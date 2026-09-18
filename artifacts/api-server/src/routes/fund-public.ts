import { Router } from "express";
import { db, fundsTable, fundMonthlyReportsTable, fundQualitativeTable, fundOfferingsTable, fundSyncLogTable } from "@workspace/db";
import { eq, desc, and, isNotNull, ne } from "drizzle-orm";
import { runCvmMonthlySync } from "../services/cvm-sync";
import { extractProfileFromPdfUrl } from "../services/profile-extract";
import { discoverLatestRelatorioGerencial } from "../services/fnet-discovery";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

function onlyDigits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

async function getFundCnpj(id: number): Promise<string | null> {
  const [fund] = await db.select({ cnpj: fundsTable.cnpj }).from(fundsTable).where(eq(fundsTable.id, id));
  if (!fund) return null;
  const cnpj = onlyDigits(fund.cnpj);
  return cnpj.length === 14 ? cnpj : null;
}

async function getFundRow(id: number): Promise<{ cnpj: string | null; relatorioPdfUrl: string | null } | null> {
  const [fund] = await db
    .select({ cnpj: fundsTable.cnpj, relatorioPdfUrl: fundsTable.relatorioPdfUrl })
    .from(fundsTable)
    .where(eq(fundsTable.id, id));
  if (!fund) return null;
  const cnpj = onlyDigits(fund.cnpj);
  return { cnpj: cnpj.length === 14 ? cnpj : null, relatorioPdfUrl: fund.relatorioPdfUrl };
}

// GET /api/funds/:id/public-data — bundle of latest CVM metrics + qualitative + offerings
router.get("/funds/:id/public-data", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const fund = await getFundRow(id);
  if (!fund) { res.status(404).json({ error: "Fund not found" }); return; }
  const cnpj = fund.cnpj;
  if (!cnpj) {
    res.json({ cnpj: null, relatorioPdfUrl: fund.relatorioPdfUrl, latest: null, history: [], qualitative: null, offerings: [] });
    return;
  }

  const history = await db.select()
    .from(fundMonthlyReportsTable)
    .where(eq(fundMonthlyReportsTable.cnpj, cnpj))
    .orderBy(desc(fundMonthlyReportsTable.dataReferencia))
    .limit(24);

  const [qualitative] = await db.select()
    .from(fundQualitativeTable)
    .where(eq(fundQualitativeTable.cnpj, cnpj));

  const offerings = await db.select()
    .from(fundOfferingsTable)
    .where(eq(fundOfferingsTable.cnpj, cnpj))
    .orderBy(desc(fundOfferingsTable.dataInicio));

  res.json({
    cnpj,
    relatorioPdfUrl: fund.relatorioPdfUrl,
    latest: history[0]
      ? {
          dataReferencia: history[0].dataReferencia,
          numCotistas: history[0].numCotistas,
          valorPatrimonialCota: history[0].valorPatrimonialCota === null ? null : Number(history[0].valorPatrimonialCota),
          patrimonioLiquido: history[0].patrimonioLiquido === null ? null : Number(history[0].patrimonioLiquido),
          rentabilidadeMes: history[0].rentabilidadeMes === null ? null : Number(history[0].rentabilidadeMes),
          dividendYieldMes: history[0].dividendYieldMes === null ? null : Number(history[0].dividendYieldMes),
          percentualMaiorCotista: history[0].percentualMaiorCotista === null ? null : Number(history[0].percentualMaiorCotista),
          sourceUrl: history[0].sourceUrl,
          fetchedAt: history[0].fetchedAt.toISOString(),
        }
      : null,
    history: history.map((h) => ({
      dataReferencia: h.dataReferencia,
      valorPatrimonialCota: h.valorPatrimonialCota === null ? null : Number(h.valorPatrimonialCota),
      numCotistas: h.numCotistas,
      dividendYieldMes: h.dividendYieldMes === null ? null : Number(h.dividendYieldMes),
      rentabilidadeMes: h.rentabilidadeMes === null ? null : Number(h.rentabilidadeMes),
    })).reverse(),
    qualitative: qualitative ?? null,
    offerings: offerings.map((o) => ({
      id: o.id,
      codigoOferta: o.codigoOferta,
      dataInicio: o.dataInicio,
      dataEncerramento: o.dataEncerramento,
      valorTotal: o.valorTotal === null ? null : Number(o.valorTotal),
      publicoAlvo: o.publicoAlvo,
      exigeQualificado: o.exigeQualificado,
      perfilEsperado: o.perfilEsperado,
      sourceUrl: o.sourceUrl,
    })),
  });
});

