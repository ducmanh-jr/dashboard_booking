import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import bcrypt from "bcryptjs";
import config from "../../config/index.js";
import { 
  sign, 
  loginKey, 
  checkLoginLock, 
  recordLoginFailure, 
  resetLoginAttempts, 
  getDummyHash, 
  hasAdminRole,
  loadUserPublic
} from "./auth.service.js";
import { loadVerifiedSession, clearAuthCookie } from "./auth.middleware.js";

const router = Router();
const COOKIE = "session";
const isProduction = config.NODE_ENV === "production";

function setCookie(res: Response, userId: number, role: string) {
  const token = sign({ userId, role });
  res.cookie(`session_${role}`, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  // Keep legacy for backward compat
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post("/login", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });

    const key = loginKey(req, email);
    const lockSec = checkLoginLock(key);
    if (lockSec > 0) {
      return res.status(429).json({ error: `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${lockSec} giây.` });
    }

    const [rows]: any = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];

    const passwordHash = user?.password_hash || (await getDummyHash());
    const passwordOk = await bcrypt.compare(String(password), passwordHash);

    if (!user || !passwordOk) {
      recordLoginFailure(key);
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }

    if (user.user_type === "staff") {
      if (!(await hasAdminRole(user.id))) {
        recordLoginFailure(key);
        return res.status(403).json({ error: "Tài khoản không có quyền truy cập" });
      }
      if (user.status !== "active") {
        recordLoginFailure(key);
        return res.status(403).json({ error: "Tài khoản đang bị khoá" });
      }
      resetLoginAttempts(key);
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      setCookie(res, user.id, "admin");
      return res.json({
        user: { id: user.id, email: user.email, fullName: user.full_name, role: "admin", status: "approved" },
      });
    }

    if (user.user_type === "partner") {
      const [pp]: any = await pool.query(
        "SELECT kyc_status, reject_reason FROM partner_profiles WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      const kyc = pp[0]?.kyc_status || "pending";
      if (kyc === "pending") return res.status(403).json({ error: "Tài khoản đang chờ admin xác nhận" });
      if (kyc === "rejected") return res.status(403).json({ error: `Tài khoản bị từ chối: ${pp[0]?.reject_reason || ""}` });
      resetLoginAttempts(key);
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      setCookie(res, user.id, "partner");
      return res.json({
        user: { id: user.id, email: user.email, fullName: user.full_name, role: "partner", status: "approved" },
      });
    }

    if (user.user_type === "customer") {
      if (user.status !== "active") {
        recordLoginFailure(key);
        return res.status(403).json({ error: "Tài khoản khách hàng đang bị khoá" });
      }
      resetLoginAttempts(key);
      await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
      setCookie(res, user.id, "customer");
      return res.json({
        user: { id: user.id, email: user.email, fullName: user.full_name, role: "customer", status: "active" },
      });
    }

    recordLoginFailure(key);
    return res.status(403).json({ error: "Tài khoản không có quyền truy cập" });
  } catch (e) { next(e); }
});

router.post("/logout", (req: Request, res: Response) => {
  const referer = req.headers.referer || "";
  if (referer.includes("5173") || referer.includes("admin")) clearAuthCookie(res, "admin");
  else if (referer.includes("5174") || referer.includes("partner")) clearAuthCookie(res, "partner");
  else clearAuthCookie(res, "customer");
  res.json({ ok: true });
});

router.get("/me", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const referer = req.headers.referer || "";
    let s: any = null;
    
    // Attempt to load the appropriate session based on the caller
    if (referer.includes("5173") || referer.includes("admin")) {
      s = await loadVerifiedSession(req.cookies?.["session_admin"]) || await loadVerifiedSession(req.cookies?.["session"]);
    } else if (referer.includes("5174") || referer.includes("partner")) {
      s = await loadVerifiedSession(req.cookies?.["session_partner"]) || await loadVerifiedSession(req.cookies?.["session"]);
    } else {
      s = await loadVerifiedSession(req.cookies?.["session_customer"]) || await loadVerifiedSession(req.cookies?.["session"]);
    }

    // Fallback to any available session if referer parsing failed
    if (!s) {
      s = await loadVerifiedSession(req.cookies?.["session_admin"])
       || await loadVerifiedSession(req.cookies?.["session_partner"])
       || await loadVerifiedSession(req.cookies?.["session_customer"])
       || await loadVerifiedSession(req.cookies?.["session"]);
    }

    if (!s) {
      clearAuthCookie(res);
      return res.json({ user: null });
    }

    const user = await loadUserPublic(s.userId);
    if (!user) {
      clearAuthCookie(res);
      return res.json({ user: null });
    }
    res.json({ user });
  } catch (e) { next(e); }
});

router.get("/google/start", (req: Request, res: Response) => {
  res
    .status(501)
    .type("html")
    .send(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Chưa cấu hình Google OAuth</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7fb;margin:0;padding:24px}
      .card{max-width:720px;margin:40px auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px}
      h1{font-size:20px;margin:0 0 8px}
      p{margin:8px 0;color:#374151;line-height:1.5}
      code{background:#f3f4f6;padding:2px 6px;border-radius:6px}
      a{color:#2563eb;text-decoration:none}
      a:hover{text-decoration:underline}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Google OAuth chưa được cấu hình</h1>
      <p>Bạn đã bật nút <b>Tiếp tục với Google</b> trên giao diện, nhưng backend hiện chưa có cấu hình Google OAuth.</p>
      <p>Để bật thật: cần tạo Google OAuth Client, đặt biến môi trường (client id/secret) và triển khai callback.</p>
      <p>Bạn có thể quay lại trang trước và đăng nhập bằng email/mật khẩu như bình thường.</p>
      <p><a href="javascript:history.back()">← Quay lại</a></p>
    </div>
  </body>
</html>`);
});

export default router;
