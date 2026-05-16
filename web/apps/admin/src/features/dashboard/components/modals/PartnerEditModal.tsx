import { useState } from "react";
import { api } from "@nowayhome/api-client";
import { Partner } from "../../../../shared/types";

type PartnerEditForm = {
  id: number;
  email: string;
  fullName: string;
  hotelName: string;
  phone: string;
  password: string;
};

export function PartnerEditModal({
  partner,
  onClose,
  onSaved,
}: {
  partner: Partner;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<PartnerEditForm>({
    id: partner.id,
    email: partner.email,
    fullName: partner.fullName,
    hotelName: partner.hotelName || "",
    phone: partner.phone || "",
    password: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setErr("");
    setSaving(true);
    try {
      const body: any = {
        email: form.email,
        fullName: form.fullName,
        hotelName: form.hotelName,
        phone: form.phone,
      };
      if (form.password) body.password = form.password;
      await api(`/admin/partners/${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await onSaved();
      onClose();
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border rounded-lg p-5 w-full max-w-md space-y-3" onClick={(event) => event.stopPropagation()}>
        <h3 className="font-semibold">Sửa đối tác</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Họ tên</label>
          <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tên khách sạn</label>
          <input value={form.hotelName} onChange={(event) => setForm({ ...form, hotelName: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số điện thoại</label>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu mới <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span></label>
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border">Hủy</button>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}





