import { Router } from "express";
import { db, assetsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAssetBody, UpdateAssetBody, GetAssetParams, UpdateAssetParams, DeleteAssetParams } from "@workspace/api-zod";
import { computeUnderwriting } from "../lib/underwriting.js";
import { generateText } from "@workspace/integrations-gemini-ai-server";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────
const numOrNull = (v: number | undefined | null): string | null =>
  v === undefined || v === null ? null : String(v);
const passOrNull = <T>(v: T | undefined): T | null =>
  v === undefined ? null : v;

router.get("/", async (_req, res) => {
  const assets = await db.select().from(assetsTable).orderBy(assetsTable.createdAt);
  res.json(assets.map(serializeAsset));
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  const [asset] = await db.insert(assetsTable).values({
    nome: d.nome,
    tipoAtivo: d.tipoAtivo,
    valorCaptacao: String(d.valorCaptacao),
    roiPrevisto: String(d.roiPrevisto),
    regiao: d.regiao,
    estagio: d.estagio,
    descricao: d.descricao ?? null,
    garantias: d.garantias ?? null,
    prazo: d.prazo ?? null,
    // structured SPE fields (all optional)
    cnpjSpe: d.cnpjSpe ?? null,
    incorporadora: d.incorporadora ?? null,
    vgv: numOrNull(d.vgv),
    percentualVendido: numOrNull(d.percentualVendido),
    equityAportado: numOrNull(d.equityAportado),
    patrimonioAfetacao: passOrNull(d.patrimonioAfetacao),
    statusTerreno: d.statusTerreno ?? null,
    statusLicenciamento: d.statusLicenciamento ?? null,
    numUnidades: d.numUnidades ?? null,
    passivosTotais: numOrNull(d.passivosTotais),
    recebiveisTotais: numOrNull(d.recebiveisTotais),
    caixaAtual: numOrNull(d.caixaAtual),
    cronogramaMeses: d.cronogramaMeses ?? null,
    mesesDecorridos: d.mesesDecorridos ?? null,
    tipoFunding: d.tipoFunding ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "asset_created",
    description: `Ativo "${asset.nome}" cadastrado`,
    entityId: asset.id,
    entityType: "asset",
  });

  res.status(201).json(serializeAsset(asset));
});

router.get("/:id", async (req, res) => {
  const parsed = GetAssetParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, parsed.data.id));
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(serializeAsset(asset));
});

router.get("/:id/underwriting", async (req, res) => {
  const parsed = GetAssetParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, parsed.data.id));
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(computeUnderwriting(asset));
});

