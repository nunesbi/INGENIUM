import { fundsTable, assetsTable, fundQualitativeTable } from "@workspace/db";

type FundRow = typeof fundsTable.$inferSelect;
type AssetRow = typeof assetsTable.$inferSelect;
type FundQualitative = typeof fundQualitativeTable.$inferSelect;

// ─── Normalization ───────────────────────────────────────────────────────

export function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  return normalize(s).split(/\s+/).filter(w => w.length >= 3);
}

/** Stem-based overlap: two strings share a >=4-char prefix on any word pair. */
function fuzzyOverlap(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) return false;
  if (normalize(a) === normalize(b)) return true;
  return wa.some(x =>
    wb.some(y => {
      if (x === y) return true;
      const stem = Math.min(x.length, y.length, 5);
      if (stem < 4) return false;
      return x.slice(0, stem) === y.slice(0, stem);
    })
  );
}

// ─── Brazil region / city map (city → state lowercase normalized) ────────

const CITY_TO_STATE: Record<string, string[]> = {
  "sao paulo": ["sao paulo", "sudeste"],
  "campinas": ["sao paulo", "sudeste"],
  "santos": ["sao paulo", "sudeste"],
  "guarulhos": ["sao paulo", "sudeste"],
  "osasco": ["sao paulo", "sudeste"],
  "santo andre": ["sao paulo", "sudeste"],
  "sao bernardo": ["sao paulo", "sudeste"],
  "sao bernardo do campo": ["sao paulo", "sudeste"],
  "barueri": ["sao paulo", "sudeste"],
  "cajamar": ["sao paulo", "sudeste"],
  "alphaville": ["sao paulo", "sudeste"],
  "faria lima": ["sao paulo", "sudeste"],
  "itaim": ["sao paulo", "sudeste"],
  "pinheiros": ["sao paulo", "sudeste"],
  "vila olimpia": ["sao paulo", "sudeste"],
  "berrini": ["sao paulo", "sudeste"],
  "ribeirao preto": ["sao paulo", "sudeste"],
  "rio de janeiro": ["rio de janeiro", "sudeste"],
  "niteroi": ["rio de janeiro", "sudeste"],
  "barra da tijuca": ["rio de janeiro", "sudeste"],
  "ipanema": ["rio de janeiro", "sudeste"],
  "leblon": ["rio de janeiro", "sudeste"],
  "copacabana": ["rio de janeiro", "sudeste"],
  "belo horizonte": ["minas gerais", "sudeste"],
  "uberlandia": ["minas gerais", "sudeste"],
  "minas gerais": ["minas gerais", "sudeste"],
  "espirito santo": ["espirito santo", "sudeste"],
  "vitoria": ["espirito santo", "sudeste"],
  "brasilia": ["distrito federal", "centro oeste"],
  "goiania": ["goias", "centro oeste"],
  "cuiaba": ["mato grosso", "centro oeste"],
  "campo grande": ["mato grosso do sul", "centro oeste"],
  "curitiba": ["parana", "sul"],
  "londrina": ["parana", "sul"],
  "porto alegre": ["rio grande do sul", "sul"],
  "florianopolis": ["santa catarina", "sul"],
  "joinville": ["santa catarina", "sul"],
  "salvador": ["bahia", "nordeste"],
  "recife": ["pernambuco", "nordeste"],
  "fortaleza": ["ceara", "nordeste"],
  "natal": ["rio grande do norte", "nordeste"],
  "joao pessoa": ["paraiba", "nordeste"],
  "maceio": ["alagoas", "nordeste"],
  "aracaju": ["sergipe", "nordeste"],
  "sao luis": ["maranhao", "nordeste"],
  "teresina": ["piaui", "nordeste"],
  "belem": ["para", "norte"],
  "manaus": ["amazonas", "norte"],
  "porto velho": ["rondonia", "norte"],
  "boa vista": ["roraima", "norte"],
  "rio branco": ["acre", "norte"],
};

const NATIONAL_KEYWORDS = ["nacional", "todo brasil", "brasil", "national"];

