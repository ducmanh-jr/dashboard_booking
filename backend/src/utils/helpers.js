/**
 * Clamp a value to an integer within a range
 */
export function clampInt(value, def, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * Basic email validation
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

/**
 * Normalize text by trimming and converting empty to null
 */
export function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
