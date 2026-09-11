const STORAGE_KEY = "flop.did.v1";
let activeIdentity: DidIdentity | null = null;
const ED25519_PKCS8_PREFIX = new Uint8Array([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);

function bytesToBase64Url(bytes: Uint8Array) { let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function base64UrlToBytes(value: string) { const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4); const binary = atob(padded); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }
function concat(...parts: Uint8Array[]) { const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result; }
function base58(bytes: Uint8Array) { const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; let digits = [0]; bytes.forEach((byte) => { let carry = byte; for (let i = 0; i < digits.length; i++) { const value = digits[i] * 256 + carry; digits[i] = value % 58; carry = Math.floor(value / 58); } while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); } }); let output = ""; for (let i = 0; i < bytes.length && bytes[i] === 0; i++) output += "1"; for (let i = digits.length - 1; i >= 0; i--) output += alphabet[digits[i]]; return output; }
function didFromPublicKey(x: string) { return `did:key:z${base58(concat(new Uint8Array([0xed, 0x01]), base64UrlToBytes(x)))}`; }

export type DidIdentity = { did: string; jwk: JsonWebKey };
export function didFromJwk(jwk: JsonWebKey) { if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || !jwk.x) throw new Error("Expected an Ed25519 JWK containing x and d"); return didFromPublicKey(jwk.x); }
export async function generateIdentity(): Promise<DidIdentity> { const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]); const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey); return { did: didFromJwk(jwk), jwk }; }
export function parseImportedJwk(raw: string): DidIdentity { const jwk = JSON.parse(raw) as JsonWebKey; return { did: didFromJwk(jwk), jwk }; }
export async function signIdentity(identity: DidIdentity, message: string) { const key = await crypto.subtle.importKey("jwk", identity.jwk, { name: "Ed25519" }, false, ["sign"]); const signature = await crypto.subtle.sign({ name: "Ed25519" }, key, new TextEncoder().encode(message)); return bytesToBase64Url(new Uint8Array(signature)); }
export function setActiveIdentity(identity: DidIdentity | null) { activeIdentity = identity; }
export function getActiveIdentity() { return activeIdentity; }
export function nextNonce(did: string, room: string) { const key = `flop.nonce.v1.${did}.${room}`; const previous = Number(localStorage.getItem(key) || "0"); const next = Math.max(Date.now(), previous + 1); localStorage.setItem(key, String(next)); return String(next); }

async function deriveKey(password: string, salt: Uint8Array) { return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 250_000, hash: "SHA-256" }, await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]), { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]); }
export async function saveIdentity(identity: DidIdentity, password: string) { if (password.length < 8) throw new Error("Use at least 8 characters for the local encryption password"); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await deriveKey(password, salt); const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(identity.jwk))); localStorage.setItem(STORAGE_KEY, JSON.stringify({ salt: bytesToBase64Url(salt), iv: bytesToBase64Url(iv), data: bytesToBase64Url(new Uint8Array(ciphertext)) })); }
export async function loadIdentity(password: string): Promise<DidIdentity> { const stored = localStorage.getItem(STORAGE_KEY); if (!stored) throw new Error("No saved Digital ID found in this browser"); const value = JSON.parse(stored); const key = await deriveKey(password, base64UrlToBytes(value.salt)); const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlToBytes(value.iv) }, key, base64UrlToBytes(value.data)); const jwk = JSON.parse(new TextDecoder().decode(plain)) as JsonWebKey; return { did: didFromJwk(jwk), jwk }; }
export function clearIdentity() { localStorage.removeItem(STORAGE_KEY); }
export function hasSavedIdentity() { return Boolean(localStorage.getItem(STORAGE_KEY)); }
export function isValidDid(value: string) { return /^did:key:z[1-9A-HJ-NP-Za-km-z]+$/.test(value); }
export const DID_STORAGE_KEY = STORAGE_KEY;
