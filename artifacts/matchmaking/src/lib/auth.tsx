import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createFund, createAsset,
  getListFundsQueryKey, getListAssetsQueryKey,
} from "@workspace/api-client-react";

export type UserRole = "fundo" | "ativo" | "admin";

export interface CompanyDoc {
  id: string;
  name: string;
  required: boolean;
  status: "missing" | "uploaded";
  uploadedAt?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ConsentState {
  lgpd: boolean;
  marketing: boolean;
  analytics: boolean;
  acceptedAt?: string;
}

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  company: string;
  createdAt: string;
  cnpj?: string;
  phone?: string;
  segment?: string;
  thesis?: string;
  docs?: CompanyDoc[];
  consent?: ConsentState;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, _password: string) => Promise<AuthUser>;
  signup: (data: {
    email: string;
    password: string;
    name: string;
    company: string;
    role: UserRole;
    cnpj?: string;
    phone?: string;
    segment?: string;
    thesis?: string;
    consent: ConsentState;
  }) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  deleteAccount: () => void;
  exportData: () => string;
}

const STORAGE_KEY = "ingenium_user";
const REGISTRY_KEY = "ingenium_users";
const ADMIN_MATCHES_KEY = "ingenium_admin_matches";

export interface AdminMatch {
  id: string;
  fundId: number;
  fundName: string;
  assetId: number;
  assetName: string;
  score: number;
  note?: string;
  createdAt: string;
  createdBy: string;
}

function readRegistry(): Record<string, AuthUser> {
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AuthUser>) : {};
  } catch { return {}; }
}
function writeRegistry(reg: Record<string, AuthUser>) {
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
}
/** Same-tab notification channel (the `storage` event only fires cross-tab). */
export const REGISTRY_EVENT = "ingenium:registry-changed";
function emitRegistryChange() {
  try { window.dispatchEvent(new CustomEvent(REGISTRY_EVENT)); } catch {}
}
function upsertRegistry(u: AuthUser) {
  const reg = readRegistry();
  reg[u.email.toLowerCase()] = u;
  writeRegistry(reg);
  emitRegistryChange();
}
function removeFromRegistry(email: string) {
  const reg = readRegistry();
  delete reg[email.toLowerCase()];
  writeRegistry(reg);
  emitRegistryChange();
}

/** Stable negative ID derived from a company name (for registry-only entries). */
export function syntheticIdFromName(name: string): number {
  let h = 0;
  const s = name.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return -Math.abs(h || 1);
}