// POST /api/funds/sync — triggers CVM sync for all funds with a CNPJ
router.post("/funds/sync", requireRole("admin"), async (req, res) => {
  try {
    const result = await runCvmMonthlySync();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "CVM sync failed");
    res.status(500).json({ error: "Sync failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/funds/:id/discover-relatorio — auto-find latest Relatório Gerencial on FNET
router.post("/funds/:id/discover-relatorio", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const fund = await getFundRow(id);
  if (!fund) { res.status(404).json({ error: "Fund not found" }); return; }
  if (!fund.cnpj) { res.status(400).json({ error: "Fund has no CNPJ — set CNPJ first" }); return; }
  try {
    const doc = await discoverLatestRelatorioGerencial(fund.cnpj);
    if (!doc) { res.status(404).json({ error: "Nenhum Relatório Gerencial encontrado no FNET para este CNPJ" }); return; }
    await db.update(fundsTable).set({ relatorioPdfUrl: doc.url }).where(eq(fundsTable.id, id));
    res.json({
      url: doc.url,
      documentId: doc.id,
      dataReferencia: doc.dataReferencia,
      dataEntrega: doc.dataEntrega,
      tipoDocumento: doc.tipoDocumento,
    });
  } catch (err) {
    req.log.error({ err, cnpj: fund.cnpj }, "FNET discovery failed");
    res.status(500).json({ error: "Discovery failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/funds/:id/extract-profile — pulls a PDF (relatório gerencial) and extracts perfil via AI
// Resolution order for the PDF URL:
//   1) explicit pdfUrl in body (manual override)
//   2) auto-discovery via CVM Fundos.NET (preferred — always gives the latest)
//   3) URL previously saved on the fund (fallback when FNET search fails)
router.post("/funds/:id/extract-profile", requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyUrl = (req.body as { pdfUrl?: string })?.pdfUrl;

  const fund = await getFundRow(id);
  if (!fund) { res.status(404).json({ error: "Fund not found" }); return; }
  if (!fund.cnpj) { res.status(400).json({ error: "Fund has no CNPJ — set CNPJ first" }); return; }
  const cnpj = fund.cnpj;

  let pdfUrl: string | null = null;
  let discoveredUrl: string | null = null;
  let dataReferencia: string | null = null;

  if (typeof bodyUrl === "string" && bodyUrl.trim()) {
    pdfUrl = bodyUrl.trim();
  } else {
    try {
      const doc = await discoverLatestRelatorioGerencial(cnpj);
      if (doc) {
        pdfUrl = doc.url;
        discoveredUrl = doc.url;
        dataReferencia = doc.dataReferencia;
      }
    } catch (err) {
      req.log.warn({ err, cnpj }, "FNET auto-discovery failed; falling back to saved URL");
    }
    if (!pdfUrl) pdfUrl = fund.relatorioPdfUrl;
  }

  if (!pdfUrl) {
    res.status(400).json({ error: "Não foi possível descobrir o relatório no FNET e nenhuma URL está salva. Informe uma URL manualmente." });
    return;
  }

  try {
    const profile = await extractProfileFromPdfUrl(cnpj, pdfUrl);
    // Persist the URL on the fund so it doesn't need to be re-entered next time
    await db.update(fundsTable).set({ relatorioPdfUrl: pdfUrl }).where(eq(fundsTable.id, id));
    await db.insert(fundSyncLogTable).values({
      source: "pdf-extract",
      status: "ok",
      message: `extracted profile for ${cnpj}`,
      details: { pdfUrl, cnpj, discovered: !!discoveredUrl },
      finishedAt: new Date(),
    });
    res.json({ cnpj, profile, discoveredUrl, dataReferencia });
  } catch (err) {
    req.log.error({ err, pdfUrl }, "Profile extraction failed");
    await db.insert(fundSyncLogTable).values({
      source: "pdf-extract",
      status: "error",
      message: err instanceof Error ? err.message : String(err),
      details: { pdfUrl, cnpj },
      finishedAt: new Date(),
    });
    res.status(500).json({ error: "Extraction failed", message: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/funds/sync/status — last few sync runs (for admin visibility)
router.get("/funds/sync/status", async (_req, res) => {
  const logs = await db.select()
    .from(fundSyncLogTable)
    .orderBy(desc(fundSyncLogTable.startedAt))
    .limit(10);
  const tracked = await db.select({ id: fundsTable.id, nome: fundsTable.nome, cnpj: fundsTable.cnpj })
    .from(fundsTable)
    .where(and(isNotNull(fundsTable.cnpj), ne(fundsTable.cnpj, "")));
  res.json({
    trackedFunds: tracked.length,
    funds: tracked,
    recent: logs.map((l) => ({
      id: l.id,
      source: l.source,
      status: l.status,
      cnpjsUpdated: l.cnpjsUpdated,
      rowsUpserted: l.rowsUpserted,
      message: l.message,
      startedAt: l.startedAt.toISOString(),
      finishedAt: l.finishedAt ? l.finishedAt.toISOString() : null,
    })),
  });
});

export default router;
