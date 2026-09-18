import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { fundsTable } from "./funds";
import { assetsTable } from "./assets";
import { matchesTable } from "./matches";

export const chatRoomsTable = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  fundoId: integer("fundo_id").references(() => fundsTable.id, { onDelete: "set null" }),
  ativoId: integer("ativo_id").references(() => assetsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => chatRoomsTable.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
