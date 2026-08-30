import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { aggregateAgentMessages, getRoomMessages, normalizeRoom, refreshPublicRooms, sanitizeRoomKey } from "./db";
import type { TrpcContext } from "./_core/context";
import { isValidPublicDid } from "../shared/identity";
import { normalizeRoomRoute } from "../shared/routes";
import { MOBILE_NAV_ROUTES } from "../client/src/components/ExplorerShell";

describe("explorer data safety", () => {
  it("sanitizes room identifiers to the public room key alphabet", () => {
    expect(sanitizeRoomKey("../Lobby<script>alert(1)</script>!!")).toBe("lobbyscriptalert1script");
    expect(sanitizeRoomKey("A_room-01")).toBe("a_room-01");
  });

  it("deduplicates repeated signed messages by sequence", () => {
    const firstPass = [{ from: "did:key:abc", room: "lobby", seq: 10 }, { from: "did:key:abc", room: "lobby", seq: 10 }, { from: "did:key:abc", room: "lobby", seq: 11 }];
    const repeatedPass = [...firstPass, ...firstPass];
    expect(aggregateAgentMessages(repeatedPass)).toEqual([{ did: "did:key:abc", messageCount: 2 }]);
    expect(aggregateAgentMessages([...firstPass, { from: "did:key:abc", room: "other", seq: 10 }])).toEqual([{ did: "did:key:abc", messageCount: 3 }]);
  });

  it("parses a known room live payload into safe message data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ seq: 7, from: "did:key:abc", text: "hello", signed: true }] }), { status: 200, headers: { "content-type": "application/json" } })));
    const result = await getRoomMessages("lobby");
    expect(result).toMatchObject({ room: "lobby", source: "live" });
    expect(result.messages[0]).toMatchObject({ seq: 7, from: "did:key:abc", text: "hello", signed: true });
    vi.unstubAllGlobals();
  });

  it("returns an unavailable state for an unknown room response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not found", { status: 404 })));
    const result = await getRoomMessages("does-not-exist");
    expect(result).toMatchObject({ room: "does-not-exist", source: "unavailable", messages: [] });
    vi.unstubAllGlobals();
  });

  it("rejects empty room identifiers at the public procedure boundary", async () => {
    const ctx = { user: undefined, req: {} as any, res: {} as any } as TrpcContext;
    await expect(appRouter.createCaller(ctx).explorer.room({ room: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("normalizes room route input before query execution", () => {
    expect(normalizeRoomRoute(undefined)).toBe("");
    expect(normalizeRoomRoute("lobby")).toBe("lobby");
    expect(normalizeRoomRoute("public%20room")).toBe("public room");
    expect(normalizeRoomRoute("%E0%A4")).toBe("");
  });

  it("keeps all mobile explorer routes exposed in the hamburger menu", () => {
    expect(MOBILE_NAV_ROUTES.map((route) => route.href)).toEqual(["/", "/rooms", "/agents", "/about"]);
    expect(MOBILE_NAV_ROUTES.map((route) => route.label)).toEqual(["Overview", "Rooms", "Agents", "Protocol notes"]);
  });

  it("accepts a public did:key identifier for direct lookup", () => {
    expect(isValidPublicDid("did:key:z6Mknc3g3mq4q1ksRHyG9JNH6gPfLyXtmqs2idu6syYFRFuu")).toBe(true);
    expect(isValidPublicDid("did:key:")).toBe(false);
    expect(isValidPublicDid("https://example.com")).toBe(false);
  });

  it("returns a safe source-unavailable result when refresh fetch fails", async () => {
    const result = await refreshPublicRooms(async () => { throw new Error("upstream 503"); });
    expect(result.status).toBe("source-unavailable");
    expect(result.count).toBe(0);
  });

  it("normalizes untrusted room metadata as bounded strings", () => {
    const room = normalizeRoom({ room: "lobby", topic: "<script>do not run</script>", messages: "12", idle_seconds: "3" });
    expect(room.room).toBe("lobby");
    expect(room.topic).toContain("<script>");
    expect(room.messages).toBe(12);
    expect(room.idle).toBe(3);
    expect(room.source).toBe("live");
  });
});

describe("explorer readiness", () => {
  it("labels unavailable Flop chain data as placeholders", async () => {
    const ctx = { user: undefined, req: {} as any, res: {} as any } as TrpcContext;
    const result = await appRouter.createCaller(ctx).explorer.readiness();
    expect(result.status).toMatch(/official testnet API/i);
    expect(result.placeholders).toEqual(expect.arrayContaining(["blocks", "validators", "miners", "$FLOP transfers"]));
  });
});
