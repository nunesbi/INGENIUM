/**
 * CNPJ lookup service — used by GET /api/cnpj/:cnpj and by signup to enforce
 * Receita Federal verification server-side.
 * Supports numeric and alphanumeric CNPJs.
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
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCnpjChecksum(cnpj: string): boolean {
  const value = (cnpj ?? "").toUpperCase();

  if (!/^[A-Z0-9]{12}\d{2}$/.test(value)) return false;
  if (/^(\d)\1{13}$/.test(value)) return false;

  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce(
      (acc, char, i) => acc + (char.charCodeAt(0) - 48) * weights[i],
      0,
    );
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calc(value.slice(0, 12), w1);
  const d2 = calc(value.slice(0, 12) + d1, w2);

  return d1 === Number(value[12]) && d2 === Number(value[13]);
}

async function fetchWithTimeout(
  url: string,
  ms: number,
): Promise<globalThis.Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);

  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
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

async function tryBrasilApi(cnpj: string): Promise<LookupOutcome> {
  try {
    const response = await fetchWithTimeout(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      7000,
    );

    if (response.status === 404) return { kind: "notfound" };
    if (!response.ok) return { kind: "fail", status: response.status };

    const data = (await response.json()) as BrasilApiCnpj;
    if (!data.razao_social) return { kind: "fail", status: 502 };

    const address = [
      data.logradouro,
      data.numero,
      data.bairro,
      data.municipio,
      data.uf,
    ].filter(Boolean) as string[];

    return {
      kind: "ok",
      result: {
        cnpj,
        razaoSocial: data.razao_social,
        nomeFantasia: data.nome_fantasia || null,
        situacao: data.descricao_situacao_cadastral ?? "Desconhecida",
        situacaoOk:
          (data.descricao_situacao_cadastral ?? "").toUpperCase() === "ATIVA",
        dataAbertura: data.data_inicio_atividade ?? null,
        cnae: data.cnae_fiscal_descricao ?? null,
        endereco: address.length ? address.join(", ") : null,
        uf: data.uf ?? null,
        municipio: data.municipio ?? null,
        porte: data.porte ?? null,
        capitalSocial:
          typeof data.capital_social === "number" ? data.capital_social : null,
        source: "brasilapi",
      },
    };
  } catch {
    return { kind: "fail", status: 0 };
  }
}

async function tryPublicaCnpjWs(cnpj: string): Promise<LookupOutcome> {
  try {
    const response = await fetchWithTimeout(
      `https://publica.cnpj.ws/cnpj/${cnpj}`,
      7000,
    );

    if (response.status === 404) return { kind: "notfound" };
    if (!response.ok) return { kind: "fail", status: response.status };

    const data = (await response.json()) as {
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

    if (!data.razao_social) return { kind: "fail", status: 502 };

    const establishment = data.estabelecimento ?? {};
    const address = [
      [establishment.tipo_logradouro, establishment.logradouro]
        .filter(Boolean)
        .join(" "),
      establishment.numero,
      establishment.bairro,
      establishment.cidade?.nome,
      establishment.estado?.sigla,
    ].filter((part): part is string => !!part && part.length > 0);

    const status = establishment.situacao_cadastral ?? "Desconhecida";
    const capital = data.capital_social ? Number(data.capital_social) : null;

    return {
      kind: "ok",
      result: {
        cnpj,
        razaoSocial: data.razao_social,
        nomeFantasia: establishment.nome_fantasia || null,
        situacao: status,
        situacaoOk: status.toUpperCase() === "ATIVA",
        dataAbertura: establishment.data_inicio_atividade ?? null,
        cnae: establishment.atividade_principal?.descricao ?? null,
        endereco: address.length ? address.join(", ") : null,
        uf: establishment.estado?.sigla ?? null,
        municipio: establishment.cidade?.nome ?? null,
        porte: data.porte?.descricao ?? null,
        capitalSocial:
          capital !== null && !Number.isNaN(capital) ? capital : null,
        source: "cnpjws",
      },
    };
  } catch {
    return { kind: "fail", status: 0 };
  }
}

export async function lookupCnpj(raw: string): Promise<LookupOutcome> {
  const cnpj = onlyDigits(raw ?? "");

  if (cnpj.length !== 14) {
    return {
      kind: "invalid",
      reason: "CNPJ deve ter 14 caracteres alfanuméricos",
    };
  }

  if (!isValidCnpjChecksum(cnpj)) {
    return {
      kind: "invalid",
      reason: "CNPJ com dígito verificador inválido",
    };
  }

  const now = Date.now();
  const cached = cache.get(cnpj);

  if (cached && cached.expiresAt > now) {
    return { kind: "ok", result: cached.value };
  }

  let outcome = await tryBrasilApi(cnpj);

  if (outcome.kind === "fail") {
    outcome = await tryPublicaCnpjWs(cnpj);
  }

  if (outcome.kind === "ok") {
    cache.set(cnpj, {
      value: outcome.result,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  return outcome;
}
