export function fmtVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

export function fmtDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}


