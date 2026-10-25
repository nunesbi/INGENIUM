import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fundsTable } from "./funds";
import { assetsTable } from "./assets";

export const interestsTable = pgTable("interests", {
  id: serial("id").primaryKey(),

  fundoId: integer("fundo_id")
    .notNull()
    .references(() => fundsTable.id, { onDelete: "cascade" }),

  ativoId: integer("ativo_id")
    .notNull()
    .references(() => assetsTable.id, { onDelete: "cascade" }),

  status: text("status")
    .notNull()
    .default("pendente"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const insertInterestSchema = createInsertSchema(
  interestsTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertInterest = z.infer<typeof insertInterestSchema>;
export type Interest = typeof interestsTable.$inferSelect;