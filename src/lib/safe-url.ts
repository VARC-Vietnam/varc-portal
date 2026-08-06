/**
 * Allow empty, site-relative paths (/...), or http(s) URLs.
 * Rejects javascript:, data:, protocol-relative //, and other schemes.
 */
export function isSafePublicUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return true;

  if (v.startsWith("/") && !v.startsWith("//")) {
    if (v.includes("\0") || v.includes("\\")) return false;
    // Disallow scheme-like segments after the first slash (e.g. /javascript:...)
    if (/^\/[a-z][a-z0-9+.-]*:/i.test(v)) return false;
    return true;
  }

  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Escape user text before embedding in a MongoDB $regex. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
