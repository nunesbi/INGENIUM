import { relations } from "drizzle-orm";
import { fundsTable } from "./funds";
import { assetsTable } from "./assets";
import { matchesTable } from "./matches";
import { chatRoomsTable, chatMessagesTable } from "./chat";

export const fundsRelations = relations(fundsTable, ({ many }) => ({
  matches: many(matchesTable),
}));

export const assetsRelations = relations(assetsTable, ({ many }) => ({
  matches: many(matchesTable),
}));

export const matchesRelations = relations(matchesTable, ({ one }) => ({
  fundo: one(fundsTable, {
    fields: [matchesTable.fundoId],
    references: [fundsTable.id],
  }),
  ativo: one(assetsTable, {
    fields: [matchesTable.ativoId],
    references: [assetsTable.id],
  }),
}));

export const chatRoomsRelations = relations(chatRoomsTable, ({ many }) => ({
  messages: many(chatMessagesTable),
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  room: one(chatRoomsTable, {
    fields: [chatMessagesTable.roomId],
    references: [chatRoomsTable.id],
  }),
}));
