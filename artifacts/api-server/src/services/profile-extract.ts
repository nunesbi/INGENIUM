import { db, fundQualitativeTable } from "@workspace/db";
import { generateText } from "@workspace/integrations-gemini-ai-server";
import { sql } from "drizzle-orm";
import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";
import { PDFParse } from "pdf-parse";
import { isFnetUrl, fetchFnetPdf } from "./fnet-discovery";

async function extractPdfText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    try {
      await parser.destroy();
    } catch {
      /* ignore */
    }
  }
}

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
const FETCH_TIMEOUT_MS = 20_000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.slice("::ffff:".length);
      if (net.isIPv4(v4)) return isPrivateIp(v4);
    }
    return false;
  }
  return true; // unknown family => reject
}

async function safeFetchPdf(rawUrl: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Apenas URLs http(s) são aceitas");
  }
  if (url.username || url.password)
    throw new Error("Credenciais embutidas na URL não são permitidas");

  // Resolve host and block private/loopback IPs (SSRF guard)
  const addrs = await dnsLookup(url.hostname, { all: true });
  if (addrs.length === 0) throw new Error("Host não resolvido");
  for (const a of addrs) {
    if (isPrivateIp(a.address))
      throw new Error("Hosts privados/internos são bloqueados");
  }

  // FNET requires a cookie warmup against the viewer page before the PDF can be
  // downloaded — handled by the discovery service.
  if (isFnetUrl(rawUrl)) {
    return fetchFnetPdf(rawUrl, MAX_PDF_BYTES);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, redirect: "error" });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Falha ao baixar PDF: HTTP ${res.status}`);

  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct && !ct.includes("pdf") && !ct.includes("octet-stream")) {
    throw new Error(`Tipo de conteúdo não suportado: ${ct}`);
  }
  const lenHeader = res.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_PDF_BYTES) {
    throw new Error(
      `PDF muito grande (${lenHeader} bytes, limite ${MAX_PDF_BYTES})`,
    );
  }

  // Stream and enforce size limit even when Content-Length is absent
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Resposta sem corpo");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_PDF_BYTES) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        throw new Error(`PDF excede o limite de ${MAX_PDF_BYTES} bytes`);
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

const SYSTEM_PROMPT = `Você é um analista sênior de fundos imobiliários (FIIs). A partir do texto do relatório
gerencial mensal de um FII, extraia o perfil qualitativo COMPLETO do fundo em JSON estritamente
válido (sem markdown, sem texto fora do JSON) com este formato:

{
  "perfilRisco": "conservador" | "moderado" | "arrojado",
  "estrategia": string (2-3 frases descrevendo a tese de investimento),
  "tipoCotistaDesejado": string (ex: "investidor pessoa física de longo prazo", "institucional", "qualificado"),
  "focoRendaCrescimento": "renda" | "crescimento" | "renda e crescimento",
  "preocupacaoVolatilidade": "alta" | "média" | "baixa" (+ breve nota opcional),
  "palavrasChave": string[] (5-10 termos do próprio texto),

  "gestor": string (nome da gestora, ex: "Kinea Investimentos"),
  "administrador": string (nome do administrador, ex: "Intrag DTVM"),
  "patrimonioLiquido": number | null (em R$, valor absoluto — converta "R$ 4,2 bi" para 4200000000),
  "numCotistas": number | null (total de cotistas),
  "dyMensal": number | null (dividend yield mensal em % decimal, ex: 0.78 para 0,78%),

  "segmentoInferido": "tijolo-residencial" | "tijolo-comercial" | "tijolo-logistica" | "tijolo-shopping" | "tijolo-hibrido" | "papel-cri" | "fof" | "desenvolvimento" | "hibrido",
  "equityOuDivida": "equity" | "divida" | "hibrido" (CRIs/papel = "divida"; tijolo = "equity"),
  "desenvolvimentoOuRenda": "desenvolvimento" | "renda" | "hibrido",
  "ativoOuPassivo": "ativo" | "passivo" (gestão ativa rotaciona portfólio; passiva mantém),

  "ticketTipico": number | null (ticket médio de alocação por operação, em R$, se mencionado),
  "geografiaPreferida": string[] (estados/regiões/cidades onde o fundo aloca, ex: ["SP", "RJ", "Sudeste"]),
  "garantiasPreferidas": string[] (tipos de garantia citados, ex: ["alienação fiduciária", "cessão fiduciária de recebíveis", "aval"]),
  "tagsInferidas": string[] (5-8 tags curtas em snake_case que caracterizam o fundo, ex: ["high_grade", "longo_prazo", "cri_pulverizado", "renda_recorrente"]),

  "confidenceScore": number (0.0–1.0 — sua confiança na extração; baixo se o texto é vago/curto)
}

