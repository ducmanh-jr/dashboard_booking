/**
 * Hàm hỗ trợ xử lý số nguyên trong khoảng cho trước
 */
export function clampInt(val: any, fallback: number, min?: number, max?: number): number {
  let n = parseInt(String(val), 10);
  if (isNaN(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

/**
 * Hàm hỗ trợ xử lý text
 */
export function normalizeText(val: any): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

/**
 * Kiểm tra email hợp lệ đơn giản
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
