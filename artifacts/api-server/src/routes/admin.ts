/**
 * Admin-only operational endpoints, gated by a bearer token in
 * `ADMIN_SEED_TOKEN` (required env). Use these to bootstrap production data
 * (CVM funds seed) without giving the agent write access to the prod DB.
 *
 * Auth: header `Authorization: Bearer <ADMIN_SEED_TOKEN>`.
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import AdmZip from "adm-zip";
import iconv from "iconv-lite";
import { sql, eq, isNotNull } from "drizzle-orm";
import { db, fundsTable, fundQualitativeTable } from "@workspace/db";
import { discoverLatestRelatorioGerencial } from "../services/fnet-discovery";
import { extractProfileFromPdfUrl } from "../services/profile-extract";

const router: IRouter = Router();

function safeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function requireSeedToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_SEED_TOKEN;
  if (!expected || expected.length < 16) {
    res.status(503).json({ error: "ADMIN_SEED_TOKEN not configured (min 16 chars)" });
    return;
  }
  const auth = req.headers.authorization ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided || !safeEqualStr(provided, expected)) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }
  next();
}

// ─── CVM seed (copy of scripts/src/seed-funds-cvm.ts core) ────────────────
const CVM_BASE = "https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS";

interface FiiRow {
  cnpj: string; nome: string; segmento: string; mandato: string;
  publicoAlvo: string; bolsa: string; administrador: string; dataReferencia: string;
}
const onlyDigits = (s: string) => s.replace(/\D/g, "");
const titleCase = (s: string) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

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
    cnpj: col("CNPJ_Fundo_Classe"), nome: col("Nome_Fundo_Classe"),
    data: col("Data_Referencia"), seg: col("Segmento_Atuacao"),
    bolsa: col("Mercado_Negociacao_Bolsa"), mandato: col("Mandato"),
    publico: col("Publico_Alvo"), adm: col("Nome_Administrador"),
  };
  const latest = new Map<string, FiiRow>();
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split(";");
    const cnpj = c[i.cnpj];
    if (!cnpj) continue;
    const row: FiiRow = {
      cnpj, nome: c[i.nome] ?? "", segmento: c[i.seg] ?? "",
      mandato: c[i.mandato] ?? "", publicoAlvo: c[i.publico] ?? "",
      bolsa: c[i.bolsa] ?? "", administrador: c[i.adm] ?? "",
      dataReferencia: c[i.data] ?? "",
    };
    const prev = latest.get(cnpj);
    if (!prev || row.dataReferencia > prev.dataReferencia) latest.set(cnpj, row);
  }
  return [...latest.values()];
}

function defaultsForSegment(segRaw: string) {
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
  return { segmentos: ["Outros"], nivelRisco: "medio", tese: "Mandato amplo conforme regulamento — incluindo CRI, FoF e desenvolvimento.", ticketMin: 1_000_000, ticketMax: 30_000_000, roiMinimo: 10 };
}

function inferEstagio(mandato: string) {
  const m = mandato.toLowerCase();
  if (m.includes("desenvolvimento")) return "Desenvolvimento";
  if (m.includes("híbrido") || m.includes("hibrido")) return "Híbrido";
  if (m.includes("título") || m.includes("titulo") || m.includes("valor mobiliário")) return "Papel";
  if (m.includes("renda")) return "Renda";
  return "Operacional";
}

/**
 * POST /admin/seed-funds?target=300
 * Idempotent — inserts up to TARGET-existing rows from CVM informe mensal.
 * Token: Authorization: Bearer <ADMIN_SEED_TOKEN>
 */
