import { assetsTable } from "@workspace/db";

type AssetRow = typeof assetsTable.$inferSelect;

export interface Pendencia {
  campo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  categoria: "estrutura" | "documental" | "financeiro" | "comercial";
}

export interface UnderwritingResult {
  readinessScore: number;                                 // 0-100, completeness of structured data
  complianceScore: number;                                // 0-100, presence of required compliance signals
  riskFlags: string[];                                    // structural risk warnings (high LTV, low equity, etc.)
  pendencias: Pendencia[];
  breakdown: {
    estrutura: { score: number; max: number };
    financeiro: { score: number; max: number };
    comercial: { score: number; max: number };
    documental: { score: number; max: number };
  };
  recomendacao: "alta" | "media" | "baixa" | "indefinida";
}

// Required structured fields by category, each worth its listed weight.
const ESTRUTURA_FIELDS: Array<[keyof AssetRow, string, number]> = [
  ["cnpjSpe", "CNPJ da SPE", 3],
  ["incorporadora", "Nome da incorporadora", 2],
  ["statusTerreno", "Status do terreno", 4],
  ["statusLicenciamento", "Status do licenciamento", 4],
  ["patrimonioAfetacao", "Patrimônio de afetação", 3],
  ["numUnidades", "Número de unidades", 2],
  ["cronogramaMeses", "Cronograma total (meses)", 2],
];

const FINANCEIRO_FIELDS: Array<[keyof AssetRow, string, number]> = [
  ["vgv", "VGV (Valor Geral de Vendas)", 5],
  ["equityAportado", "Equity já aportado", 4],
  ["caixaAtual", "Caixa atual", 3],
  ["passivosTotais", "Passivos totais", 3],
  ["recebiveisTotais", "Recebíveis totais", 3],
  ["tipoFunding", "Tipo de funding pretendido", 2],
];

const COMERCIAL_FIELDS: Array<[keyof AssetRow, string, number]> = [
  ["percentualVendido", "Percentual vendido", 5],
  ["garantias", "Garantias ofertadas", 5],
];

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v);
  return true;
}

export function computeUnderwriting(asset: AssetRow): UnderwritingResult {
  const pendencias: Pendencia[] = [];
  const riskFlags: string[] = [];

  // ── Per-category completeness scoring ──
  const scoreCategory = (
    fields: Array<[keyof AssetRow, string, number]>,
    categoria: Pendencia["categoria"],
  ) => {
    let score = 0;
    let max = 0;
    for (const [field, label, weight] of fields) {
      max += weight;
      const present = hasValue(asset[field]);
      if (present) {
        score += weight;
      } else {
        pendencias.push({
          campo: String(field),
          descricao: `Faltando: ${label}`,
          severidade: weight >= 4 ? "alta" : weight >= 2 ? "media" : "baixa",
          categoria,
        });
      }
    }
    return { score, max };
  };

  const estrutura = scoreCategory(ESTRUTURA_FIELDS, "estrutura");
  const financeiro = scoreCategory(FINANCEIRO_FIELDS, "financeiro");
  const comercial = scoreCategory(COMERCIAL_FIELDS, "comercial");

  // ── Documental (placeholder until docs table is integrated) ──
  // We currently have only the `garantias` text field as a documental proxy.
  // When the docs system is integrated, expand this.
  const documental = {
    score: hasValue(asset.garantias) ? 3 : 0,
    max: 3,
  };
  if (documental.score === 0) {
    pendencias.push({
      campo: "documental",
      descricao: "Nenhuma documentação registrada",
      severidade: "alta",
      categoria: "documental",
    });
  }

  const totalScore = estrutura.score + financeiro.score + comercial.score + documental.score;
  const totalMax = estrutura.max + financeiro.max + comercial.max + documental.max;
  const readinessScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  // ── Risk flags from financial structure ──
  const vgv = asset.vgv !== null ? Number(asset.vgv) : null;
  const equity = asset.equityAportado !== null ? Number(asset.equityAportado) : null;
  const captacao = Number(asset.valorCaptacao);
  const passivos = asset.passivosTotais !== null ? Number(asset.passivosTotais) : null;
  const recebiveis = asset.recebiveisTotais !== null ? Number(asset.recebiveisTotais) : null;
  const vendido = asset.percentualVendido !== null ? Number(asset.percentualVendido) : null;

  if (vgv !== null && captacao > 0) {
    const exposureRatio = captacao / vgv;
    if (exposureRatio > 0.6) {
      riskFlags.push(`Alta exposição: captação representa ${Math.round(exposureRatio * 100)}% do VGV`);
    }
  }
  if (vgv !== null && equity !== null && vgv > 0) {
    const equityRatio = equity / vgv;
    if (equityRatio < 0.1) {
      riskFlags.push(`Equity baixo: apenas ${Math.round(equityRatio * 100)}% do VGV foi aportado`);
    }
  }
  if (passivos !== null && recebiveis !== null && passivos > recebiveis) {
    riskFlags.push(`Passivos (R$ ${passivos.toLocaleString("pt-BR")}) > recebíveis (R$ ${recebiveis.toLocaleString("pt-BR")})`);
  }
  if (vendido !== null && vendido < 20 && /lancamento|obra|construcao/i.test(asset.estagio)) {
    riskFlags.push(`Baixo percentual vendido (${vendido}%) para estágio em obra/lançamento`);
  }
  if (asset.patrimonioAfetacao === false) {
    riskFlags.push("SPE SEM patrimônio de afetação — exposição patrimonial elevada");
  }

  // ── Compliance score = base on critical "must-have" fields ──
  const criticalFields: Array<keyof AssetRow> = [
    "cnpjSpe", "statusTerreno", "statusLicenciamento", "patrimonioAfetacao",
    "vgv", "equityAportado", "garantias",
  ];
  const criticalPresent = criticalFields.filter((f) => hasValue(asset[f])).length;
  const complianceScore = Math.round((criticalPresent / criticalFields.length) * 100);

  // ── Recomendação ──
  let recomendacao: UnderwritingResult["recomendacao"];
  if (readinessScore < 30) recomendacao = "indefinida";
  else if (readinessScore >= 75 && complianceScore >= 70 && riskFlags.length <= 1) recomendacao = "alta";
  else if (readinessScore >= 50 && complianceScore >= 50) recomendacao = "media";
  else recomendacao = "baixa";

  return {
    readinessScore,
    complianceScore,
    riskFlags,
    pendencias: pendencias.sort((a, b) => {
      const sev = { alta: 0, media: 1, baixa: 2 };
      return sev[a.severidade] - sev[b.severidade];
    }),
    breakdown: { estrutura, financeiro, comercial, documental },
    recomendacao,
  };
}
