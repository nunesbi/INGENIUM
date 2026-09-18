// FNET (CVM Fundos.NET) — automated discovery and download of fund documents.
//
// Why this exists: Relatório Gerencial PDFs published by gestoras on their own
// websites have month-of-publication in the path and are unstable. The CVM
// Fundos.NET portal, however, assigns a permanent numeric `id` to every
// document filed by every Brazilian FII, so we can:
//   1) Query the public JSON search endpoint by CNPJ.
//   2) Pick the most recent doc with tipo "Relatório Gerencial".
//   3) Build a stable viewer URL `…/visualizarDocumento?id=<id>`.
//   4) Download the raw PDF by doing a cookie-warmup against the viewer URL
//      and then GET-ing `…/exibirDocumento?id=<id>` with that session cookie
//      (Cloudflare on FNET rejects the direct hit otherwise).

const FNET_BASE = "https://fnet.bmfbovespa.com.br/fnet/publico";
// Counterintuitively, Cloudflare on FNET slow-walls browser-looking UAs from
// non-browser IPs (no JS challenge to solve), while a simple curl/Postman UA
// passes through in well under a second. Don't "improve" this without testing.
const UA = "curl/8.5.0";
const FETCH_TIMEOUT_MS = 60_000;

export interface FnetDoc {
  id: number;
  url: string; // stable visualizarDocumento URL — safe to store and to show to humans
  dataReferencia: string; // "MM/YYYY" or "DD/MM/YYYY" as returned by FNET
  dataEntrega: string;
  tipoDocumento: string;
  categoriaDocumento: string;
}

interface FnetRawDoc {
  id: number;
  tipoDocumento?: string;
  categoriaDocumento?: string;
  dataReferencia?: string;
  dataEntrega?: string;
  situacaoDocumento?: string;
  status?: string;
  versao?: number;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function isFnetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "fnet.bmfbovespa.com.br";
  } catch {
    return false;
  }
}

export function fnetDocIdFromUrl(url: string): number | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "fnet.bmfbovespa.com.br") return null;
    const id = Number(u.searchParams.get("id"));
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function fnetViewerUrl(id: number): string {
  return `${FNET_BASE}/visualizarDocumento?id=${id}`;
}

/**
 * Find the most recent active "Relatório Gerencial" filed for a given CNPJ.
 * Returns null when nothing matches.
 */
export async function discoverLatestRelatorioGerencial(cnpj: string): Promise<FnetDoc | null> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) throw new Error("CNPJ inválido");

  // FNET doesn't expose a "Relatórios" category filter that actually works for
  // FIIs, so we paginate the date-sorted feed and filter client-side. 5 pages
  // of 100 = up to 500 most-recent docs, which covers many months of filings
  // even for very active funds.
  const PAGE_SIZE = 100;
  const MAX_PAGES = 5;
  let match: FnetRawDoc | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      cnpjFundo: digits,
      tipoFundo: "1",
      d: String(page + 1),
      s: String(page * PAGE_SIZE),
      l: String(PAGE_SIZE),
      "o[0][dataEntrega]": "desc",
    });

    const res = await fetchWithTimeout(`${FNET_BASE}/pesquisarGerenciadorDocumentosDados?${qs.toString()}`, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: `${FNET_BASE}/abrirGerenciadorDocumentosCVM`,
      },
    });
    if (!res.ok) throw new Error(`FNET search HTTP ${res.status}`);
    const json = (await res.json()) as { data?: FnetRawDoc[]; recordsTotal?: number };
    const items = json.data ?? [];

    match = items.find((d) => {
      const tipo = (d.tipoDocumento ?? "").trim().toLowerCase();
      const ativo = (d.situacaoDocumento ?? "A").toUpperCase() === "A";
      return ativo && /relat[óo]rio gerencial/.test(tipo);
    });
    if (match) break;

    // Stop if we've already pulled every record on file.
    if (items.length < PAGE_SIZE) break;
    if (typeof json.recordsTotal === "number" && (page + 1) * PAGE_SIZE >= json.recordsTotal) break;
  }

  if (!match) return null;
  return {
    id: match.id,
    url: fnetViewerUrl(match.id),
    dataReferencia: (match.dataReferencia ?? "").trim(),
    dataEntrega: (match.dataEntrega ?? "").trim(),
    tipoDocumento: (match.tipoDocumento ?? "").trim(),
    categoriaDocumento: (match.categoriaDocumento ?? "").trim(),
  };
}

/**
 * Download the raw PDF bytes for a FNET viewer URL (visualizarDocumento?id=N)
 * or a raw document id. Hits `exibirDocumento` directly — Cloudflare on FNET
 * happily serves the PDF on GET as long as we use a browser-like User-Agent.
 * (Earlier code did a viewer-page warmup to harvest session cookies; that page
 * is now slow-walled by Cloudflare while the PDF endpoint is fast, so we skip
 * it.)
 */
export async function fetchFnetPdf(urlOrId: string | number, maxBytes: number): Promise<Buffer> {
  const id = typeof urlOrId === "number" ? urlOrId : fnetDocIdFromUrl(urlOrId);
  if (!id) throw new Error("URL FNET sem id de documento");

  const downloadUrl = `${FNET_BASE}/exibirDocumento?id=${id}`;
  const res = await fetchWithTimeout(downloadUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "application/pdf,*/*;q=0.9",
      Referer: fnetViewerUrl(id),
    },
  });
  if (!res.ok) throw new Error(`FNET download HTTP ${res.status}`);

  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct && !ct.includes("pdf") && !ct.includes("octet-stream")) {
    throw new Error(`FNET retornou content-type inesperado: ${ct}`);
  }

  const lenHeader = res.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > maxBytes) {
    throw new Error(`PDF muito grande (${lenHeader} bytes, limite ${maxBytes})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Resposta FNET sem corpo");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* ignore */ }
        throw new Error(`PDF excede o limite de ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  // PDF magic header sanity check
  if (buf.length < 4 || buf.subarray(0, 4).toString("ascii") !== "%PDF") {
    throw new Error("FNET retornou conteúdo que não é PDF");
  }
  return buf;
}
