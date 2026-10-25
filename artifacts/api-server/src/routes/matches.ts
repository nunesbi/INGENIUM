import { Router } from "express";
import { db, fundsTable, assetsTable, matchesTable, activityTable, fundQualitativeTable } from "@workspace/db";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { RunMatchingBody, GetMatchesForAssetParams, GetMatchesForFundParams, GetMatchParams } from "@workspace/api-zod";
import { generateText } from "@workspace/integrations-gemini-ai-server";
import { serializeFund } from "./funds";
import { serializeAsset } from "./assets";
import { calcLogicalScore } from "../lib/matching";
import type { MatchScore } from "../lib/matching";
import { requireAuth } from "../middlewares/requireAuth";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// LGPD: ativos (incorporadoras) NUNCA podem ler dados de fundos via /matches.
// O catálogo de fundos não é público para o ativo; somente admin cura e revela.
function denyAtivo(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const role = (req.user as { role?: string } | undefined)?.role;
  if (role === "ativo") {
    res.status(403).json({ error: "Acesso negado: catálogo de fundos não é público para incorporadoras." });
    return;
  }
  next();
}

function isAtivo(req: Request): boolean {
  if (!req.isAuthenticated()) return false;
  return (req.user as { role?: string } | undefined)?.role === "ativo";
}

// LGPD: para ativos exibimos só score + ordem; nada que identifique o fundo.
function anonymizeMatchForAtivo(serialized: ReturnType<typeof serializeMatch>, rank: number) {
  return {
    ...serialized,
    fundoId: 0,
    motivos: [],
    pontosFortes: [],
    pontosFracos: [],
    alertas: [],
    breakdown: null,
    explicacaoAI: null,
    fundo: {
      ...serialized.fundo,
      id: 0,
      nome: `Fundo Compatível #${rank}`,
      cnpj: null,
      ticker: null,
      tese: "Identidade preservada até curadoria Ingenium",
      segmentos: [],
      regioes: [],
      descricao: null,
      relatorioPdfUrl: null,
    },
  };
}

function requireAuthOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

router.get("/", denyAtivo, async (req, res) => {
  const matches = await db.query.matchesTable.findMany({
    orderBy: [desc(matchesTable.scoreFinal), asc(matchesTable.fundoId)],
    with: { fundo: true, ativo: true },
  });
  res.json(matches.map(serializeMatch));
});

