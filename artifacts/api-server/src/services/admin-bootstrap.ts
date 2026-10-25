import bcrypt from "bcryptjs";
import { inArray } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * On boot, ensures users listed in ADMIN_EMAILS exist with role=admin.
 * If ADMIN_BOOTSTRAP_PASSWORD is set, also (re)sets their passwordHash so the
 * email/password login flow works without OIDC. Idempotent.
 */
export async function bootstrapAdmins(): Promise<void> {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return;

  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() || "";
  const hash = password ? await bcrypt.hash(password, 10) : null;

  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(inArray(usersTable.email, emails));

    const existingByEmail = new Map(
      rows.filter((r) => r.email).map((r) => [r.email!.toLowerCase(), r]),
    );

    for (const email of emails) {
      const existing = existingByEmail.get(email);
      if (existing) {
        const patch: Record<string, unknown> = { updatedAt: new Date() };
        if (existing.role !== "admin") patch.role = "admin";
        if (hash) patch.passwordHash = hash;
        if (Object.keys(patch).length > 1) {
          await db
            .update(usersTable)
            .set(patch)
            .where(inArray(usersTable.email, [email]));
          logger.info(
            { email, role: "admin", password: !!hash },
            "admin bootstrap: updated existing user",
          );
        }
      } else if (hash) {
        // No existing row — create one so password login works before OIDC.
        await db
          .insert(usersTable)
          .values({
            id: `admin-${email}`,
            email,
            role: "admin",
            passwordHash: hash,
            name: email.split("@")[0] ?? "Admin",
          })
          .onConflictDoNothing();
        logger.info({ email }, "admin bootstrap: created new admin user");
      }
    }
  } catch (err) {
    logger.error({ err }, "admin bootstrap failed");
  }
}
