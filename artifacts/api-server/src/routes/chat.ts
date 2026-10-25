import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { chatRoomsTable, chatMessagesTable } from "@workspace/db/schema";
import { fundsTable, assetsTable, matchesTable } from "@workspace/db/schema";
import { generateText } from "@workspace/integrations-gemini-ai-server";
import { requireAuth } from "../middlewares/requireAuth";
const router: IRouter = Router();

function parseRoomInput(
  body: unknown,
): {
  title: string;
  matchId?: number;
  fundoId?: number;
  ativoId?: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b["title"] !== "string" || !b["title"].trim()) return null;
  return {
    title: b["title"] as string,
    matchId:
      typeof b["matchId"] === "number" ? (b["matchId"] as number) : undefined,
    fundoId:
      typeof b["fundoId"] === "number" ? (b["fundoId"] as number) : undefined,
    ativoId:
      typeof b["ativoId"] === "number" ? (b["ativoId"] as number) : undefined,
  };
}

function parseMsgInput(
  body: unknown,
): {
  sender: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b["sender"] !== "string" || !b["sender"].trim()) return null;
  return {
    sender: b["sender"] as string,
    content:
      typeof b["content"] === "string" ? (b["content"] as string) : undefined,
    fileUrl:
      typeof b["fileUrl"] === "string" ? (b["fileUrl"] as string) : undefined,
    fileName:
      typeof b["fileName"] === "string" ? (b["fileName"] as string) : undefined,
    fileSize:
      typeof b["fileSize"] === "number" ? (b["fileSize"] as number) : undefined,
    fileType:
      typeof b["fileType"] === "string" ? (b["fileType"] as string) : undefined,
  };
}

function serializeMessage(msg: typeof chatMessagesTable.$inferSelect) {
  return {
    id: msg.id,
    roomId: msg.roomId,
    sender: msg.sender,
    content: msg.content ?? null,
    fileUrl: msg.fileUrl ?? null,
    fileName: msg.fileName ?? null,
    fileSize: msg.fileSize ?? null,
    fileType: msg.fileType ?? null,
    createdAt: msg.createdAt.toISOString(),
  };
}

// GET /chat/rooms
router.get("/rooms", async (_req: Request, res: Response) => {
  const rooms = await db
    .select({
      id: chatRoomsTable.id,
      title: chatRoomsTable.title,
      matchId: chatRoomsTable.matchId,
      fundoId: chatRoomsTable.fundoId,
      ativoId: chatRoomsTable.ativoId,
      createdAt: chatRoomsTable.createdAt,
      messageCount: sql<number>`cast(count(${chatMessagesTable.id}) as int)`,
    })
    .from(chatRoomsTable)
    .leftJoin(
      chatMessagesTable,
      eq(chatMessagesTable.roomId, chatRoomsTable.id),
    )
    .groupBy(chatRoomsTable.id)
    .orderBy(desc(chatRoomsTable.createdAt));

  const roomsWithLastMsg = await Promise.all(
    rooms.map(async (room) => {
      const [lastMsg] = await db
        .select({
          content: chatMessagesTable.content,
          sender: chatMessagesTable.sender,
          createdAt: chatMessagesTable.createdAt,
        })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.roomId, room.id))
        .orderBy(desc(chatMessagesTable.createdAt))
        .limit(1);

      return {
        ...room,
        createdAt: room.createdAt.toISOString(),
        messageCount: Number(room.messageCount),
        lastMessage: lastMsg
          ? {
              content: lastMsg.content ?? null,
              sender: lastMsg.sender,
              createdAt: lastMsg.createdAt.toISOString(),
            }
          : null,
      };
    }),
  );

  res.json(roomsWithLastMsg);
});

