import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const incorporadorasTable = pgTable("incorporadoras", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cidade: text("cidade").notNull(),
  estado: text("estado").notNull(),
  segmentoFoco: text("segmento_foco").notNull(),
  anosAtuacao: integer("anos_atuacao").notNull(),
  opsAtivas: integer("ops_ativas").notNull().default(0),
  opsEntregues: integer("ops_entregues").notNull().default(0),
  vgvHistorico: numeric("vgv_historico", { precision: 18, scale: 2 }),
  status: text("status").notNull(),
  monitorada: text("monitorada").notNull().default("ativa"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const empreendedoresTable = pgTable("empreendedores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cargo: text("cargo").notNull(),
  cidade: text("cidade").notNull(),
  estado: text("estado").notNull(),
  incorporadoraNome: text("incorporadora_nome"),
  anosExperiencia: integer("anos_experiencia").notNull(),
  opsEntregues: integer("ops_entregues").notNull().default(0),
  vgvAcumulado: numeric("vgv_acumulado", { precision: 18, scale: 2 }),
  foco: text("foco").notNull(),
  status: text("status").notNull().default("monitorado"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncorporadoraSchema = createInsertSchema(incorporadorasTable).omit({ id: true, createdAt: true });
export type InsertIncorporadora = z.infer<typeof insertIncorporadoraSchema>;
export type Incorporadora = typeof incorporadorasTable.$inferSelect;

export const insertEmpreendedorSchema = createInsertSchema(empreendedoresTable).omit({ id: true, createdAt: true });
export type InsertEmpreendedor = z.infer<typeof insertEmpreendedorSchema>;
export type Empreendedor = typeof empreendedoresTable.$inferSelect;