function regionMatches(assetRegion: string, fundRegioes: string[]): { match: boolean; strong: boolean } {
  const a = normalize(assetRegion);
  const fundNorm = fundRegioes.map(normalize);
  if (fundNorm.some(f => NATIONAL_KEYWORDS.includes(f))) return { match: true, strong: true };
  if (fundNorm.includes(a)) return { match: true, strong: true };
  if (fundNorm.some(f => fuzzyOverlap(a, f))) return { match: true, strong: true };
  const aliases = CITY_TO_STATE[a];
  if (aliases) {
    if (aliases.some(al => fundNorm.includes(al) || fundNorm.some(f => fuzzyOverlap(al, f)))) {
      return { match: true, strong: true };
    }
  }
  for (const f of fundNorm) {
    const fAliases = CITY_TO_STATE[f];
    if (fAliases && (fAliases.includes(a) || (aliases && fAliases.some(fa => aliases.includes(fa))))) {
      return { match: true, strong: false };
    }
  }
  return { match: false, strong: false };
}

// ─── Segment synonyms ────────────────────────────────────────────────────

const SEGMENT_SYNONYMS: Array<string[]> = [
  ["galpao", "logistica", "logistico", "industrial", "armazem", "warehouse", "centro de distribuicao", "condominio logistico"],
  ["laje", "corporativa", "corporativo", "escritorio", "office", "comercial", "aaa", "triple a"],
  ["residencial", "residential", "apartamento", "moradia", "housing", "multifamily", "residencias", "imovel residencial", "vertical", "incorporacao residencial"],
  ["shopping", "varejo", "retail", "mall", "comercio", "centro comercial", "strip mall"],
  ["hotel", "hotelaria", "hospitalidade", "hospitality", "resort", "pousada"],
  ["loteamento", "incorporacao", "desenvolvimento", "greenfield", "construcao"],
  ["misto", "mixed use", "multiuso", "uso misto"],
  ["hospital", "saude", "healthcare", "clinica"],
  ["educacional", "escola", "universidade", "education"],
  ["agronegocio", "rural", "fazenda", "agricola"],
  ["cri", "papel", "recebivel", "credito imobiliario", "divida"],
  ["fof", "fundo de fundos"],
];

function expandSegment(s: string): Set<string> {
  const norm = normalize(s);
  const expanded = new Set<string>([norm]);
  for (const group of SEGMENT_SYNONYMS) {
    if (group.some(g => norm.includes(g) || g.includes(norm) || fuzzyOverlap(norm, g))) {
      group.forEach(g => expanded.add(g));
    }
  }
  return expanded;
}

function segmentMatches(tipoAtivo: string, fundSegmentos: string[]): "strong" | "partial" | "none" {
  const assetTerms = expandSegment(tipoAtivo);
  const fundTerms = new Set<string>();
  for (const seg of fundSegmentos) {
    expandSegment(seg).forEach(t => fundTerms.add(t));
  }
  for (const a of assetTerms) {
    for (const f of fundTerms) {
      if (a === f) return "strong";
      if (a.includes(f) || f.includes(a)) return "strong";
      if (fuzzyOverlap(a, f)) return "strong";
    }
  }
  const fundJoined = fundSegmentos.map(normalize).join(" ");
  if (/imobiliari|real estate|multi(\s)?(ativos|categoria|mercado)|diversificad|hibrido|hybrid|outros|generico/.test(fundJoined)) {
    return "partial";
  }
  return "none";
}

// ─── Tag overlap (Jaccard-like) ──────────────────────────────────────────

function tagOverlap(fundTags: string[], assetText: string): { hits: string[]; count: number } {
  const text = normalize(assetText);
  if (!text) return { hits: [], count: 0 };
  const hits: string[] = [];
  for (const t of fundTags) {
    const norm = normalize(t.replace(/_/g, " "));
    if (!norm) continue;
    // Hit if any meaningful token of the tag appears in the asset text
    const toks = norm.split(/\s+/).filter((w) => w.length >= 4);
    if (toks.some((w) => text.includes(w))) hits.push(t);
  }
  return { hits, count: hits.length };
}

// ─── Main scoring ────────────────────────────────────────────────────────

export interface MatchScore {
  score: number;
  motivos: string[];
  pontosFortes: string[];
  pontosFracos: string[];
  alertas: string[];
  breakdown: Record<string, { score: number; max: number; nota: string }>;
  usouQualitative: boolean;
  disqualifiers: string[];
}

