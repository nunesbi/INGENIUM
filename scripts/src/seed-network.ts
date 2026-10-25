/**
 * Seed da rede Ingenium: 100 incorporadoras, 100 empreendedores, 100 operações.
 * Idempotente: se já houver >=100 incorporadoras, não faz nada.
 *
 * Rodar: pnpm --filter @workspace/scripts run seed-network
 */
import {
  db,
  incorporadorasTable,
  empreendedoresTable,
  assetsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const CIDADES: Array<[string, string]> = [
  ["São Paulo", "SP"], ["Campinas", "SP"], ["Santos", "SP"], ["Ribeirão Preto", "SP"],
  ["São Bernardo", "SP"], ["Sorocaba", "SP"], ["São José dos Campos", "SP"], ["Bauru", "SP"],
  ["Rio de Janeiro", "RJ"], ["Niterói", "RJ"], ["Petrópolis", "RJ"], ["Cabo Frio", "RJ"],
  ["Belo Horizonte", "MG"], ["Uberlândia", "MG"], ["Juiz de Fora", "MG"], ["Contagem", "MG"],
  ["Curitiba", "PR"], ["Londrina", "PR"], ["Maringá", "PR"],
  ["Porto Alegre", "RS"], ["Caxias do Sul", "RS"], ["Pelotas", "RS"],
  ["Florianópolis", "SC"], ["Joinville", "SC"], ["Blumenau", "SC"], ["Itajaí", "SC"],
  ["Salvador", "BA"], ["Feira de Santana", "BA"],
  ["Recife", "PE"], ["Olinda", "PE"],
  ["Fortaleza", "CE"], ["Caucaia", "CE"],
  ["Natal", "RN"], ["Maceió", "AL"], ["João Pessoa", "PB"], ["Aracaju", "SE"],
  ["Goiânia", "GO"], ["Anápolis", "GO"], ["Brasília", "DF"],
  ["Cuiabá", "MT"], ["Campo Grande", "MS"],
  ["Vitória", "ES"], ["Vila Velha", "ES"], ["Serra", "ES"],
  ["Belém", "PA"], ["Manaus", "AM"],
];

const SEGMENTOS = [
  "Residencial alto padrão", "Residencial econômico", "Residencial médio padrão",
  "Comercial corporativo", "Loteamento", "Multiuso", "Logística", "Hotelaria",
  "Hospitalar", "Educacional", "Studios", "Built-to-suit",
];

const FOCOS = [
  "residencial-alto", "residencial-medio", "residencial-economico",
  "comercial", "loteamento", "multiuso", "logistica", "hotelaria",
];

const STATUS_INCORP = ["operacional", "em-captacao", "em-obra", "concluindo-ciclo"];

const NOMES_INCORP_PREFIXO = [
  "Atlas", "Mosaico", "Vértice", "Plenus", "Skyline", "Aurora", "Patrimar",
  "Brisa", "Cedro", "Bravo", "Núcleo", "Polo", "Horizonte", "Origem", "Sólida",
  "Terra", "Vetor", "Eixo", "Volta", "Praça", "Quadra", "Marco", "Pilar",
  "Cardeal", "Norte", "Sul", "Trilha", "Caminho", "Ponto", "Linha", "Centro",
  "Castro", "Madeira", "Pedra", "Argila", "Ferro", "Aço", "Concreto",
  "Cota", "Plano", "Forma", "Bloco", "Térreo", "Cobertura", "Pátio", "Praia",
];

const NOMES_INCORP_SUFIXO = [
  "Incorporadora", "Empreendimentos", "Desenvolvimento", "Construtora",
  "Real Estate", "Patrimônio", "Engenharia", "Urbanismo", "Properties",
  "Habitação", "Imobiliária", "Investimentos", "Capital",
];

const NOMES_PESSOA = [
  "Lucas Almeida", "Marina Souza", "Rafael Costa", "Patrícia Lima", "Bruno Pereira",
  "Camila Ribeiro", "Diego Santos", "Fernanda Oliveira", "Gustavo Martins", "Helena Rocha",
  "Igor Cardoso", "Juliana Mendes", "Leonardo Vieira", "Mariana Castro", "Nicolas Barbosa",
  "Olívia Carvalho", "Paulo Henrique", "Quésia Moraes", "Ricardo Nunes", "Sofia Araújo",
  "Thiago Ferreira", "Ursula Fonseca", "Vitor Hugo", "Wagner Teixeira", "Yara Pinto",
  "André Macedo", "Beatriz Andrade", "Carlos Eduardo", "Daniela Pacheco", "Eduardo Tavares",
  "Felipe Ramos", "Gabriela Lopes", "Henrique Cunha", "Isabela Marques", "João Vitor",
  "Karina Duarte", "Larissa Freitas", "Matheus Gomes", "Nathalia Reis", "Otávio Borges",
  "Priscila Caldas", "Rodrigo Bezerra", "Sabrina Dias", "Tatiana Brito", "Vinicius Sales",
  "Adriana Pires", "Bernardo Fagundes", "Carla Nogueira", "Daniel Coutinho", "Elaine Cordeiro",
  "Fábio Antunes", "Giovana Pinheiro", "Heitor Sampaio", "Ingrid Vasconcelos", "José Roberto",
  "Karla Sant'Ana", "Laura Bittencourt", "Marcelo Quintela", "Natalia Ramalho", "Otto Loureiro",
  "Pamela Drummond", "Raul Bastos", "Sílvia Magalhães", "Tomás Aleixo", "Valéria Schneider",
  "Wilson Galvão", "Xênia Peixoto", "Yuri Negrão", "Zélia Falcão", "Alan Resende",
  "Beatriz Hollanda", "Caio Belfort", "Débora Maia", "Eric Belmonte", "Flávia Vilanova",
  "Gilberto Salim", "Hellen Vaz", "Iuri Brandão", "Janaína Pacheco", "Klaus Aragão",
  "Larisa Bonfim", "Murilo Wanderley", "Naiara Quintana", "Ozéas Tavares", "Pietro Galvão",
  "Renan Buenos", "Stefany Kraemer", "Túlio Bertelli", "Úrsula Toledo", "Valter Cerqueira",
  "Wanda Aparício", "Xisto Andrade", "Yago Pessanha", "Zóe Castilho",
  "Alessandra Cintra", "Bruno Resende", "Cíntia Vaz", "Davi Mascarenhas", "Edson Galante",
  "Fátima Sequeira",
];

const CARGOS = [
  "Sócio-fundador", "CEO", "COO", "Diretor de Incorporação", "Diretor Comercial",
  "Diretor de Operações", "Diretor Financeiro", "Sócio-diretor", "Head de Novos Negócios",
];

const TIPOS_ATIVO = [
  "Residencial multifamily", "Residencial econômico", "Lajes corporativas",
  "Loteamento aberto", "Loteamento fechado", "Comercial street", "Multiuso",
  "Studios e flats", "Hotel midscale", "Galpão logístico",
];

const ESTAGIOS = ["Captação", "Pré-obra", "Obra inicial", "Obra avançada", "Pronto para entrega"];

const STATUS_TERRENO = ["comprado_pago", "comprado_a_pagar", "permuta", "negociacao"];
const STATUS_LIC = ["aprovado", "em_aprovacao", "alvara_emitido", "habite_se", "pendente"];
const TIPOS_FUNDING = ["equity", "divida", "mezanino", "hibrido"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function rangeInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function rangeFloat(min: number, max: number, decimals = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function buildIncorporadoraNomes(n: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let attempts = 0;
  while (out.length < n && attempts < n * 20) {
    attempts++;
    const nome = `${pick(NOMES_INCORP_PREFIXO)} ${pick(NOMES_INCORP_SUFIXO)}`;
    if (seen.has(nome)) continue;
    seen.add(nome);
    out.push(nome);
  }
  return out;
}

const TARGET = 100;

async function main() {
  // ── 1) Incorporadoras — completa até TARGET ─────────────────────────
  const existingIncorps = await db.select().from(incorporadorasTable);
  const faltamIncorps = Math.max(0, TARGET - existingIncorps.length);
  const allIncorpNomes: string[] = existingIncorps.map((r) => r.nome);

  if (faltamIncorps > 0) {
    const novosNomes = buildIncorporadoraNomes(faltamIncorps + existingIncorps.length)
      .filter((n) => !existingIncorps.some((r) => r.nome === n))
      .slice(0, faltamIncorps);
    console.log(`[seed-network] Inserindo ${novosNomes.length} incorporadoras (havia ${existingIncorps.length})...`);
    const incorpRows = novosNomes.map((nome) => {
      const [cidade, estado] = pick(CIDADES);
      return {
        nome,
        cidade,
        estado,
        segmentoFoco: pick(SEGMENTOS),
        anosAtuacao: rangeInt(3, 35),
        opsAtivas: rangeInt(1, 6),
        opsEntregues: rangeInt(3, 28),
        vgvHistorico: String(rangeInt(20_000_000, 1_200_000_000)),
        status: pick(STATUS_INCORP),
        monitorada: "ativa",
      };
    });
    if (incorpRows.length > 0) await db.insert(incorporadorasTable).values(incorpRows);
    allIncorpNomes.push(...novosNomes);
  } else {
    console.log(`[seed-network] Incorporadoras já em ${existingIncorps.length} (alvo ${TARGET}).`);
  }

  // ── 2) Empreendedores — completa até TARGET ─────────────────────────
  const existingEmps = await db.select().from(empreendedoresTable);
  const faltamEmps = Math.max(0, TARGET - existingEmps.length);
  if (faltamEmps > 0) {
    const usados = new Set(existingEmps.map((e) => e.nome));
    const disponiveis = NOMES_PESSOA.filter((n) => !usados.has(n));
    if (disponiveis.length < faltamEmps) {
      throw new Error(`Sem nomes suficientes em NOMES_PESSOA: faltam ${faltamEmps}, disponíveis ${disponiveis.length}`);
    }
    console.log(`[seed-network] Inserindo ${faltamEmps} empreendedores (havia ${existingEmps.length})...`);
    const empRows = disponiveis.slice(0, faltamEmps).map((nome, i) => {
      const [cidade, estado] = pick(CIDADES);
      return {
        nome,
        cargo: pick(CARGOS),
        cidade,
        estado,
        incorporadoraNome: allIncorpNomes[i % allIncorpNomes.length] ?? null,
        anosExperiencia: rangeInt(5, 32),
        opsEntregues: rangeInt(2, 22),
        vgvAcumulado: String(rangeInt(15_000_000, 850_000_000)),
        foco: pick(FOCOS),
        status: "monitorado",
      };
    });
    await db.insert(empreendedoresTable).values(empRows);
  } else {
    console.log(`[seed-network] Empreendedores já em ${existingEmps.length} (alvo ${TARGET}).`);
  }

  // ── 3) Operações (assets) — completa até TARGET ─────────────────────
  const existingAssets = await db.select().from(assetsTable);
  const faltamAssets = Math.max(0, TARGET - existingAssets.length);
  if (faltamAssets > 0) {
    console.log(`[seed-network] Inserindo ${faltamAssets} operações (havia ${existingAssets.length})...`);
    const assetRows = Array.from({ length: faltamAssets }).map((_, i) => {
      const incorp = allIncorpNomes[i % allIncorpNomes.length]!;
      const tipo = pick(TIPOS_ATIVO);
      const vgv = rangeInt(8_000_000, 380_000_000);
      const captacao = Math.round(vgv * rangeFloat(0.15, 0.55));
      const [cidade, estado] = pick(CIDADES);
      return {
        nome: `${tipo} — ${cidade}`,
        tipoAtivo: tipo,
        valorCaptacao: String(captacao),
        roiPrevisto: String(rangeFloat(9, 22)),
        regiao: `${cidade}/${estado}`,
        estagio: pick(ESTAGIOS),
        descricao: `Operação ${tipo.toLowerCase()} em ${cidade} estruturada pela ${incorp}.`,
        incorporadora: incorp,
        vgv: String(vgv),
        percentualVendido: String(rangeFloat(5, 75)),
        equityAportado: String(Math.round(vgv * rangeFloat(0.08, 0.25))),
        patrimonioAfetacao: Math.random() > 0.4,
        statusTerreno: pick(STATUS_TERRENO),
        statusLicenciamento: pick(STATUS_LIC),
        numUnidades: rangeInt(24, 360),
        cronogramaMeses: rangeInt(18, 48),
        mesesDecorridos: rangeInt(0, 18),
        tipoFunding: pick(TIPOS_FUNDING),
      };
    });
    await db.insert(assetsTable).values(assetRows);
  } else {
    console.log(`[seed-network] Operações já em ${existingAssets.length} (alvo ${TARGET}).`);
  }

  // ── Asserção final ──────────────────────────────────────────────────
  const [ic] = await db.select({ c: sqlCount() }).from(incorporadorasTable);
  const [ec] = await db.select({ c: sqlCount() }).from(empreendedoresTable);
  const [ac] = await db.select({ c: sqlCount() }).from(assetsTable);
  console.log(`[seed-network] Final → incorporadoras=${ic?.c} empreendedores=${ec?.c} operacoes=${ac?.c}`);
}

function sqlCount() {
  return sql<number>`count(*)::int`;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
