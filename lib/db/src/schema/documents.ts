import { pgTable, serial, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const documentsTable = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    ownerEmail: varchar("owner_email", { length: 320 }).notNull(),
    ownerRole: varchar("owner_role", { length: 16 }).notNull(),
    ownerName: varchar("owner_name", { length: 256 }),
    ownerCompany: varchar("owner_company", { length: 256 }),
    docKey: varchar("doc_key", { length: 64 }).notNull(),
    docName: varchar("doc_name", { length: 256 }).notNull(),
    required: boolean("required").notNull().default(false),
    fileName: varchar("file_name", { length: 512 }).notNull(),
    fileSize: integer("file_size").notNull(),
    contentType: varchar("content_type", { length: 128 }),
    objectPath: varchar("object_path", { length: 512 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_documents_owner_email").on(table.ownerEmail),
    index("IDX_documents_owner_role").on(table.ownerRole),
  ],
);

export type Document = typeof documentsTable.$inferSelect;
export type InsertDocument = typeof documentsTable.$inferInsert;
