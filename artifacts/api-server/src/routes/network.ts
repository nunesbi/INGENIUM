import { Router, type Request, type Response, type NextFunction } from "express";
import { db, incorporadorasTable, empreendedoresTable, assetsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

// Auth guard — base de rede é proprietária da Ingenium (PII de empreendedores).
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Autenticação requerida" });
    return;
  }
  next();
});

router.get("/summary", async (_req, res) => {
  const [incorpCount] = await db.select({ count: sql<number>`count(*)::int` }).from(incorporadorasTable);
  const [empCount] = await db.select({ count: sql<number>`count(*)::int` }).from(empreendedoresTable);
  const [opsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(assetsTable);
  const [vgvTotal] = await db.select({
    total: sql<number>`coalesce(sum(vgv_historico::numeric), 0)`,
  }).from(incorporadorasTable);

  const porEstado = await db.select({
    estado: incorporadorasTable.estado,
    total: sql<number>`count(*)::int`,
  }).from(incorporadorasTable)
    .groupBy(incorporadorasTable.estado)
    .orderBy(desc(sql`count(*)`));

  const porSegmento = await db.select({
    segmento: incorporadorasTable.segmentoFoco,
    total: sql<number>`count(*)::int`,
  }).from(incorporadorasTable)
    .groupBy(incorporadorasTable.segmentoFoco)
    .orderBy(desc(sql`count(*)`));

  res.json({
    totalIncorporadoras: incorpCount?.count ?? 0,
    totalEmpreendedores: empCount?.count ?? 0,
    totalOperacoes: opsCount?.count ?? 0,
    vgvHistoricoTotal: Number(vgvTotal?.total ?? 0),
    porEstado: porEstado.map((r) => ({ estado: r.estado, total: r.total })),
    porSegmento: porSegmento.map((r) => ({ segmento: r.segmento, total: r.total })),
  });
});

router.get("/incorporadoras", async (_req, res) => {
  const rows = await db.select().from(incorporadorasTable).orderBy(desc(incorporadorasTable.opsAtivas));
  res.json(rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    cidade: r.cidade,
    estado: r.estado,
    segmentoFoco: r.segmentoFoco,
    anosAtuacao: r.anosAtuacao,
    opsAtivas: r.opsAtivas,
    opsEntregues: r.opsEntregues,
    vgvHistorico: r.vgvHistorico ? Number(r.vgvHistorico) : null,
    status: r.status,
  })));
});

router.get("/empreendedores", async (_req, res) => {
  const rows = await db.select().from(empreendedoresTable).orderBy(desc(empreendedoresTable.opsEntregues));
  res.json(rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    cargo: r.cargo,
    cidade: r.cidade,
    estado: r.estado,
    incorporadoraNome: r.incorporadoraNome,
    anosExperiencia: r.anosExperiencia,
    opsEntregues: r.opsEntregues,
    vgvAcumulado: r.vgvAcumulado ? Number(r.vgvAcumulado) : null,
    foco: r.foco,
    status: r.status,
  })));
});

export default router;
