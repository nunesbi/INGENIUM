import { Router } from "express";
import { db, fundsTable, assetsTable, matchesTable } from "@workspace/db";
import { documentsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateText } from "@workspace/integrations-gemini-ai-server";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { calcLogicalScore } from "../lib/matching";
import { requireAuth } from "../middlewares/requireAuth";
import { PDFParse } from "pdf-parse";

const router = Router();
const objectStorageService = new ObjectStorageService();

type FundRow = typeof fundsTable.$inferSelect;
type AssetRow = typeof assetsTable.$inferSelect;

// ─── Extract text from file buffer ───────────────────────────────────────

async function extractTextFromBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  const type = fileType.toLowerCase();
  const name = (fileName || "").toLowerCase();

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text ?? "").slice(0, 15000);
    } catch {
      return "(não foi possível extrair texto do PDF)";
    } finally {
      try { await parser.destroy(); } catch { /* ignore */ }
    }
  }

  if (type.includes("text") || name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".md")) {
    return buffer.toString("utf8").slice(0, 15000);
  }

  return "(tipo de arquivo não suportado para extração de texto; descreva o conteúdo em texto)";
}

// ─── AI extraction prompt ─────────────────────────────────────────────────

const SYSTEM_CONTEXT = `Você é o Copilot Ingenium — parceiro consultivo de pequenas e médias incorporadoras brasileiras.

Sua missão: ajudar o empreendedor a estruturar a operação dele de um jeito que fundo institucional aceite. Você fala como um sócio experiente — direto, sem jargão financeiro pesado, sem firula corporativa. Português Brasil, próximo, gentil. Trate a pessoa como dona do projeto, não como cliente de banco.

ESCOPO RÍGIDO — você SÓ responde sobre:
- Fundos imobiliários (FIIs), gestoras, investidores institucionais, tese de investimento, ticket, DY, segmento
- Incorporadoras, SPE, patrimônio de afetação, VGV, cronograma de obra, licenciamento, terreno, recebíveis
- Captação, governança, due diligence, underwriting, compliance, documentação institucional
- Real estate brasileiro (residencial, logística, lajes corporativas, shoppings, hotéis, multipropriedade, loteamento)
- Uso da plataforma Ingenium (matchmaking, cadastro de operação, documentos, status de match)

Se o usuário perguntar QUALQUER COISA fora desse escopo (receita de comida, programação, política, esportes, conselhos pessoais, piadas, outras áreas de negócio que não sejam real estate, etc.), você DEVE recusar de forma curta e gentil e redirecionar para o tema da plataforma. Exemplo: "Esse assunto foge do meu escopo — sou focado em estruturar operações imobiliárias e conectar com fundos. Quer que a gente avance no seu projeto? Me conta em que estágio ele está." Nesse caso, responda com intent "query" e NÃO invente extractedData.

Você pode:
1. Ler documentos (memorial, viabilidade, planilha de SPE, relatório gerencial de FII) e transformar o que está espalhado em dados estruturados que dá pra apresentar pra fundo
2. Responder dúvidas sobre captação, governança, SPE, patrimônio de afetação, recebíveis — sempre traduzindo termo técnico em linguagem prática
3. Apontar o que está faltando pra operação ficar "investível" e sugerir o próximo passo concreto

IMPORTANTE: Responda SEMPRE em JSON válido com este formato exato:
{
  "intent": "create_asset" | "create_fund" | "query" | "greeting",
  "reply": "Sua resposta em linguagem natural (markdown permitido)",
  "extractedData": { ... } // apenas quando intent é create_asset ou create_fund
}

Para "create_asset", extractedData deve ter:
{
  "nome": string (nome do empreendimento),
  "tipoAtivo": string (ex: "Laje Corporativa", "Galpão Logístico", "Residencial", "Hotel", "Shopping"),
  "valorCaptacao": number (valor em R$ que busca captar),
  "roiPrevisto": number (retorno anual previsto em %, ex: 12),
  "regiao": string (ex: "São Paulo", "Rio de Janeiro", "Sul", "Nordeste"),
  "estagio": string (ex: "Greenfield", "Em construção", "Pronto", "Operacional"),
  "descricao": string (resumo do ativo),
  "garantias": string (garantias oferecidas, se houver),
  "prazo": number (prazo em meses, se houver)
}

Para "create_fund", extractedData deve ter:
{
  "nome": string (nome do fundo),
  "tese": string (tese de investimento),
  "ticketMin": number (ticket mínimo em R$),
  "ticketMax": number (ticket máximo em R$),
  "segmentos": string[] (ex: ["Laje Corporativa", "Logística"]),
  "regioes": string[] (ex: ["São Paulo", "Rio de Janeiro"]),
  "nivelRisco": string ("baixo" | "medio" | "alto"),
  "roiMinimo": number (ROI mínimo exigido em %),
  "estagio": string (estágio preferido),
  "descricao": string (descrição do fundo)
}

Se o documento contém um ativo/empreendimento buscando capital → use "create_asset".
Se o documento descreve um fundo/investidor buscando ativos → use "create_fund".
Se é apenas uma pergunta → use "query".
Se é uma saudação → use "greeting".

Valores monetários: converta para número simples (ex: "R$ 5 milhões" → 5000000).
Se algum campo não puder ser determinado, use valores razoáveis e informe no reply.`;