// ─── Hard gates ─────────────────────────────────────────────────────────
// Critérios MANDATÓRIOS. Se qualquer um falhar, o fundo é desqualificado
// (score = 0) e não aparece como compatível. Isso garante que o top de
// compatibilidade só mostre fundos com tese realmente compatível.
function evaluateHardGates(
  fund: FundRow,
  ativo: AssetRow,
  qual: FundQualitative | null,
): string[] {
  const disq: string[] = [];

  // 1. Segmento: tese tem que cobrir o tipo de ativo. Sem isso, nada feito.
  const segResult = segmentMatches(ativo.tipoAtivo, (fund.segmentos as string[]) || []);
  if (segResult === "none") {
    disq.push(`Segmento "${ativo.tipoAtivo}" fora da tese declarada do fundo (${(fund.segmentos as string[]).join(", ") || "n/d"})`);
  }

  // 2. Equity vs Dívida (CRI): fundo de papel não cabe em tijolo, e vice-versa.
  if (qual) {
    const ed = normalize(qual.equityOuDivida ?? "");
    const assetNorm = normalize(`${ativo.nome} ${ativo.descricao ?? ""} ${ativo.tipoAtivo}`);
    const assetIsCri = /\bcri\b|recebivel|credito imobiliario|papel/.test(assetNorm);
    if (ed === "divida" && !assetIsCri) {
      disq.push(`Fundo de DÍVIDA (CRI), ativo é equity/tijolo`);
    }
    if (ed === "equity" && assetIsCri) {
      disq.push(`Fundo de EQUITY (tijolo), ativo é dívida/CRI`);
    }

    // 4. Dev vs Renda: fundo de RENDA pura não absorve lançamento/greenfield.
    const fundFoco = normalize(qual.desenvolvimentoOuRenda ?? "");
    const estagioNorm = normalize(ativo.estagio);
    const assetIsDev = /lancamento|greenfield|incorporacao|desenvolvimento|obra|construcao|terreno|pre.viabilidade|pre.lancamento/.test(`${assetNorm} ${estagioNorm}`);
    if (fundFoco === "renda" && assetIsDev) {
      disq.push(`Fundo é de RENDA pura, ativo está em desenvolvimento/lançamento`);
    }
  }

  // 5. Risco × Estágio: fundo "baixo risco" não pega greenfield.
  const risco = normalize(fund.nivelRisco);
  const estagioNorm = normalize(ativo.estagio);
  if (risco === "baixo" && /lancamento|greenfield|terreno|pre.viabilidade/.test(estagioNorm)) {
    disq.push(`Fundo declarado "baixo risco" incompatível com estágio "${ativo.estagio}"`);
  }

  return disq;
}

