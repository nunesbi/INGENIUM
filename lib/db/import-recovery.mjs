import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const DATA_DIR = path.resolve("../../data-recovery");

const TABLES = [
  "funds",
  "assets",
  "empreendedores",
  "incorporadoras",
  "fund_monthly_reports",
  "fund_qualitative",
  "matches",
  "fund_sync_log",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((r) => r.some((v) => v !== ""));
}

function quoteIdentifier(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

function convertValue(value, column) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const dataType = column.data_type;
  const udtName = column.udt_name;

  // PostgreSQL boolean
  if (dataType === "boolean") {
    return ["true", "t", "1", "yes", "sim"].includes(
      value.toLowerCase(),
    );
  }

  // PostgreSQL integers
  if (
    dataType === "smallint" ||
    dataType === "integer" ||
    dataType === "bigint"
  ) {
    return Number.parseInt(value, 10);
  }

  // PostgreSQL numeric
  // Mantemos como string para evitar perda de precisão.
  if (
    dataType === "numeric" ||
    dataType === "real" ||
    dataType === "double precision"
  ) {
    return value;
  }

  // PostgreSQL arrays
  //
  // No CSV eles aparecem, por exemplo:
  // ["Multimercado"]
  // ["São Paulo","Minas Gerais"]
  //
  // JSON.parse transforma isso em um array JavaScript,
  // e o driver pg converte corretamente para PostgreSQL.
  if (dataType === "ARRAY") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      return [String(parsed)];
    } catch {
      console.warn(
        `⚠ Array inválido encontrado: ${value}. Usando array vazio.`,
      );

      return [];
    }
  }

  // JSON / JSONB
  if (
    dataType === "json" ||
    dataType === "jsonb" ||
    udtName === "json" ||
    udtName === "jsonb"
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Datas/timestamps
  if (
    dataType === "timestamp with time zone" ||
    dataType === "timestamp without time zone" ||
    dataType === "date"
  ) {
    return value;
  }

  // Texto e demais tipos
  return value;
}

async function getColumns(client, table) {
  const result = await client.query(
    `
      SELECT
        column_name,
        data_type,
        udt_name,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );

  return result.rows;
}

async function getTableCount(client, table) {
  const result = await client.query(
    `SELECT COUNT(*)::integer AS total FROM ${quoteIdentifier(table)}`,
  );

  return result.rows[0].total;
}

async function importTable(client, table) {
  const filePath = path.join(DATA_DIR, `${table}.csv`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ ${table}: arquivo não encontrado.`);
    return 0;
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(fileContent);

  if (rows.length === 0) {
    console.log(`- ${table}: arquivo vazio.`);
    return 0;
  }

  // Remove BOM caso exista no primeiro cabeçalho
  const headers = rows[0].map((header, index) => {
    if (index === 0) {
      return header.replace(/^\uFEFF/, "");
    }

    return header;
  });

  const dataRows = rows
    .slice(1)
    .filter((row) => row.some((value) => value !== ""));

  if (dataRows.length === 0) {
    console.log(`- ${table}: 0 registros.`);
    return 0;
  }

  const columns = await getColumns(client, table);

  const columnMap = new Map(
    columns.map((column) => [column.column_name, column]),
  );

  // Confere se todas as colunas do CSV existem no banco
  for (const header of headers) {
    if (!columnMap.has(header)) {
      throw new Error(
        `${table}: a coluna "${header}" existe no CSV, mas não existe na tabela PostgreSQL.`,
      );
    }
  }

  const selectedColumns = headers.map((header) =>
    columnMap.get(header),
  );

  const sqlColumns = selectedColumns
    .map((column) => quoteIdentifier(column.column_name))
    .join(", ");

  await client.query("BEGIN");

  try {
    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      const row = dataRows[rowIndex];

      if (row.length !== headers.length) {
        throw new Error(
          `${table}: linha ${rowIndex + 2} possui ${row.length} campos, mas o cabeçalho possui ${headers.length}.`,
        );
      }

      const values = row.map((value, index) =>
        convertValue(value, selectedColumns[index]),
      );

      const placeholders = values
        .map((_, index) => `$${index + 1}`)
        .join(", ");

      const sql = `
        INSERT INTO ${quoteIdentifier(table)}
        (${sqlColumns})
        VALUES (${placeholders})
      `;

      await client.query(sql, values);
    }

    await client.query("COMMIT");

    console.log(`✓ ${table}: ${dataRows.length} registros importados`);

    return dataRows.length;
  } catch (error) {
    await client.query("ROLLBACK");

    throw new Error(
      `${table}: ${error.message}`,
    );
  }
}

async function fixSequences(client) {
  console.log("\nAjustando sequences dos IDs...");

  for (const table of TABLES) {
    const sequenceResult = await client.query(
      `
        SELECT pg_get_serial_sequence($1, 'id') AS sequence_name
      `,
      [`public.${table}`],
    );

    const sequenceName =
      sequenceResult.rows[0]?.sequence_name;

    if (!sequenceName) {
      continue;
    }

    const maxResult = await client.query(
      `SELECT MAX(id) AS max_id FROM ${quoteIdentifier(table)}`,
    );

    const maxId = maxResult.rows[0]?.max_id;

    if (maxId === null || maxId === undefined) {
      continue;
    }

    await client.query(
      `SELECT setval($1::regclass, $2, true)`,
      [sequenceName, Number(maxId)],
    );

    console.log(`✓ ${table}: sequence ajustada para ${maxId}`);
  }
}

async function showFinalCounts(client) {
  console.log("\n==============================");
  console.log("      CONTAGEM FINAL");
  console.log("==============================");

  let total = 0;

  for (const table of TABLES) {
    const count = await getTableCount(client, table);

    console.log(`${table.padEnd(25)} ${count}`);

    total += count;
  }

  console.log("------------------------------");
  console.log(`TOTAL                     ${total}`);
  console.log("==============================");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não está definida nesta janela do PowerShell.",
    );
  }

  console.log("Conectado ao PostgreSQL local.");
  console.log(`Pasta dos CSVs: ${DATA_DIR}`);
  console.log("");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    // Segurança: não permite duplicação.
    for (const table of TABLES) {
      const count = await getTableCount(client, table);

      if (count > 0) {
        throw new Error(
          `A tabela "${table}" já possui ${count} registros. Importação cancelada para evitar duplicação.`,
        );
      }
    }

    console.log("Todas as tabelas estão vazias.");
    console.log("Iniciando recuperação...\n");

    let totalImported = 0;

    for (const table of TABLES) {
      totalImported += await importTable(client, table);
    }

    await fixSequences(client);

    await showFinalCounts(client);

    console.log("");
    console.log(`Total importado nesta recuperação: ${totalImported}`);
    console.log("");
    console.log("✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("");
  console.error("❌ ERRO:");
  console.error(error.message);
  console.error("");

  process.exit(1);
});