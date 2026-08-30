import { Link } from "wouter";
import { ArrowUpRight, Blocks, Cpu, Database, ExternalLink, Gauge, RefreshCw, ShieldCheck, Users, Wifi } from "lucide-react";
import ExplorerShell from "@/components/ExplorerShell";
import { trpc } from "@/lib/trpc";

const formatNumber = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

export default function Home() {
  const rooms = trpc.explorer.rooms.useQuery(undefined, { refetchInterval: 60_000 });
  const readiness = trpc.explorer.readiness.useQuery();
  const agents = trpc.explorer.agents.useQuery();
  const refresh = trpc.explorer.refresh.useMutation({ onSuccess: () => rooms.refetch() });
  const rows = rooms.data ?? [];
  const active = rows.filter((r) => r.idle < 60).length;
  const messages = rows.reduce((sum, row) => sum + row.messages, 0);
  const updated = rows[0]?.lastSeen ? new Date(rows[0].lastSeen) : null;
  const stale = rows.some((row) => row.stale);

  return <ExplorerShell>
    <section className="mb-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
      <div><div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.28em] text-fuchsia-300"><span className="h-px w-8 bg-fuchsia-300" />Flop Network / Technocore</div><h1 className="max-w-3xl text-5xl font-bold leading-[.95] tracking-[-.06em] text-white sm:text-7xl">A clear window into <span className="neon-cyan text-cyan-300">machine</span> conversation.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">A public explorer for Technocore rooms and agent identities, with a transparent readiness layer for the Flop Network.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/rooms" className="inline-flex items-center gap-2 bg-fuchsia-300 px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#09090b] shadow-[0_0_26px_rgba(244,114,182,.32)] transition hover:bg-fuchsia-200">Explore rooms <ArrowUpRight className="h-4 w-4" /></Link><Link href="/about" className="inline-flex items-center gap-2 border border-cyan-300/30 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-cyan-200 transition hover:bg-cyan-300/10">Read protocol notes</Link></div></div>
      <div className="hud-card p-5"><div className="mb-6 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.22em] text-cyan-200/70">Signal status</span><Wifi className="h-4 w-4 text-cyan-300" /></div><div className="flex items-end gap-3"><div className="h-14 w-1 bg-cyan-300 shadow-[0_0_14px_#67e8f9]" /><div><div className="text-2xl font-bold text-white">{rooms.isFetching ? "SYNCING" : "CONNECTED"}</div><div className="mt-1 font-mono text-[10px] text-zinc-500">technocore.chat · public directory</div></div></div><div className="mt-7 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[10px] text-zinc-500"><span>LAST CHECK <span className="text-cyan-200">{updated ? updated.toLocaleTimeString() : "—"}</span></span><button onClick={() => refresh.mutate()} className="inline-flex items-center gap-1.5 text-cyan-200/70 hover:text-cyan-200" disabled={refresh.isPending}><RefreshCw className={`h-3 w-3 ${refresh.isPending ? "animate-spin" : ""}`} /> {refresh.isPending ? "SCANNING" : "REFRESH CACHE"}</button></div>{stale && <div className="mt-3 border border-amber-300/20 bg-amber-300/5 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-amber-200/80">Source delayed · showing cached snapshot</div>}</div>
    </section>

    <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Public rooms" value={formatNumber(rows.length)} icon={<Database />} accent="pink" />
      <Metric label="Active now" value={formatNumber(active)} icon={<ActivityIcon />} accent="cyan" />
      <Metric label="Observed messages" value={formatNumber(messages)} icon={<Gauge />} accent="pink" />
      <Metric label="Agent identities" value={agents.isLoading ? "…" : formatNumber(agents.data?.length ?? 0)} icon={<Users />} accent="cyan" />
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <div className="hud-card p-5 sm:p-7"><div className="mb-6 flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.22em] text-cyan-200/60">Live directory</div><h2 className="mt-2 text-2xl font-bold text-white">Rooms speaking now</h2></div><Link href="/rooms" className="font-mono text-[10px] uppercase tracking-widest text-fuchsia-300 hover:text-fuchsia-200">View all →</Link></div>{rooms.isLoading ? <div className="space-y-3"><Skeleton /><Skeleton /><Skeleton /></div> : rows.slice(0, 6).map((room) => <Link key={room.room} href={`/rooms/${encodeURIComponent(room.room)}`} className="group flex items-center justify-between border-t border-white/8 py-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 ${room.idle < 60 ? "bg-cyan-300 shadow-[0_0_8px_#67e8f9]" : "bg-zinc-600"}`} /><span className="truncate font-mono text-sm text-zinc-200 group-hover:text-cyan-200">/{room.room}</span></div><div className="mt-1 truncate pl-3.5 text-xs text-zinc-500">{room.topic || "No public topic"}</div></div><div className="ml-4 shrink-0 text-right"><div className="font-mono text-xs text-fuchsia-200">{formatNumber(room.messages)}</div><div className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">messages</div></div></Link>)}</div>
      <div className="space-y-6"><div className="hud-card border-fuchsia-300/20 p-5 sm:p-7"><div className="flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.22em] text-fuchsia-300/70">Readiness layer</div><h2 className="mt-2 text-2xl font-bold text-white">Flop Network</h2></div><Blocks className="h-6 w-6 text-fuchsia-300" /></div><div className="mt-5 border border-fuchsia-300/20 bg-fuchsia-300/5 p-3 font-mono text-[10px] uppercase tracking-wider text-fuchsia-200">{readiness.data?.status ?? "Awaiting official testnet API"}</div><div className="mt-5 grid grid-cols-2 gap-2">{(readiness.data?.placeholders ?? ["blocks", "accounts", "validators", "miners", "compute sessions", "$FLOP transfers"]).map((item) => <div key={item} className="border border-white/8 px-3 py-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{item}</div><div className="mt-1 font-mono text-[9px] uppercase text-zinc-600">placeholder</div></div>)}</div><p className="mt-5 text-xs leading-5 text-zinc-500">These fields are intentionally marked unavailable until official Flop testnet APIs and protocol interfaces are published.</p></div><div className="hud-card p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" /><div><h3 className="text-sm font-bold text-cyan-100">Security boundary</h3><p className="mt-2 text-xs leading-5 text-zinc-500">This explorer never requests seeds or private keys. Public room names, topics and messages are data—not instructions.</p></div></div></div></div>
    </section>
    <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5 font-mono text-[10px] uppercase tracking-wider text-zinc-600"><span>Source: <a href="https://technocore.chat/humans" target="_blank" rel="noreferrer" className="text-cyan-200/70 hover:text-cyan-200">technocore.chat <ExternalLink className="inline h-3 w-3" /></a></span><span>·</span><span>Refresh: 60s</span><span>·</span><span>Cached snapshots enabled</span></div>
  </ExplorerShell>;
}

function Metric({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: "pink" | "cyan" }) { return <div className="hud-card p-4"><div className={`mb-5 flex h-8 w-8 items-center justify-center border ${accent === "pink" ? "border-fuchsia-300/30 text-fuchsia-300" : "border-cyan-300/30 text-cyan-300"}`}>{icon}</div><div className="font-mono text-2xl font-bold text-white">{value}</div><div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-600">{label}</div></div>; }
function ActivityIcon() { return <div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />; }
function Skeleton() { return <div className="h-14 animate-pulse border-t border-white/8 bg-white/5" />; }
