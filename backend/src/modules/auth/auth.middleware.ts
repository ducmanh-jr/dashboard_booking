import { Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import config from "../../config/index.js";
import { verifyToken, hasAdminRole, SessionPayload } from "./auth.service.js";

const COOKIE = "session";
const isProduction = config.NODE_ENV === "production";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export function clearAuthCookie(res: Response, role?: string): void {
  const cookieName = role ? `session_${role}` : "session";
  res.clearCookie(cookieName, { path: "/", httpOnly: true, sameSite: "lax", secure: isProduction });
  if (!role) {
    res.clearCookie("session_admin", { path: "/", httpOnly: true, sameSite: "lax", secure: isProduction });
    res.clearCookie("session_partner", { path: "/", httpOnly: true, sameSite: "lax", secure: isProduction });
    res.clearCookie("session_customer", { path: "/", httpOnly: true, sameSite: "lax", secure: isProduction });
  }
}

export async function loadVerifiedSession(token: string | undefined): Promise<SessionPayload | null> {
  const s = verifyToken(token);
  if (!s || !s.userId || !s.role) return null;
  
  const [rows]: any = await pool.query(
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
    const [pp]: any = await pool.query(
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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const s = await loadVerifiedSession(req.cookies?.["session_customer"]) 
           || await loadVerifiedSession(req.cookies?.["session_partner"])
           || await loadVerifiedSession(req.cookies?.["session_admin"])
           || await loadVerifiedSession(req.cookies?.["session"]);
    if (!s) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
    }
    req.session = s;
    next();
  } catch (e) { next(e); }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const s = await loadVerifiedSession(req.cookies?.["session_admin"])
           || await loadVerifiedSession(req.cookies?.["session"]);
    if (!s) {
      clearAuthCookie(res, "admin");
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
    }
    if (s.role !== "admin") return res.status(403).json({ error: "Không có quyền" });
    req.session = s;
    next();
  } catch (e) { next(e); }
}

export async function requirePartner(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const s = await loadVerifiedSession(req.cookies?.["session_partner"])
           || await loadVerifiedSession(req.cookies?.["session"]);
    if (!s) {
      clearAuthCookie(res, "partner");
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
    }
    if (s.role !== "partner") return res.status(403).json({ error: "Chỉ dành cho đối tác" });
    req.session = s;
    next();
  } catch (e) { next(e); }
}
