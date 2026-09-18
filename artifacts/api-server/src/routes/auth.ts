import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { lookupCnpj } from "../services/cnpj-lookup";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const ALLOWED_SIGNUP_ROLES = new Set(["fundo", "ativo"] as const);

function toSessionUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
    role: (u.role as "fundo" | "ativo" | "admin") ?? "fundo",
    name: u.name,
    company: u.company,
    cnpj: u.cnpj,
    phone: u.phone,
    segment: u.segment,
    thesis: u.thesis,
  };
}

function setSessionCookieHelper(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

function adminEmailAllowlist(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function upsertUser(claims: Record<string, unknown>) {
  const email = (claims.email as string) || null;
  const userData = {
    id: claims.sub as string,
    email,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      string | null,
  };

  const allowlist = adminEmailAllowlist();
  const shouldBeAdmin = !!email && allowlist.has(email.toLowerCase());

  // Role is only set on first insert via schema default ("fundo"). On update,
  // role is preserved EXCEPT when the email is in ADMIN_EMAILS — then we
  // promote on every login (idempotent). Demotion still requires manual SQL.
  const updateSet: Record<string, unknown> = {
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    profileImageUrl: userData.profileImageUrl,
    updatedAt: new Date(),
  };
  const insertValues: typeof userData & { role?: "admin" | "fundo" | "ativo" } =
    {
      ...userData,
    };
  if (shouldBeAdmin) {
    updateSet.role = "admin";
    insertValues.role = "admin";
  }

  const [user] = await db
    .insert(usersTable)
    .values(insertValues)
    .onConflictDoUpdate({ target: usersTable.email, set: updateSet })
    .returning();
  return user;
}

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json(GetCurrentAuthUserResponse.parse({ user: null }));
    return;
  }
  // Re-fetch from DB so role changes (e.g. promotion to admin) reflect on next
  // request without forcing the user to logout/login.
  try {
    const sessionUser = req.user as { id?: string } | undefined;
    const id = sessionUser?.id;
    if (id) {
      const [fresh] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id));
      if (fresh) {
        res.json(
          GetCurrentAuthUserResponse.parse({ user: toSessionUser(fresh) }),
        );
        return;
      }
    }
  } catch (err) {
    req.log.warn(
      { err },
      "auth/user fresh fetch failed, falling back to session",
    );
  }
  res.json(GetCurrentAuthUserResponse.parse({ user: req.user }));
});

// ─── Password-based signup / login (replaces localStorage demo auth) ───────

interface SignupBody {
  email: string;
  password: string;
  name: string;
  company: string;
  role: "fundo" | "ativo";
  cnpj?: string;
  phone?: string;
  segment?: string;
  thesis?: string;
}

function parseSignup(body: unknown): SignupBody | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const company = typeof b.company === "string" ? b.company.trim() : "";
  const role = b.role === "fundo" || b.role === "ativo" ? b.role : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  // Strong password: ≥8 chars, lower, upper, digit. Symbol recommended but not required.
  if (password.length < 8) return null;
  if (!/[a-z]/.test(password)) return null;
  if (!/[A-Z]/.test(password)) return null;
  if (!/\d/.test(password)) return null;
  if (!name || !company || !role) return null;
  return {
    email,
    password,
    name,
    company,
    role,
    cnpj: typeof b.cnpj === "string" ? b.cnpj : undefined,
    phone: typeof b.phone === "string" ? b.phone : undefined,
    segment: typeof b.segment === "string" ? b.segment : undefined,
    thesis: typeof b.thesis === "string" ? b.thesis : undefined,
  };
}

