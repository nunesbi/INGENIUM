import { Router } from "express";
import { db, fundsTable, assetsTable, matchesTable, activityTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  const [fundCount] = await db.select({ count: sql<number>`count(*)::int` }).from(fundsTable);
  const [assetCount] = await db.select({ count: sql<number>`count(*)::int` }).from(assetsTable);
  const [matchCount] = await db.select({ count: sql<number>`count(*)::int` }).from(matchesTable);
  const [avgResult] = await db.select({ avg: sql<number>`coalesce(avg(score_final::numeric), 0)` }).from(matchesTable);
  const [highCount] = await db.select({ count: sql<number>`count(*)::int` }).from(matchesTable)
    .where(sql`score_final::numeric >= 75`);
  const [captacaoResult] = await db.select({ total: sql<number>`coalesce(sum(valor_captacao::numeric), 0)` }).from(assetsTable);

  res.json({
    totalFunds: fundCount?.count ?? 0,
    totalAssets: assetCount?.count ?? 0,
    totalMatches: matchCount?.count ?? 0,
    avgScore: Math.round((avgResult?.avg ?? 0) * 10) / 10,
    highCompatibilityCount: highCount?.count ?? 0,
    captacaoTotal: Number(captacaoResult?.total ?? 0),
  });
});

router.get("/top-matches", async (req, res) => {
  const matches = await db.query.matchesTable.findMany({
    orderBy: [desc(matchesTable.scoreFinal)],
    limit: 10,
    with: { fundo: true, ativo: true },
  });

  res.json(matches.map(serializeMatch));
});

router.get("/recent-activity", async (req, res) => {
  const activities = await db.select().from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  res.json(activities.map(a => ({
    id: a.id,
    type: a.type,
    description: a.description,
    entityId: a.entityId ?? null,
    entityType: a.entityType ?? null,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.get("/score-distribution", async (req, res) => {
  const buckets = [
    { range: "0-25",   min: 0,   max: 25  },
    { range: "26-50",  min: 26,  max: 50  },
    { range: "51-75",  min: 51,  max: 75  },
    { range: "76-100", min: 76,  max: 100 },
  ];

  const results = await Promise.all(
    buckets.map(async b => {
      const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(matchesTable)
        .where(sql`score_final::numeric >= ${b.min} AND score_final::numeric <= ${b.max}`);
      return { range: b.range, count: row?.count ?? 0 };
    })
  );

  res.json(results);
});

function serializeMatch(m: any) {
  return {
    id: m.id,
    fundoId: m.fundoId,
    ativoId: Number(m.ativoId),
    score: Number(m.score),
    similaridade: Number(m.similaridade),
    scoreFinal: Number(m.scoreFinal),
    motivos: m.motivos as string[],
    explicacaoAI: m.explicacaoAI ?? null,
    fundo: {
      id: m.fundo.id,
      nome: m.fundo.nome,
      tese: m.fundo.tese,
      ticketMin: Number(m.fundo.ticketMin),
      ticketMax: Number(m.fundo.ticketMax),
      segmentos: m.fundo.segmentos,
      regioes: m.fundo.regioes,
      nivelRisco: m.fundo.nivelRisco,
      roiMinimo: Number(m.fundo.roiMinimo),
      descricao: m.fundo.descricao ?? null,
      estagio: m.fundo.estagio,
      createdAt: m.fundo.createdAt.toISOString(),
    },
    ativo: {
      id: m.ativo.id,
      nome: m.ativo.nome,
      tipoAtivo: m.ativo.tipoAtivo,
      valorCaptacao: Number(m.ativo.valorCaptacao),
      roiPrevisto: Number(m.ativo.roiPrevisto),
      regiao: m.ativo.regiao,
      estagio: m.ativo.estagio,
      descricao: m.ativo.descricao ?? null,
      garantias: m.ativo.garantias ?? null,
      prazo: m.ativo.prazo ?? null,
      createdAt: m.ativo.createdAt.toISOString(),
    },
    createdAt: m.createdAt.toISOString(),
  };
}

export default router;
