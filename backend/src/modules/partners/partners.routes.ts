import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAuth, requireAdmin } from "../auth/auth.middleware.js";
import { registerPartner } from "./partners.service.js";

const router = Router();

// Registration
router.post("/auth/register", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password, fullName, businessName } = req.body;
    if (!email || !password || !fullName || !businessName) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }
    const [exists]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length) return res.status(409).json({ error: "Email đã được sử dụng" });

    await registerPartner(req.body);
    res.json({ message: "Đăng ký thành công, vui lòng chờ admin phê duyệt" });
  } catch (e) { next(e); }
});

// Admin management
router.get("/admin/partners", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    let query = `
      SELECT u.id, u.email, u.full_name AS fullName, u.phone,
             pp.business_name AS hotelName, pp.kyc_status AS status,
             pp.reject_reason AS rejectReason,
             u.created_at AS createdAt,
             (SELECT COUNT(*) FROM properties WHERE partner_id = pp.id) AS roomCount
        FROM users u
        JOIN partner_profiles pp ON pp.user_id = u.id
       WHERE u.user_type = 'partner'
    `;
    const params: any[] = [];
    if (status) {
      query += " AND pp.kyc_status = ?";
      params.push(status);
    }
    query += " ORDER BY u.created_at DESC";

    const [rows]: any = await pool.query(query, params);
    console.log(`[API] fetchPartners status=${status} - found ${rows.length} rows`);
    res.json({
      partners: rows.map((r: any) => ({
        ...r,
        fullName: r.fullName || "",
        hotelName: r.hotelName || "",
        phone: r.phone || "",
        rejectReason: r.rejectReason || "",
      })),
    });
  } catch (e) { next(e); }
});

router.post("/admin/partners/:id/approve", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(
      "UPDATE partner_profiles SET kyc_status = 'approved', reject_reason = NULL WHERE user_id = ?",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/admin/partners/:id/reject", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(
      "UPDATE partner_profiles SET kyc_status = 'rejected', reject_reason = ? WHERE user_id = ?",
      [req.body.reason || "Không đạt yêu cầu", req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.patch("/admin/partners/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { email, fullName, hotelName, phone, password } = req.body;

    if (!email || !fullName) return res.status(400).json({ error: "Thiếu thông tin email hoặc họ tên" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Check email dup
      const [dup]: any = await conn.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, id]);
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: "Email đã được sử dụng bởi tài khoản khác" });
      }

      // Update users table
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await conn.query("UPDATE users SET email = ?, full_name = ?, phone = ?, password_hash = ? WHERE id = ?", [email, fullName, phone, hash, id]);
      } else {
        await conn.query("UPDATE users SET email = ?, full_name = ?, phone = ? WHERE id = ?", [email, fullName, phone, id]);
      }

      // Update partner_profiles table
      await conn.query("UPDATE partner_profiles SET business_name = ? WHERE user_id = ?", [hotelName, id]);

      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    next(e);
  }
});

router.delete("/admin/partners/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // Get profile id
      const [pp]: any = await conn.query("SELECT id FROM partner_profiles WHERE user_id = ?", [id]);
      if (pp.length) {
        const profileId = pp[0].id;
        // Delete related properties (cascading might not be set)
        await conn.query("DELETE FROM properties WHERE partner_id = ?", [profileId]);
        await conn.query("DELETE FROM partner_profiles WHERE id = ?", [profileId]);
      }
      
      await conn.query("DELETE FROM user_roles WHERE user_id = ?", [id]);
      await conn.query("DELETE FROM users WHERE id = ?", [id]);
      
      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    next(e);
  }
});

export default router;
