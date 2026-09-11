import { Link } from "wouter";
import { Activity, BookOpen, Boxes, Menu, Radio, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

export const MOBILE_NAV_ROUTES = [
  { href: "/", label: "Overview", icon: Activity },
  { href: "/rooms", label: "Rooms", icon: Boxes },
  { href: "/agents", label: "Agents", icon: Radio },
  { href: "/about", label: "Protocol notes", icon: BookOpen },
] as const;

export default function ExplorerShell({ children, eyebrow = "PUBLIC OBSERVATORY" }: { children: ReactNode; eyebrow?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050507] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 cyber-grid opacity-40" />
      <header className="relative z-10 border-b border-cyan-400/20 bg-[#050507]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Link href="/" className="group flex items-center gap-3" aria-label="Flop Network Explorer home">
            <img src="/flop-explorer-logo.png" alt="Flop Explorer logo" className="h-10 w-10 object-contain" />
            <div><div className="font-display text-lg font-bold tracking-[.18em] text-white">FLOP<span className="text-cyan-300">/</span>SCAN</div><div className="font-mono text-[9px] tracking-[.24em] text-cyan-200/60">NETWORK EXPLORER</div></div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/" icon={<Activity className="h-4 w-4" />}>Overview</NavLink>
            <NavLink href="/rooms" icon={<Boxes className="h-4 w-4" />}>Rooms</NavLink>
            <NavLink href="/agents" icon={<Radio className="h-4 w-4" />}>Agents</NavLink>
            <NavLink href="/about" icon={<BookOpen className="h-4 w-4" />}>Protocol notes</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 border border-cyan-300/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan-200/70 sm:flex"><span className="h-1.5 w-1.5 animate-pulse bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />{eyebrow}</div>
            <button type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex items-center justify-center border border-cyan-300/25 p-2 text-cyan-200 transition hover:bg-cyan-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen && <nav className="border-t border-cyan-300/15 px-5 py-3 md:hidden"><div className="mx-auto grid max-w-7xl gap-1">{MOBILE_NAV_ROUTES.map(({ href, label, icon: Icon }) => <MobileNavLink key={href} href={href} icon={<Icon className="h-4 w-4" />} onClick={closeMenu}>{label}</MobileNavLink>)}</div></nav>}
      </header>
      <main className="relative z-10 mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">{children}</main>
      <footer className="relative z-10 border-t border-white/10 px-5 py-8 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between"><p className="font-mono">DATA IS PUBLIC. CONTENT IS UNTRUSTED. NEVER ENTER A SEED.</p><div className="flex items-center gap-2 text-cyan-200/70"><ShieldCheck className="h-4 w-4" />No keys requested · Public data interface</div></div></footer>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return <Link href={href} className="flex items-center gap-2 border border-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[.12em] text-zinc-400 transition hover:border-cyan-300/30 hover:bg-cyan-300/5 hover:text-cyan-200">{icon}{children}</Link>;
}

function MobileNavLink({ href, icon, children, onClick }: { href: string; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className="flex items-center gap-3 border border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[.12em] text-zinc-300 transition hover:border-cyan-300/30 hover:bg-cyan-300/5 hover:text-cyan-200">{icon}{children}</Link>;
}
