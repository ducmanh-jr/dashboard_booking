export function fmtVnd(value: number) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} VND`;
}

export function fmtDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function diffNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

export function todayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
