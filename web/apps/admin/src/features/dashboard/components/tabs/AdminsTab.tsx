import { useState, useEffect } from "react";
import { api } from "@nowayhome/api-client";

export function AdminsTab({ currentUserId }: { currentUserId: number }) {
  const [list, setList] = useState<{ id: number; email: string; fullName: string; createdAt: string }[]>([]);
  const [form, setForm] = useState({ email: "", password: "", fullName: "" });
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: number; email: string; fullName: string; password: string } | null>(null);
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    try {
      const result = await api("/admin/admins");
      setList(result.admins);
    } catch (error: any) {
      setErr(error.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await api("/admin/admins", { method: "POST", body: JSON.stringify(form) });
      setMsg("Đã tạo admin thành công");
      setForm({ email: "", password: "", fullName: "" });
      await load();
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setEditErr("");
    setSavingEdit(true);
    try {
      const body: any = { email: editing.email, fullName: editing.fullName };
      if (editing.password) body.password = editing.password;
      await api(`/admin/admins/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setEditing(null);
      await load();
    } catch (error: any) {
      setEditErr(error.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeAdmin(id: number) {
    if (!confirm("Xóa quản trị viên này?")) return;
    try {
      await api(`/admin/admins/${id}`, { method: "DELETE" });
      await load();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
      <form onSubmit={submit} className="bg-card border rounded-lg p-5 space-y-3 h-fit">
        <h3 className="font-semibold">Tạo tài khoản admin mới</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Họ tên</label>
          <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mat khau</label>
          <input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
        </div>
        {err && <div className="text-sm text-destructive">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}
        <button disabled={loading} className="w-full py-2 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50">
          {loading ? "Đang tạo..." : "Tạo admin"}
        </button>
      </form>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Danh sách admin ({list.length})</div>
        <table className="w-full text-sm">
          <thead className="bg-muted text-left sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5">Họ tên</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Ngày tạo</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((admin) => (
              <tr key={admin.id} className="border-t">
                <td className="px-4 py-3">{admin.fullName}{admin.id === currentUserId && <span className="ml-2 text-xs text-primary">(bạn)</span>}</td>
                <td className="px-4 py-3">{admin.email}</td>
                <td className="px-4 py-3">{new Date(admin.createdAt).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap text-right">
                  <button onClick={() => setEditing({ id: admin.id, email: admin.email, fullName: admin.fullName, password: "" })} className="px-2 py-1 text-xs rounded border hover:bg-accent">
                    Sửa
                  </button>
                  {admin.id !== currentUserId && (
                    <button onClick={() => removeAdmin(admin.id)} className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground">
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 pt-10 z-50 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-card border rounded-lg p-5 w-full max-w-md space-y-3" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-semibold">Sửa quản trị viên</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Họ tên</label>
              <input value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mật khẩu mới <span className="text-xs text-muted-foreground">(để trống nếu không đổi)</span></label>
              <input type="password" value={editing.password} onChange={(event) => setEditing({ ...editing, password: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </div>
            {editErr && <div className="text-sm text-destructive">{editErr}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-md border">Hủy</button>
              <button onClick={saveEdit} disabled={savingEdit} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                {savingEdit ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





