import { pgTable, serial, text, integer, numeric, timestamp, date, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";

/**
 * Monthly metrics for a fund, sourced from CVM "Informe Mensal FII" open data.
 * Indexed by CNPJ + reference month so we can upsert as new informes are published.
 */
export const fundMonthlyReportsTable = pgTable(
  "fund_monthly_reports",
  {
    id: serial("id").primaryKey(),
    cnpj: text("cnpj").notNull(),
    dataReferencia: date("data_referencia").notNull(),
    numCotistas: integer("num_cotistas"),
    valorPatrimonialCota: numeric("valor_patrimonial_cota", { precision: 24, scale: 6 }),
    patrimonioLiquido: numeric("patrimonio_liquido", { precision: 28, scale: 2 }),
    rentabilidadeMes: numeric("rentabilidade_mes", { precision: 10, scale: 4 }),
    dividendYieldMes: numeric("dividend_yield_mes", { precision: 10, scale: 4 }),
    percentualMaiorCotista: numeric("percentual_maior_cotista", { precision: 8, scale: 4 }),
    sourceUrl: text("source_url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqCnpjDate: uniqueIndex("fund_monthly_reports_cnpj_date_uidx").on(t.cnpj, t.dataReferencia),
  }),
);
export type FundMonthlyReport = typeof fundMonthlyReportsTable.$inferSelect;

/**
 * Qualitative profile extracted from relatórios gerenciais (PDFs).
 * One row per fund (latest extraction), updatable via AI extraction endpoint.
 */
export const fundQualitativeTable = pgTable(
  "fund_qualitative",
  {
    id: serial("id").primaryKey(),
    cnpj: text("cnpj").notNull().unique(),
    perfilRisco: text("perfil_risco"),
    estrategia: text("estrategia"),
    tipoCotistaDesejado: text("tipo_cotista_desejado"),
    focoRendaCrescimento: text("foco_renda_crescimento"),
    preocupacaoVolatilidade: text("preocupacao_volatilidade"),
    palavrasChave: text("palavras_chave").array().notNull().default([]),
    // ── Inteligência v2 — extracted from the same PDF
    gestor: text("gestor"),
    administrador: text("administrador"),
    patrimonioLiquido: numeric("patrimonio_liquido", { precision: 28, scale: 2 }),
    numCotistas: integer("num_cotistas"),
    dyMensal: numeric("dy_mensal", { precision: 10, scale: 4 }),
    segmentoInferido: text("segmento_inferido"),       // canonical: tijolo-residencial, papel/CRI, FoF, híbrido, logística…
    equityOuDivida: text("equity_ou_divida"),          // equity | divida | hibrido
    desenvolvimentoOuRenda: text("desenvolvimento_ou_renda"), // desenvolvimento | renda | hibrido
    ativoOuPassivo: text("ativo_ou_passivo"),          // ativo | passivo
    ticketTipico: numeric("ticket_tipico", { precision: 22, scale: 2 }),
    geografiaPreferida: text("geografia_preferida").array().notNull().default([]),
    garantiasPreferidas: text("garantias_preferidas").array().notNull().default([]),
    tagsInferidas: text("tags_inferidas").array().notNull().default([]),
    confidenceScore: numeric("confidence_score", { precision: 4, scale: 2 }), // 0–1
    sourceUrl: text("source_url"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
  },
);
export type FundQualitative = typeof fundQualitativeTable.$inferSelect;

/**
 * Offerings (IPO / emissão) — public-facing prospectus snapshot.
 */
export const fundOfferingsTable = pgTable(
  "fund_offerings",
  {
    id: serial("id").primaryKey(),
    cnpj: text("cnpj").notNull(),
    codigoOferta: text("codigo_oferta"),
    dataInicio: date("data_inicio"),
    dataEncerramento: date("data_encerramento"),
    valorTotal: numeric("valor_total", { precision: 22, scale: 2 }),
    publicoAlvo: text("publico_alvo"),
    exigeQualificado: text("exige_qualificado"),
    perfilEsperado: text("perfil_esperado"),
    sourceUrl: text("source_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    cnpjDataIdx: index("fund_offerings_cnpj_data_idx").on(t.cnpj, t.dataInicio),
  }),
);
export type FundOffering = typeof fundOfferingsTable.$inferSelect;

/**
 * Tracks each CVM sync run for observability.
 */
export const fundSyncLogTable = pgTable(
  "fund_sync_log",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(), // "cvm-monthly", "pdf-extract", "manual"
    status: text("status").notNull(), // "ok" | "error" | "partial"
    cnpjsUpdated: integer("cnpjs_updated").default(0),
    rowsUpserted: integer("rows_upserted").default(0),
    message: text("message"),
    details: jsonb("details"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => ({
    startedAtIdx: index("fund_sync_log_started_at_idx").on(t.startedAt),
  }),
);
export type FundSyncLog = typeof fundSyncLogTable.$inferSelect;
