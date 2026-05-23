import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchState } from "@/shared/types";
import { todayOffset } from "@/shared/utils/format";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

export function SearchBox({ initial, compact = false }: { initial?: Partial<SearchState>; compact?: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SearchState>({
    q: initial?.q || "",
    checkIn: initial?.checkIn || todayOffset(1),
    checkOut: initial?.checkOut || todayOffset(2),
    guests: initial?.guests || 2,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      q: form.q,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guests: String(form.guests),
    });
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className={`bg-card border rounded-lg p-3 shadow-sm ${compact ? "" : "max-w-5xl"}`}>
      <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_.8fr_auto]">
        <Field label="Địa điểm">
          <input value={form.q} onChange={(e) => setForm(prev => ({ ...prev, q: e.target.value }))} placeholder="Đà Nẵng, Hà Nội..." className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label="Nhận phòng">
          <input type="date" value={form.checkIn} onChange={(e) => setForm(prev => ({ ...prev, checkIn: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label="Trả phòng">
          <input type="date" value={form.checkOut} onChange={(e) => setForm(prev => ({ ...prev, checkOut: e.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label="Số khách">
          <input type="number" min={1} value={form.guests} onChange={(e) => setForm(prev => ({ ...prev, guests: Number(e.target.value) }))} className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <button className="md:self-end h-10 px-5 rounded-md bg-primary text-primary-foreground font-bold">Tìm</button>
      </div>
    </form>
  );
}