router.post("/run", requireAuthOnly, async (req, res) => {
  const parsed = RunMatchingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }

  const { ativoId, generateAI } = parsed.data;

  const [ativo] = await db.select().from(assetsTable).where(eq(assetsTable.id, ativoId));
  if (!ativo) { res.status(404).json({ error: "Asset not found" }); return; }

  const funds = await db.select().from(fundsTable);

  // Pre-fetch all qualitatives by CNPJ in one query (n+1 avoidance).
  // funds.cnpj is stored formatted ("97.521.225/0001-25"); fund_qualitative.cnpj is digits-only.
  // Normalize both sides to digits for lookup.
  const digitsOnly = (s: string | null) => (s ?? "").replace(/\D/g, "");
  const cnpjsDigits = funds.map((f) => digitsOnly(f.cnpj)).filter((c) => c.length === 14);
  const qualRows = cnpjsDigits.length
    ? await db.select().from(fundQualitativeTable).where(inArray(fundQualitativeTable.cnpj, cnpjsDigits))
    : [];
  const qualByCnpj = new Map(qualRows.map((q) => [digitsOnly(q.cnpj), q]));

  const results = [];

  for (const fund of funds) {
    const qual = fund.cnpj ? qualByCnpj.get(digitsOnly(fund.cnpj)) ?? null : null;
    const result: MatchScore = calcLogicalScore(fund, ativo, qual);
    const { score, motivos, pontosFortes, pontosFracos, alertas, breakdown, usouQualitative } = result;
    const scoreFinal = score;

    let explicacaoAI: string | null = null;
    if (generateAI && score > 30) {
      try {
        explicacaoAI = await generateMatchExplanation(fund, ativo, score, motivos, qual, alertas);
      } catch (e) {
        // non-fatal
      }
    }

    const existing = await db.select().from(matchesTable)
      .where(eq(matchesTable.fundoId, fund.id))
      .then(rows => rows.find(r => Number(r.ativoId) === ativoId));

    const dbValues = {
      score: String(score),
      similaridade: "0",
      scoreFinal: String(scoreFinal),
      motivos,
      pontosFortes,
      pontosFracos,
      alertas,
      breakdown,
      usouQualitative: usouQualitative ? "sim" : "nao",
      explicacaoAI,
    };

    let match;
    if (existing) {
      [match] = await db.update(matchesTable).set(dbValues).where(eq(matchesTable.id, existing.id)).returning();
    } else {
      [match] = await db.insert(matchesTable).values({
        fundoId: fund.id,
        ativoId,
        ...dbValues,
      }).returning();
    }

    results.push({ ...match, fundo: fund, ativo });
  }

  const sorted = results.sort((a, b) => {
    const diff = Number(b.scoreFinal) - Number(a.scoreFinal);
    if (diff !== 0) return diff;
    return Number(a.fundoId) - Number(b.fundoId);
  });

  await db.insert(activityTable).values({
    type: "match_run",
    description: `Matching executado para "${ativo.nome}" — ${sorted.length} fundos analisados`,
    entityId: ativoId,
    entityType: "asset",
  });

  const topScore = sorted[0];
  if (topScore && Number(topScore.scoreFinal) >= 75) {
    await db.insert(activityTable).values({
      type: "high_score",
      description: `Alta compatibilidade detectada: ${ativo.nome} x ${topScore.fundo.nome} (${Math.round(Number(topScore.scoreFinal))}%)`,
      entityId: Number(topScore.id),
      entityType: "match",
    });
  }

  const serialized = sorted.map(serializeMatch);
  if (isAtivo(req)) {
    res.json(serialized.slice(0, 10));
    return;
  }
  res.json(serialized);
});