router.post("/:id/copilot-suggestions", requireAuth, async (req, res) => {
  const parsed = GetAssetParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, parsed.data.id));
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }

  const uw = computeUnderwriting(asset);

  const prompt = `Você é o Copilot Ingenium — parceiro consultivo de uma pequena/média incorporadora brasileira.
Fala em PT-BR direto, próximo, sem jargão financeiro vazio. Tom de sócio experiente, não de banco.

OPERAÇÃO ATUAL:
- Nome: ${asset.nome}
- Tipo: ${asset.tipoAtivo} (${asset.estagio})
- Região: ${asset.regiao}
- Incorporadora: ${asset.incorporadora ?? "não informada"}
- VGV: ${asset.vgv ? "R$ " + Number(asset.vgv).toLocaleString("pt-BR") : "não informado"}
- Captação alvo: R$ ${Number(asset.valorCaptacao).toLocaleString("pt-BR")}
- % vendido: ${asset.percentualVendido ?? "n/i"}
- Equity aportado: ${asset.equityAportado ? "R$ " + Number(asset.equityAportado).toLocaleString("pt-BR") : "n/i"}
- Patrimônio de afetação: ${asset.patrimonioAfetacao === true ? "sim" : asset.patrimonioAfetacao === false ? "não" : "n/i"}
- Status terreno: ${asset.statusTerreno ?? "n/i"}
- Status licenciamento: ${asset.statusLicenciamento ?? "n/i"}
- Unidades: ${asset.numUnidades ?? "n/i"}
- Cronograma: ${asset.mesesDecorridos ?? "?"}/${asset.cronogramaMeses ?? "?"} meses

DIAGNÓSTICO ATUAL:
- Readiness: ${uw.readinessScore}/100
- Compliance: ${uw.complianceScore}/100
- Recomendação: ${uw.recomendacao}
- Pendências: ${uw.pendencias.map(p => `(${p.severidade}) ${p.descricao}`).join("; ") || "nenhuma"}
- Sinais de risco: ${uw.riskFlags.join("; ") || "nenhum"}

Gere de 3 a 5 sugestões PRÁTICAS e ACIONÁVEIS pra tornar essa operação investível. Cada sugestão deve ser algo que o empreendedor pode fazer essa semana ou esse mês, não conselho genérico.

Responda APENAS em JSON válido (sem markdown, sem texto fora do JSON), neste formato exato:
{
  "resumo": "1 frase honesta sobre o estado da operação",
  "sugestoes": [
    {
      "titulo": "frase curta acionável (max 80 caracteres)",
      "porQue": "1-2 frases explicando o impacto pro fundo",
      "categoria": "<escolha exatamente um destes valores: estrutura, comercial, documental, financeiro>",
      "impacto": "<escolha exatamente um destes valores: alto, medio, baixo>"
    }
  ]
}

Regras rígidas:
- "categoria" deve ser EXATAMENTE: estrutura | comercial | documental | financeiro
- "impacto" deve ser EXATAMENTE: alto | medio | baixo
- Use "medio" (sem acento), não "médio"
- Mínimo 3, máximo 5 sugestões`;

  const ALLOWED_CAT = new Set(["estrutura", "comercial", "documental", "financeiro"]);
  const ALLOWED_IMP = new Set(["alto", "medio", "baixo"]);

  try {
    const resp = await generateText({ maxOutputTokens: 900, responseMimeType: "application/json", systemInstruction: "Você é o Copilot Ingenium. Sempre responda em JSON estrito conforme o schema solicitado, sem texto adicional.", prompt: prompt });
    const raw = resp.trim() || "{}";
    const parsedJson = JSON.parse(raw) as { resumo?: unknown; sugestoes?: unknown[] };
    const resumo = typeof parsedJson.resumo === "string" ? parsedJson.resumo : "Operação em estruturação.";
    const rawSugs = Array.isArray(parsedJson.sugestoes) ? parsedJson.sugestoes : [];
    const sugestoes = rawSugs
      .map((s) => {
        const o = s as Record<string, unknown>;
        const titulo = typeof o?.titulo === "string" ? o.titulo : null;
        const porQue = typeof o?.porQue === "string" ? o.porQue : null;
        const categoria = typeof o?.categoria === "string" && ALLOWED_CAT.has(o.categoria) ? o.categoria : "estrutura";
        const impacto = typeof o?.impacto === "string" && ALLOWED_IMP.has(o.impacto) ? o.impacto : "medio";
        if (!titulo || !porQue) return null;
        return { titulo, porQue, categoria, impacto };
      })
      .filter((x): x is { titulo: string; porQue: string; categoria: string; impacto: string } => x !== null)
      .slice(0, 5);
    res.json({ resumo, sugestoes });
  } catch (e) {
    req.log.error({ err: e }, "copilot-suggestions failed");
    res.status(500).json({ error: "Falha ao gerar sugestões" });
  }
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const params = UpdateAssetParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = UpdateAssetBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Validation error", details: body.error.issues }); return; }
  const d = body.data;
  const updateData: Record<string, unknown> = {};
  if (d.nome !== undefined) updateData.nome = d.nome;
  if (d.tipoAtivo !== undefined) updateData.tipoAtivo = d.tipoAtivo;
  if (d.valorCaptacao !== undefined) updateData.valorCaptacao = String(d.valorCaptacao);
  if (d.roiPrevisto !== undefined) updateData.roiPrevisto = String(d.roiPrevisto);
  if (d.regiao !== undefined) updateData.regiao = d.regiao;
  if (d.estagio !== undefined) updateData.estagio = d.estagio;
  if (d.descricao !== undefined) updateData.descricao = d.descricao;
  if (d.garantias !== undefined) updateData.garantias = d.garantias;
  if (d.prazo !== undefined) updateData.prazo = d.prazo;
  // structured fields
  if (d.cnpjSpe !== undefined) updateData.cnpjSpe = d.cnpjSpe;
  if (d.incorporadora !== undefined) updateData.incorporadora = d.incorporadora;
  if (d.vgv !== undefined) updateData.vgv = String(d.vgv);
  if (d.percentualVendido !== undefined) updateData.percentualVendido = String(d.percentualVendido);
  if (d.equityAportado !== undefined) updateData.equityAportado = String(d.equityAportado);
  if (d.patrimonioAfetacao !== undefined) updateData.patrimonioAfetacao = d.patrimonioAfetacao;
  if (d.statusTerreno !== undefined) updateData.statusTerreno = d.statusTerreno;
  if (d.statusLicenciamento !== undefined) updateData.statusLicenciamento = d.statusLicenciamento;
  if (d.numUnidades !== undefined) updateData.numUnidades = d.numUnidades;
  if (d.passivosTotais !== undefined) updateData.passivosTotais = String(d.passivosTotais);
  if (d.recebiveisTotais !== undefined) updateData.recebiveisTotais = String(d.recebiveisTotais);
  if (d.caixaAtual !== undefined) updateData.caixaAtual = String(d.caixaAtual);
  if (d.cronogramaMeses !== undefined) updateData.cronogramaMeses = d.cronogramaMeses;
  if (d.mesesDecorridos !== undefined) updateData.mesesDecorridos = d.mesesDecorridos;
  if (d.tipoFunding !== undefined) updateData.tipoFunding = d.tipoFunding;
  const [asset] = await db.update(assetsTable).set(updateData).where(eq(assetsTable.id, params.data.id)).returning();
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(serializeAsset(asset));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const parsed = DeleteAssetParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await db.delete(assetsTable).where(eq(assetsTable.id, parsed.data.id)).returning();
  if (!result.length) { res.status(404).json({ error: "Asset not found" }); return; }
  res.status(204).send();
});