// ─── Run matching for newly created asset ─────────────────────────────────

type TopMatchAsset = { score: number; fundName: string; motivos: string[]; pontosFortes: string[]; pontosFracos: string[]; matchId: number };
type TopMatchFund = { score: number; assetName: string; motivos: string[]; pontosFortes: string[]; pontosFracos: string[]; matchId: number };

async function runMatchingForAsset(ativo: AssetRow): Promise<TopMatchAsset[]> {
  const funds = await db.select().from(fundsTable);
  const results: TopMatchAsset[] = [];

  for (const fund of funds) {
    const { score, motivos, pontosFortes, pontosFracos } = calcLogicalScore(fund, ativo);
    const [match] = await db.insert(matchesTable).values({
      fundoId: fund.id,
      ativoId: ativo.id,
      score: String(score),
      similaridade: "0",
      scoreFinal: String(score),
      motivos,
      pontosFortes,
      pontosFracos,
      explicacaoAI: null,
    }).onConflictDoNothing().returning();

    results.push({ score, fundName: fund.nome, motivos, pontosFortes, pontosFracos, matchId: match?.id ?? 0 });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

async function runMatchingForFund(fund: FundRow): Promise<TopMatchFund[]> {
  const assets = await db.select().from(assetsTable);
  const results: TopMatchFund[] = [];

  for (const ativo of assets) {
    const { score, motivos, pontosFortes, pontosFracos } = calcLogicalScore(fund, ativo);
    const [match] = await db.insert(matchesTable).values({
      fundoId: fund.id,
      ativoId: ativo.id,
      score: String(score),
      similaridade: "0",
      scoreFinal: String(score),
      motivos,
      pontosFortes,
      pontosFracos,
      explicacaoAI: null,
    }).onConflictDoNothing().returning();

    results.push({ score, assetName: ativo.nome, motivos, pontosFortes, pontosFracos, matchId: match?.id ?? 0 });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ─── POST /assistant/chat ────────────────────────────────────────────────

router.post("/assistant/chat", requireAuth, async (req, res) => {
  const { message, fileObjectPath, fileName, fileType, history } = req.body as {
    message?: string;
    fileObjectPath?: string;
    fileName?: string;
    fileType?: string;
    history?: Array<{ role: string; content: string }>;
  };

  if (!message && !fileObjectPath) {
    res.status(400).json({ error: "message or fileObjectPath required" });
    return;
  }

  let fileText = "";
  let fileLabel = "";

  if (fileObjectPath) {
    try {
      // LGPD: caller must be the document's owner OR an admin.
      const sessionUser = req.user as { email?: string; role?: string } | undefined;
      const email = (sessionUser?.email ?? "").trim().toLowerCase();
      const [doc] = await db
        .select({ ownerEmail: documentsTable.ownerEmail })
        .from(documentsTable)
        .where(eq(documentsTable.objectPath, fileObjectPath));
      if (!doc) {
        res.status(404).json({ error: "Arquivo não registrado." });
        return;
      }
      if (sessionUser?.role !== "admin" && doc.ownerEmail !== email) {
        res.status(403).json({ error: "Acesso negado a este arquivo." });
        return;
      }
      const file = await objectStorageService.getObjectEntityFile(fileObjectPath);
      const [buffer] = await file.download();
      fileText = await extractTextFromBuffer(Buffer.from(buffer), fileType || "", fileName || "");
      fileLabel = fileName ? `\n\n[Arquivo enviado: ${fileName}]\n${fileText}` : `\n\n[Arquivo enviado]\n${fileText}`;
    } catch (err) {
      if (!(err instanceof ObjectNotFoundError)) {
        req.log.error({ err }, "Error downloading file for assistant");
      }
      fileLabel = fileName ? `\n\n[Arquivo: ${fileName} — não foi possível ler o conteúdo]` : "";
    }
  }

  const userContent = `${message || ""}${fileLabel}`;

  const historyMessages = (history || []).slice(-8).map(h => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  const prompt = `${SYSTEM_CONTEXT}

${historyMessages.length > 0 ? `HISTÓRICO DA CONVERSA:\n${historyMessages.map(h => `${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content}`).join("\n")}\n\n` : ""}MENSAGEM ATUAL DO USUÁRIO:
${userContent}

Responda com JSON válido conforme o formato especificado acima.`;

  let aiJson: { intent: string; reply: string; extractedData?: Record<string, unknown> };

  try {
    const response = await generateText({ maxOutputTokens: 1200, prompt: prompt });

    const raw = response;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    aiJson = JSON.parse(jsonMatch[0]);
  } catch (err) {
    req.log.error({ err }, "AI call failed");
    res.json({ reply: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente." });
    return;
  }

  const { intent, reply, extractedData } = aiJson;

  // ─── Execute action if AI wants to create something ──────────────────
  if ((intent === "create_asset" || intent === "create_fund") && extractedData) {
    try {
      if (intent === "create_asset") {
        const [ativo] = await db.insert(assetsTable).values({
          nome: String(extractedData.nome || "Ativo sem nome"),
          tipoAtivo: String(extractedData.tipoAtivo || "Imóvel"),
          valorCaptacao: String(Number(extractedData.valorCaptacao) || 1000000),
          roiPrevisto: String(Number(extractedData.roiPrevisto) || 10),
          regiao: String(extractedData.regiao || "São Paulo"),
          estagio: String(extractedData.estagio || "Operacional"),
          descricao: extractedData.descricao ? String(extractedData.descricao) : null,
          garantias: extractedData.garantias ? String(extractedData.garantias) : null,
          prazo: extractedData.prazo ? Number(extractedData.prazo) : null,
        }).returning();

        const topMatches = await runMatchingForAsset(ativo);

        res.json({
          reply,
          action: {
            type: "create_asset",
            record: { id: ativo.id, nome: ativo.nome, type: ativo.tipoAtivo },
            topMatches: topMatches.map(m => ({
              id: m.matchId,
              score: m.score,
              fundName: m.fundName,
              assetName: ativo.nome,
              motivos: m.motivos,
              pontosFortes: m.pontosFortes,
              pontosFracos: m.pontosFracos,
            })),
          },
        });
        return;
      }

      if (intent === "create_fund") {
        const segmentos = Array.isArray(extractedData.segmentos) ? extractedData.segmentos.map(String) : ["Imobiliário"];
        const regioes = Array.isArray(extractedData.regioes) ? extractedData.regioes.map(String) : ["Nacional"];
        const [fund] = await db.insert(fundsTable).values({
          nome: String(extractedData.nome || "Fundo sem nome"),
          tese: String(extractedData.tese || "Investimento imobiliário"),
          ticketMin: String(Number(extractedData.ticketMin) || 1000000),
          ticketMax: String(Number(extractedData.ticketMax) || 50000000),
          segmentos,
          regioes,
          nivelRisco: String(extractedData.nivelRisco || "medio"),
          roiMinimo: String(Number(extractedData.roiMinimo) || 10),
          estagio: String(extractedData.estagio || "qualquer"),
          descricao: extractedData.descricao ? String(extractedData.descricao) : null,
        }).returning();

        const topMatches = await runMatchingForFund(fund);

        res.json({
          reply,
          action: {
            type: "create_fund",
            record: { id: fund.id, nome: fund.nome, type: "Fundo" },
            topMatches: topMatches.map(m => ({
              id: m.matchId,
              score: m.score,
              fundName: fund.nome,
              assetName: m.assetName,
              motivos: m.motivos,
              pontosFortes: m.pontosFortes,
              pontosFracos: m.pontosFracos,
            })),
          },
        });
        return;
      }
    } catch (err) {
      req.log.error({ err }, "Failed to create record from assistant");
      res.json({ reply: reply + "\n\n⚠️ Ocorreu um erro ao salvar o cadastro. Por favor tente novamente." });
      return;
    }
  }

  res.json({ reply });
});

export default router;
