import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Link2, ShieldCheck, Trash2, Upload, Wallet, X } from "lucide-react";
import ExplorerShell from "@/components/ExplorerShell";
import { clearIdentity, didFromPublicKeyFile, generateIdentity, getActiveIdentity, getSessionDid, hasSavedIdentity, isValidDid, loadIdentity, parseImportedJwk, parseSeed, saveIdentity, setActiveIdentity, setSessionDid, type DidIdentity } from "@/lib/did";

type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
const ethereum = () => (window as Window & { ethereum?: EthereumProvider }).ethereum;

export default function Identity() {
  const [identity, setIdentity] = useState<DidIdentity | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [seedText, setSeedText] = useState("");
  const [importText, setImportText] = useState("");
  const [didInput, setDidInput] = useState("");
  const [publicKeyDid, setPublicKeyDid] = useState("");
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const refreshSession = () => {
      const sessionDid = getSessionDid();
      setDidInput(sessionDid);
      if (sessionDid) setStatus(`Signed in as ${sessionDid}.`);
      else { setIdentity(null); setStatus(hasSavedIdentity() ? "Logged out. The encrypted Digital ID remains in this browser; enter its password to unlock it." : "No identity in this browser yet. Paste your seed to sign in."); }
    };
    refreshSession();
    window.addEventListener("flop:identity", refreshSession);
    return () => window.removeEventListener("flop:identity", refreshSession);
  }, []);

  async function signInFromSeed() {
    if (!seedText.trim()) { setStatus("Paste your 64-character seed first."); return; }
    if (password.length < 8) { setStatus("Use a local password of at least 8 characters."); return; }
    if (password !== confirmPassword) { setStatus("The two local passwords do not match."); return; }
    setBusy(true);
    try {
      const next = await parseSeed(seedText);
      await saveIdentity(next, password);
      setActiveIdentity(next); setSessionDid(next.did); window.dispatchEvent(new Event("flop:identity")); setIdentity(next); setDidInput(next.did);
      setStatus(`Signed in as ${next.did}. The seed stays in this browser; signed messages are enabled across all rooms.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Seed sign-in failed"); }
    finally { setBusy(false); }
  }

  async function unlock() {
    setBusy(true);
    try {
      const next = await loadIdentity(password);
      if (didInput.trim() && didInput.trim() !== next.did) throw new Error("The pasted DID does not match the saved identity.");
      setActiveIdentity(next); setSessionDid(next.did); window.dispatchEvent(new Event("flop:identity")); setIdentity(next); setDidInput(next.did);
      setStatus(`Signed in as ${next.did}. Signed messages are enabled across all rooms.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not unlock saved identity"); }
    finally { setBusy(false); }
  }

  async function create() {
    if (password.length < 8 || password !== confirmPassword) { setStatus("Enter and confirm a matching local password of at least 8 characters."); return; }
    setBusy(true);
    try { const next = await generateIdentity(); await saveIdentity(next, password); setActiveIdentity(next); setSessionDid(next.did); window.dispatchEvent(new Event("flop:identity")); setIdentity(next); setDidInput(next.did); setStatus("New identity encrypted locally and signed in."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not create Digital ID"); }
    finally { setBusy(false); }
  }

  async function importJwk() {
    if (password.length < 8 || password !== confirmPassword) { setStatus("Enter and confirm a matching local password first."); return; }
    setBusy(true);
    try { const next = parseImportedJwk(importText); await saveIdentity(next, password); setActiveIdentity(next); setSessionDid(next.did); window.dispatchEvent(new Event("flop:identity")); setIdentity(next); setDidInput(next.did); setImportText(""); setStatus(`Signed in as ${next.did}. Existing identity encrypted locally.`); }
    catch (error) { setStatus(error instanceof Error ? error.message : "JWK import failed"); }
    finally { setBusy(false); }
  }

  async function inspectPublicKey(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try { const did = await didFromPublicKeyFile(await file.text()); setPublicKeyDid(did); setDidInput(did); setStatus(`key.pub resolved to ${did}. It is optional and cannot sign by itself.`); }
    catch (error) { setStatus(error instanceof Error ? error.message : "key.pub could not be read"); }
    finally { setBusy(false); }
  }

  async function connectWallet() {
    const provider = ethereum();
    if (!provider) { setStatus("No injected EVM wallet found. Install MetaMask or another browser wallet."); return; }
    setBusy(true);
    try { const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[]; const address = accounts?.[0]; if (!address) throw new Error("Wallet returned no account"); const proof = await provider.request({ method: "personal_sign", params: [`FLOP/SCAN identity link\n${address}`, address] }); setWallet(address); setStatus(`Wallet connected and ownership proof signed: ${String(proof).slice(0, 12)}…`); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Wallet connection cancelled"); }
    finally { setBusy(false); }
  }

  function forget() { clearIdentity(); setSessionDid(null); setActiveIdentity(null); setIdentity(null); setDidInput(""); setStatus("Local Digital ID and DID session deleted from this browser."); }

  return <ExplorerShell eyebrow="IDENTITY VAULT">
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center"><div className="font-mono text-[10px] uppercase tracking-[.25em] text-fuchsia-300">Private by design</div><h1 className="mt-3 text-4xl font-bold tracking-[-.05em] text-white sm:text-6xl">Sign in to post</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-400">Paste your 64-character seed. It is processed and encrypted only in this browser; Technocore receives signatures, never your seed.</p></div>
      <section className="hud-card overflow-hidden border-cyan-300/25 shadow-[0_0_45px_rgba(34,211,238,.08)]">
        <div className="border-b border-white/10 bg-cyan-300/5 px-6 py-5"><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-cyan-300" /><div><h2 className="text-xl font-bold text-white">Unified identity sign-in</h2><p className="mt-1 text-xs text-zinc-500">No Shift key or keyboard shortcut is required.</p></div></div></div>
        <div className="space-y-5 p-6">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">Manual 64-character seed<textarea value={seedText} onChange={(event) => setSeedText(event.target.value)} rows={3} placeholder="Paste 64 hexadecimal characters" className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 font-mono text-xs text-zinc-200 outline-none focus:border-cyan-300/50" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">Local password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-cyan-300/50" /></label><label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">Confirm password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Type it again" className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-cyan-300/50" /></label></div>
          <button onClick={() => void signInFromSeed()} disabled={busy || !seedText.trim()} className="inline-flex w-full items-center justify-center gap-2 bg-cyan-300 px-4 py-4 text-xs font-bold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Checking seed…" : "Encrypt locally and sign in"}</button>
          <p className="text-center text-[11px] leading-5 text-zinc-500">Your password encrypts the identity in localStorage. The seed is never uploaded.</p>
          {hasSavedIdentity() && <button onClick={() => void unlock()} disabled={busy || password.length < 8} className="w-full border border-cyan-300/25 px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-200 disabled:opacity-40">Unlock saved identity</button>}
          {status && <div className="border border-white/10 bg-white/[.03] p-4 text-xs leading-5 text-zinc-300">{status}</div>}
        </div>
      </section>

      {identity && <div className="mt-5 border border-cyan-300/20 bg-cyan-300/5 p-4"><div className="font-mono text-[10px] uppercase tracking-widest text-cyan-200/70">Signed in DID</div><div className="mt-2 break-all font-mono text-xs text-zinc-200">{identity.did}</div></div>}
      <button onClick={() => setShowAdvanced((value) => !value)} className="mx-auto mt-6 flex items-center gap-2 text-xs text-zinc-500 hover:text-cyan-200">{showAdvanced ? <X className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />} Advanced identity options</button>
      {showAdvanced && <section className="mt-4 space-y-5 border border-white/10 bg-black/20 p-5"><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => void create()} disabled={busy} className="border border-cyan-300/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-200">Generate new identity</button><button onClick={forget} className="inline-flex items-center justify-center gap-2 border border-amber-300/25 px-4 py-3 text-xs text-amber-200"><Trash2 className="h-3.5 w-3.5" /> Delete local identity</button></div><label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-600">Optional DID verification<input value={didInput} onChange={(event) => setDidInput(event.target.value)} placeholder="did:key:z6Mk…" className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 text-xs text-zinc-200 outline-none focus:border-cyan-300/50" /></label><label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-600">Optional key.pub<input type="file" accept=".pub,text/plain" onChange={(event) => void inspectPublicKey(event.target.files?.[0])} disabled={busy} className="mt-2 block w-full cursor-pointer border border-fuchsia-300/25 bg-black/30 px-3 py-3 text-xs text-zinc-300 file:mr-4 file:border-0 file:bg-fuchsia-300 file:px-3 file:py-2 file:text-xs file:font-bold file:text-black" /></label>{publicKeyDid && <p className="break-all font-mono text-[10px] text-fuchsia-200/80">key.pub DID: {publicKeyDid}</p>}<label className="block font-mono text-[10px] uppercase tracking-widest text-zinc-600">Advanced private JWK<textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={3} placeholder='JSON containing kty, crv, x and d' className="mt-2 w-full border border-white/15 bg-black/30 px-3 py-3 text-xs text-zinc-200 outline-none focus:border-cyan-300/50" /></label><button onClick={() => void importJwk()} disabled={busy || !importText.trim()} className="border border-fuchsia-300/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-fuchsia-200 disabled:opacity-40">Import JWK and sign in</button></section>}

      <section className="mt-6 space-y-5"><div className="hud-card p-6"><div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-fuchsia-300" /><h2 className="text-xl font-bold text-white">Optional EVM wallet link</h2></div><p className="mt-3 text-sm leading-6 text-zinc-500">This is separate from Technocore DID signing and does not replace your identity.pem.</p><button onClick={() => void connectWallet()} disabled={busy} className="mt-5 inline-flex items-center gap-2 bg-fuchsia-300 px-4 py-3 text-xs font-bold uppercase tracking-wider text-black disabled:opacity-40"><Link2 className="h-4 w-4" />{wallet ? "Wallet connected" : "Connect wallet"}</button>{wallet && <div className="mt-4 break-all font-mono text-xs text-cyan-200">{wallet}</div>}</div><div className="flex gap-3 border border-cyan-300/20 bg-cyan-300/5 p-5"><ShieldCheck className="h-5 w-5 shrink-0 text-cyan-300" /><p className="text-xs leading-5 text-zinc-400">Private keys remain local. Never paste your seed phrase into chat or send it to anyone.</p></div><div className="flex gap-3 border border-amber-300/20 bg-amber-300/5 p-5"><CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-300" /><p className="text-xs leading-5 text-amber-100/70">After sign-in, open any room. Posting uses the DID signature; reading remains public.</p></div></section>
    </div>
  </ExplorerShell>;
}