/** All registered (non-admin) accounts of a given role. */
export function getRegistryAccountsByRole(role: UserRole): AuthUser[] {
  return Object.values(readRegistry())
    .filter((u) => u.role === role)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Admin helper — list every signup persisted in this browser. */
export function getAllUsers(): AuthUser[] {
  return Object.values(readRegistry()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Admin helper — manual matches (admin-curated, LGPD-safe). */
export function getAdminMatches(): AdminMatch[] {
  try {
    const raw = window.localStorage.getItem(ADMIN_MATCHES_KEY);
    return raw ? (JSON.parse(raw) as AdminMatch[]) : [];
  } catch { return []; }
}
export function saveAdminMatch(m: AdminMatch) {
  const all = getAdminMatches();
  window.localStorage.setItem(ADMIN_MATCHES_KEY, JSON.stringify([m, ...all]));
}
export function deleteAdminMatch(id: string) {
  const all = getAdminMatches().filter((m) => m.id !== id);
  window.localStorage.setItem(ADMIN_MATCHES_KEY, JSON.stringify(all));
}

const norm = (s: string) => s.trim().toLowerCase();

/** Which asset IDs has the admin paired with a given fund (matched by company name)? */
export function getAllowedAssetIdsForFund(company: string): Set<number> {
  const c = norm(company);
  return new Set(
    getAdminMatches()
      .filter((m) => norm(m.fundName) === c)
      .map((m) => m.assetId),
  );
}

/** Which fund IDs has the admin paired with a given asset (matched by company name)? */
export function getAllowedFundIdsForAsset(company: string): Set<number> {
  const c = norm(company);
  return new Set(
    getAdminMatches()
      .filter((m) => norm(m.assetName) === c)
      .map((m) => m.fundId),
  );
}

/** Find a non-admin registered user by company name (case-insensitive). */
export function getUserByCompany(company: string, role?: UserRole): AuthUser | undefined {
  const c = norm(company);
  const candidates = Object.values(readRegistry()).filter((u) => norm(u.company) === c);
  if (role) {
    const sameRole = candidates.filter((u) => u.role === role);
    if (sameRole.length) {
      return sameRole.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }
    return undefined;
  }
  return candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

/** Admin-curated entry — represents a fundo/ativo cadastrado pelo próprio admin,
 * sem dependência de signup. A documentação aqui é validada offline.
 *
 * The bypass is bound to a stable `entityId` returned by the API on creation,
 * not the name, so a forged localStorage record with the right name alone
 * cannot unlock the docs gate for arbitrary fundos/ativos.
 */
export type CuratedKind = "fundo" | "ativo";
export interface AdminCurated {
  kind: CuratedKind;
  entityId: number; // API entity id returned by createFund / createAsset
  name: string; // mirror of entity nome at creation time (display only)
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  docsVerifiedOffline: boolean;
  createdAt: string;
  createdBy: string;
}

const ADMIN_CURATED_KEY = "ingenium_admin_curated";

export function getAdminCurated(): AdminCurated[] {
  try {
    const raw = window.localStorage.getItem(ADMIN_CURATED_KEY);
    return raw ? (JSON.parse(raw) as AdminCurated[]) : [];
  } catch { return []; }
}
export function saveAdminCurated(c: AdminCurated) {
  const all = getAdminCurated().filter((x) => !(x.kind === c.kind && x.entityId === c.entityId));
  window.localStorage.setItem(ADMIN_CURATED_KEY, JSON.stringify([c, ...all]));
  emitRegistryChange();
}
export function deleteAdminCurated(kind: CuratedKind, entityId: number) {
  const all = getAdminCurated().filter((x) => !(x.kind === kind && x.entityId === entityId));
  window.localStorage.setItem(ADMIN_CURATED_KEY, JSON.stringify(all));
  emitRegistryChange();
}
export function findAdminCuratedById(kind: CuratedKind, entityId: number): AdminCurated | undefined {
  return getAdminCurated().find((x) => x.kind === kind && x.entityId === entityId);
}

/** Status of required-doc completion for a given company. */
export type DocsCheck =
  | { ok: true; user?: AuthUser; viaAdminCuration?: boolean }
  | { ok: false; reason: "no-user" | "missing-docs"; user?: AuthUser; missing?: number };

/**
 * Checks if a fund/ativo is ready to be matched.
 *
 * - `entityId` (when provided) is the stable API id of the selected entity.
 *   Only an `AdminCurated` record bound to that exact id unlocks the offline-
 *   verified path — name-based forgery cannot bypass docs.
 * - Falls back to the registry-user docs progress otherwise.
 */
export function checkDocsReady(
  company: string,
  role?: UserRole,
  entityId?: number,
): DocsCheck {
  if ((role === "fundo" || role === "ativo") && typeof entityId === "number") {
    const curated = findAdminCuratedById(role, entityId);
    if (curated?.docsVerifiedOffline) return { ok: true, viaAdminCuration: true };
  }
  const user = getUserByCompany(company, role);
  if (!user) return { ok: false, reason: "no-user" };
  const { missingRequired } = docsProgress(user.docs);
  if (missingRequired > 0) return { ok: false, reason: "missing-docs", user, missing: missingRequired };
  return { ok: true, user };
}

/** True if the admin has curated a match between this fund and asset. */
export function isAdminMatchAllowed(opts: { fundId?: number; fundName?: string; assetId?: number; assetName?: string }): boolean {
  const matches = getAdminMatches();
  return matches.some((m) => {
    if (opts.fundId !== undefined && m.fundId !== opts.fundId) return false;
    if (opts.assetId !== undefined && m.assetId !== opts.assetId) return false;
    if (opts.fundName !== undefined && norm(m.fundName) !== norm(opts.fundName)) return false;
    if (opts.assetName !== undefined && norm(m.assetName) !== norm(opts.assetName)) return false;
    return true;
  });
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function defaultDocsFor(role: UserRole): CompanyDoc[] {
  if (role === "fundo") {
    return [
      { id: "regulamento", name: "Regulamento do fundo", required: true, status: "missing" },
      { id: "carta", name: "Carta de tese de investimento", required: true, status: "missing" },
      { id: "cvm", name: "Registro CVM / ANBIMA", required: true, status: "missing" },
      { id: "historico", name: "Histórico de alocações (últimos 12m)", required: false, status: "missing" },
      { id: "compliance", name: "Política de compliance", required: false, status: "missing" },
    ];
  }
  if (role === "ativo") {
    return [
      { id: "prospecto", name: "Prospecto do projeto", required: true, status: "missing" },
      { id: "matricula", name: "Matrícula do imóvel", required: true, status: "missing" },
      { id: "viabilidade", name: "Estudo de viabilidade", required: true, status: "missing" },
      { id: "dre", name: "DRE projetada", required: true, status: "missing" },
      { id: "memorial", name: "Memorial descritivo", required: false, status: "missing" },
      { id: "alvaras", name: "Alvarás e licenças", required: false, status: "missing" },
    ];
  }
  return [];
}

type ServerUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  name: string | null;
  company: string | null;
  cnpj?: string | null;
  phone?: string | null;
  segment?: string | null;
  thesis?: string | null;
};

function hydrateFromServer(s: ServerUser, existing?: AuthUser | null): AuthUser {
  const email = s.email ?? existing?.email ?? "";
  const fallbackName = [s.firstName, s.lastName].filter(Boolean).join(" ").trim();
  return {
    email,
    name: s.name ?? fallbackName ?? email.split("@")[0] ?? "Usuário",
    company: s.company ?? existing?.company ?? fallbackName ?? "",
    role: s.role,
    cnpj: s.cnpj ?? existing?.cnpj,
    phone: s.phone ?? existing?.phone,
    segment: s.segment ?? existing?.segment,
    thesis: s.thesis ?? existing?.thesis,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    docs: existing?.docs ?? defaultDocsFor(s.role),
    consent: existing?.consent ?? { lgpd: true, marketing: false, analytics: false, acceptedAt: new Date().toISOString() },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const persist = (u: AuthUser | null) => {
    setUser(u);
    if (u) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      if (u.role !== "admin") upsertRegistry(u);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    let cancelled = false;
    // Bootstrap from server session (cookie-based — works for password + OIDC).
    fetch("/api/auth/user", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: ServerUser | null } | null) => {
        if (cancelled) return;
        const su = data?.user;
        if (su?.email) {
          let cached: AuthUser | null = null;
          try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) cached = JSON.parse(raw) as AuthUser;
          } catch {}
          const hydrated = hydrateFromServer(su, cached?.email === su.email ? cached : null);
          persist(hydrated);
        } else {
          // No server session — drop any stale localStorage user.
          window.localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Falha no login" }));
      throw new Error(body.error ?? "Credenciais inválidas");
    }
    const data = (await res.json()) as { user: ServerUser };
    const hydrated = hydrateFromServer(data.user);
    persist(hydrated);
    return hydrated;
  };

  const signup: AuthContextValue["signup"] = async (data) => {
    if (data.role === "admin") {
      throw new Error("Cadastro como admin não permitido. Solicite à equipe Ingenium.");
    }
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        name: data.name,
        company: data.company,
        role: data.role,
        cnpj: data.cnpj,
        phone: data.phone,
        segment: data.segment,
        thesis: data.thesis,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Falha no cadastro" }));
      throw new Error(body.error ?? "Erro ao criar conta");
    }
    const body = (await res.json()) as { user: ServerUser };
    const hydrated: AuthUser = {
      ...hydrateFromServer(body.user),
      consent: data.consent,
    };
    persist(hydrated);

    // Mirror in funds/assets table so the entity is matchable. Non-fatal.
    if (data.role === "fundo") {
      try {
        await createFund({
          nome: data.company,
          tese: data.thesis?.trim() || `Tese de investimento — ${data.company}`,
          ticketMin: 1_000_000,
          ticketMax: 50_000_000,
          segmentos: data.segment ? [data.segment] : [],
          regioes: ["Brasil"],
          nivelRisco: "medio",
          roiMinimo: 10,
          estagio: "Captação",
          descricao: data.thesis?.trim() || undefined,
        });
        queryClient.invalidateQueries({ queryKey: getListFundsQueryKey() });
      } catch (err) {
        console.warn("[signup] createFund failed", err);
      }
    } else if (data.role === "ativo") {
      try {
        await createAsset({
          nome: data.company,
          tipoAtivo: data.segment || "Imóvel",
          valorCaptacao: 10_000_000,
          roiPrevisto: 12,
          regiao: "Brasil",
          estagio: "Captação",
          descricao: data.thesis?.trim() || undefined,
        });
        queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey() });
      } catch (err) {
        console.warn("[signup] createAsset failed", err);
      }
    }
    return hydrated;
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    persist(null);
    queryClient.clear();
  };

  const updateUser: AuthContextValue["updateUser"] = (patch) => {
    if (!user) return;
    // Optimistic local update; persist server fields async.
    const merged = { ...user, ...patch };
    persist(merged);
    const serverFields: Record<string, string | undefined> = {
      name: patch.name,
      company: patch.company,
      cnpj: patch.cnpj,
      phone: patch.phone,
      segment: patch.segment,
      thesis: patch.thesis,
    };
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(serverFields)) {
      if (typeof v === "string") body[k] = v;
    }
    if (Object.keys(body).length > 0) {
      fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      }).catch((err) => console.warn("[updateUser] PATCH failed", err));
    }
  };

  const deleteAccount = () => {
    if (user) removeFromRegistry(user.email);
    fetch("/api/auth/me", { method: "DELETE", credentials: "include" }).catch(() => {});
    persist(null);
    queryClient.clear();
    window.localStorage.removeItem("ingenium_consent");
  };

  const exportData = (): string => {
    return JSON.stringify(user, null, 2);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUser, deleteAccount, exportData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function docsProgress(docs?: CompanyDoc[]) {
  if (!docs || docs.length === 0) return { pct: 100, missingRequired: 0, total: 0, uploaded: 0 };
  const uploaded = docs.filter((d) => d.status === "uploaded").length;
  const missingRequired = docs.filter((d) => d.required && d.status === "missing").length;
  return {
    pct: Math.round((uploaded / docs.length) * 100),
    missingRequired,
    total: docs.length,
    uploaded,
  };
}
