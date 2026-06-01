import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bell, CheckCircle2, KeyRound, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { fetchAccountOverview, updateAccountProfile, uploadAvatarFile, type AccountOverview } from "../../../api/accountApi";
import type { User } from "../../../shared/types";

type SectionKey = "profile" | "security" | "permissions" | "notifications";

const sections: Array<{ key: SectionKey; label: string; icon: typeof UserRound }> = [
  { key: "profile", label: "Thông tin cá nhân", icon: UserRound },
  { key: "security", label: "Bảo mật", icon: KeyRound },
  { key: "permissions", label: "Phân quyền", icon: ShieldCheck },
  { key: "notifications", label: "Thông báo", icon: Bell },
];

export function AccountSettingsPage({ onUserUpdated }: { onUserUpdated?: (patch: Partial<User>) => void }) {
  const [active, setActive] = useState<SectionKey>("profile");
  const [data, setData] = useState<AccountOverview | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", preferredLanguage: "vi", avatarUrl: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notificationState, setNotificationState] = useState<Record<string, boolean>>({});
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAccountOverview().then((result) => {
      setData(result);
      setForm({
        fullName: result.profile.fullName,
        phone: result.profile.phone || "",
        preferredLanguage: result.profile.preferredLanguage || "vi",
        avatarUrl: result.profile.avatarUrl || "",
      });
      setNotificationState(Object.fromEntries(result.notifications.map((item) => [item.key, item.enabled])));
    });
  }, []);

  const initials = useMemo(() => {
    const name = data?.profile.fullName || "Admin";
    return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }, [data?.profile.fullName]);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    try {
      await updateAccountProfile(form);
      const refreshed = await fetchAccountOverview();
      setData(refreshed);
      setForm({
        fullName: refreshed.profile.fullName,
        phone: refreshed.profile.phone || "",
        preferredLanguage: refreshed.profile.preferredLanguage || "vi",
        avatarUrl: refreshed.profile.avatarUrl || "",
      });
      onUserUpdated?.({
        fullName: refreshed.profile.fullName,
        avatarUrl: refreshed.profile.avatarUrl || null,
      });
      setMessage("Đã cập nhật thông tin tài khoản.");
    } catch (error: any) {
      setMessage(error.message || "Không thể cập nhật tài khoản.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Vui lòng chọn file ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ảnh đại diện tối đa 5MB.");
      return;
    }

    setUploadingAvatar(true);
    setMessage("");
    try {
      await uploadAvatarFile(file);
      const refreshed = await fetchAccountOverview();
      setData(refreshed);
      setForm((current) => ({ ...current, avatarUrl: refreshed.profile.avatarUrl || "" }));
      onUserUpdated?.({ avatarUrl: refreshed.profile.avatarUrl || null });
      window.dispatchEvent(new CustomEvent("nowayhome:user-updated"));
      setMessage("Đã cập nhật ảnh đại diện.");
    } catch (error: any) {
      setMessage(error.message || "Không thể cập nhật ảnh đại diện.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  if (!data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Đang tải tài khoản...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Account Settings</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground">Tài khoản quản trị</h1>
        </div>
        <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
          <Avatar avatarUrl={data.profile.avatarUrl} initials={initials} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{data.profile.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{data.profile.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-1">
          {sections.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActive(item.key)}
                className={[
                  "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-bold transition",
                  isActive ? "border-indigo-100 bg-indigo-50 text-indigo-700" : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                ].join(" ")}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </aside>

        <section className="min-w-0">
          {active === "profile" && (
            <Panel title="Thông tin cá nhân" description="Dùng cho hiển thị nội bộ, liên hệ vận hành và khôi phục tài khoản.">
              <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <Avatar avatarUrl={data.profile.avatarUrl} initials={initials} large />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleAvatarFile(event.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="h-9 w-24 rounded-md border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {uploadingAvatar ? "Đang tải..." : "Đổi ảnh"}
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Họ và tên" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} />
                  <Field label="Chức vụ" value={data.profile.title || (data.profile.isSuperAdmin ? "Admin tổng" : "Quản trị viên")} disabled />
                  <Field label="Email" value={data.profile.email} disabled />
                  <Field label="Số điện thoại" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                  <SelectField label="Ngôn ngữ" value={form.preferredLanguage} onChange={(value) => setForm({ ...form, preferredLanguage: value })} />
                  <Field label="Múi giờ" value={data.profile.timezone} disabled />
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button disabled={saving} onClick={saveProfile} className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                {message && <span className="text-sm text-muted-foreground">{message}</span>}
              </div>
            </Panel>
          )}

          {active === "security" && (
            <Panel title="Bảo mật tài khoản" description="Theo dõi phương thức đăng nhập và các phiên đang hoạt động.">
              <div className="grid gap-3 md:grid-cols-3">
                <StatusTile title="Google" value={data.security.googleLinked ? "Đã liên kết" : "Chưa liên kết"} active={data.security.googleLinked} />
                <StatusTile title="Mật khẩu" value="Có thể đổi qua luồng khôi phục" active />
                <StatusTile title="2FA" value="Chưa bật" active={false} />
              </div>
              <div className="mt-5 overflow-hidden rounded-md border">
                {data.security.sessions.map((session) => (
                  <div key={session.id} className="grid gap-2 border-b p-4 last:border-b-0 md:grid-cols-[1fr_160px_160px]">
                    <div>
                      <p className="text-sm font-bold">{session.deviceName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{session.userAgent || "Không có user agent"}</p>
                    </div>
                    <Info label="IP" value={session.ipAddress || "-"} />
                    <Info label="Hoạt động" value={formatDate(session.lastActiveAt)} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {active === "permissions" && (
            <Panel title="Quản lý phân quyền" description="Quyền hiện tại của tài khoản admin trong hệ thống.">
              <div className="space-y-3">
                {data.permissions.map((item) => (
                  <PermissionRow key={item.name} {...item} />
                ))}
              </div>
            </Panel>
          )}

          {active === "notifications" && (
            <Panel title="Cấu hình thông báo" description="Chọn các nhóm thông báo quan trọng cho vận hành.">
              <div className="space-y-3">
                {data.notifications.map((item) => (
                  <label key={item.key} className="flex items-center justify-between gap-4 rounded-md border p-4">
                    <span className="text-sm font-semibold">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={notificationState[item.key] ?? false}
                      onChange={(event) => setNotificationState({ ...notificationState, [item.key]: event.target.checked })}
                      className="h-5 w-5 accent-indigo-600"
                    />
                  </label>
                ))}
              </div>
            </Panel>
          )}
        </section>
      </div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-5">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Avatar({ avatarUrl, initials, large }: { avatarUrl?: string | null; initials: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = large ? "h-24 w-24 text-2xl" : "h-10 w-10 text-sm";
  useEffect(() => setFailed(false), [avatarUrl]);
  return avatarUrl && !failed ? (
    <img src={avatarUrl} alt="" onError={() => setFailed(true)} className={`${size} rounded-full object-cover`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-full bg-indigo-50 font-black text-indigo-700`}>{initials}</div>
  );
}

function Field({ label, value, onChange, disabled, placeholder }: { label: string; value: string; onChange?: (value: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <input value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary disabled:bg-muted/40" />
    </label>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary">
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}

function StatusTile({ title, value, active }: { title: string; value: string; active: boolean }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">{title}</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-bold">
        <CheckCircle2 size={16} className={active ? "text-emerald-600" : "text-slate-300"} />
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function PermissionRow({ name, description, enabled }: { name: string; description: string; enabled: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-4">
      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
        <UsersRound size={16} />
      </div>
      <div>
        <p className="text-sm font-bold">{name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
