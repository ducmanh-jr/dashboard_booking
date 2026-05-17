import { useState } from "react";
import { updatePartner } from "../../../../api/partnersApi";
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
      await updatePartner(form.id, body);
      await onSaved();
      onClose();
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-50 overflow-y-auto" 
      onClick={onClose}
      role="button"
      tabIndex={-1}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div 
        className="bg-card border rounded-lg p-5 w-full max-w-md space-y-3" 
        onClick={(event: any) => event.stopPropagation()}
        role="presentation"
      >
        <h3 className="font-semibold">Sửa đối tác</h3>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">Họ tên</label>
          <input id="fullName" value={form.fullName} onChange={(event: any) => setForm(prev => ({ ...prev, fullName: event.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <input id="email" type="email" value={form.email} onChange={(event: any) => setForm(prev => ({ ...prev, email: event.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label htmlFor="hotelName" className="block text-sm font-medium mb-1">Tên khách sạn</label>
          <input id="hotelName" value={form.hotelName} onChange={(event: any) => setForm(prev => ({ ...prev, hotelName: event.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">Số điện thoại</label>
          <input id="phone" value={form.phone} onChange={(event: any) => setForm(prev => ({ ...prev, phone: event.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Mật khẩu mới <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span></label>
          <input id="password" type="password" value={form.password} onChange={(event: any) => setForm(prev => ({ ...prev, password: event.target.value }))} className="w-full px-3 py-2 border rounded-md bg-background" />
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





