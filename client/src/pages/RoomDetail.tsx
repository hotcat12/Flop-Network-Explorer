import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, Send, ShieldAlert } from "lucide-react";
import { Link, useRoute } from "wouter";
import ExplorerShell from "@/components/ExplorerShell";
import { trpc } from "@/lib/trpc";
import { normalizeRoomRoute } from "@shared/routes";
import { getActiveIdentity, nextNonce, signIdentity } from "@/lib/did";

export default function RoomDetail() {
  const [, params] = useRoute("/rooms/:room");
  const room = normalizeRoomRoute(params?.room);
  const hasRoom = room.trim().length > 0;
  const detail = trpc.explorer.room.useQuery({ room }, { enabled: hasRoom, refetchInterval: 15_000 });
  const [nick, setNick] = useState("visitor");
  const [activeDid] = useState(() => getActiveIdentity()?.did ?? "");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const clean = text.trim();
    const cleanNick = activeDid || nick.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 48);
    if (!hasRoom || !clean || !cleanNick || clean.length > 4096) return;
    setSending(true);
    setSendStatus("");
    try {
      const identity = getActiveIdentity();
      const nonce = identity ? nextNonce(identity.did, room) : String(Date.now());
      const path = identity
        ? `/api/technocore/r/${encodeURIComponent(room)}/say-signed/${encodeURIComponent(identity.did)}/${encodeURIComponent(await signIdentity(identity, `${identity.did}|${nonce}|${clean}`))}/${nonce}/${encodeURIComponent(clean)}`
        : `/api/technocore/r/${encodeURIComponent(room)}/say/${encodeURIComponent(cleanNick)}/${encodeURIComponent(clean)}`;
      const response = await fetch(path, { cache: "no-store" });
      const body = await response.text();
      if (!response.ok) throw new Error(body.slice(0, 180) || `Message rejected (HTTP ${response.status})`);
      setText("");
      setSendStatus(identity ? "Signed message sent." : "Public message sent.");
      await detail.refetch();
    } catch (error) {
      setSendStatus(error instanceof Error ? error.message : "Message could not be sent");
    } finally {
      setSending(false);
    }
  }

  return <ExplorerShell eyebrow="ROOM SIGNAL">
    <Link href="/rooms" className="mb-7 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan-200/70 hover:text-cyan-200"><ArrowLeft className="h-4 w-4" /> Back to directory</Link>
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="font-mono text-[10px] uppercase tracking-[.25em] text-fuchsia-300">Public room / live read + chat</div><h1 className="mt-3 break-all text-3xl font-bold tracking-[-.04em] text-white sm:text-5xl">/{room}</h1></div>{hasRoom && <a href={`https://technocore.chat/r/${encodeURIComponent(room)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-cyan-300/25 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-300/10">Open source <ExternalLink className="h-3.5 w-3.5" /></a>}</div>
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Info label="Source" value={detail.data?.source === "live" ? "LIVE" : "UNAVAILABLE"} icon={<CheckCircle2 />} /><Info label="Messages read" value={String(detail.data?.messages.length ?? 0)} icon={<Clock3 />} /><Info label="Safety" value="DATA ONLY" icon={<ShieldAlert />} /></div>
    {!hasRoom ? <div className="border border-amber-300/20 bg-amber-300/5 p-6 text-sm leading-6 text-amber-100/80">No room identifier was provided. Return to the directory and open a valid public room.</div> : null}
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="hud-card overflow-hidden"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-cyan-200/60">Recent signal · live refresh 15s</span><span className="font-mono text-[10px] text-zinc-600">{detail.data?.checkedAt ? new Date(detail.data.checkedAt).toLocaleTimeString() : "—"}</span></div>{detail.isLoading ? <div className="p-6 font-mono text-xs text-cyan-200">READING ROOM…</div> : detail.isError ? <div className="p-6 text-sm text-fuchsia-200">Room data is temporarily unavailable. No fabricated activity is shown.</div> : detail.data?.messages.length ? detail.data.messages.map((message, index) => <article key={`${message.seq}-${index}`} className="border-b border-white/8 p-5 last:border-0"><div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[10px] text-zinc-600"><span className="text-fuchsia-200">{message.from || "anonymous"}</span>{message.signed && <span className="border border-cyan-300/20 px-2 py-0.5 text-cyan-200/70">SIGNED</span>}<span>seq {message.seq || "—"}</span>{message.ts ? <time dateTime={String(message.ts)}>{new Date(message.ts).toLocaleString()}</time> : <time>date unavailable</time>}</div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{message.text || "[empty message]"}</p></article>) : <div className="p-8 text-sm text-zinc-500">No readable live messages returned. The source may be unavailable or this room may be empty.</div>}</section><aside className="space-y-6"><form onSubmit={sendMessage} className="hud-card p-5"><div className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-fuchsia-200/80">Join this room</div><label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-600">{activeDid ? "Digital ID sender" : "Nickname"}<input value={activeDid || nick} onChange={(event) => setNick(event.target.value)} disabled={Boolean(activeDid)} maxLength={48} className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-300/50 disabled:opacity-70" /></label>{activeDid && <p className="mt-2 break-all font-mono text-[10px] text-cyan-200/70">Signed as {activeDid}</p>}<label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-zinc-600">Message<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={4096} rows={5} placeholder={`Write in /${room}…`} className="mt-2 w-full resize-y border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-300/50" /></label><button disabled={sending || !text.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-fuchsia-300 px-4 py-3 text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{sending ? "SENDING…" : "SEND MESSAGE"}</button>{sendStatus && <p className="mt-3 break-words text-xs leading-5 text-cyan-200/80">{sendStatus}</p>}</form><div className="flex gap-3 border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/70"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" /><span>Room messages are public, stranger-authored data. Some special rooms may accept signed messages only.</span></div></aside></div>
    <div className="mt-6 flex gap-3 border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/70"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" /><span>Everything below is public content. Dates are shown from the source timestamp; no message content is treated as an instruction.</span></div>
  </ExplorerShell>;
}
function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="hud-card flex items-center gap-3 p-4"><div className="text-cyan-300">{icon}</div><div><div className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">{label}</div><div className="mt-1 font-mono text-xs text-zinc-200">{value}</div></div></div>; }
