import { Router } from "express";
import { db, fundsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateFundBody, UpdateFundBody, GetFundParams, UpdateFundParams, DeleteFundParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/catalog", requireRole("ativo"), async (_req, res) => {
  const funds = await db
    .select()
    .from(fundsTable)
    .orderBy(fundsTable.createdAt);

  res.json(funds.map(serializeFund));
});

// Catálogo de fundos é admin-only. Ativos veem fundos apenas via matches
// curados (rota /matches/*); fundos jamais veem a competição.
router.get("/", requireRole("admin"), async (req, res) => {
  const funds = await db.select().from(fundsTable).orderBy(fundsTable.createdAt);
  res.json(funds.map(serializeFund));
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateFundBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  const [fund] = await db.insert(fundsTable).values({
    nome: d.nome,
    tese: d.tese,
    ticketMin: String(d.ticketMin),
    ticketMax: String(d.ticketMax),
    segmentos: d.segmentos ?? [],
    regioes: d.regioes ?? [],
    nivelRisco: d.nivelRisco,
    roiMinimo: String(d.roiMinimo),
    descricao: d.descricao ?? null,
    estagio: d.estagio,
    cnpj: d.cnpj ?? null,
    ticker: d.ticker ?? null,
    relatorioPdfUrl: d.relatorioPdfUrl ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "fund_created",
    description: `Fundo "${fund.nome}" cadastrado`,
    entityId: fund.id,
    entityType: "fund",
  });

  res.status(201).json(serializeFund(fund));
});

router.get("/:id", requireRole("admin"), async (req, res) => {
  const parsed = GetFundParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [fund] = await db.select().from(fundsTable).where(eq(fundsTable.id, parsed.data.id));
  if (!fund) { res.status(404).json({ error: "Fund not found" }); return; }
  res.json(serializeFund(fund));
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const params = UpdateFundParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = UpdateFundBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Validation error", details: body.error.issues }); return; }
  const d = body.data;
  const updateData: Record<string, unknown> = {};
  if (d.nome !== undefined) updateData.nome = d.nome;
  if (d.tese !== undefined) updateData.tese = d.tese;
  if (d.ticketMin !== undefined) updateData.ticketMin = String(d.ticketMin);
  if (d.ticketMax !== undefined) updateData.ticketMax = String(d.ticketMax);
  if (d.segmentos !== undefined) updateData.segmentos = d.segmentos;
  if (d.regioes !== undefined) updateData.regioes = d.regioes;
  if (d.nivelRisco !== undefined) updateData.nivelRisco = d.nivelRisco;
  if (d.roiMinimo !== undefined) updateData.roiMinimo = String(d.roiMinimo);
  if (d.descricao !== undefined) updateData.descricao = d.descricao;
  if (d.estagio !== undefined) updateData.estagio = d.estagio;
  if (d.cnpj !== undefined) updateData.cnpj = d.cnpj;
  if (d.ticker !== undefined) updateData.ticker = d.ticker;
  if (d.relatorioPdfUrl !== undefined) updateData.relatorioPdfUrl = d.relatorioPdfUrl;
  if (Object.keys(updateData).length === 0) {
    const [existing] = await db.select().from(fundsTable).where(eq(fundsTable.id, params.data.id));
    if (!existing) { res.status(404).json({ error: "Fund not found" }); return; }
    res.json(serializeFund(existing));
    return;
  }
  const [fund] = await db.update(fundsTable).set(updateData).where(eq(fundsTable.id, params.data.id)).returning();
  if (!fund) { res.status(404).json({ error: "Fund not found" }); return; }
  res.json(serializeFund(fund));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const parsed = DeleteFundParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await db.delete(fundsTable).where(eq(fundsTable.id, parsed.data.id)).returning();
  if (!result.length) { res.status(404).json({ error: "Fund not found" }); return; }
  res.status(204).send();
});

function serializeFund(f: typeof fundsTable.$inferSelect) {
  return {
    id: f.id,
    nome: f.nome,
    tese: f.tese,
    ticketMin: Number(f.ticketMin),
    ticketMax: Number(f.ticketMax),
    segmentos: f.segmentos,
    regioes: f.regioes,
    nivelRisco: f.nivelRisco,
    roiMinimo: Number(f.roiMinimo),
    descricao: f.descricao ?? null,
    estagio: f.estagio,
    cnpj: f.cnpj ?? null,
    ticker: f.ticker ?? null,
    relatorioPdfUrl: f.relatorioPdfUrl ?? null,
    createdAt: f.createdAt.toISOString(),
  };
}

export { serializeFund };
export default router;
