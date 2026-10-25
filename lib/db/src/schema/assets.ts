import { pgTable, serial, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipoAtivo: text("tipo_ativo").notNull(),
  valorCaptacao: numeric("valor_captacao", { precision: 18, scale: 2 }).notNull(),
  roiPrevisto: numeric("roi_previsto", { precision: 8, scale: 2 }).notNull(),
  regiao: text("regiao").notNull(),
  estagio: text("estagio").notNull(),
  descricao: text("descricao"),
  garantias: text("garantias"),
  prazo: integer("prazo"),
  // ─── SPE / estrutura da operação (Phase 3 — onboarding estruturado) ───
  cnpjSpe: text("cnpj_spe"),
  incorporadora: text("incorporadora"),
  vgv: numeric("vgv", { precision: 18, scale: 2 }),                         // Valor Geral de Vendas
  percentualVendido: numeric("percentual_vendido", { precision: 6, scale: 2 }),
  equityAportado: numeric("equity_aportado", { precision: 18, scale: 2 }),
  patrimonioAfetacao: boolean("patrimonio_afetacao"),
  statusTerreno: text("status_terreno"),                                    // "comprado_pago" | "comprado_a_pagar" | "permuta" | "negociacao"
  statusLicenciamento: text("status_licenciamento"),                        // "aprovado" | "em_aprovacao" | "alvara_emitido" | "habite_se" | "pendente"
  numUnidades: integer("num_unidades"),
  passivosTotais: numeric("passivos_totais", { precision: 18, scale: 2 }),
  recebiveisTotais: numeric("recebiveis_totais", { precision: 18, scale: 2 }),
  caixaAtual: numeric("caixa_atual", { precision: 18, scale: 2 }),
  cronogramaMeses: integer("cronograma_meses"),                             // duração total da obra
  mesesDecorridos: integer("meses_decorridos"),
  tipoFunding: text("tipo_funding"),                                        // "equity" | "divida" | "mezanino" | "hibrido"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;
