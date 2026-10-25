import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { db, fundsTable, fundMonthlyReportsTable, fundSyncLogTable } from "@workspace/db";
import { sql, isNotNull, and, ne } from "drizzle-orm";
import { logger } from "../lib/logger";

const CVM_BASE = "https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS";
const FETCH_TIMEOUT_MS = 60_000;

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

function parseBrazilNumber(s: string | undefined): number | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed || trimmed === "ND" || trimmed === "N/A") return null;
  // CVM mistura formatos ao longo dos anos:
  //   - "1.234,56" (BR clássico: ponto=milhar, vírgula=decimal)
  //   - "1234.56" ou "166.490023171738" (novo: ponto=decimal)
  //   - "1.234" (BR thousands-only — ambíguo, mas o padrão \d{1,3}(\.\d{3})+ desambigua)
  let normalized: string;
  if (trimmed.includes(",")) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    // Apenas grupos de 3 dígitos após pontos → milhar BR
    normalized = trimmed.replace(/\./g, "");
  } else {
    // Ponto isolado é decimal (formato novo CVM)
    normalized = trimmed;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseInteger(s: string | undefined): number | null {
  const n = parseBrazilNumber(s);
  return n === null ? null : Math.round(n);
}

interface CsvRow {
  [column: string]: string;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const row: CsvRow = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cols[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

async function fetchWithTimeout(url: string): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(t);
  }
}

function pickColumn(row: CsvRow, candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (row[c] !== undefined) return row[c];
  }
  return undefined;
}

interface ParsedRow {
  cnpj: string;
  dataReferencia: string;
  numCotistas: number | null;
  valorPatrimonialCota: number | null;
  patrimonioLiquido: number | null;
  rentabilidadeMes: number | null;
  dividendYieldMes: number | null;
  percentualMaiorCotista: number | null;
}

function rowToParsed(row: CsvRow): ParsedRow | null {
  const cnpjRaw = pickColumn(row, ["CNPJ_Fundo_Classe", "CNPJ_Fundo", "CNPJ"]);
  const cnpj = onlyDigits(cnpjRaw);
  if (cnpj.length !== 14) return null;

  const dataRaw = pickColumn(row, ["Data_Referencia", "DT_REFER", "DATA_REFER"]);
  if (!dataRaw) return null;
  // CVM uses ISO-like "YYYY-MM-DD" in modern files
  const dataReferencia = dataRaw.length >= 10 ? dataRaw.slice(0, 10) : dataRaw;

  // CVM "complemento" file columns (verified against 2026 schema):
  //   - Valor_Patrimonial_Cotas: já é per-cota (ex.: 163.42 para KNRI11)
  //   - Patrimonio_Liquido: total do fundo
  //   - Percentual_*: armazenado como fração (0.006101 = 0.61%); multiplicamos por 100.
  //   - Aliases legados (Rentabilidade_Mes / Dividend_Yield_Mes) já vinham em % nos schemas
  //     antigos da CVM — NÃO multiplicar por 100 nesse caso.
  const pctFromFraction = (s: string | undefined): number | null => {
    const n = parseBrazilNumber(s);
    return n === null ? null : n * 100;
  };
  const pickPercent = (
    fractionCols: string[],
    legacyPercentCols: string[],
  ): number | null => {
    const fracVal = pickColumn(row, fractionCols);
    if (fracVal !== undefined) return pctFromFraction(fracVal);
    return parseBrazilNumber(pickColumn(row, legacyPercentCols));
  };

  return {
    cnpj,
    dataReferencia,
    numCotistas: parseInteger(pickColumn(row, ["Total_Numero_Cotistas", "Numero_Cotistas"])),
    valorPatrimonialCota: parseBrazilNumber(pickColumn(row, ["Valor_Patrimonial_Cotas", "Valor_Patrimonial_Cota"])),
    patrimonioLiquido: parseBrazilNumber(pickColumn(row, ["Patrimonio_Liquido", "Patrimonio_Liq"])),
    rentabilidadeMes: pickPercent(["Percentual_Rentabilidade_Efetiva_Mes"], ["Rentabilidade_Mes"]),
    dividendYieldMes: pickPercent(["Percentual_Dividend_Yield_Mes"], ["Dividend_Yield_Mes"]),
    percentualMaiorCotista: pickPercent(["Percentual_Maior_Cotista"], []),
  };
}

async function getKnownCnpjs(): Promise<Set<string>> {
  const rows = await db
    .select({ cnpj: fundsTable.cnpj })
    .from(fundsTable)
    .where(and(isNotNull(fundsTable.cnpj), ne(fundsTable.cnpj, "")));
  const set = new Set<string>();
  for (const r of rows) {
    const c = onlyDigits(r.cnpj);
    if (c.length === 14) set.add(c);
  }
  return set;
}

/**
 * Download CVM informe mensal for a given year, parse the "complemento" CSV,
 * and upsert rows for CNPJs known in our funds table.
 */
