/**
 * PRINCÍPIO MULTI-TENANT POR DISCRIMINADOR
 *
 * Este é um sistema multi-tenant. TODA tabela de dados de negócio carrega
 * uma coluna `tenant_id` (exceto a própria tabela `tenants`).
 *
 * Nenhuma consulta de dados de negócio pode rodar sem filtrar por `tenant_id`.
 * Ao criar novas tabelas ou queries, SEMPRE inclua o tenant_id.
 */

import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
  boolean,
  pgEnum,
  customType,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "TENANT_ADMIN",
  "ATENDENTE",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "bot",
  "human",
  "closed",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "inbound",
  "outbound",
]);

export const knowledgeChunkTypeEnum = pgEnum("knowledge_chunk_type", [
  "plano",
  "faq",
  "regra",
  "tom",
]);

const pgVector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return value.replace(/[\[\]]/g, "").split(",").map(Number);
    }
    return value as number[];
  },
});

// ── User (autenticação do painel) ──────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Tenant ─────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  config: jsonb("config").default({}).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Contact ────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  waId: varchar("wa_id", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Conversation ───────────────────────────────────────────────

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  status: conversationStatusEnum("status").default("bot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Message ────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  direction: messageDirectionEnum("direction").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

// ── Knowledge Item (item editável da base de conhecimento) ────

export const knowledgeItems = pgTable("knowledge_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  tipo: knowledgeChunkTypeEnum("tipo").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Knowledge Chunk (base de conhecimento para RAG) ───────────

export const knowledgeChunks = pgTable("knowledge_chunk", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  tipo: knowledgeChunkTypeEnum("tipo").notNull(),
  conteudo: text("conteudo").notNull(),
  embedding: pgVector("embedding").notNull(),
  origemId: uuid("origem_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