// POST /chat/rooms
router.post("/rooms", requireAuth, async (req: Request, res: Response) => {
  const parsed = parseRoomInput(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { title, matchId, fundoId, ativoId } = parsed;
  const [room] = await db
    .insert(chatRoomsTable)
    .values({ title, matchId, fundoId, ativoId })
    .returning();

  res.status(201).json({
    ...room,
    createdAt: room.createdAt.toISOString(),
    messageCount: 0,
    lastMessage: null,
  });
});

// GET /chat/rooms/:roomId
router.get("/rooms/:roomId", async (req: Request, res: Response) => {
  const roomId = parseInt(req.params.roomId as string, 10);
  if (isNaN(roomId)) {
    res.status(400).json({ error: "Invalid room ID" });
    return;
  }

  const [room] = await db
    .select()
    .from(chatRoomsTable)
    .where(eq(chatRoomsTable.id, roomId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(chatMessagesTable.createdAt);

  res.json({
    ...room,
    createdAt: room.createdAt.toISOString(),
    messages: messages.map(serializeMessage),
  });
});

// POST /chat/rooms/:roomId/messages
router.post(
  "/rooms/:roomId/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId as string, 10);
    if (isNaN(roomId)) {
      res.status(400).json({ error: "Invalid room ID" });
      return;
    }

    const [room] = await db
      .select({ id: chatRoomsTable.id })
      .from(chatRoomsTable)
      .where(eq(chatRoomsTable.id, roomId))
      .limit(1);

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const parsed = parseMsgInput(req.body);
    if (!parsed) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const { sender, content, fileUrl, fileName, fileSize, fileType } = parsed;

    if (!content && !fileUrl) {
      res.status(400).json({ error: "Message must have content or a file" });
      return;
    }

    const [msg] = await db
      .insert(chatMessagesTable)
      .values({
        roomId,
        sender,
        content,
        fileUrl,
        fileName,
        fileSize,
        fileType,
      })
      .returning();

    res.status(201).json(serializeMessage(msg));
  },
);

// POST /chat/rooms/:roomId/ai-reply
router.post(
  "/rooms/:roomId/ai-reply",
  requireAuth,
  async (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId as string, 10);
    if (isNaN(roomId)) {
      res.status(400).json({ error: "Invalid room ID" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const userMessage =
      typeof body["userMessage"] === "string" ? body["userMessage"].trim() : "";
    if (!userMessage) {
      res.status(400).json({ error: "userMessage is required" });
      return;
    }

    const [room] = await db
      .select()
      .from(chatRoomsTable)
      .where(eq(chatRoomsTable.id, roomId))
      .limit(1);

    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    // Load context: last 20 messages
    const recentMessages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.roomId, roomId))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(20);
    recentMessages.reverse();

    // Load deal context if linked
    let dealContext = "";

    if (room.matchId) {
      const [match] = await db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.id, room.matchId))
        .limit(1);
      if (match) {
        const [fundo] = await db
          .select()
          .from(fundsTable)
          .where(eq(fundsTable.id, match.fundoId))
          .limit(1);
        const [ativo] = await db
          .select()
          .from(assetsTable)
          .where(eq(assetsTable.id, match.ativoId!))
          .limit(1);
        if (fundo && ativo) {
          dealContext = `
CONTEXTO DO MATCH (Score: ${Number(match.scoreFinal)}/100):
FUNDO: ${fundo.nome} | Tese: ${fundo.tese} | Ticket: R$ ${Number(fundo.ticketMin).toLocaleString("pt-BR")} - R$ ${Number(fundo.ticketMax).toLocaleString("pt-BR")} | ROI mínimo: ${fundo.roiMinimo}% | Risco: ${fundo.nivelRisco}
ATIVO: ${ativo.nome} | Tipo: ${ativo.tipoAtivo} | Captação: R$ ${Number(ativo.valorCaptacao).toLocaleString("pt-BR")} | ROI previsto: ${ativo.roiPrevisto}% | Região: ${ativo.regiao}`;
        }
      }
    } else if (room.fundoId) {
      const [fundo] = await db
        .select()
        .from(fundsTable)
        .where(eq(fundsTable.id, room.fundoId))
        .limit(1);
      if (fundo)
        dealContext = `\nFUNDO EM FOCO: ${fundo.nome} | Tese: ${fundo.tese} | Ticket: R$ ${Number(fundo.ticketMin).toLocaleString("pt-BR")} - R$ ${Number(fundo.ticketMax).toLocaleString("pt-BR")}`;
    } else if (room.ativoId) {
      const [ativo] = await db
        .select()
        .from(assetsTable)
        .where(eq(assetsTable.id, room.ativoId))
        .limit(1);
      if (ativo)
        dealContext = `\nATIVO EM FOCO: ${ativo.nome} | Tipo: ${ativo.tipoAtivo} | Captação: R$ ${Number(ativo.valorCaptacao).toLocaleString("pt-BR")} | ROI previsto: ${ativo.roiPrevisto}%`;
    }

    // Build conversation history
    const conversationHistory = recentMessages
      .filter(
        (m) => m.sender !== "Ingenium IA" && m.sender !== "Copilot Ingenium",
      )
      .slice(-10)
      .map((m) => ({
        role: "user" as const,
        content: `[${m.sender}]: ${m.content ?? "(arquivo enviado)"}`,
      }));

    const historyText =
      conversationHistory.length > 0
        ? `\nHISTÓRICO RECENTE DA CONVERSA:\n${conversationHistory.map((m) => m.content).join("\n")}\n`
        : "";

    const prompt = `Você é o Copilot Ingenium, parceiro consultivo do empreendedor brasileiro em conversas com fundos. Fala em português PT-BR, próximo e direto, como um sócio sênior que já estruturou muita SPE. Sem jargão financeiro vazio — traduza termo técnico em linguagem prática quando aparecer. Foco: ajudar o empreendedor a avançar a operação sem travar.

CONTEXTO:
Você está em uma conversa de negociação na plataforma Ingenium.
Nome da conversa: "${room.title}"${dealContext}
${historyText}
PERGUNTA DO USUÁRIO:
${userMessage}

Responda de forma clara e prática. Ajude as partes a avançar na negociação. Se não tiver dados suficientes para uma análise precisa, diga o que pode e sugira o que falta.`;

    const response = await generateText({
      maxOutputTokens: 600,
      prompt: prompt,
    });

    const rawContent = response;
    const aiContent =
      rawContent && rawContent.trim()
        ? rawContent.trim()
        : "Desculpe, não consegui gerar uma resposta no momento. Por favor tente novamente.";

    const [aiMsg] = await db
      .insert(chatMessagesTable)
      .values({
        roomId,
        sender: "Copilot Ingenium",
        content: aiContent,
      })
      .returning();

    res.status(201).json(serializeMessage(aiMsg));
  },
);

// DELETE /chat/rooms/:roomId/messages/:messageId
router.delete(
  "/rooms/:roomId/messages/:messageId",
  requireAuth,
  async (req: Request, res: Response) => {
    const roomId = parseInt(req.params.roomId as string, 10);
    const messageId = parseInt(req.params.messageId as string, 10);

    if (isNaN(roomId) || isNaN(messageId)) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const result = await db
      .delete(chatMessagesTable)
      .where(eq(chatMessagesTable.id, messageId))
      .returning({ id: chatMessagesTable.id });

    if (result.length === 0) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
