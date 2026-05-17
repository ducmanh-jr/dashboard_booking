import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../../db.js";
import config from "../../config/index.js";
import { PoolConnection } from "mysql2/promise";

const SECRET = config.SESSION_SECRET;

export interface SessionPayload {
  userId: number;
  role: "admin" | "partner" | "customer" | string;
}

export interface UserPublic {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone?: string | null;
}

// ===== Session Management =====
export function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  
  let expBuf: Buffer, sigBuf: Buffer;
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
    return JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
  } catch {
    return null;
  }
}

// ===== Brute-force protection =====
interface LoginAttempt {
  count: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

export function loginKey(req: any, email: string): string {
  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
  return `${ip}|${String(email || "").toLowerCase()}`;
}

export function checkLoginLock(key: string): number {
  const e = loginAttempts.get(key);
  if (!e) return 0;
  const now = Date.now();
  if (e.lockedUntil > now) return Math.ceil((e.lockedUntil - now) / 1000);
  return 0;
}

export function recordLoginFailure(key: string): void {
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

export function resetLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

// ===== Timing Attack Protection =====
let DUMMY_HASH_PROMISE: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  if (!DUMMY_HASH_PROMISE) {
    DUMMY_HASH_PROMISE = bcrypt.hash("not-a-real-password-just-timing", 10);
  }
  return DUMMY_HASH_PROMISE;
}

// ===== User Helpers =====
export async function hasAdminRole(userId: number, conn: any = pool): Promise<boolean> {
  const [rows]: any = await conn.query(
    `SELECT 1 FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.slug = 'admin' LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

export async function loadUserPublic(userId: number): Promise<UserPublic | null> {
  const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  const u = rows[0];
  if (!u) return null;
  
  if (u.user_type === "staff") {
    const isAdmin = await hasAdminRole(u.id);
    if (isAdmin) return { id: u.id, email: u.email, fullName: u.full_name, role: "admin", status: "approved" };
    return { id: u.id, email: u.email, fullName: u.full_name, role: "staff", status: u.status };
  }
  
  if (u.user_type === "partner") {
    const [pp]: any = await pool.query("SELECT kyc_status FROM partner_profiles WHERE user_id = ? LIMIT 1", [u.id]);
    const kyc = pp[0]?.kyc_status || "pending";
    const status = kyc === "approved" ? "approved" : kyc === "rejected" ? "rejected" : "pending";
    return { id: u.id, email: u.email, fullName: u.full_name, role: "partner", status };
  }
  
  if (u.user_type === "customer") {
    return { id: u.id, email: u.email, fullName: u.full_name, phone: u.phone, role: "customer", status: u.status };
  }
  
  return { id: u.id, email: u.email, fullName: u.full_name, role: u.user_type, status: u.status };
}
