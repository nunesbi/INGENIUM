/**
 * Backfill `funds.relatorio_pdf_url` for every fund with a CNPJ by hitting the
 * CVM FNET (Fundos.NET) public search endpoint and picking the most recent
 * "Relatório Gerencial" filed by each fund.
 *
 * Idempotent — by default skips funds that already have a relatorioPdfUrl.
 * Set FORCE=1 to overwrite even when one is already saved.
 *
 * Tuning:
 *  - CONCURRENCY (default 8)
 *  - LIMIT (default no limit) — useful to smoke-test on a few CNPJs first
 *
 * Run: `pnpm --filter @workspace/scripts run backfill-relatorios`
 */
import { db, fundsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const FNET_BASE = "https://fnet.bmfbovespa.com.br/fnet/publico";
const UA = "curl/8.5.0";
const FETCH_TIMEOUT_MS = 45_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const RETRY_ATTEMPTS = 2;

const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4);
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const FORCE = process.env.FORCE === "1";

interface FnetRawDoc {
  id: number;
  tipoDocumento?: string;
  situacaoDocumento?: string;
  dataReferencia?: string;
  dataEntrega?: string;
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

async function discoverLatest(cnpj: string): Promise<{ id: number; url: string; dataReferencia: string } | null> {
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      cnpjFundo: cnpj,
      tipoFundo: "1",
      d: String(page + 1),
      s: String(page * PAGE_SIZE),
      l: String(PAGE_SIZE),
      "o[0][dataEntrega]": "desc",
    });
    const res = await fetchWithTimeout(`${FNET_BASE}/pesquisarGerenciadorDocumentosDados?${qs}`, {
      headers: { "User-Agent": UA, Accept: "application/json", Referer: `${FNET_BASE}/abrirGerenciadorDocumentosCVM` },
    });
    if (!res.ok) throw new Error(`FNET HTTP ${res.status}`);
    const json = (await res.json()) as { data?: FnetRawDoc[]; recordsTotal?: number };
    const items = json.data ?? [];
    const match = items.find((d) => {
      const tipo = (d.tipoDocumento ?? "").trim().toLowerCase();
      const ativo = (d.situacaoDocumento ?? "A").toUpperCase() === "A";
      return ativo && /relat[óo]rio gerencial/.test(tipo);
    });
    if (match) {
      return {
        id: match.id,
        url: `${FNET_BASE}/visualizarDocumento?id=${match.id}`,
        dataReferencia: (match.dataReferencia ?? "").trim(),
      };
    }
    if (items.length < PAGE_SIZE) break;
    if (typeof json.recordsTotal === "number" && (page + 1) * PAGE_SIZE >= json.recordsTotal) break;
  }
  return null;
}

function onlyDigits(s: string | null): string {
  return (s ?? "").replace(/\D/g, "");
}

async function main(): Promise<void> {
  const all = await db.select({ id: fundsTable.id, nome: fundsTable.nome, cnpj: fundsTable.cnpj, relatorioPdfUrl: fundsTable.relatorioPdfUrl }).from(fundsTable);
  const targets = all
    .filter((f) => {
      const d = onlyDigits(f.cnpj);
      if (d.length !== 14) return false;
      if (!FORCE && f.relatorioPdfUrl) return false;
      return true;
    })
    .slice(0, LIMIT);

  console.log(`[backfill] total funds: ${all.length}, targets (missing relatório): ${targets.length}, concurrency=${CONCURRENCY}${FORCE ? " [FORCE]" : ""}`);
  if (targets.length === 0) {
    console.log("[backfill] nothing to do.");
    return;
  }

  let done = 0;
  let found = 0;
  let missing = 0;
  let errors = 0;
  const startedAt = Date.now();

  // Simple worker pool — concurrent FNET calls bounded by CONCURRENCY.
  let cursor = 0;
  async function worker(workerId: number): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= targets.length) return;
      const fund = targets[i];
      const cnpjDigits = onlyDigits(fund.cnpj);
      let lastErr: unknown = null;
      let success = false;
      for (let attempt = 0; attempt < RETRY_ATTEMPTS && !success; attempt++) {
        try {
          const doc = await discoverLatest(cnpjDigits);
          if (doc) {
            await db.update(fundsTable).set({ relatorioPdfUrl: doc.url }).where(eq(fundsTable.id, fund.id));
            found++;
          } else {
            missing++;
          }
          success = true;
        } catch (err) {
          lastErr = err;
          if (attempt < RETRY_ATTEMPTS - 1) await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (!success) {
        errors++;
        console.warn(`[backfill] w${workerId} #${fund.id} ${fund.nome.slice(0, 40)} cnpj=${cnpjDigits} ERR:`, lastErr instanceof Error ? lastErr.message : lastErr);
      }
      done++;
      if (done % 20 === 0 || done === targets.length) {
        const pct = ((done / targets.length) * 100).toFixed(1);
        const rate = (done / ((Date.now() - startedAt) / 1000)).toFixed(2);
        console.log(`[backfill] ${done}/${targets.length} (${pct}%) — found=${found} missing=${missing} err=${errors} @ ${rate}/s`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  const [{ withUrl }] = await db.select({ withUrl: sql<number>`count(*) FILTER (WHERE relatorio_pdf_url IS NOT NULL)::int` }).from(fundsTable);
  console.log(`[backfill] DONE in ${Math.round((Date.now() - startedAt) / 1000)}s. found=${found} missing=${missing} err=${errors}. Funds with relatório agora: ${withUrl}/${all.length}`);
}

main().catch((err) => {
  console.error("[backfill] FAILED", err);
  process.exit(1);
});
