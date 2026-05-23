import { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card border rounded-lg p-4">
      <h2 className="font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="py-10 text-center bg-card border rounded-lg">
      <div className="text-3xl mb-2">🔍</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
