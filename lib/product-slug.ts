const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function productSlug(title: string, id: string): string {
  const titlePart = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const idPart = id.replace(/-/g, "");
  return `${titlePart}--${idPart}`;
}

export function productHref(title: string, id: string): string {
  return `/product/${productSlug(title, id)}`;
}

// Returns the UUID extracted from a slug param, or null if invalid.
// Accepts both plain UUIDs (old URLs) and slug--hex32 (new URLs).
export function parseProductId(param: string): string | null {
  if (UUID_RE.test(param)) return param;
  const match = param.match(/--([0-9a-f]{32})$/i);
  if (!match) return null;
  const h = match[1];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function isRawUuid(param: string): boolean {
  return UUID_RE.test(param);
}
