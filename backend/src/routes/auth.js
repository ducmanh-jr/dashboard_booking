import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import logger from "../utils/logger.js";
import config from "../utils/config.js";
import { notifyAdmins, createNotification } from "../utils/notifications.js";
import { clampInt, isValidEmail } from "../utils/helpers.js";
import { validateBody } from "../middleware/validate.js";
import { registerPartnerSchema, registerCustomerSchema, adminCreateSchema } from "../validation/authSchemas.js";

const router = Router();

const isProduction = config.NODE_ENV === "production";
const COOKIE = "session";
const SECRET = config.SESSION_SECRET;


// ===== Cookie session (HMAC, timing-safe) =====
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  let expBuf, sigBuf;
  try {
    expBuf = Buffer.from(expected, "base64url");
    sigBuf = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (expBuf.length !== sigBuf.length) return null;
  try {
    if (!crypto.timingSafeEqual(expBuf, sigBuf)) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

function setCookie(res, userId, role) {
  res.cookie(COOKIE, sign({ userId, role }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: isProduction });
}


// ===== Brute-force protection (in-memory) =====

// ===== Brute-force protection (in-memory) =====
const loginAttempts = new Map(); // key -> { count, lockedUntil }
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
function loginKey(req, email) {
  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
  return `${ip}|${String(email || "").toLowerCase()}`;
}
function checkLoginLock(key) {
  const e = loginAttempts.get(key);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}
function recordLoginFailure(key) {
  const now = Date.now();
  const e = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  if (e.lockedUntil <= now) e.count = 0;
  e.count += 1;
  if (e.count >= MAX_FAILS) {
    e.lockedUntil = now + LOCK_MS;
    e.count = 0;
  }
  loginAttempts.set(key, e);
}
function resetLoginAttempts(key) {
  loginAttempts.delete(key);
}
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [k, v] of loginAttempts) {
    if (v.lockedUntil < cutoff && v.count === 0) loginAttempts.delete(k);
  }
}, 5 * 60 * 1000).unref?.();

// ===== Dummy bcrypt hash de chong timing attack khi user khong ton tai =====
let DUMMY_HASH_PROMISE = null;
function getDummyHash() {
  if (!DUMMY_HASH_PROMISE) {
    DUMMY_HASH_PROMISE = bcrypt.hash("not-a-real-password-just-timing", 10);
  }
  return DUMMY_HASH_PROMISE;
}

// ===== Helpers =====
async function hasAdminRole(userId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT 1 FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.slug = 'admin' LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}
async function getAdminRoleId() {
  const [rows] = await pool.query("SELECT id FROM roles WHERE slug='admin' LIMIT 1");
  if (!rows.length) throw new Error("Role 'admin' chưa được seed (kiểm tra themcode.sql)");
  return rows[0].id;
}

// ===== Verify session voi DB (chong gia mao + chong cookie cu) =====
async function loadVerifiedSession(token) {
  const s = verifyToken(token);
  if (!s || !s.userId || !s.role) return null;
  const [rows] = await pool.query(
    "SELECT id, user_type, status FROM users WHERE id = ? LIMIT 1",
    [s.userId]
  );
  const u = rows[0];
  if (!u) return null;
  if (u.status === "suspended" || u.status === "banned") return null;
  if (s.role === "admin") {
    if (u.user_type !== "staff") return null;
    if (u.status !== "active") return null;
    if (!(await hasAdminRole(u.id))) return null;
    return { userId: u.id, role: "admin" };
  }
  if (s.role === "partner") {
    if (u.user_type !== "partner") return null;
    const [pp] = await pool.query(
      "SELECT kyc_status FROM partner_profiles WHERE user_id = ? LIMIT 1",
      [u.id]
    );
    if (pp[0]?.kyc_status !== "approved") return null;
    return { userId: u.id, role: "partner" };
  }
  if (s.role === "customer") {
    if (u.user_type !== "customer") return null;
    if (u.status !== "active") return null;
    return { userId: u.id, role: "customer" };
  }
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
    }
    req.session = s;
    next();
  } catch (e) { next(e); }
}
export async function requireAdmin(req, res, next) {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
    }
    if (s.role !== "admin") return res.status(403).json({ error: "Khong co quyen" });
    req.session = s;
    next();
  } catch (e) { next(e); }
}
export async function requirePartner(req, res, next) {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phien dang nhap khong hop le hoac da het han" });
    }
    if (s.role !== "partner") return res.status(403).json({ error: "Chi danh cho doi tac" });
    req.session = s;
    next();
  } catch (e) { next(e); }
}

