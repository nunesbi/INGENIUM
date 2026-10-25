import { db, fundsTable } from "@workspace/db";

const result = await db.select().from(fundsTable);

console.log("TOTAL DE FUNDOS:", result.length);

console.log(
  result.slice(0, 10).map(f => ({
    id: f.id,
    nome: f.nome,
    cnpj: f.cnpj,
    ticker: f.ticker
  }))
);

process.exit(0);
