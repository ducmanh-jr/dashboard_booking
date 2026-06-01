import { FormEvent, useState } from "react";
import { login, registerPartner, googleLogin, applyAsPartner } from "../../../api/authApi";
import { AuthLayout, GoogleButton } from "@nowayhome/auth-ui";
import { User } from "../../../shared/types";
import { PARTNER_PORTAL_NAME } from "../../../shared/config/pageTitles";
import { usePageTitle } from "../../../shared/hooks/usePageTitle";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const inputClass =
  "w-full h-[48px] pl-[44px] pr-[14px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc]/50 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] focus:bg-white focus:ring-4 focus:ring-[#3b82f6]/5 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  usePageTitle({ title: "Đăng nhập", portal: PARTNER_PORTAL_NAME, restoreOnUnmount: false });
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "", hotelName: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ email: string; hotelName: string } | null>(null);
  // Sau Google login: user là customer (chưa phải partner) → hỏi có muốn đăng ký partner không
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login({ email: form.email, password: form.password });
        if (result.user?.role !== "partner") throw new Error("Tai khoan nay khong phai doi tac");
        onLogin(result.user);
      } else {
        await registerPartner(form);
        setPending({ email: form.email, hotelName: form.hotelName });
      }
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setErr("");
    setLoading(true);
    try {
      const result = await googleLogin(credential);
      const role = result.user?.role;

      if (role === "partner") {
        // Đã là partner → vào dashboard luôn
        onLogin(result.user);
      } else if (role === "admin") {
        throw new Error("Tài khoản admin không thể đăng nhập vào trang đối tác.");
      } else {
        // role === "customer" → chưa phải partner, hỏi có muốn đăng ký không
        setGoogleUser(result.user);
      }
    } catch (error: any) {
      setErr(error.message ?? "Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  }

  // Màn hình: đăng ký partner sau khi đã Google login thành công
  if (googleUser) {
    return (
      <AuthLayout
        title="Đăng ký trở thành đối tác"
        subtitle={`Xin chào ${googleUser.fullName ?? googleUser.email}! Hãy điền thêm thông tin để đăng ký.`}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f0f9ff] p-4 text-sm text-[#0369a1]">
            Tài khoản Google của bạn đã được xác minh. Điền thông tin bên dưới để gửi yêu cầu trở thành đối tác.
          </div>

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <Input
                placeholder="Tên khách sạn / cơ sở lưu trú"
                value={form.hotelName}
                onChange={(v) => setForm({ ...form, hotelName: v })}
                required
                className={inputClass}
              />
            </div>
            <div className="relative">
              <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.31-2.31a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <Input
                placeholder="Số điện thoại"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                className={inputClass}
              />
            </div>
          </div>

          {err && <div className="text-xs font-medium text-destructive">{err}</div>}

          <div className="space-y-3">
            <button
              disabled={loading || !form.hotelName}
              onClick={async () => {
                setErr("");
                setLoading(true);
                try {
                  await applyAsPartner({
                    hotelName: form.hotelName,
                    phone: form.phone || undefined,
                  });
                  setPending({ email: googleUser.email, hotelName: form.hotelName });
                  setGoogleUser(null);
                } catch (error: any) {
                  setErr(error.message ?? "Đăng ký thất bại");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
            >
              {loading ? "Đang gửi..." : "Gửi yêu cầu đăng ký đối tác"}
            </button>
            <button
              type="button"
              onClick={() => setGoogleUser(null)}
              className="w-full text-sm text-[#64748b] hover:text-[#0f172a] transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (pending) {
    return (
      <AuthLayout title="Under review" subtitle="Your partner account was submitted">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff7ed] text-[#f59e0b]">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-sm leading-7 text-[#6f717b]">
            Partner account {pending.email} for {pending.hotelName} is waiting for admin approval.
          </p>
          <button
            onClick={() => {
              setPending(null);
              setMode("login");
              setForm({ email: pending.email, password: "", fullName: "", phone: "", hotelName: "" });
            }}
            className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200"
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={mode === "login" ? "Welcome back" : "Create account"}
      subtitle={mode === "login" ? "Please enter partner details" : "Please enter partner details"}
      footer={
        <p className="text-center text-sm text-[#64748b]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErr("");
            }}
            className="font-semibold text-[#3b82f6] underline underline-offset-4 hover:text-[#2563eb] transition-colors"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3">
          {mode === "register" && (
            <>
              <div className="relative">
                <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <Input placeholder="Full name" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} required className={inputClass} />
              </div>
              <div className="relative">
                <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <Input placeholder="Hotel / property name" value={form.hotelName} onChange={(value) => setForm({ ...form, hotelName: value })} required className={inputClass} />
              </div>
              <div className="relative">
                <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.31-2.31a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <Input placeholder="Phone number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} className={inputClass} />
              </div>
            </>
          )}
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <Input placeholder="Email address" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required className={inputClass} />
          </div>
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <Input placeholder="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required className={inputClass} />
          </div>
        </div>

        {err && <div className="text-xs font-medium text-destructive">{err}</div>}

        <div className="pt-2 space-y-4">
          <button
            disabled={loading}
            className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
          >
            {loading ? "Processing..." : mode === "login" ? "Sign in" : "Sign up"}
          </button>

          {mode === "login" && GOOGLE_CLIENT_ID && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#e2e8f0]"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="bg-[#fcfdfe] px-2 text-[#94a3b8]">Or continue with</span>
                </div>
              </div>
              <GoogleButton
                clientId={GOOGLE_CLIENT_ID}
                onCredential={handleGoogleCredential}
                label={loading ? "Processing..." : "Sign in with Google"}
              />
            </>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
  required,
  className = inputClass,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