router.post("/auth/signup", async (req: Request, res: Response) => {
  const data = parseSignup(req.body);
  if (!data) {
    res
      .status(400)
      .json({
        error:
          "Senha precisa ter ≥8 caracteres com letra maiúscula, minúscula e número. Email/nome/empresa/role também obrigatórios.",
      });
    return;
  }
  if (!ALLOWED_SIGNUP_ROLES.has(data.role)) {
    res.status(400).json({ error: "Role inválido" });
    return;
  }
  // Verificação obrigatória do CNPJ na Receita Federal — server-side para
  // impedir bypass via devtools/curl. Bloqueia se inválido, inexistente ou
  // com situação cadastral diferente de ATIVA.
  if (!data.cnpj) {
    res.status(400).json({ error: "CNPJ obrigatório." });
    return;
  }
  const cnpjOutcome = await lookupCnpj(data.cnpj);
  if (cnpjOutcome.kind === "invalid") {
    res.status(400).json({ error: cnpjOutcome.reason });
    return;
  }
  if (cnpjOutcome.kind === "notfound") {
    res.status(400).json({ error: "CNPJ não encontrado na Receita Federal." });
    return;
  }
  if (cnpjOutcome.kind === "fail") {
    req.log.warn(
      { status: cnpjOutcome.status },
      "Signup blocked: CNPJ provider failure",
    );
    res.status(503).json({
      error:
        "Não foi possível validar o CNPJ na Receita Federal agora. Tente novamente em alguns minutos.",
    });
    return;
  }
  if (!cnpjOutcome.result.situacaoOk) {
    res.status(400).json({
      error: `CNPJ está com situação "${cnpjOutcome.result.situacao}" na Receita Federal. Apenas CNPJs ATIVOS podem se cadastrar.`,
    });
    return;
  }
  // Normaliza CNPJ pra dígitos e usa razão social oficial se company veio vazia.
  const cnpjDigits = cnpjOutcome.result.cnpj;
  const companyFinal = data.company || cnpjOutcome.result.razaoSocial;
  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, data.email));
    if (existing) {
      res.status(409).json({ error: "Email já cadastrado" });
      return;
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [created] = await db
      .insert(usersTable)
      .values({
        email: data.email,
        passwordHash,
        role: data.role,
        name: data.name,
        company: companyFinal,
        cnpj: cnpjDigits,
        phone: data.phone ?? null,
        segment: data.segment ?? null,
        thesis: data.thesis ?? null,
      })
      .returning();

    const sid = await createSession({
      user: toSessionUser(created),
      access_token: "local",
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL / 1000,
    });
    setSessionCookieHelper(res, sid);
    res.status(201).json({ user: toSessionUser(created) });
  } catch (err) {
    req.log.error({ err }, "Signup failed");
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const b = req.body as Record<string, unknown> | undefined;
  const email =
    typeof b?.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b?.password === "string" ? b.password : "";
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha obrigatórios" });
    return;
  }
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    const sid = await createSession({
      user: toSessionUser(user),
      access_token: "local",
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL / 1000,
    });
    setSessionCookieHelper(res, sid);
    res.json({ user: toSessionUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Erro ao autenticar" });
  }
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ ok: true });
});

router.patch("/auth/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const b = req.body as Record<string, unknown> | undefined;
  if (!b || typeof b !== "object") {
    res.status(400).json({ error: "Body inválido" });
    return;
  }
  // Allowed self-update fields (never role / passwordHash)
  const patch: Record<string, string | null> = {};
  for (const k of [
    "name",
    "company",
    "cnpj",
    "phone",
    "segment",
    "thesis",
  ] as const) {
    if (typeof b[k] === "string") patch[k] = b[k] as string;
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Nenhum campo válido" });
    return;
  }
  try {
    const [updated] = await db
      .update(usersTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user.id))
      .returning();
    // Refresh session
    const sid = getSessionId(req);
    if (sid) {
      const { updateSession, getSession } = await import("../lib/auth");
      const sess = await getSession(sid);
      if (sess) {
        sess.user = toSessionUser(updated);
        await updateSession(sid, sess);
      }
    }
    res.json({ user: toSessionUser(updated) });
  } catch (err) {
    req.log.error({ err }, "Profile update failed");
    res.status(500).json({ error: "Erro ao atualizar" });
  }
});

router.delete("/auth/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const sid = getSessionId(req);
    await db.delete(usersTable).where(eq(usersTable.id, req.user.id));
    await clearSession(res, sid);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Account deletion failed");
    res.status(500).json({ error: "Erro ao excluir conta" });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
