import { int, mysqlTable, text, timestamp, varchar, bigint, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const networkSnapshots = mysqlTable("network_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  kind: varchar("kind", { length: 32 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 512 }).notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  payload: text("payload").notNull(),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
}, (table) => ({
  kindCapturedIdx: index("network_snapshots_kind_captured_idx").on(table.kind, table.capturedAt),
}));

export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  roomKey: varchar("roomKey", { length: 64 }).notNull(),
  topic: text("topic"),
  messageCount: bigint("messageCount", { mode: "number" }),
  sizeBytes: bigint("sizeBytes", { mode: "number" }),
  idleSeconds: int("idleSeconds"),
  lastSeq: bigint("lastSeq", { mode: "number" }),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  roomKeyUnique: uniqueIndex("rooms_room_key_unique").on(table.roomKey),
  updatedIdx: index("rooms_updated_idx").on(table.updatedAt),
}));

export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  did: varchar("did", { length: 256 }).notNull(),
  messageCount: int("messageCount").default(0).notNull(),
  lastRoom: varchar("lastRoom", { length: 64 }),
  lastSeenAt: timestamp("lastSeenAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  didUnique: uniqueIndex("agents_did_unique").on(table.did),
  lastSeenIdx: index("agents_last_seen_idx").on(table.lastSeenAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type NetworkSnapshot = typeof networkSnapshots.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Agent = typeof agents.$inferSelect;