// Lấy user đầy đủ (kèm role/status mapped) để trả về frontend
async function loadUserPublic(userId) {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  const u = rows[0];
  if (!u) return null;
  if (u.user_type === "staff") {
    const isAdmin = await hasAdminRole(u.id);
    if (isAdmin) return { id: u.id, email: u.email, fullName: u.full_name, role: "admin", status: "approved" };
    return { id: u.id, email: u.email, fullName: u.full_name, role: "staff", status: u.status };
  }
  if (u.user_type === "partner") {
    const [pp] = await pool.query("SELECT kyc_status FROM partner_profiles WHERE user_id = ? LIMIT 1", [u.id]);
    const kyc = pp[0]?.kyc_status || "pending";
    const status = kyc === "approved" ? "approved" : kyc === "rejected" ? "rejected" : "pending";
    return { id: u.id, email: u.email, fullName: u.full_name, role: "partner", status };
  }
  if (u.user_type === "customer") {
    return { id: u.id, email: u.email, fullName: u.full_name, phone: u.phone, role: "customer", status: u.status };
  }
  return { id: u.id, email: u.email, fullName: u.full_name, role: u.user_type, status: u.status };
}

// ===== Auth =====
router.post("/auth/register", validateBody(registerPartnerSchema), async (req, res, next) => {
  const { email, password, fullName, phone, hotelName } = req.validated;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dup] = await conn.query("SELECT id FROM users WHERE email = ? FOR UPDATE", [email]);
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Email đã được đăng ký" });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, phone, password_hash, full_name, user_type, status)
       VALUES (?, ?, ?, ?, ?, 'partner', 'pending')`,
      [crypto.randomUUID(), email.trim(), phone || null, hash, fullName]
    );
    await conn.query(
      `INSERT INTO partner_profiles (user_id, business_name, business_type, kyc_status)
       VALUES (?, ?, 'individual', 'pending')`,
      [r.insertId, hotelName]
    );
    await conn.commit();
    
    // Thong bao cho admin
    await notifyAdmins(pool, {
      type: "new_partner_registration",
      title: "Doi tac moi dang ky",
      body: `Doi tac ${fullName} (${hotelName}) vua dang ky tai khoan.`,
      entityType: "partner",
      entityId: r.insertId
    });

    res.json({
      message: "Đăng ký thành công. Vui lòng chờ admin xác nhận.",
      user: { id: r.insertId, email, status: "pending" },
    });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email đã được đăng ký" });
    }
    next(e);
  } finally { conn.release(); }
});

router.post("/customer/auth/register", validateBody(registerCustomerSchema), async (req, res, next) => {
  const { email, password, fullName, phone } = req.validated;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [dup] = await conn.query("SELECT id FROM users WHERE email = ? FOR UPDATE", [email]);
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Email da duoc dang ky" });
    }
    const hash = await bcrypt.hash(password, 10);
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, phone, password_hash, full_name, user_type, status, email_verified_at)
       VALUES (?, ?, ?, ?, ?, 'customer', 'active', NOW())`,
      [crypto.randomUUID(), email.trim(), phone || null, hash, fullName]
    );
    await conn.query("INSERT INTO customer_profiles (user_id) VALUES (?)", [r.insertId]);
    await conn.commit();

    resetLoginAttempts(loginKey(req, email));
    setCookie(res, r.insertId, "customer");
    res.json({
      user: { id: r.insertId, email, fullName, role: "customer", status: "active" },
    });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email da duoc dang ky" });
    }
    next(e);
  } finally { conn.release(); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });

    const key = loginKey(req, email);
    const lockSec = checkLoginLock(key);
    if (lockSec > 0) {
      return res.status(429).json({ error: `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${lockSec} giây.` });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];

    // Luon chay bcrypt de tranh user enumeration timing attack
    const passwordHash = user?.password_hash || (await getDummyHash());
    const passwordOk = await bcrypt.compare(String(password), passwordHash);

    if (!user || !passwordOk) {
      recordLoginFailure(key);
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }

    // Phân loại: staff có role 'admin' → đăng nhập với role 'admin'
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

    // Partner: kiểm tra KYC
    if (user.user_type === "partner") {
      const [pp] = await pool.query(
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
        return res.status(403).json({ error: "Tai khoan khach hang dang bi khoa" });
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

router.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// ===== Google OAuth (placeholder) =====
// UI đã có nút "Tiếp tục với Google". Để dùng thật cần cấu hình Google OAuth.
router.get("/auth/google/start", (req, res) => {
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

router.patch("/customer/profile", requireAuth, async (req, res, next) => {
  if (req.session.role !== "customer") return res.status(403).json({ error: "Chi danh cho khach hang" });
  const { fullName, phone } = req.body ?? {};
  const sets = [], args = [];
  if (fullName !== undefined) {
    if (!String(fullName).trim()) return res.status(400).json({ error: "Ho ten khong duoc de trong" });
    if (String(fullName).length > 200) return res.status(400).json({ error: "Ho ten qua dai" });
    sets.push("full_name=?"); args.push(String(fullName).trim());
  }
  if (phone !== undefined) {
    if (phone && String(phone).length > 30) return res.status(400).json({ error: "So dien thoai qua dai" });
    sets.push("phone=?"); args.push(phone ? String(phone).trim() : null);
  }
  if (!sets.length) return res.status(400).json({ error: "Khong co thong tin cap nhat" });

  try {
    args.push(req.session.userId);
    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=?`, args);
    const user = await loadUserPublic(req.session.userId);
    res.json({ user });
  } catch (e) { next(e); }
});

router.get("/auth/me", async (req, res, next) => {
  try {
    const s = await loadVerifiedSession(req.cookies?.[COOKIE]);
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

// ===== Admin: Thống kê tổng quan =====
router.get("/admin/stats", requireAdmin, async (req, res, next) => {
  try {
    const period = req.query.period || "month";
    const now = new Date();
    let startDate, lastStartDate, lastEndDate;
    let trendFormat, trendDays;

    if (period === "week") {
      trendFormat = "%d/%m";
      trendDays = 7;
      const day = now.getDay() || 7; 
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
      lastStartDate = new Date(startDate);
      lastStartDate.setDate(startDate.getDate() - 7);
      lastEndDate = new Date(startDate);
    } else if (period === "year") {
      trendFormat = "Th %m";
      trendDays = 12;
      startDate = new Date(now.getFullYear(), 0, 1);
      lastStartDate = new Date(now.getFullYear() - 1, 0, 1);
      lastEndDate = new Date(now.getFullYear(), 0, 1);
    } else {
      trendFormat = "%d/%m";
      trendDays = 30;
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      lastStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const fmt = (d) => d.toISOString().slice(0, 10);
    const startStr = fmt(startDate);
    const lastStartStr = fmt(lastStartDate);
    const lastEndStr = fmt(lastEndDate);

    // 1. Đối tác chờ duyệt
    const [pRows] = await pool.query("SELECT COUNT(*) AS total FROM partner_profiles WHERE kyc_status = 'pending'");
    const [pendingPropertyRows] = await pool.query("SELECT COUNT(*) AS total FROM properties WHERE status = 'pending_review'");
    const [pendingPropertyChangeRows] = await pool.query("SELECT COUNT(*) AS total FROM property_change_requests WHERE status = 'pending'");
    const [pendingBookingRows] = await pool.query("SELECT COUNT(*) AS total FROM bookings WHERE status = 'pending'");
    
    // 2. Doanh thu trong kỳ và kỳ trước đó
    const isCompletedSql = `(status = 'checked_out' OR (status IN ('confirmed','checked_in') AND check_out_date <= CURDATE()))`;
    
    const [revCurrent] = await pool.query(`
      SELECT SUM(total_amount) AS total FROM bookings 
      WHERE ${isCompletedSql} 
      AND check_out_date >= ?
    `, [startStr]);
    const [revLast] = await pool.query(`
      SELECT SUM(total_amount) AS total FROM bookings 
      WHERE ${isCompletedSql} 
      AND check_out_date >= ? AND check_out_date < ?
    `, [lastStartStr, lastEndStr]);
    
    const currentRev = Number(revCurrent[0].total || 0);
    const lastRev = Number(revLast[0].total || 0);
    const revGrowth = lastRev > 0 ? ((currentRev - lastRev) / lastRev) * 100 : 0;

    const [topHotelRows] = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.city,
        COALESCE(SUM(b.total_amount), 0) AS revenue,
        COUNT(b.id) AS orders,
        COALESCE(SUM(b.platform_fee_amount), 0) AS commission
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE b.status NOT IN ('cancelled', 'refunded')
        AND b.created_at >= ?
      GROUP BY p.id, p.name, p.city
      ORDER BY revenue DESC
      LIMIT 5
    `, [startStr]);

    const [topCityRows] = await pool.query(`
      SELECT
        p.city,
        COUNT(b.id) AS bookings,
        COALESCE(SUM(b.total_amount), 0) AS revenue
      FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE b.status NOT IN ('cancelled', 'refunded')
        AND b.created_at >= ?
        AND p.city IS NOT NULL
        AND p.city <> ''
      GROUP BY p.city
      ORDER BY bookings DESC, revenue DESC
      LIMIT 5
    `, [startStr]);

    // 3. Đặt phòng mới trong kỳ
    const [bActive] = await pool.query("SELECT COUNT(*) AS total FROM bookings WHERE status IN ('confirmed', 'checked_in')");
    const [bInPeriod] = await pool.query(`SELECT COUNT(*) AS total FROM bookings WHERE check_in_date >= ?`, [startStr]);

    // 4. Khách hàng mới trong kỳ và kỳ trước
    const [cCurrent] = await pool.query(`
      SELECT COUNT(*) AS total FROM users 
      WHERE user_type = 'customer' AND created_at >= ?
    `, [startStr]);
    const [cLast] = await pool.query(`
      SELECT COUNT(*) AS total FROM users 
      WHERE user_type = 'customer' AND created_at >= ? AND created_at < ?
    `, [lastStartStr, lastEndStr]);
    const currentCust = Number(cCurrent[0].total || 0);
    const lastCust = Number(cLast[0].total || 0);
    const custGrowth = lastCust > 0 ? ((currentCust - lastCust) / lastCust) * 100 : 0;

    // 5. Dữ liệu biểu đồ xu hướng
    let trendRows;
    if (period === "year") {
      [trendRows] = await pool.query(`
        SELECT 
          DATE_FORMAT(m.date, '%m/%Y') as name,
          DATE_FORMAT(m.date, '%Y-%m-%d') as fullDate,
          COALESCE(COUNT(b.id), 0) as bookings,
          COALESCE(SUM(b.total_amount), 0) as revenue
        FROM (
          SELECT DATE_SUB(CURDATE(), INTERVAL (n.a) MONTH) as date
          FROM (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) as n
        ) m
        LEFT JOIN bookings b ON DATE_FORMAT(b.check_in_date, '%m/%Y') = DATE_FORMAT(m.date, '%m/%Y') AND b.status <> 'cancelled'
        GROUP BY DATE_FORMAT(m.date, '%m/%Y'), m.date
        ORDER BY MIN(m.date) ASC
      `);
    } else {
      [trendRows] = await pool.query(`
        SELECT 
          DATE_FORMAT(date_list.date, '${trendFormat}') as name,
          DATE_FORMAT(date_list.date, '%Y-%m-%d') as fullDate,
          COALESCE(COUNT(b.id), 0) as bookings,
          COALESCE(SUM(b.total_amount), 0) as revenue
        FROM (
          SELECT CURDATE() - INTERVAL (a.a + (10 * b.a)) DAY as date
          FROM (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as a
          CROSS JOIN (SELECT 0 as a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) as b
        ) date_list
        LEFT JOIN bookings b ON DATE(b.check_in_date) = date_list.date AND b.status <> 'cancelled'
        WHERE date_list.date BETWEEN ? AND CURDATE()
        GROUP BY date_list.date
        ORDER BY date_list.date ASC
      `, [startStr]);
    }

    // 6. Tỷ lệ trạng thái đặt phòng (Thành công, Hủy, Hoàn tiền)
    const [statusRows] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status IN ('confirmed', 'checked_in', 'checked_out') THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as canceled,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded,
        COUNT(*) as total
      FROM bookings 
      WHERE created_at >= ?
    `, [startStr]);
    const s = statusRows[0];
    const total = Number(s.total || 0);
    const bookingStats = {
      confirmed: total > 0 ? Math.round((Number(s.confirmed) / total) * 100) : 0,
      canceled: total > 0 ? Math.round((Number(s.canceled) / total) * 100) : 0,
      refunded: total > 0 ? Math.round((Number(s.refunded) / total) * 100) : 0,
    };

    // 7. Hoạt động gần đây
    const [activityRows] = await pool.query(`
      (SELECT 'booking' as type, b.id as targetId, u.full_name as user, 'đã đặt phòng' as action, p.name as target, b.created_at as time
       FROM bookings b
       JOIN users u ON u.id = b.customer_id
       JOIN properties p ON p.id = b.property_id
       ORDER BY b.created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'partner' as type, u.id as targetId, u.full_name as user, 'đã đăng ký đối tác' as action, pp.business_name as target, u.created_at as time
       FROM users u
       JOIN partner_profiles pp ON pp.user_id = u.id
       WHERE u.user_type = 'partner'
       ORDER BY u.created_at DESC LIMIT 5)
      ORDER BY time DESC LIMIT 10
    `);

    res.json({
      pendingPartners: Number(pRows[0].total || 0),
      pendingRooms: Number(pendingPropertyRows[0].total || 0),
      pendingRoomChangeRequests: Number(pendingPropertyChangeRows[0].total || 0),
      pendingBookingActions: Number(pendingBookingRows[0].total || 0),
      totalRevenue: currentRev,
      revenueGrowth: revGrowth,
      activeBookings: Number(bActive[0].total || 0),
      bookingsInPeriod: Number(bInPeriod[0].total || 0),
      newCustomers: currentCust,
      customerGrowth: custGrowth,
      trends: trendRows,
      bookingStats,
      topHotels: topHotelRows.map((row) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        revenue: Number(row.revenue || 0),
        orders: Number(row.orders || 0),
        commission: Number(row.commission || 0),
      })),
      topCities: topCityRows.map((row) => ({
        city: row.city,
        bookings: Number(row.bookings || 0),
        revenue: Number(row.revenue || 0),
      })),
      recentActivity: activityRows
    });
  } catch (e) { next(e); }
});

// ===== Admin: quản lý partner =====

router.get("/admin/partners", requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status;
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const offset = clampInt(req.query.offset, 0, 0, 1000000);
    const args = [];
    let where = "u.user_type='partner'";
    if (status === "pending" || status === "approved" || status === "rejected") {
      where += " AND pp.kyc_status = ?"; args.push(status);
    }
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM users u LEFT JOIN partner_profiles pp ON pp.user_id = u.id
        WHERE ${where}`,
      args
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.phone,
              pp.business_name AS hotelName,
              pp.kyc_status AS status,
              pp.reject_reason AS rejectReason,
              u.created_at AS createdAt,
              pp.kyc_reviewed_at AS reviewedAt,
              (SELECT COUNT(*) FROM properties p WHERE p.partner_id = pp.id) AS roomCount
         FROM users u
         LEFT JOIN partner_profiles pp ON pp.user_id = u.id
        WHERE ${where}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );
    res.json({ partners: rows, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});

router.get("/admin/customers", requireAdmin, async (req, res, next) => {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const offset = clampInt(req.query.offset, 0, 0, 1000000);
    const q = String(req.query.q || "").trim();
    const args = [];
    let where = "u.user_type='customer'";
    if (q) {
      where += " AND (u.email LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)";
      const like = `%${q}%`;
      args.push(like, like, like);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM users u
        WHERE ${where}`,
      args
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.phone, u.status,
              u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
              cp.loyalty_tier AS loyaltyTier,
              cp.loyalty_points_balance AS loyaltyPoints,
              COALESCE(COUNT(b.id), 0) AS bookingCount,
              COALESCE(SUM(CASE WHEN b.status <> 'cancelled' THEN b.total_amount ELSE 0 END), 0) AS totalSpent,
              COALESCE(SUM(CASE WHEN b.status IN ('confirmed','checked_in')
                      AND b.check_in_date <= CURDATE()
                      AND b.check_out_date > CURDATE()
                    THEN 1 ELSE 0 END), 0) AS activeBookingCount
         FROM users u
         LEFT JOIN customer_profiles cp ON cp.user_id = u.id
         LEFT JOIN bookings b ON b.customer_id = u.id
        WHERE ${where}
        GROUP BY u.id, u.email, u.full_name, u.phone, u.status, u.created_at,
                 u.last_login_at, cp.loyalty_tier, cp.loyalty_points_balance
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?`,
      [...args, limit, offset]
    );
    res.json({
      customers: rows.map((row) => ({
        ...row,
        bookingCount: Number(row.bookingCount || 0),
        totalSpent: Number(row.totalSpent || 0),
        activeBookingCount: Number(row.activeBookingCount || 0),
        loyaltyPoints: Number(row.loyaltyPoints || 0),
      })),
      total: Number(countRows[0].total || 0),
      limit,
      offset,
    });
  } catch (e) { next(e); }
});

router.post("/admin/partners/:id/approve", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r1] = await conn.query(
      `UPDATE partner_profiles SET kyc_status='approved', reject_reason=NULL,
              kyc_reviewed_by=?, kyc_reviewed_at=NOW()
        WHERE user_id=?`,
      [req.session.userId, id]
    );
    if (!r1.affectedRows) { await conn.rollback(); return res.status(404).json({ error: "Không tìm thấy đối tác" }); }
    await createNotification(conn, {
      userId: id,
      type: "kyc_approved",
      title: "Tai khoan doi tac da duoc duyet",
      body: "Chuc mung! Ho so doi tac cua ban da duoc chap thuan."
    });
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

// Sửa thông tin đối tác (email, họ tên, tên khách sạn, SĐT, mật khẩu)
router.patch("/admin/partners/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  const { email, fullName, phone, hotelName, password } = req.body ?? {};

  const [rows] = await pool.query(
    "SELECT * FROM users WHERE id=? AND user_type='partner' LIMIT 1",
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Không tìm thấy đối tác" });
  const current = rows[0];

  const userSets = [], userArgs = [];
  if (email && email !== current.email) {
    if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    const [dup] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, id]);
    if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });
    userSets.push("email=?"); userArgs.push(email);
  }
  if (fullName !== undefined && fullName !== null) {
    if (String(fullName).length > 200) return res.status(400).json({ error: "Họ tên quá dài" });
    userSets.push("full_name=?"); userArgs.push(String(fullName));
  }
  if (phone !== undefined) {
    if (phone && String(phone).length > 30) return res.status(400).json({ error: "Số điện thoại quá dài" });
    userSets.push("phone=?"); userArgs.push(phone || null);
  }
  if (password) {
    if (String(password).length < 8) return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự" });
    if (String(password).length > 200) return res.status(400).json({ error: "Mật khẩu quá dài" });
    userSets.push("password_hash=?"); userArgs.push(await bcrypt.hash(password, 10));
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (userSets.length) {
      userArgs.push(id);
      await conn.query(`UPDATE users SET ${userSets.join(", ")} WHERE id=?`, userArgs);
    }
    if (hotelName !== undefined && hotelName !== null) {
      if (String(hotelName).length > 200) {
        await conn.rollback();
        return res.status(400).json({ error: "Tên khách sạn quá dài" });
      }
      await conn.query(
        "UPDATE partner_profiles SET business_name=? WHERE user_id=?",
        [String(hotelName), id]
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

// Xoá đối tác (xoá luôn user → cascade xoá partner_profiles, properties, ...)
router.delete("/admin/partners/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE id=? AND user_type='partner' LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy đối tác" });
    await pool.query("DELETE FROM users WHERE id=? AND user_type='partner'", [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/admin/partners/:id/reject", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = (req.body?.reason || "").trim();
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  if (!reason) return res.status(400).json({ error: "Vui lòng nhập lý do từ chối" });
  if (reason.length > 1000) return res.status(400).json({ error: "Lý do quá dài" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r1] = await conn.query(
      `UPDATE partner_profiles SET kyc_status='rejected', reject_reason=?,
              kyc_reviewed_by=?, kyc_reviewed_at=NOW()
        WHERE user_id=?`,
      [reason, req.session.userId, id]
    );
    if (!r1.affectedRows) { await conn.rollback(); return res.status(404).json({ error: "Không tìm thấy đối tác" }); }
    await conn.query("UPDATE users SET status='suspended' WHERE id=? AND user_type='partner'", [id]);
    await createNotification(conn, {
      userId: id,
      type: "kyc_rejected",
      title: "Ho so doi tac bi tu choi",
      body: `Rat tiec, ho so cua ban khong duoc duyet. Ly do: ${reason}`
    });
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

// ===== Admin: quản lý quản trị viên =====
router.post("/admin/admins", requireAdmin, validateBody(adminCreateSchema), async (req, res, next) => {
  const { email, password, fullName } = req.validated;
  const [dup] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });
  const roleId = await getAdminRoleId();
  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, password_hash, full_name, user_type, status, email_verified_at)
       VALUES (?, ?, ?, ?, 'staff', 'active', NOW())`,
      [crypto.randomUUID(), email, hash, fullName]
    );
    await conn.query(
      "INSERT INTO user_roles (user_id, role_id, granted_by) VALUES (?, ?, ?)",
      [r.insertId, roleId, req.session.userId]
    );
    await conn.commit();
    res.json({ admin: { id: r.insertId, email, fullName } });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email đã tồn tại" });
    next(e);
  } finally { conn.release(); }
});

router.get("/admin/admins", requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.created_at AS createdAt
         FROM users u
        WHERE u.user_type='staff'
          AND EXISTS (
            SELECT 1 FROM user_roles ur
              JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = u.id AND r.slug = 'admin'
          )
        ORDER BY u.created_at DESC`
    );
    res.json({ admins: rows });
  } catch (e) { next(e); }
});

router.patch("/admin/admins/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
    const { email, fullName, password } = req.body ?? {};
    const [t] = await pool.query("SELECT * FROM users WHERE id=? AND user_type='staff'", [id]);
    if (!t.length || !(await hasAdminRole(id))) return res.status(404).json({ error: "Không tìm thấy admin" });
    const sets = [], args = [];
    if (email && email !== t[0].email) {
      if (!isValidEmail(email)) return res.status(400).json({ error: "Email không hợp lệ" });
      const [dup] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, id]);
      if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });
      sets.push("email=?"); args.push(email);
    }
    if (fullName) {
      if (String(fullName).length > 200) return res.status(400).json({ error: "Họ tên quá dài" });
      sets.push("full_name=?"); args.push(fullName);
    }
    if (password) {
      if (String(password).length < 8) return res.status(400).json({ error: "Mật khẩu tối thiểu 8 ký tự" });
      if (String(password).length > 200) return res.status(400).json({ error: "Mật khẩu quá dài" });
      sets.push("password_hash=?"); args.push(await bcrypt.hash(password, 10));
    }
    if (sets.length) {
      args.push(id);
      await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id=?`, args);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/admin/admins/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID không hợp lệ" });
  if (id === req.session.userId) return res.status(400).json({ error: "Không thể xoá chính mình" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Khoa toan bo dong staff de chong race
    const [c] = await conn.query(
      `SELECT u.id FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
        WHERE u.user_type='staff' AND r.slug='admin'
        FOR UPDATE`
    );
    const total = c.length;
    if (total <= 1) {
      await conn.rollback();
      return res.status(400).json({ error: "Phải còn ít nhất 1 admin" });
    }
    const target = c.find((row) => row.id === id);
    if (!target) {
      await conn.rollback();
      return res.status(404).json({ error: "Không tìm thấy admin" });
    }
    await conn.query("DELETE FROM users WHERE id=? AND user_type='staff'", [id]);
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
});

export default router;
