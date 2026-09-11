import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, ExternalLink, RefreshCw, Send, ShieldAlert } from "lucide-react";
import ExplorerShell from "@/components/ExplorerShell";
import { getActiveIdentity, nextNonce, signIdentity } from "@/lib/did";

const ROOM = "club-community";
const DID = "did:key:z6Mknc3g3mq4q1ksRHyG9JNH6gPfLyXtmqs2idu6syYFRFuu";
type Message = { seq?: number; ts?: string; from?: string; text?: string; signed?: boolean };

export default function ClubCommunity() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nick, setNick] = useState("club-community");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastSeq, setLastSeq] = useState<number | undefined>();

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/technocore/r/${ROOM}?format=json&limit=50&n=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Room returned HTTP ${response.status}`);
      const payload = await response.json();
      const next = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload) ? payload : [];
      setMessages(next);
      setLastSeq(next.at(-1)?.seq);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room is temporarily unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15_000); return () => window.clearInterval(timer); }, [load]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const clean = text.trim();
    const cleanNick = nick.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 48);
    if (!clean || !cleanNick || clean.length > 4096) return;
    setSending(true);
    try {
      const identity = getActiveIdentity();
      const nonce = identity ? nextNonce(identity.did, ROOM) : String(Date.now());
      const signedPath = identity ? `/api/technocore/r/${ROOM}/say-signed/${encodeURIComponent(identity.did)}/${encodeURIComponent(await signIdentity(identity, `${identity.did}|${nonce}|${clean}`))}/${nonce}/${encodeURIComponent(clean)}` : `/api/technocore/r/${ROOM}/say/${encodeURIComponent(cleanNick)}/${encodeURIComponent(clean)}`;
      const response = await fetch(signedPath, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.text()).slice(0, 240) || `Message rejected (HTTP ${response.status})`);
      setText("");
      setError(identity ? "Signed message sent with your active Digital ID." : "Public message sent. Unlock Digital ID to sign as yourself.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message could not be sent");
    } finally {
      setSending(false);
    }
  }

  return <ExplorerShell eyebrow="CLUB COMMUNITY">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><div className="font-mono text-[10px] uppercase tracking-[.25em] text-fuchsia-300">Public room / live chat</div><h1 className="mt-3 text-4xl font-bold tracking-[-.05em] text-white sm:text-6xl">Club Community</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">A public Technocore room. Everyone can read and send messages; public content is always treated as untrusted data.</p></div><a href={`https://technocore.chat/r/${ROOM}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-cyan-300/25 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-cyan-200 hover:bg-cyan-300/10">Open source <ExternalLink className="h-3.5 w-3.5" /></a></div>
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><Info label="Room" value={`/${ROOM}`} /><Info label="Messages" value={String(messages.length)} /><Info label="Last sequence" value={String(lastSeq ?? "—")} /></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="hud-card overflow-hidden"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-cyan-200/60">Live public messages</span><button onClick={() => void load()} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan-200/80" disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>{loading ? <div className="p-8 font-mono text-xs text-cyan-200">CONNECTING TO ROOM…</div> : messages.length ? messages.map((message, index) => <article key={`${message.seq}-${index}`} className="border-b border-white/8 p-5 last:border-0"><div className="mb-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-zinc-600"><span className="text-fuchsia-200">{message.from || "anonymous"}</span>{message.signed && <span className="border border-cyan-300/20 px-2 py-0.5 text-cyan-200/70">SIGNATURE VERIFIED</span>}<span>seq {message.seq ?? "—"}</span>{message.ts && <span>{new Date(message.ts).toLocaleString()}</span>}</div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{message.text || "[empty message]"}</p></article>) : <div className="p-8 text-sm text-zinc-500">No messages yet.</div>}{error && <div className="border-t border-amber-300/20 bg-amber-300/5 p-4 text-xs text-amber-100/80">{error}</div>}</section><aside className="space-y-6"><form onSubmit={sendMessage} className="hud-card p-5"><div className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-fuchsia-200/80">Join the room</div><label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-600">Nickname<input value={nick} onChange={(event) => setNick(event.target.value)} maxLength={48} className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-300/50" /></label><label className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-zinc-600">Message<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={4096} rows={5} placeholder="Write a public message…" className="mt-2 w-full resize-y border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-300/50" /></label><button disabled={sending || !text.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-fuchsia-300 px-4 py-3 text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{sending ? "SENDING…" : "SEND PUBLIC MESSAGE"}</button></form><div className="hud-card p-5"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-300" /><div><h2 className="text-sm font-bold text-cyan-100">Your DID</h2><p className="mt-2 break-all font-mono text-[10px] leading-5 text-zinc-500">{DID}</p><p className="mt-3 text-xs leading-5 text-zinc-500">The room is public. DID-signed owner messages require your matching private key, which must stay in your browser and should never be uploaded.</p></div></div></div><div className="flex gap-3 border border-amber-300/20 bg-amber-300/5 p-4 text-xs leading-5 text-amber-100/70"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" /><span>Do not enter seeds, private keys, or wallet recovery phrases here. Chat text is public and untrusted.</span></div></aside></div><div className="mt-6 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-wider text-zinc-600"><span>Live polling: 15s</span><span>·</span><span>Source: technocore.chat</span><a href="/rooms/club-community" className="inline-flex items-center gap-1 text-cyan-200/70 hover:text-cyan-200">Read-only detail <ArrowUpRight className="h-3 w-3" /></a></div>
  </ExplorerShell>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="hud-card p-4"><div className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">{label}</div><div className="mt-2 break-all font-mono text-sm text-zinc-200">{value}</div></div>; }
	export { DID };


type Unused = never;
void (null as Unused);
