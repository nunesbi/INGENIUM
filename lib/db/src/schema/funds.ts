import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fundsTable = pgTable("funds", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tese: text("tese").notNull(),
  ticketMin: numeric("ticket_min", { precision: 18, scale: 2 }).notNull(),
  ticketMax: numeric("ticket_max", { precision: 18, scale: 2 }).notNull(),
  segmentos: text("segmentos").array().notNull().default([]),
  regioes: text("regioes").array().notNull().default([]),
  nivelRisco: text("nivel_risco").notNull(),
  roiMinimo: numeric("roi_minimo", { precision: 8, scale: 2 }).notNull(),
  descricao: text("descricao"),
  estagio: text("estagio").notNull(),
  cnpj: text("cnpj"),
  ticker: text("ticker"),
  relatorioPdfUrl: text("relatorio_pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFundSchema = createInsertSchema(fundsTable).omit({ id: true, createdAt: true });
export type InsertFund = z.infer<typeof insertFundSchema>;
export type Fund = typeof fundsTable.$inferSelect;