router.post("/admin/seed-funds", requireSeedToken, async (req: Request, res: Response) => {
  const target = Math.max(1, Math.min(1000, Number(req.query.target ?? 300)));
  const log = req.log;
  try {
    const year = new Date().getUTCFullYear();
    let csv: string;
    try {
      csv = await downloadGeralCsv(year);
    } catch {
      log.info({ year }, "CVM year not available, falling back to previous");
      csv = await downloadGeralCsv(year - 1);
    }

    const all = parseGeral(csv);
    const investable = all.filter(
      (r) => r.bolsa === "S" && /investidores em geral/i.test(r.publicoAlvo),
    );
    const existing = await db.select({ cnpj: fundsTable.cnpj }).from(fundsTable);
    const existingDigits = new Set(
      existing.map((r) => onlyDigits(r.cnpj ?? "")).filter((d) => d.length === 14),
    );
    const candidates = investable.filter((r) => !existingDigits.has(onlyDigits(r.cnpj)));
    const segOrder = ["Logística", "Shopping", "Lajes Corporativas", "Residencial", "Hospitalar", "Hotelaria", "Multicategoria", "Outros"];
    candidates.sort((a, b) => {
      const da = defaultsForSegment(a.segmento).segmentos[0];
      const dbSeg = defaultsForSegment(b.segmento).segmentos[0];
      return segOrder.indexOf(da) - segOrder.indexOf(dbSeg);
    });

    const toInsert = candidates.slice(0, Math.max(0, target - existingDigits.size));
    if (toInsert.length === 0) {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(fundsTable);
      res.json({ ok: true, message: "nothing to insert", inserted: 0, totalFunds: count, existing: existingDigits.size, target });
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
    }
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(fundsTable);
    res.json({
      ok: true,
      cvmRows: all.length,
      investable: investable.length,
      existingBefore: existingDigits.size,
      inserted,
      totalFunds: count,
      target,
    });
  } catch (err) {
    log.error({ err }, "Seed funds failed");
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /admin/hydrate-funds?limit=20&force=0
 * For each fund with CNPJ and no fund_qualitative entry yet, discover the
 * latest relatório gerencial on FNET and extract its profile via AI.
 * - `limit`: how many funds to process in this call (default 20, max 50).
 * - `force=1`: re-process even funds that already have a qualitative entry.
 * Idempotent — re-run until `pending: 0`.
 */
type HydrateRunState = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  target: number;
  processed: number;
  ok: number;
  noRelatorio: number;
  errors: number;
  lastError: string | null;
  lastFundCnpj: string | null;
  lastFundNome: string | null;
};
const hydrateState: HydrateRunState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  target: 0,
  processed: 0,
  ok: 0,
  noRelatorio: 0,
  errors: 0,
  lastError: null,
  lastFundCnpj: null,
  lastFundNome: null,
};

router.post("/admin/hydrate-funds", requireSeedToken, async (req: Request, res: Response) => {
  if (hydrateState.running) {
    res.status(409).json({ error: "already running", state: hydrateState });
    return;
  }
  const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 50)));
  const force = req.query.force === "1" || req.query.force === "true";
  const log = req.log;
  const onlyDigitsLocal = (s: string | null) => (s ?? "").replace(/\D/g, "");

  const allFunds = await db
    .select({ id: fundsTable.id, cnpj: fundsTable.cnpj, nome: fundsTable.nome })
    .from(fundsTable)
    .where(isNotNull(fundsTable.cnpj));
  let pool = allFunds.filter((f) => onlyDigitsLocal(f.cnpj).length === 14);
  if (!force) {
    const existing = await db.select({ cnpj: fundQualitativeTable.cnpj }).from(fundQualitativeTable);
    const existingSet = new Set(existing.map((r) => onlyDigitsLocal(r.cnpj)));
    pool = pool.filter((f) => !existingSet.has(onlyDigitsLocal(f.cnpj)));
  }
  const batch = pool.slice(0, limit);

  hydrateState.running = true;
  hydrateState.startedAt = new Date().toISOString();
  hydrateState.finishedAt = null;
  hydrateState.target = batch.length;
  hydrateState.processed = 0;
  hydrateState.ok = 0;
  hydrateState.noRelatorio = 0;
  hydrateState.errors = 0;
  hydrateState.lastError = null;
  hydrateState.lastFundCnpj = null;
  hydrateState.lastFundNome = null;

  res.status(202).json({
    accepted: true,
    target: batch.length,
    pending: pool.length,
    message: "Hydration started in background. Poll GET /admin/hydrate-funds/status.",
  });

  void (async () => {
    for (const f of batch) {
      const cnpj = f.cnpj!;
      hydrateState.lastFundCnpj = cnpj;
      hydrateState.lastFundNome = f.nome;
      try {
        const doc = await discoverLatestRelatorioGerencial(cnpj);
        if (!doc) {
          hydrateState.noRelatorio += 1;
        } else {
          await db.update(fundsTable).set({ relatorioPdfUrl: doc.url }).where(eq(fundsTable.id, f.id));
          await extractProfileFromPdfUrl(cnpj, doc.url);
          hydrateState.ok += 1;
        }
      } catch (err) {
        hydrateState.errors += 1;
        hydrateState.lastError = err instanceof Error ? err.message : String(err);
        log.warn({ err, cnpj, fundId: f.id }, "hydrate-funds: extract failed");
      }
      hydrateState.processed += 1;
    }
    hydrateState.running = false;
    hydrateState.finishedAt = new Date().toISOString();
    log.info({ state: hydrateState }, "hydrate-funds: batch finished");
  })();
});

/** GET /admin/hydrate-funds/status — quick counters, no auth body needed but token-gated. */
router.get("/admin/hydrate-funds/status", requireSeedToken, async (_req, res) => {
  const onlyDigitsLocal = (s: string | null) => (s ?? "").replace(/\D/g, "");
  const allFunds = await db.select({ cnpj: fundsTable.cnpj }).from(fundsTable).where(isNotNull(fundsTable.cnpj));
  const withCnpj = allFunds.filter((f) => onlyDigitsLocal(f.cnpj).length === 14).length;
  const existing = await db.select({ cnpj: fundQualitativeTable.cnpj }).from(fundQualitativeTable);
  const hydrated = existing.length;
  res.json({
    totalFundsWithCnpj: withCnpj,
    hydrated,
    pending: Math.max(0, withCnpj - hydrated),
    job: hydrateState,
  });
});

export default router;