router.get("/asset/:assetId", requireAuthOnly, async (req, res) => {
  const parsed = GetMatchesForAssetParams.safeParse({ assetId: Number(req.params.assetId) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid assetId" }); return; }
  const matches = await db.query.matchesTable.findMany({
    where: eq(matchesTable.ativoId, parsed.data.assetId),
    orderBy: [desc(matchesTable.scoreFinal), asc(matchesTable.fundoId)],
    with: { fundo: true, ativo: true },
  });
  const serialized = matches.map(serializeMatch);
  if (isAtivo(req)) {
    res.json(serialized.slice(0, 10));
    return;
  }
  res.json(serialized);
});

router.get("/fund/:fundId", denyAtivo, async (req, res) => {
  const parsed = GetMatchesForFundParams.safeParse({ fundId: Number(req.params.fundId) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid fundId" }); return; }
  const matches = await db.query.matchesTable.findMany({
    where: eq(matchesTable.fundoId, parsed.data.fundId),
    orderBy: [desc(matchesTable.scoreFinal), asc(matchesTable.fundoId)],
    with: { fundo: true, ativo: true },
  });
  res.json(matches.map(serializeMatch));
});

router.get("/:id", requireAuthOnly, async (req, res) => {
  const parsed = GetMatchParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const match = await db.query.matchesTable.findFirst({
    where: eq(matchesTable.id, parsed.data.id),
    with: { fundo: true, ativo: true },
  });
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  res.json(serializeMatch(match));
});

// ─── Matching Engine (calcLogicalScore lives in ../lib/matching) ──────────────

type FundRow = typeof fundsTable.$inferSelect;
type AssetRow = typeof assetsTable.$inferSelect;

type QualRow = typeof fundQualitativeTable.$inferSelect;

async function generateMatchExplanation(
  fund: FundRow,
  ativo: AssetRow,
  score: number,
  motivos: string[],
  qual: QualRow | null,
  alertas: string[],
): Promise<string> {
  const qualBlock = qual
    ? `\nINTELIGÊNCIA DO FUNDO (extraída do Relatório Gerencial):
- Gestor: ${qual.gestor ?? '—'} | Administrador: ${qual.administrador ?? '—'}
- Patrimônio: ${qual.patrimonioLiquido ? `R$ ${Number(qual.patrimonioLiquido).toLocaleString('pt-BR')}` : '—'} | Cotistas: ${qual.numCotistas ?? '—'}
- Estratégia: ${qual.estrategia ?? '—'}
- Perfil de risco: ${qual.perfilRisco ?? '—'} | Foco: ${qual.focoRendaCrescimento ?? '—'} | ${qual.desenvolvimentoOuRenda ?? '—'}
- Equity/Dívida: ${qual.equityOuDivida ?? '—'} | Tipo de cotista: ${qual.tipoCotistaDesejado ?? '—'}
- Tags: ${(qual.tagsInferidas ?? []).join(', ') || '—'}
- Confiança da extração: ${qual.confidenceScore ?? '—'}`
    : '\n(Sem perfil qualitativo extraído — análise apenas sobre dados estruturados.)';

  const alertBlock = alertas.length > 0
    ? `\nALERTAS DE INCOMPATIBILIDADE DETECTADOS:\n${alertas.map((a) => `- ${a}`).join('\n')}`
    : '';

  const prompt = `Você é um analista institucional sênior de crédito imobiliário e matchmaking entre fundos e operações.

Analise a compatibilidade entre o FUNDO e a OPERAÇÃO abaixo e escreva uma análise profissional concisa (3-4 parágrafos) no tom de uma nota de underwriting institucional, em português, objetiva e técnica. Não invente dados. Se houver alertas, trate-os explicitamente.

FUNDO:
- Nome: ${fund.nome}
- Tese declarada: ${fund.tese}
- Ticket: R$ ${Number(fund.ticketMin).toLocaleString('pt-BR')} - R$ ${Number(fund.ticketMax).toLocaleString('pt-BR')}
- Segmentos: ${(fund.segmentos as string[]).join(', ')}
- Regiões: ${(fund.regioes as string[]).join(', ')}
- Risco declarado: ${fund.nivelRisco} | ROI mínimo: ${fund.roiMinimo}%
- Estágio preferido: ${fund.estagio}${qualBlock}

OPERAÇÃO/ATIVO:
- Nome: ${ativo.nome}
- Tipo: ${ativo.tipoAtivo}
- Captação: R$ ${Number(ativo.valorCaptacao).toLocaleString('pt-BR')} | ROI previsto: ${ativo.roiPrevisto}%
- Região: ${ativo.regiao} | Estágio: ${ativo.estagio}
- Garantias: ${ativo.garantias ?? '—'} | Prazo: ${ativo.prazo ? `${ativo.prazo} meses` : '—'}
- Descrição: ${ativo.descricao ?? '—'}

SCORE: ${score}/100${alertBlock}
PONTOS DA ANÁLISE LÓGICA: ${motivos.join('; ')}

Escreva como um analista institucional escreveria para um comitê de investimento. Comece com a recomendação implícita (forte aderência / aderência condicional / baixa aderência), depois pontos de alinhamento, depois pontos de atrito ou alertas, e fechar com a probabilidade qualitativa de aprovação.`;

  const response = await generateText({ maxOutputTokens: 512, prompt: prompt });

  return response;
}

type MatchWithRelations = typeof matchesTable.$inferSelect & {
  fundo: typeof fundsTable.$inferSelect;
  ativo: typeof assetsTable.$inferSelect;
};

function serializeMatch(m: MatchWithRelations) {
  return {
    id: m.id,
    fundoId: m.fundoId,
    ativoId: Number(m.ativoId),
    score: Number(m.score),
    similaridade: Number(m.similaridade),
    scoreFinal: Number(m.scoreFinal),
    motivos: m.motivos as string[],
    pontosFortes: (m.pontosFortes as string[]) ?? [],
    pontosFracos: (m.pontosFracos as string[]) ?? [],
    alertas: (m.alertas as string[]) ?? [],
    breakdown: (m.breakdown as Record<string, { score: number; max: number; nota: string }> | null) ?? null,
    usouQualitative: m.usouQualitative === "sim",
    explicacaoAI: m.explicacaoAI ?? null,
    fundo: serializeFund(m.fundo),
    ativo: serializeAsset(m.ativo),
    createdAt: m.createdAt.toISOString(),
  };
}

export default router;
