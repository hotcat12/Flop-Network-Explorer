export function isValidPublicDid(value: string) {
  return /^did:key:[A-Za-z0-9._~-]+$/.test(value.trim());
}
