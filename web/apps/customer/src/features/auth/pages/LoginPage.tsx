import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login, registerCustomer } from "../../../api/authApi";
import { AuthLayout, GoogleButton } from "@nowayhome/auth-ui";
import { User } from "@/shared/types";

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });
  const [err, setErr] = useState("");
  const next = params.get("next") || "/";
  const inputClass = "w-full h-[48px] pl-[44px] pr-[14px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc]/50 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] focus:bg-white focus:ring-4 focus:ring-[#3b82f6]/5 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErr("");
    try {
      const result = mode === "login"
        ? await login({ email: form.email, password: form.password })
        : await registerCustomer(form);
      if (result.user?.role !== "customer") throw new Error("Tai khoan nay khong phai khach hang");
      onLogin(result.user);
      navigate(next, { replace: true });
    } catch (error: any) {
      setErr(error.message);
    }
  }

  return (
    <AuthLayout
      title={mode === "login" ? "Welcome back" : "Create account"}
      subtitle="Please enter your details"
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
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" className={inputClass} />
              </div>
              <div className="relative">
                <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.31-2.31a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className={inputClass} />
              </div>
            </>
          )}
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" className={inputClass} />
          </div>
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className={inputClass} />
          </div>
        </div>

        {err && <div className="text-xs font-medium text-destructive">{err}</div>}

        <div className="pt-2 space-y-4">
          <button className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200">
            {mode === "login" ? "Sign in" : "Sign up"}
          </button>

          {mode === "login" && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#e2e8f0]"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="bg-[#fcfdfe] px-2 text-[#94a3b8]">Or continue with</span>
                </div>
              </div>
              <GoogleButton href="/api/auth/google/start" />
            </>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