export function calcLogicalScore(
  fund: FundRow,
  ativo: AssetRow,
  qual: FundQualitative | null = null,
): MatchScore {
  const pontosFortes: string[] = [];
  const pontosFracos: string[] = [];
  const alertas: string[] = [];
  const breakdown: MatchScore["breakdown"] = {};
  const fmtBRL = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;

  // ── Ticket (max 22) ──
  const captacao = Number(ativo.valorCaptacao);
  const ticketMin = Number(fund.ticketMin);
  const ticketMax = Number(fund.ticketMax);
  let ticketPts = 0;
  if (captacao >= ticketMin && captacao <= ticketMax) {
    ticketPts = 22;
    pontosFortes.push(`Ticket ${fmtBRL(captacao)} dentro do range do fundo (${fmtBRL(ticketMin)} – ${fmtBRL(ticketMax)})`);
  } else if (captacao >= ticketMin * 0.7 && captacao <= ticketMax * 1.5) {
    ticketPts = 13;
    pontosFortes.push(`Ticket ${fmtBRL(captacao)} próximo do range`);
  } else if (captacao >= ticketMin * 0.5 && captacao <= ticketMax * 2) {
    ticketPts = 6;
    pontosFracos.push(`Ticket fora do range ideal (${fmtBRL(ticketMin)} – ${fmtBRL(ticketMax)})`);
  } else {
    pontosFracos.push(`Ticket muito distante do range do fundo`);
    alertas.push(`Ticket fora dos limites operacionais do fundo`);
  }
  breakdown.ticket = { score: ticketPts, max: 22, nota: `${fmtBRL(captacao)} vs range` };

  // ── Region (max 16) ──
  const fundRegioes = (fund.regioes as string[]) || [];
  const region = regionMatches(ativo.regiao, fundRegioes);
  let regionPts = 0;
  if (region.match && region.strong) {
    regionPts = 16;
    pontosFortes.push(`Região "${ativo.regiao}" prioritária para o fundo`);
  } else if (region.match) {
    regionPts = 10;
    pontosFortes.push(`Região "${ativo.regiao}" na mesma área geográfica do fundo`);
  } else {
    pontosFracos.push(`Região "${ativo.regiao}" fora do foco do fundo`);
  }
  breakdown.regiao = { score: regionPts, max: 16, nota: ativo.regiao };

  // ── Segment (max 25) ──
  const fundSegmentos = (fund.segmentos as string[]) || [];
  const segResult = segmentMatches(ativo.tipoAtivo, fundSegmentos);
  let segPts = 0;
  if (segResult === "strong") {
    segPts = 25;
    pontosFortes.push(`Tipo "${ativo.tipoAtivo}" alinhado com a tese do fundo`);
  } else if (segResult === "partial") {
    segPts = 14;
    pontosFortes.push(`Tipo "${ativo.tipoAtivo}" compatível com a tese genérica do fundo`);
  } else {
    pontosFracos.push(`Tipo "${ativo.tipoAtivo}" não alinhado com a tese`);
    alertas.push(`Segmento do ativo fora da tese declarada do fundo`);
  }
  breakdown.segmento = { score: segPts, max: 25, nota: ativo.tipoAtivo };

  // ── ROI (max 12) ──
  const roiPrevisto = Number(ativo.roiPrevisto);
  const roiMinimo = Number(fund.roiMinimo);
  let roiPts = 0;
  if (roiPrevisto >= roiMinimo + 3) { roiPts = 12; pontosFortes.push(`ROI ${roiPrevisto}% bem acima do mínimo (${roiMinimo}%)`); }
  else if (roiPrevisto >= roiMinimo) { roiPts = 9; pontosFortes.push(`ROI ${roiPrevisto}% acima do mínimo (${roiMinimo}%)`); }
  else if (roiPrevisto >= roiMinimo - 2) { roiPts = 4; pontosFracos.push(`ROI ${roiPrevisto}% ligeiramente abaixo do mínimo (${roiMinimo}%)`); }
  else { pontosFracos.push(`ROI ${roiPrevisto}% abaixo do mínimo (${roiMinimo}%)`); }
  breakdown.roi = { score: roiPts, max: 12, nota: `${roiPrevisto}% vs ${roiMinimo}%` };

  // ── Risco × Estágio (max 10) ──
  const risco = normalize(fund.nivelRisco);
  const estagio = normalize(ativo.estagio);
  const fundEstagio = normalize(fund.estagio);
  const riscoOk =
    risco === "alto" ||
    (risco === "medio" && !/greenfield|lancamento/.test(estagio)) ||
    (risco === "baixo" && /pronto|entregue|operacional|estabilizad/.test(estagio));
  const estagioOk =
    fundEstagio === "" || fundEstagio === "todos" || fundEstagio === "qualquer" || fuzzyOverlap(estagio, fundEstagio);
  let rsPts = 0;
  if (riscoOk && estagioOk) { rsPts = 10; pontosFortes.push(`Estágio "${ativo.estagio}" + risco "${fund.nivelRisco}" compatíveis`); }
  else if (riscoOk || estagioOk) { rsPts = 6; pontosFracos.push(`Estágio/risco parcialmente compatíveis`); }
  else { pontosFracos.push(`Estágio "${ativo.estagio}" pouco alinhado com risco "${fund.nivelRisco}"`); }
  breakdown.risco_estagio = { score: rsPts, max: 10, nota: `${ativo.estagio} × ${fund.nivelRisco}` };

  // ═══════════════════════════════════════════════════════════════════════
  // Qualitative-driven signals (max 15) — only when fund_qualitative exists
  // ═══════════════════════════════════════════════════════════════════════
  let theseAlignPts = 0, devRendaPts = 0, tagsPts = 0;
  const usouQualitative = !!qual;

  if (qual) {
    const assetText = `${ativo.nome} ${ativo.descricao ?? ""} ${ativo.tipoAtivo} ${ativo.estagio} ${ativo.garantias ?? ""}`;
    const assetNorm = normalize(assetText);

    // ── Thesis alignment via word overlap between estrategia + palavrasChave and asset (max 7)
    const fundThesis = `${qual.estrategia ?? ""} ${(qual.palavrasChave ?? []).join(" ")}`;
    const thesisWords = words(fundThesis).filter((w) => w.length >= 5);
    const uniqWords = Array.from(new Set(thesisWords));
    const hits = uniqWords.filter((w) => assetNorm.includes(w));
    const ratio = uniqWords.length > 0 ? hits.length / uniqWords.length : 0;
    theseAlignPts = Math.min(7, Math.round(ratio * 14));
    if (theseAlignPts >= 5) pontosFortes.push(`Tese do fundo alinhada ao ativo (${hits.length}/${uniqWords.length} termos)`);
    else if (theseAlignPts >= 2) pontosFortes.push(`Alguma aderência à tese do fundo (${hits.length} termos em comum)`);
    breakdown.tese = { score: theseAlignPts, max: 7, nota: `${hits.length}/${uniqWords.length} termos` };

    // ── desenvolvimento vs renda alignment (max 4) — most common deal-breaker
    const fundFoco = normalize(qual.desenvolvimentoOuRenda ?? "");
    const assetIsDev = /lancamento|greenfield|incorporacao|desenvolvimento|obra|construcao|terreno/.test(assetNorm);
    const assetIsRenda = /pronto|entregue|operacional|estabilizad|locado|gerando renda/.test(assetNorm);
    if (fundFoco === "renda" && assetIsDev) {
      alertas.push(`Fundo busca RENDA, mas ativo é de DESENVOLVIMENTO/incorporação`);
    } else if (fundFoco === "desenvolvimento" && assetIsRenda) {
      pontosFracos.push(`Fundo busca desenvolvimento, ativo já está em renda`);
      devRendaPts = 1;
    } else if (fundFoco === "renda" && assetIsRenda) {
      devRendaPts = 4;
      pontosFortes.push(`Ativo em renda alinhado com o foco "renda" do fundo`);
    } else if (fundFoco === "desenvolvimento" && assetIsDev) {
      devRendaPts = 4;
      pontosFortes.push(`Ativo em desenvolvimento alinhado com o foco do fundo`);
    } else if (fundFoco === "hibrido") {
      devRendaPts = 3;
    } else {
      devRendaPts = 2;
    }
    breakdown.dev_renda = { score: devRendaPts, max: 4, nota: `fundo=${fundFoco}` };

    // ── Tag overlap (max 4)
    const { hits: tagHits, count } = tagOverlap(qual.tagsInferidas ?? [], assetText);
    tagsPts = Math.min(4, count);
    if (tagsPts >= 2) pontosFortes.push(`Tags do fundo presentes no ativo: ${tagHits.join(", ")}`);
    breakdown.tags = { score: tagsPts, max: 4, nota: tagHits.join(", ") || "—" };

    // ── Hard alerts based on equityOuDivida ──
    const ed = normalize(qual.equityOuDivida ?? "");
    const assetIsCri = /cri|recebivel|credito imobiliario|papel/.test(assetNorm);
    if (ed === "divida" && !assetIsCri) {
      alertas.push(`Fundo de DÍVIDA (CRI), mas ativo é equity/tijolo`);
    }
    if (ed === "equity" && assetIsCri) {
      alertas.push(`Fundo de EQUITY (tijolo), mas ativo é dívida/CRI`);
    }
  }

  // Hard gates: se qualquer critério mandatório falhar, score = 0.
  const disqualifiers = evaluateHardGates(fund, ativo, qual);
  if (disqualifiers.length > 0) {
    return {
      score: 0,
      motivos: disqualifiers,
      pontosFortes: [],
      pontosFracos: disqualifiers,
      alertas: disqualifiers,
      breakdown,
      usouQualitative,
      disqualifiers,
    };
  }

  const rawScore = ticketPts + regionPts + segPts + roiPts + rsPts + theseAlignPts + devRendaPts + tagsPts;
  // Soft alertas (não-gate) reduzem 10 cada.
  const alertPenalty = alertas.length * 10;
  const finalScore = Math.max(0, Math.min(100, rawScore - alertPenalty));

  const motivos = [...pontosFortes, ...pontosFracos];
  return { score: finalScore, motivos, pontosFortes, pontosFracos, alertas, breakdown, usouQualitative, disqualifiers: [] };
}
