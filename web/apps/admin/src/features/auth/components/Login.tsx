import { FormEvent, useState } from "react";
import { login, googleLogin } from "../../../api/authApi";
import { AuthLayout, GoogleButton } from "@nowayhome/auth-ui";
import { User } from "../../../shared/types";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const inputClass =
  "w-full h-[48px] pl-[44px] pr-[14px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc]/50 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] focus:bg-white focus:ring-4 focus:ring-[#3b82f6]/5 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result.user?.role !== "admin") throw new Error("Tai khoan nay khong phai admin");
      onLogin(result.user);
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
      if (result.user?.role !== "admin") {
        throw new Error("Tài khoản này không phải admin. Chỉ email admin mới được đăng nhập tại đây.");
      }
      onLogin(result.user);
    } catch (error: any) {
      setErr(error.message ?? "Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Please enter admin details"
      footer={
        <p className="text-center text-sm text-[#64748b]">
          Need an account? <span className="font-semibold text-[#3b82f6] hover:underline cursor-pointer">Contact admin</span>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className={inputClass}
            />
          </div>
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className={inputClass}
            />
          </div>
        </div>

        {err && <div className="text-xs font-medium text-destructive">{err}</div>}

        <div className="pt-2 space-y-4">
          <button
            disabled={loading}
            className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {GOOGLE_CLIENT_ID && (
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
                label={loading ? "Signing in..." : "Sign in with Google"}
              />
            </>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}

