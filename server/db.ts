import { eq, desc, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, agents, networkSnapshots, rooms, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type RoomRecord = {
  room: string;
  topic: string;
  messages: number;
  size: number;
  idle: number;
  lastSeq: number;
  lastSeen: string;
  source: "live" | "cached";
  stale: boolean;
};

export type MessageRecord = {
  seq?: number;
  ts?: number | string;
  from?: string;
  text?: string;
  signed?: boolean;
};

const TECHNОCORE_ROOMS = "https://technocore.chat/rooms?format=json&limit=200";
const TECHNОCORE_BASE = "https://technocore.chat";
const CLUB_COMMUNITY_ROOM = "club-community";

export function normalizeRoom(input: any): RoomRecord {
  return {
    room: String(input.room ?? input.name ?? "unknown").slice(0, 64),
    topic: String(input.topic ?? "").slice(0, 500),
    messages: Number(input.messages ?? input.message_count ?? input.count ?? input.last_seq ?? input.window ?? 0),
    size: Number(input.size ?? input.size_bytes ?? input.bytes ?? 0),
    idle: Number(input.idle ?? input.idle_seconds ?? 0),
    lastSeq: Number(input.last_seq ?? input.lastSeq ?? 0),
    lastSeen: new Date().toISOString(),
    source: "live",
    stale: false,
  };
}

export function sanitizeRoomKey(room: string) {
  return room.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 48);
}