REGRAS:
- Use APENAS informações presentes no texto. NÃO INVENTE.
- Se um campo numérico não estiver claro, use null (não "não informado").
- Se um campo string não estiver claro, use "não informado".
- Para arrays, use [] quando não houver informação.
- Para FIIs de papel/CRI: equityOuDivida = "divida", desenvolvimentoOuRenda = "renda".
- Para FIIs de tijolo já estabilizados: equityOuDivida = "equity", desenvolvimentoOuRenda = "renda".
- Para FIIs de desenvolvimento/incorporação: desenvolvimentoOuRenda = "desenvolvimento".
- confidenceScore baixo (<0.5) quando o texto não traz detalhes claros sobre tese/estratégia.`;

interface ExtractedProfile {
  perfilRisco: string;
  estrategia: string;
  tipoCotistaDesejado: string;
  focoRendaCrescimento: string;
  preocupacaoVolatilidade: string;
  palavrasChave: string[];
  gestor: string;
  administrador: string;
  patrimonioLiquido: number | null;
  numCotistas: number | null;
  dyMensal: number | null;
  segmentoInferido: string;
  equityOuDivida: string;
  desenvolvimentoOuRenda: string;
  ativoOuPassivo: string;
  ticketTipico: number | null;
  geografiaPreferida: string[];
  garantiasPreferidas: string[];
  tagsInferidas: string[];
  confidenceScore: number;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

export async function extractProfileFromPdfUrl(
  cnpj: string,
  pdfUrl: string,
): Promise<ExtractedProfile> {
  const buffer = await safeFetchPdf(pdfUrl);

  const text = await extractPdfText(buffer);
  const truncated = text.slice(0, 18000);

  const raw = await generateText({
    systemInstruction: SYSTEM_PROMPT,
    prompt: `Texto do relatório gerencial:\n\n${truncated}`,
    maxOutputTokens: 2000,
    responseMimeType: "application/json",
  });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return JSON");
  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  const profile: ExtractedProfile = {
    perfilRisco: String(parsed.perfilRisco ?? "não informado"),
    estrategia: String(parsed.estrategia ?? "não informado"),
    tipoCotistaDesejado: String(parsed.tipoCotistaDesejado ?? "não informado"),
    focoRendaCrescimento: String(
      parsed.focoRendaCrescimento ?? "não informado",
    ),
    preocupacaoVolatilidade: String(
      parsed.preocupacaoVolatilidade ?? "não informado",
    ),
    palavrasChave: strArr(parsed.palavrasChave),
    gestor: String(parsed.gestor ?? "não informado"),
    administrador: String(parsed.administrador ?? "não informado"),
    patrimonioLiquido: num(parsed.patrimonioLiquido),
    numCotistas: num(parsed.numCotistas),
    dyMensal: num(parsed.dyMensal),
    segmentoInferido: String(parsed.segmentoInferido ?? "não informado"),
    equityOuDivida: String(parsed.equityOuDivida ?? "não informado"),
    desenvolvimentoOuRenda: String(
      parsed.desenvolvimentoOuRenda ?? "não informado",
    ),
    ativoOuPassivo: String(parsed.ativoOuPassivo ?? "não informado"),
    ticketTipico: num(parsed.ticketTipico),
    geografiaPreferida: strArr(parsed.geografiaPreferida),
    garantiasPreferidas: strArr(parsed.garantiasPreferidas),
    tagsInferidas: strArr(parsed.tagsInferidas),
    confidenceScore: num(parsed.confidenceScore) ?? 0.5,
  };

  const dbRow = {
    cnpj,
    perfilRisco: profile.perfilRisco,
    estrategia: profile.estrategia,
    tipoCotistaDesejado: profile.tipoCotistaDesejado,
    focoRendaCrescimento: profile.focoRendaCrescimento,
    preocupacaoVolatilidade: profile.preocupacaoVolatilidade,
    palavrasChave: profile.palavrasChave,
    gestor: profile.gestor,
    administrador: profile.administrador,
    patrimonioLiquido:
      profile.patrimonioLiquido !== null
        ? String(profile.patrimonioLiquido)
        : null,
    numCotistas: profile.numCotistas,
    dyMensal: profile.dyMensal !== null ? String(profile.dyMensal) : null,
    segmentoInferido: profile.segmentoInferido,
    equityOuDivida: profile.equityOuDivida,
    desenvolvimentoOuRenda: profile.desenvolvimentoOuRenda,
    ativoOuPassivo: profile.ativoOuPassivo,
    ticketTipico:
      profile.ticketTipico !== null ? String(profile.ticketTipico) : null,
    geografiaPreferida: profile.geografiaPreferida,
    garantiasPreferidas: profile.garantiasPreferidas,
    tagsInferidas: profile.tagsInferidas,
    confidenceScore: String(profile.confidenceScore),
    sourceUrl: pdfUrl,
  };

  await db
    .insert(fundQualitativeTable)
    .values(dbRow)
    .onConflictDoUpdate({
      target: fundQualitativeTable.cnpj,
      set: { ...dbRow, extractedAt: sql`now()` },
    });

  return profile;
}
