export function normalizeRoomRoute(value?: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return "";
  }
}