async function readJson(url: string) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Technocore returned ${response.status}`);
  return response.json();
}

export async function fetchLiveRooms(): Promise<RoomRecord[]> {
  const raw = await readJson(TECHNОCORE_ROOMS);
  const rows = Array.isArray(raw) ? raw : raw.rooms ?? raw.data ?? [];
  return rows.map(normalizeRoom).filter((room: RoomRecord) => room.room !== "unknown");
}

export async function getCachedRooms(): Promise<RoomRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const [snapshot] = await db.select().from(networkSnapshots).where(eq(networkSnapshots.kind, "rooms")).orderBy(desc(networkSnapshots.capturedAt)).limit(1);
  if (snapshot) {
    try {
      const stale = Date.now() - snapshot.capturedAt.getTime() > 5 * 60 * 1000;
      return (JSON.parse(snapshot.payload) as RoomRecord[]).map((room) => ({ ...room, source: "cached" as const, stale, lastSeen: snapshot.capturedAt.toISOString() }));
    } catch { /* ignore malformed historical snapshot */ }
  }
  const rows = await db.select().from(rooms).orderBy(desc(rooms.messageCount)).limit(200);
  return rows.map((row) => ({
    room: row.roomKey,
    topic: row.topic ?? "",
    messages: row.messageCount ?? 0,
    size: row.sizeBytes ?? 0,
    idle: row.idleSeconds ?? 0,
    lastSeq: row.lastSeq ?? 0,
    lastSeen: row.updatedAt.toISOString(),
    source: "cached" as const,
    stale: Date.now() - row.updatedAt.getTime() > 5 * 60 * 1000,
  }));
}

export async function persistRooms(rows: RoomRecord[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  for (const row of rows) {
    await db.insert(rooms).values({
      roomKey: row.room,
      topic: row.topic,
      messageCount: row.messages,
      sizeBytes: row.size,
      idleSeconds: row.idle,
      lastSeq: row.lastSeq,
      sourceUpdatedAt: new Date(row.lastSeen),
    }).onDuplicateKeyUpdate({ set: {
      topic: row.topic,
      messageCount: row.messages,
      sizeBytes: row.size,
      idleSeconds: row.idle,
      lastSeq: row.lastSeq,
      sourceUpdatedAt: new Date(row.lastSeen),
    }});
  }
  await db.insert(networkSnapshots).values({
    kind: "rooms",
    sourceUrl: TECHNОCORE_ROOMS,
    status: "live",
    payload: JSON.stringify(rows),
  });
}

export async function getRooms(query?: string) {
  const live = await fetchLiveRooms().catch(() => null);
  const rows = live && live.length ? live : await getCachedRooms();
  if (!rows.some((row) => row.room === CLUB_COMMUNITY_ROOM)) {
    const club = await getRoomMessages(CLUB_COMMUNITY_ROOM);
    if (club.source === "live") {
      const last = club.messages.at(-1);
      rows.push({ room: CLUB_COMMUNITY_ROOM, topic: "Club Community · project room", messages: club.messages.length, size: 0, idle: 0, lastSeq: Number(last?.seq ?? 0), lastSeen: String(last?.ts ?? new Date().toISOString()), source: "live", stale: false });
    }
  }
  const q = query?.trim().toLowerCase();
  return q ? rows.filter((row) => `${row.room} ${row.topic}`.toLowerCase().includes(q)) : rows;
}

export async function getRoomMessages(room: string): Promise<{ room: string; messages: MessageRecord[]; source: "live" | "unavailable"; checkedAt: string }> {
  const safeRoom = sanitizeRoomKey(room);
  const url = `${TECHNОCORE_BASE}/r/${encodeURIComponent(safeRoom)}?since=0&format=json&limit=50`;
  try {
    const raw = await readJson(url);
    const messages = Array.isArray(raw) ? raw : raw.messages ?? raw.data ?? [];
    return { room: safeRoom, messages: messages.map((message: any) => ({
      seq: Number(message.seq), ts: message.ts, from: String(message.from ?? "anonymous"), text: String(message.text ?? ""), signed: Boolean(message.did || message.signed),
    })), source: "live", checkedAt: new Date().toISOString() };
  } catch {
    return { room: safeRoom, messages: [], source: "unavailable", checkedAt: new Date().toISOString() };
  }
}

export async function searchAgents(query?: string) {
  const db = await getDb();
  if (!db) return [];
  const q = query?.trim();
  if (!q) return db.select().from(agents).orderBy(desc(agents.lastSeenAt)).limit(100);
  return db.select().from(agents).where(or(like(agents.did, `%${q}%`), like(agents.lastRoom, `%${q}%`))).orderBy(desc(agents.lastSeenAt)).limit(100);
}

export function aggregateAgentMessages(messages: Array<{ from?: string; seq?: number; room?: string }>) {
  const byDid = new Map<string, Set<string>>();
  for (const message of messages) {
    const did = message.from?.startsWith("did:key:") ? message.from : null;
    if (!did) continue;
    const key = `${message.room ?? "unknown"}:${String(message.seq ?? `${did}:${messages.indexOf(message)}`)}`;
    if (!byDid.has(did)) byDid.set(did, new Set());
    byDid.get(did)!.add(key);
  }
  return Array.from(byDid.entries()).map(([did, keys]) => ({ did, messageCount: keys.size }));
}

export async function indexAgentsFromRooms(rows: RoomRecord[]) {
  const db = await getDb();
  if (!db) return 0;
  const activeRooms = rows.filter((item) => item.idle < 600).slice(0, 3);
  const details = await Promise.all(activeRooms.map((room) => getRoomMessages(room.room)));
  const observed: Array<{ from?: string; seq?: number; room: string; ts?: number | string }> = [];
  details.forEach((detail, index) => observed.push(...detail.messages.map((message) => ({ ...message, room: activeRooms[index]!.room }))));
  const aggregate = aggregateAgentMessages(observed);
  for (const item of aggregate) {
    const last = observed.filter((message) => message.from === item.did).sort((a, b) => Number(b.seq ?? 0) - Number(a.seq ?? 0))[0];
    await db.insert(agents).values({ did: item.did, messageCount: item.messageCount, lastRoom: last?.room, lastSeenAt: last?.ts ? new Date(last.ts) : new Date() }).onDuplicateKeyUpdate({ set: { messageCount: item.messageCount, lastRoom: last?.room, lastSeenAt: last?.ts ? new Date(last.ts) : new Date() } });
  }
  return aggregate.length;
}

export async function getAgentActivity(did: string) {
  const rows = await fetchLiveRooms().catch(() => []);
  const activity: Array<{ room: string; seq?: number; ts?: number | string; text: string }> = [];
  for (const room of rows.filter((item) => item.idle < 600).slice(0, 12)) {
    const detail = await getRoomMessages(room.room);
    for (const message of detail.messages) {
      if (message.from === did) activity.push({ room: room.room, seq: message.seq, ts: message.ts, text: message.text ?? "" });
    }
  }
  return activity.slice(-40).reverse();
}

export async function refreshPublicRooms(fetcher: () => Promise<RoomRecord[]> = fetchLiveRooms) {
  try {
    const rows = await fetcher();
    await persistRooms(rows);
    const indexedAgents = await indexAgentsFromRooms(rows);
    return { count: rows.length, indexedAgents, status: "live" as const, capturedAt: new Date().toISOString(), sourceUrl: TECHNОCORE_ROOMS };
  } catch (error) {
    return { count: 0, indexedAgents: 0, status: "source-unavailable" as const, error: error instanceof Error ? error.message : String(error), capturedAt: new Date().toISOString(), sourceUrl: TECHNОCORE_ROOMS };
  }
}
