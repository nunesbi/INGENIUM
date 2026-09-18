import { pgTable, serial, integer, numeric, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fundsTable } from "./funds";
import { assetsTable } from "./assets";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  fundoId: integer("fundo_id").notNull().references(() => fundsTable.id, { onDelete: "cascade" }),
  ativoId: integer("ativo_id").notNull().references(() => assetsTable.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 6, scale: 2 }).notNull(),
  similaridade: numeric("similaridade", { precision: 6, scale: 2 }).notNull().default("0"),
  scoreFinal: numeric("score_final", { precision: 6, scale: 2 }).notNull(),
  motivos: text("motivos").array().notNull().default([]),
  pontosFortes: text("pontos_fortes").array().notNull().default([]),
  pontosFracos: text("pontos_fracos").array().notNull().default([]),
  alertas: text("alertas").array().notNull().default([]),       // hard incompatibilities
  breakdown: jsonb("breakdown"),                                // per-axis score breakdown
  usouQualitative: text("usou_qualitative").notNull().default("nao"), // "sim" | "nao"
  explicacaoAI: text("explicacao_ai"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