async function syncYear(year: number, knownCnpjs: Set<string>): Promise<{ rowsUpserted: number; cnpjsUpdated: number; sourceUrl: string }> {
  const sourceUrl = `${CVM_BASE}/inf_mensal_fii_${year}.zip`;
  const ab = await fetchWithTimeout(sourceUrl);
  const zip = new AdmZip(Buffer.from(ab));

  const entry = zip.getEntries().find((e) => /inf_mensal_fii_complemento.*\.csv$/i.test(e.entryName));
  if (!entry) throw new Error(`complemento CSV not found in ZIP for ${year}`);

  const buffer = entry.getData();
  // CVM CSVs are ISO-8859-1
  const content = iconv.decode(buffer, "latin1");
  const rows = parseCsv(content);

  let rowsUpserted = 0;
  const touchedCnpjs = new Set<string>();
  const batch: ParsedRow[] = [];

  for (const r of rows) {
    const parsed = rowToParsed(r);
    if (!parsed) continue;
    if (!knownCnpjs.has(parsed.cnpj)) continue;
    batch.push(parsed);
    touchedCnpjs.add(parsed.cnpj);
  }

  for (const p of batch) {
    await db
      .insert(fundMonthlyReportsTable)
      .values({
        cnpj: p.cnpj,
        dataReferencia: p.dataReferencia,
        numCotistas: p.numCotistas,
        valorPatrimonialCota: p.valorPatrimonialCota === null ? null : String(p.valorPatrimonialCota),
        patrimonioLiquido: p.patrimonioLiquido === null ? null : String(p.patrimonioLiquido),
        rentabilidadeMes: p.rentabilidadeMes === null ? null : String(p.rentabilidadeMes),
        dividendYieldMes: p.dividendYieldMes === null ? null : String(p.dividendYieldMes),
        percentualMaiorCotista: p.percentualMaiorCotista === null ? null : String(p.percentualMaiorCotista),
        sourceUrl,
      })
      .onConflictDoUpdate({
        target: [fundMonthlyReportsTable.cnpj, fundMonthlyReportsTable.dataReferencia],
        set: {
          numCotistas: sql`EXCLUDED.num_cotistas`,
          valorPatrimonialCota: sql`EXCLUDED.valor_patrimonial_cota`,
          patrimonioLiquido: sql`EXCLUDED.patrimonio_liquido`,
          rentabilidadeMes: sql`EXCLUDED.rentabilidade_mes`,
          dividendYieldMes: sql`EXCLUDED.dividend_yield_mes`,
          percentualMaiorCotista: sql`EXCLUDED.percentual_maior_cotista`,
          sourceUrl: sql`EXCLUDED.source_url`,
          fetchedAt: sql`now()`,
        },
      });
    rowsUpserted++;
  }

  return { rowsUpserted, cnpjsUpdated: touchedCnpjs.size, sourceUrl };
}

export interface SyncResult {
  status: "ok" | "error" | "partial";
  rowsUpserted: number;
  cnpjsUpdated: number;
  yearsProcessed: number[];
  errors: string[];
}

/**
 * Run full CVM monthly sync. Pulls current year (and previous year early in the year)
 * to ensure we have the latest informes for funds tracked in our system.
 */
export async function runCvmMonthlySync(): Promise<SyncResult> {
  const startedAt = new Date();
  const [logRow] = await db.insert(fundSyncLogTable).values({
    source: "cvm-monthly",
    status: "ok",
    message: "started",
    startedAt,
  }).returning();

  const knownCnpjs = await getKnownCnpjs();
  const errors: string[] = [];
  let totalRows = 0;
  let totalCnpjs = 0;
  const yearsProcessed: number[] = [];

  if (knownCnpjs.size === 0) {
    await db.update(fundSyncLogTable).set({
      status: "ok",
      message: "no funds with CNPJ — nothing to sync",
      cnpjsUpdated: 0,
      rowsUpserted: 0,
      finishedAt: new Date(),
    }).where(sql`id = ${logRow.id}`);
    return { status: "ok", rowsUpserted: 0, cnpjsUpdated: 0, yearsProcessed: [], errors: [] };
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = now.getUTCMonth() < 3 ? [currentYear - 1, currentYear] : [currentYear];

  const allTouched = new Set<string>();
  for (const year of years) {
    try {
      const r = await syncYear(year, knownCnpjs);
      totalRows += r.rowsUpserted;
      totalCnpjs += r.cnpjsUpdated;
      yearsProcessed.push(year);
      // Track cnpjs across years (we only get total touched per call, approximate)
      void allTouched;
    } catch (err) {
      const msg = `year ${year}: ${err instanceof Error ? err.message : String(err)}`;
      logger.error({ err, year }, "CVM sync failed for year");
      errors.push(msg);
    }
  }

  const status: "ok" | "error" | "partial" =
    errors.length === 0 ? "ok" : yearsProcessed.length > 0 ? "partial" : "error";

  await db.update(fundSyncLogTable).set({
    status,
    cnpjsUpdated: totalCnpjs,
    rowsUpserted: totalRows,
    message: errors.length > 0 ? errors.join("; ") : `synced ${yearsProcessed.join(", ")}`,
    details: { years: yearsProcessed, errors },
    finishedAt: new Date(),
  }).where(sql`id = ${logRow.id}`);

  return { status, rowsUpserted: totalRows, cnpjsUpdated: totalCnpjs, yearsProcessed, errors };
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
let scheduled = false;

export function scheduleCvmSync(): void {
  if (scheduled) return;
  scheduled = true;

  // Initial run on a short delay so server is fully up
  setTimeout(() => {
    runCvmMonthlySync()
      .then((r) => logger.info(r, "CVM initial sync complete"))
      .catch((err) => logger.error({ err }, "CVM initial sync failed"));
  }, 5_000);

  setInterval(() => {
    runCvmMonthlySync()
      .then((r) => logger.info(r, "CVM scheduled sync complete"))
      .catch((err) => logger.error({ err }, "CVM scheduled sync failed"));
  }, TWENTY_FOUR_HOURS_MS);
}
