/**
 * Seed funds table from CVM open data (informe mensal FII — geral).
 *
 * Source: https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_<year>.zip
 * The `geral` CSV inside contains every FII registered with CVM — name, CNPJ,
 * segment, market (bolsa/balcao), administrator, status.
 *
 * Strategy:
 *  - Download latest year ZIP, fall back to previous year.
 *  - Dedup by CNPJ (keep latest Data_Referencia per CNPJ).
 *  - Filter to bolsa-listed funds (Mercado_Negociacao_Bolsa === "S") and
 *    "Investidores em Geral" / qualified — the real investable universe.
 *  - Insert only CNPJs not already present in funds table (idempotent).
 *  - Sensible defaults for tese/ticket/risco derived from segment.
 *
 * Run: `pnpm --filter @workspace/scripts run seed-funds-cvm`
 *      Env: TARGET=N (cap insertions, default 300)
 */
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { db, fundsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const CVM_BASE = "https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS";
const TARGET = Number(process.env.TARGET ?? 300);

interface FiiRow {
  cnpj: string;
  nome: string;
  segmento: string;
  mandato: string;
  publicoAlvo: string;
  bolsa: string;
  administrador: string;
  dataReferencia: string;
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

async function downloadGeralCsv(year: number): Promise<string> {
  const url = `${CVM_BASE}/inf_mensal_fii_${year}.zip`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  const zip = new AdmZip(Buffer.from(ab));
  const entry = zip.getEntries().find((e) => /geral/i.test(e.entryName));
  if (!entry) throw new Error(`geral CSV not found in ${url}`);
  return iconv.decode(entry.getData(), "latin1");
}

function parseGeral(csv: string): FiiRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(";");
  const col = (n: string) => header.findIndex((h) => h === n);
  const i = {
    cnpj: col("CNPJ_Fundo_Classe"),
    nome: col("Nome_Fundo_Classe"),
    data: col("Data_Referencia"),
    seg: col("Segmento_Atuacao"),
    bolsa: col("Mercado_Negociacao_Bolsa"),
    mandato: col("Mandato"),
    publico: col("Publico_Alvo"),
    adm: col("Nome_Administrador"),
  };

  const latest = new Map<string, FiiRow>();
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split(";");
    const cnpj = c[i.cnpj];
    if (!cnpj) continue;
    const row: FiiRow = {
      cnpj,
      nome: c[i.nome] ?? "",
      segmento: c[i.seg] ?? "",
      mandato: c[i.mandato] ?? "",
      publicoAlvo: c[i.publico] ?? "",
      bolsa: c[i.bolsa] ?? "",
      administrador: c[i.adm] ?? "",
      dataReferencia: c[i.data] ?? "",
    };
    const prev = latest.get(cnpj);
    if (!prev || row.dataReferencia > prev.dataReferencia) latest.set(cnpj, row);
  }
  return [...latest.values()];
}

/**
 * Segment heuristics — drive tese, segmentos[], nivelRisco, ticket range, roi.
 * Numbers reflect typical institutional FII tickets in BRL.
 */
function defaultsForSegment(segRaw: string): {
  segmentos: string[];
  nivelRisco: string;
  tese: string;
  ticketMin: number;
  ticketMax: number;
  roiMinimo: number;
} {
  const s = (segRaw || "").toLowerCase();
  if (s.includes("logística") || s.includes("logistica"))
    return { segmentos: ["Logística"], nivelRisco: "medio", tese: "Investimento em galpões logísticos AAA com contratos atípicos de longo prazo.", ticketMin: 2_000_000, ticketMax: 50_000_000, roiMinimo: 9 };
  if (s.includes("shopping"))
    return { segmentos: ["Shopping"], nivelRisco: "medio", tese: "Aquisição de participações em shopping centers consolidados em regiões metropolitanas.", ticketMin: 5_000_000, ticketMax: 100_000_000, roiMinimo: 8 };
  if (s.includes("escritório") || s.includes("escritorio") || s.includes("lajes corporativas"))
    return { segmentos: ["Lajes Corporativas"], nivelRisco: "medio", tese: "Lajes corporativas AAA em eixos premium (Faria Lima, Vila Olímpia, JK).", ticketMin: 3_000_000, ticketMax: 80_000_000, roiMinimo: 8 };
  if (s.includes("residencial"))
    return { segmentos: ["Residencial"], nivelRisco: "medio", tese: "Renda residencial multifamily e desenvolvimento residencial em capitais.", ticketMin: 2_000_000, ticketMax: 40_000_000, roiMinimo: 10 };
  if (s.includes("hospital"))
    return { segmentos: ["Hospitalar"], nivelRisco: "baixo", tese: "Built-to-suit hospitalar com inquilinos investment grade.", ticketMin: 5_000_000, ticketMax: 60_000_000, roiMinimo: 8 };
  if (s.includes("hotel") || s.includes("hotelaria"))
    return { segmentos: ["Hotelaria"], nivelRisco: "medio", tese: "Hotéis em destinos consolidados com operadores reconhecidos.", ticketMin: 3_000_000, ticketMax: 50_000_000, roiMinimo: 10 };
  if (s.includes("varejo"))
    return { segmentos: ["Varejo"], nivelRisco: "medio", tese: "Imóveis de varejo com contratos atípicos de longo prazo (BTS, sale & leaseback).", ticketMin: 2_000_000, ticketMax: 40_000_000, roiMinimo: 9 };
  if (s.includes("educacional"))
    return { segmentos: ["Educacional"], nivelRisco: "baixo", tese: "Imóveis educacionais (campus universitário, colégios) com contratos longos.", ticketMin: 3_000_000, ticketMax: 50_000_000, roiMinimo: 8 };
  if (s.includes("multicategoria"))
    return { segmentos: ["Multicategoria"], nivelRisco: "medio", tese: "Carteira diversificada — logística, lajes e renda urbana.", ticketMin: 2_000_000, ticketMax: 60_000_000, roiMinimo: 9 };
  // "Outros" — papel, FoF, CRI, desenvolvimento, etc.
  return { segmentos: ["Outros"], nivelRisco: "medio", tese: "Mandato amplo conforme regulamento — incluindo CRI, FoF e desenvolvimento.", ticketMin: 1_000_000, ticketMax: 30_000_000, roiMinimo: 10 };
}