function serializeAsset(a: typeof assetsTable.$inferSelect) {
  const num = (v: string | null) => (v === null ? null : Number(v));
  return {
    id: a.id,
    nome: a.nome,
    tipoAtivo: a.tipoAtivo,
    valorCaptacao: Number(a.valorCaptacao),
    roiPrevisto: Number(a.roiPrevisto),
    regiao: a.regiao,
    estagio: a.estagio,
    descricao: a.descricao ?? null,
    garantias: a.garantias ?? null,
    prazo: a.prazo ?? null,
    cnpjSpe: a.cnpjSpe ?? null,
    incorporadora: a.incorporadora ?? null,
    vgv: num(a.vgv),
    percentualVendido: num(a.percentualVendido),
    equityAportado: num(a.equityAportado),
    patrimonioAfetacao: a.patrimonioAfetacao ?? null,
    statusTerreno: a.statusTerreno ?? null,
    statusLicenciamento: a.statusLicenciamento ?? null,
    numUnidades: a.numUnidades ?? null,
    passivosTotais: num(a.passivosTotais),
    recebiveisTotais: num(a.recebiveisTotais),
    caixaAtual: num(a.caixaAtual),
    cronogramaMeses: a.cronogramaMeses ?? null,
    mesesDecorridos: a.mesesDecorridos ?? null,
    tipoFunding: a.tipoFunding ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export { serializeAsset };
export default router;
