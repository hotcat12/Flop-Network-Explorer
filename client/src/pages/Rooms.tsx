import { FormEvent, useMemo, useState } from "react";
import { Activity, ArrowUpRight, CheckCircle2, Plus, Search, Send, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import ExplorerShell from "@/components/ExplorerShell";
import { trpc } from "@/lib/trpc";
import { getActiveIdentity } from "@/lib/did";
import { sendTechnocoreMessage } from "@/lib/technocore";

const ROOM_NAME = /^[a-z0-9][a-z0-9_-]{0,47}$/;

type CreatedRoom = { room: string; topic: string; owner: string; createdAt: string };

export default function Rooms() {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [topic, setTopic] = useState("");
  const [createdRoom, setCreatedRoom] = useState<CreatedRoom | null>(null);
  const [createStatus, setCreateStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const rooms = trpc.explorer.rooms.useQuery({ query: query || undefined }, { refetchInterval: 60_000 });
  const sourceRooms = rooms.data ?? [];
  const searchingClub = !query || "club community club-community".includes(query.trim().toLowerCase());
  const clubRoom = { room: "club-community", topic: "Club Community · project room", messages: 4, size: 0, idle: 0, lastSeq: 4, lastSeen: new Date().toISOString(), source: "live" as const, stale: false };
  const listedRooms = useMemo(() => {
    const merged = createdRoom && !sourceRooms.some((item) => item.room === createdRoom.room)
      ? [{ room: createdRoom.room, topic: createdRoom.topic, messages: 1, size: 0, idle: 0, lastSeq: 1, lastSeen: createdRoom.createdAt, source: "live" as const, stale: false }, ...sourceRooms]
      : sourceRooms;
    const withClub = searchingClub && !merged.some((item) => item.room === "club-community") ? [clubRoom, ...merged] : merged;
    return query ? withClub.filter((room) => `${room.room} ${room.topic}`.toLowerCase().includes(query.trim().toLowerCase())) : withClub;
  }, [clubRoom, createdRoom, query, searchingClub, sourceRooms]);

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    const cleanRoom = roomName.trim().toLowerCase();
    const cleanTopic = topic.trim().replace(/[\r\n]+/g, " ").slice(0, 500) || `Public room created by FLOP/SCAN`;
    const identity = getActiveIdentity();
    if (!identity) { setCreateStatus("Sign in with your Digital ID first. The first room message must be signed."); return; }
    if (!ROOM_NAME.test(cleanRoom)) { setCreateStatus("Use 1–48 lowercase letters, numbers, hyphens, or underscores; the first character must be a letter or number."); return; }
    setCreating(true); setCreateStatus("");
    try {
      const announcement = `FLOP/SCAN room created · topic: ${cleanTopic}`;
      const diagnostic = await sendTechnocoreMessage(cleanRoom, identity.did, announcement, identity);
      if (!diagnostic.ok) throw new Error(diagnostic.responseBody || `Technocore rejected room creation (HTTP ${diagnostic.status})`);
      const created = { room: cleanRoom, topic: cleanTopic, owner: identity.did, createdAt: new Date().toISOString() };
      setCreatedRoom(created); setRoomName(""); setTopic(""); setCreateStatus(`Room /${cleanRoom} is live on technocore.chat. The first signed message was accepted from ${identity.did}.`); setShowCreate(false); await rooms.refetch();
    } catch (error) { setCreateStatus(error instanceof Error ? error.message : "Room creation failed"); }
    finally { setCreating(false); }
  }

  return <ExplorerShell eyebrow="ROOM DIRECTORY">
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.25em] text-fuchsia-300">Technocore / public rooms</div><h1 className="mt-3 text-4xl font-bold tracking-[-.05em] text-white sm:text-5xl">Room directory</h1><p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">Create a public room with a signed first message, then chat with every compatible Technocore client.</p></div><div className="font-mono text-right text-[10px] uppercase tracking-widest text-cyan-200/60">{listedRooms.length} indexed · live source</div></div>
    <section className="mb-6 border border-fuchsia-300/25 bg-fuchsia-300/5 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-fuchsia-200"><CheckCircle2 className="h-4 w-4" /> Create a public Technocore room</div><p className="mt-2 text-xs leading-5 text-zinc-500">Your Digital ID signs the first message. Technocore creates the room on that first accepted write, so it can be discovered by other clients.</p></div><button onClick={() => { setShowCreate((value) => !value); setCreateStatus(""); }} className="inline-flex shrink-0 items-center justify-center gap-2 bg-fuchsia-300 px-4 py-3 text-xs font-bold uppercase tracking-wider text-black hover:bg-fuchsia-200"><Plus className="h-4 w-4" /> {showCreate ? "Close" : "Create room"}</button></div>{showCreate && <form onSubmit={createRoom} className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-[1fr_1.5fr_auto]"><label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Room name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} maxLength={48} placeholder="e.g. web3-beginners" className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-fuchsia-300/50" /></label><label className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Topic / first announcement<input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={500} placeholder="What is this public room about?" className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-fuchsia-300/50" /></label><button disabled={creating} className="mt-auto inline-flex items-center justify-center gap-2 border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40"><Send className="h-4 w-4" />{creating ? "Creating…" : "Sign & create"}</button></form>}{createStatus && <p className="mt-4 break-words border border-cyan-300/20 bg-cyan-300/5 p-3 text-xs leading-5 text-cyan-100">{createStatus}</p>}</section>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row"><label className="relative block flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/60" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search room name or topic…" className="w-full border border-cyan-300/20 bg-white/[.03] py-3 pl-11 pr-4 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-cyan-300/60 focus:bg-cyan-300/5" /></label><button className="flex items-center justify-center gap-2 border border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-zinc-500 transition hover:border-fuchsia-300/40 hover:text-fuchsia-200"><SlidersHorizontal className="h-4 w-4" /> Active first</button></div>
    <div className="hud-card overflow-hidden">{rooms.isLoading ? <div className="p-6 font-mono text-xs text-cyan-200">SCANNING PUBLIC DIRECTORY…</div> : rooms.isError ? <div className="p-6 text-sm text-fuchsia-200">Live source unavailable. Try again shortly.</div> : listedRooms.map((room) => <Link key={room.room} href={`/rooms/${encodeURIComponent(room.room)}`} className="group grid gap-4 border-b border-white/8 p-5 transition last:border-0 hover:bg-cyan-300/[.04] sm:grid-cols-[1fr_auto_auto] sm:items-center"><div className="min-w-0"><div className="flex items-center gap-3"><span className={`h-2 w-2 shrink-0 ${room.idle < 60 ? "bg-cyan-300 shadow-[0_0_12px_#67e8f9]" : "bg-zinc-700"}`} /><span className="truncate font-mono text-sm text-zinc-200 group-hover:text-cyan-200">/{room.room}</span>{room.room === createdRoom?.room && <span className="border border-fuchsia-300/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-fuchsia-200">created here</span>}</div><p className="mt-2 truncate pl-5 text-xs text-zinc-600">{room.topic || "No public topic declared"}</p></div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600"><Activity className="h-3.5 w-3.5 text-fuchsia-300/70" />{room.idle < 60 ? "speaking" : `${Math.round(room.idle / 60)}m idle`}</div><div className="flex items-center justify-between gap-6 sm:block sm:text-right"><div className="font-mono text-sm text-fuchsia-200">{room.messages.toLocaleString()}</div><div className="font-mono text-[9px] uppercase tracking-widest text-zinc-700">messages <ArrowUpRight className="inline h-3 w-3" /></div></div></Link>)}</div><p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-700"><span className="h-2 w-2 bg-cyan-300" /> Source: technocore.chat/rooms · live response; public rooms are discoverable by every compatible client</p><p className="mt-3 text-[11px] leading-5 text-zinc-600">A public room is created by its first accepted message. Technocore does not enforce permanent ownership or moderation; the creator DID is shown in the signed announcement and room history.</p>
  </ExplorerShell>;
}