function inferEstagio(mandato: string): string {
  const m = mandato.toLowerCase();
  if (m.includes("desenvolvimento")) return "Desenvolvimento";
  if (m.includes("híbrido") || m.includes("hibrido")) return "Híbrido";
  if (m.includes("título") || m.includes("titulo") || m.includes("valor mobiliário")) return "Papel";
  if (m.includes("renda")) return "Renda";
  return "Operacional";
}

async function main(): Promise<void> {
  const now = new Date();
  const year = now.getUTCFullYear();
  let csv: string;
  try {
    csv = await downloadGeralCsv(year);
  } catch {
    console.log(`[seed-funds-cvm] ${year} not available, falling back to ${year - 1}`);
    csv = await downloadGeralCsv(year - 1);
  }

  const all = parseGeral(csv);
  // Bolsa-listed + open to general public — the real investable universe.
  const investable = all.filter(
    (r) => r.bolsa === "S" && /investidores em geral/i.test(r.publicoAlvo),
  );
  console.log(`[seed-funds-cvm] CVM rows: ${all.length}, bolsa-listed investable: ${investable.length}`);

  // Existing CNPJs (compare by digits only).
  const existing = await db
    .select({ cnpj: fundsTable.cnpj })
    .from(fundsTable);
  const existingDigits = new Set(existing.map((r) => onlyDigits(r.cnpj ?? "")).filter((d) => d.length === 14));
  console.log(`[seed-funds-cvm] existing funds with CNPJ: ${existingDigits.size}`);

  const candidates = investable.filter((r) => !existingDigits.has(onlyDigits(r.cnpj)));
  // Sort: bigger segments first so the demo reflects the real market mix.
  const segOrder = ["Logística", "Shopping", "Lajes Corporativas", "Residencial", "Hospitalar", "Hotelaria", "Multicategoria", "Outros"];
  candidates.sort((a, b) => {
    const da = defaultsForSegment(a.segmento).segmentos[0];
    const db_ = defaultsForSegment(b.segmento).segmentos[0];
    return segOrder.indexOf(da) - segOrder.indexOf(db_);
  });

  const toInsert = candidates.slice(0, Math.max(0, TARGET - existingDigits.size));
  console.log(`[seed-funds-cvm] target=${TARGET}, will insert ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log(`[seed-funds-cvm] nothing to insert.`);
    return;
  }

  let inserted = 0;
  const batchSize = 50;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const slice = toInsert.slice(i, i + batchSize);
    const rows = slice.map((r) => {
      const d = defaultsForSegment(r.segmento);
      const nome = titleCase(r.nome.replace(/FUNDO DE INVESTIMENTO IMOBILIÁRIO/gi, "FII").trim());
      return {
        nome: nome || r.nome,
        tese: d.tese,
        ticketMin: String(d.ticketMin),
        ticketMax: String(d.ticketMax),
        segmentos: d.segmentos,
        regioes: ["Brasil"],
        nivelRisco: d.nivelRisco,
        roiMinimo: String(d.roiMinimo),
        descricao: r.administrador ? `Administrado por ${titleCase(r.administrador)}.` : null,
        estagio: inferEstagio(r.mandato),
        cnpj: r.cnpj,
        ticker: null,
        relatorioPdfUrl: null,
      };
    });
    await db.insert(fundsTable).values(rows).onConflictDoNothing();
    inserted += rows.length;
    console.log(`[seed-funds-cvm] inserted ${inserted}/${toInsert.length}`);
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(fundsTable);
  console.log(`[seed-funds-cvm] DONE. funds in DB: ${count}`);
}

main().catch((err) => {
  console.error("[seed-funds-cvm] FAILED", err);
  process.exit(1);
});
