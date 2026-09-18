import { Router, type IRouter, type Request, type Response } from "express";
import { sql, eq, desc } from "drizzle-orm";
import { db, usersTable, fundsTable, documentsTable, matchesTable, assetsTable } from "@workspace/db";
import { requireRole } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/users", requireRole("admin"), async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      name: usersTable.name,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      company: usersTable.company,
      cnpj: usersTable.cnpj,
      phone: usersTable.phone,
      segment: usersTable.segment,
      profileImageUrl: usersTable.profileImageUrl,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const [docsByEmail, fundsCount, matchesCount, assetsCount] = await Promise.all([
    db
      .select({ ownerEmail: documentsTable.ownerEmail, count: sql<number>`count(*)::int` })
      .from(documentsTable)
      .groupBy(documentsTable.ownerEmail),
    db.select({ count: sql<number>`count(*)::int` }).from(fundsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(matchesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(assetsTable),
  ]);

  const docsMap = new Map(docsByEmail.map((r) => [r.ownerEmail, r.count]));

  res.json({
    users: rows.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      documentsCount: u.email ? docsMap.get(u.email) ?? 0 : 0,
    })),
    totals: {
      users: rows.length,
      funds: fundsCount[0]?.count ?? 0,
      matches: matchesCount[0]?.count ?? 0,
      assets: assetsCount[0]?.count ?? 0,
    },
  });
});

router.patch("/admin/users/:id/role", requireRole("admin"), async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "");
  const role = (req.body as { role?: string } | undefined)?.role;
  if (!id || !role || !["admin", "fundo", "ativo"].includes(role)) {
    res.status(400).json({ error: "Role inválida" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });
  if (!updated) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  res.json(updated);
});

export default router;
