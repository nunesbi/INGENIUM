/**
 * CNPJ lookup service — used by GET /api/cnpj/:cnpj and by signup to enforce
 * Receita Federal verification server-side (can't be bypassed by client).
 *
 * Two-provider fallback (BrasilAPI → publica.cnpj.ws). 1h in-memory cache.
 */

export interface CnpjResult {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string;
  situacaoOk: boolean;
  dataAbertura: string | null;
  cnae: string | null;
  endereco: string | null;
  uf: string | null;
  municipio: string | null;
  porte: string | null;
  capitalSocial: number | null;
  source: "brasilapi" | "cnpjws";
}

export type LookupOutcome =
  | { kind: "ok"; result: CnpjResult }
  | { kind: "invalid"; reason: string }
  | { kind: "notfound" }
  | { kind: "fail"; status: number };

type CacheEntry = { value: CnpjResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

const UA =
  "Mozilla/5.0 (Ingenium-Matchfund/1.0; +https://ingenium.app) IngeniumCNPJValidator";

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function isValidCnpjChecksum(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, d, i) => acc + parseInt(d, 10) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj.slice(0, 12), w1);
  const d2 = calc(cnpj.slice(0, 12) + d1, w2);
  return d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10);
}

async function fetchWithTimeout(url: string, ms: number): Promise<globalThis.Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
  } finally {
    clearTimeout(t);
  }
}

interface BrasilApiCnpj {
  razao_social?: string;
  nome_fantasia?: string | null;
  descricao_situacao_cadastral?: string;
  data_inicio_atividade?: string;
  cnae_fiscal_descricao?: string;
  uf?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  porte?: string;
  capital_social?: number;
}

async function tryBrasilApi(digits: string): Promise<LookupOutcome> {
  try {
    const up = await fetchWithTimeout(
      `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      7000,
    );
    if (up.status === 404) return { kind: "notfound" };
    if (!up.ok) return { kind: "fail", status: up.status };
    const d = (await up.json()) as BrasilApiCnpj;
    if (!d.razao_social) return { kind: "fail", status: 502 };
    const enderecoParts = [
      d.logradouro,
      d.numero,
      d.bairro,
      d.municipio,
      d.uf,
    ].filter(Boolean) as string[];
    return {
      kind: "ok",
      result: {
        cnpj: digits,
        razaoSocial: d.razao_social,
        nomeFantasia: d.nome_fantasia || null,
        situacao: d.descricao_situacao_cadastral ?? "Desconhecida",
        situacaoOk:
          (d.descricao_situacao_cadastral ?? "").toUpperCase() === "ATIVA",
        dataAbertura: d.data_inicio_atividade ?? null,
        cnae: d.cnae_fiscal_descricao ?? null,
        endereco: enderecoParts.length > 0 ? enderecoParts.join(", ") : null,
        uf: d.uf ?? null,
        municipio: d.municipio ?? null,
        porte: d.porte ?? null,
        capitalSocial: typeof d.capital_social === "number" ? d.capital_social : null,
        source: "brasilapi",
      },
    };
  } catch {
    return { kind: "fail", status: 0 };
  }
}

async function tryPublicaCnpjWs(digits: string): Promise<LookupOutcome> {
  try {
    const up = await fetchWithTimeout(
      `https://publica.cnpj.ws/cnpj/${digits}`,
      7000,
    );
    if (up.status === 404) return { kind: "notfound" };
    if (!up.ok) return { kind: "fail", status: up.status };
    const d = (await up.json()) as {
      razao_social?: string;
      estabelecimento?: {
        nome_fantasia?: string | null;
        situacao_cadastral?: string;
        data_inicio_atividade?: string;
        atividade_principal?: { descricao?: string };
        tipo_logradouro?: string;
        logradouro?: string;
        numero?: string;
        bairro?: string;
        cidade?: { nome?: string };
        estado?: { sigla?: string };
      };
      porte?: { descricao?: string };
      capital_social?: string;
    };
    if (!d.razao_social) return { kind: "fail", status: 502 };
    const est = d.estabelecimento ?? {};
    const enderecoParts = [
      [est.tipo_logradouro, est.logradouro].filter(Boolean).join(" "),
      est.numero,
      est.bairro,
      est.cidade?.nome,
      est.estado?.sigla,
    ].filter((s): s is string => !!s && s.length > 0);
    const situacao = est.situacao_cadastral ?? "Desconhecida";
    const cap = d.capital_social ? Number(d.capital_social) : null;
    return {
      kind: "ok",
      result: {
        cnpj: digits,
        razaoSocial: d.razao_social,
        nomeFantasia: est.nome_fantasia || null,
        situacao,
        situacaoOk: situacao.toUpperCase() === "ATIVA",
        dataAbertura: est.data_inicio_atividade ?? null,
        cnae: est.atividade_principal?.descricao ?? null,
        endereco: enderecoParts.length > 0 ? enderecoParts.join(", ") : null,
        uf: est.estado?.sigla ?? null,
        municipio: est.cidade?.nome ?? null,
        porte: d.porte?.descricao ?? null,
        capitalSocial: cap !== null && !Number.isNaN(cap) ? cap : null,
        source: "cnpjws",
      },
    };
  } catch {
    return { kind: "fail", status: 0 };
  }
}

/**
 * Look up a CNPJ in Receita Federal. Validates format/checksum first,
 * then consults BrasilAPI with fallback to publica.cnpj.ws.
 * Results cached in-memory for 1h.
 */
export async function lookupCnpj(raw: string): Promise<LookupOutcome> {
  const digits = onlyDigits(raw ?? "");
  if (digits.length !== 14) {
    return { kind: "invalid", reason: "CNPJ deve ter 14 dígitos" };
  }
  if (!isValidCnpjChecksum(digits)) {
    return { kind: "invalid", reason: "CNPJ com dígito verificador inválido" };
  }
  const now = Date.now();
  const cached = cache.get(digits);
  if (cached && cached.expiresAt > now) {
    return { kind: "ok", result: cached.value };
  }
  let outcome = await tryBrasilApi(digits);
  if (outcome.kind === "fail") {
    outcome = await tryPublicaCnpjWs(digits);
  }
  if (outcome.kind === "ok") {
    cache.set(digits, { value: outcome.result, expiresAt: now + CACHE_TTL_MS });
  }
  return outcome;
}
