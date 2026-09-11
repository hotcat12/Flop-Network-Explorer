import { getActiveIdentity, nextNonce, signIdentity, type DidIdentity } from "@/lib/did";

export type SendDiagnostic = {
  at: string;
  room: string;
  mode: "signed" | "public";
  did?: string;
  nonce?: string;
  canonicalPayload?: string;
  canonicalPayloadSha256?: string;
  signatureLength?: number;
  signaturePrefix?: string;
  requestPath: string;
  elapsedMs: number;
  status: number;
  ok: boolean;
  responseContentType: string;
  responseBody: string;
  responseHeaders: Record<string, string>;
  note: string;
};

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeBody(value: string) { return value.slice(0, 1600).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " "); }

export async function sendTechnocoreMessage(room: string, nick: string, text: string, identity: DidIdentity | null = getActiveIdentity()): Promise<SendDiagnostic> {
  const clean = text.trim();
  const started = performance.now();
  let requestPath = "";
  let mode: "signed" | "public" = "public";
  let did: string | undefined;
  let nonce: string | undefined;
  let canonicalPayload: string | undefined;
  let signature = "";
  if (identity) {
    mode = "signed";
    did = identity.did;
    nonce = nextNonce(identity.did, room);
    canonicalPayload = `${identity.did}|${nonce}|${clean}`;
    signature = await signIdentity(identity, canonicalPayload);
    requestPath = `/api/technocore/r/${encodeURIComponent(room)}/say-signed/${encodeURIComponent(identity.did)}/${encodeURIComponent(signature)}/${nonce}/${encodeURIComponent(clean)}`;
  } else {
    const cleanNick = nick.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 48);
    requestPath = `/api/technocore/r/${encodeURIComponent(room)}/say/${encodeURIComponent(cleanNick)}/${encodeURIComponent(clean)}`;
  }
  const response = await fetch(requestPath, { cache: "no-store" });
  const body = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => { if (["content-type", "x-room-generation", "retry-after", "cache-control", "cf-ray"].includes(key)) headers[key] = value; });
  const elapsedMs = Math.round(performance.now() - started);
  const diagnostic: SendDiagnostic = {
    at: new Date().toISOString(), room, mode, did, nonce, canonicalPayload, canonicalPayloadSha256: canonicalPayload ? await sha256(canonicalPayload) : undefined,
    signatureLength: signature ? signature.length : undefined, signaturePrefix: signature ? `${signature.slice(0, 10)}…${signature.slice(-6)}` : undefined,
    requestPath: requestPath.replace(/\/say-signed\/([^/]+)\/([^/]+)\//, "/say-signed/$1/[signature-redacted]/"), elapsedMs, status: response.status, ok: response.ok,
    responseContentType: response.headers.get("content-type") ?? "", responseBody: safeBody(body), responseHeaders: headers,
    note: response.ok ? (mode === "signed" ? "Technocore accepted the signed write; verify the room JSON for from/sig/nonce." : "Technocore accepted an unsigned public write.") : "Technocore rejected the write; inspect status and response body.",
  };
  if (!response.ok) throw Object.assign(new Error(diagnostic.responseBody || `Message rejected (HTTP ${response.status})`), { diagnostic });
  return diagnostic;
}
