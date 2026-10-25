import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router: IRouter = Router();

interface RegisterInput {
  docKey: string;
  docName: string;
  required: boolean;
  fileName: string;
  fileSize: number;
  contentType: string | null;
  objectPath: string;
  ownerName: string | null;
  ownerCompany: string | null;
}

function parseRegisterBody(body: unknown): RegisterInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const docKey = typeof b["docKey"] === "string" ? b["docKey"].trim() : "";
  const docName = typeof b["docName"] === "string" ? b["docName"].trim() : "";
  const objectPath = typeof b["objectPath"] === "string" ? b["objectPath"].trim() : "";
  const fileName = typeof b["fileName"] === "string" ? b["fileName"].trim() : "";
  const fileSize = typeof b["fileSize"] === "number" ? Math.floor(b["fileSize"] as number) : NaN;
  if (!docKey || !docName || !objectPath || !fileName || !Number.isFinite(fileSize)) return null;
  // Hard cap to prevent storage abuse from authenticated users.
  if (fileSize > 50 * 1024 * 1024) return null;
  return {
    docKey,
    docName,
    required: b["required"] === true,
    fileName,
    fileSize,
    contentType: typeof b["contentType"] === "string" ? (b["contentType"] as string) : null,
    objectPath,
    ownerName: typeof b["ownerName"] === "string" ? (b["ownerName"] as string).trim() : null,
    ownerCompany: typeof b["ownerCompany"] === "string" ? (b["ownerCompany"] as string).trim() : null,
  };
}

function serialize(d: typeof documentsTable.$inferSelect) {
  return {
    id: d.id,
    ownerEmail: d.ownerEmail,
    ownerRole: d.ownerRole,
    ownerName: d.ownerName,
    ownerCompany: d.ownerCompany,
    docKey: d.docKey,
    docName: d.docName,
    required: d.required,
    fileName: d.fileName,
    fileSize: d.fileSize,
    contentType: d.contentType,
    objectPath: d.objectPath,
    createdAt: d.createdAt.toISOString(),
  };
}

/**
 * POST /documents
 * Owner is ALWAYS derived from the session — body cannot impersonate.
 * Upserts by (ownerEmail, docKey).
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parsed = parseRegisterBody(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const user = req.user!;
  const ownerEmail = (user.email ?? "").trim().toLowerCase();
  if (!ownerEmail) {
    res.status(400).json({ error: "Conta sem email registrado" });
    return;
  }
  try {
    await db
      .delete(documentsTable)
      .where(and(eq(documentsTable.ownerEmail, ownerEmail), eq(documentsTable.docKey, parsed.docKey)));

    const [row] = await db
      .insert(documentsTable)
      .values({
        ownerEmail,
        ownerRole: user.role,
        ownerName: parsed.ownerName ?? user.name ?? null,
        ownerCompany: parsed.ownerCompany ?? user.company ?? null,
        docKey: parsed.docKey,
        docName: parsed.docName,
        required: parsed.required,
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        contentType: parsed.contentType,
        objectPath: parsed.objectPath,
      })
      .returning();

    res.status(201).json(serialize(row));
  } catch (error) {
    req.log.error({ err: error }, "Error registering document");
    res.status(500).json({ error: "Failed to register document" });
  }
});

/**
 * GET /documents/mine — current user's docs (owner derived from session).
 */
router.get("/mine", requireAuth, async (req: Request, res: Response) => {
  const email = (req.user!.email ?? "").trim().toLowerCase();
  if (!email) {
    res.json([]);
    return;
  }
  try {
    const rows = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.ownerEmail, email))
      .orderBy(desc(documentsTable.createdAt));
    res.json(rows.map(serialize));
  } catch (error) {
    req.log.error({ err: error }, "Error listing user documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

/**
 * GET /documents — admin only. Optional ?role= filter.
 */
router.get("/", requireRole("admin"), async (req: Request, res: Response) => {
  const role = typeof req.query.role === "string" ? req.query.role : "";
  try {
    const rows = role
      ? await db.select().from(documentsTable).where(eq(documentsTable.ownerRole, role)).orderBy(desc(documentsTable.createdAt))
      : await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
    res.json(rows.map(serialize));
  } catch (error) {
    req.log.error({ err: error }, "Error listing all documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

/**
 * DELETE /documents/:id — owner (session) or admin.
 */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const user = req.user!;
  const email = (user.email ?? "").trim().toLowerCase();
  try {
    const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const isOwner = email && existing.ownerEmail === email;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db.delete(documentsTable).where(eq(documentsTable.id, id));
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error deleting document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
