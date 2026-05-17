import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import { requireAuth, requireAdmin } from "../auth/auth.middleware.js";
import { registerCustomer } from "./customers.service.js";

const router = Router();

// Registration
router.post("/register", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }
    const [exists]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(409).json({ error: "Email đã được sử dụng" });

    await registerCustomer(req.body);
    res.json({ message: "Đăng ký thành công" });
  } catch (e) { next(e); }
});

// Profile
router.get("/profile", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const [rows]: any = await pool.query(
      "SELECT id, email, full_name AS fullName, phone, created_at AS createdAt FROM users WHERE id = ?",
      [req.session?.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy user" });
    res.json({ user: rows[0] });
  } catch (e) { next(e); }
});

// Admin management
router.get("/admin/customers", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    let query = `
      SELECT id, email, full_name AS fullName, phone, status, created_at AS createdAt, last_login_at AS lastLoginAt
        FROM users
       WHERE user_type = 'customer'
    `;
    const params: any[] = [];
    
    if (q) {
      query += " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";
      const search = `%${q}%`;
      params.push(search, search, search);
    }
    
    query += " ORDER BY u.created_at DESC";
    
    // Fix: users table doesn't have alias 'u' in the FROM clause above, but ORDER BY u.created_at DESC might fail if not careful.
    // Actually the previous query was:
    // FROM users
    // WHERE user_type = 'customer'
    // ORDER BY created_at DESC
    
    // I'll fix the alias issue.
    
    const [rows]: any = await pool.query(
      `SELECT id, email, full_name AS fullName, phone, status, created_at AS createdAt, last_login_at AS lastLoginAt
         FROM users
        WHERE user_type = 'customer'
        ${q ? "AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)" : ""}
        ORDER BY created_at DESC`,
      params
    );
    res.json({
      customers: rows.map((r: any) => ({
        ...r,
        fullName: r.fullName || "",
        phone: r.phone || "",
      })),
    });
  } catch (e) { next(e); }
});

router.post("/admin/customers/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended", "banned"].includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }
    await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
