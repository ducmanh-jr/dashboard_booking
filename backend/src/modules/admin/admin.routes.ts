import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

// Validation helper (simplified for TS)
function validateBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as any).validated = schema.parse(req.body);
      next();
    } catch (e: any) {
      res.status(400).json({ error: e.errors?.[0]?.message || "Dữ liệu không hợp lệ" });
    }
  };
}

// Stats
router.get("/admin/stats", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || "month";
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let groupByFormat: string;
    
    if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupByFormat = "%Y-%m-%d";
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
      groupByFormat = "%Y-%m";
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      groupByFormat = "%Y-%m-%d";
    }

    // 1. Basic counts
    const [[partners]]: any = await pool.query("SELECT COUNT(*) as count FROM partner_profiles WHERE kyc_status = 'pending'");
    const [[rooms]]: any = await pool.query("SELECT COUNT(*) as count FROM properties WHERE status = 'pending_review'");
    const [[changeRequests]]: any = await pool.query("SELECT COUNT(*) as count FROM property_change_requests WHERE status = 'pending'");
    const [[activeBookings]]: any = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE status IN ('confirmed', 'checked_in')");
    const [[bookingsInPeriod]]: any = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE created_at >= ? AND status IN ('confirmed', 'checked_in', 'checked_out')", [startDate]);
    const [[newCustomers]]: any = await pool.query("SELECT COUNT(*) as count FROM users WHERE user_type = 'customer' AND created_at >= ?", [startDate]);
    const [[pendingBookings]]: any = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
    
    // 2. Revenue & Growth
    const [[revenue]]: any = await pool.query("SELECT SUM(total_amount) as total FROM bookings WHERE (status = 'confirmed' OR status = 'checked_in' OR status = 'checked_out') AND created_at >= ?", [startDate]);
    const [[prevRevenue]]: any = await pool.query("SELECT SUM(total_amount) as total FROM bookings WHERE (status = 'confirmed' OR status = 'checked_in' OR status = 'checked_out') AND created_at >= ? AND created_at < ?", [prevStartDate, startDate]);
    
    const currentRev = Number(revenue.total || 0);
    const prevRev = Number(prevRevenue.total || 0);
    const revenueGrowth = prevRev === 0 ? (currentRev > 0 ? 100 : 0) : ((currentRev - prevRev) / prevRev) * 100;

    const [[prevCustomers]]: any = await pool.query("SELECT COUNT(*) as count FROM users WHERE user_type = 'customer' AND created_at >= ? AND created_at < ?", [prevStartDate, startDate]);
    const customerGrowth = prevCustomers.count === 0 ? (newCustomers.count > 0 ? 100 : 0) : ((newCustomers.count - prevCustomers.count) / prevCustomers.count) * 100;

    // 3. Trends
    const [trendRows]: any = await pool.query(
      `SELECT DATE_FORMAT(created_at, ?) as name, 
              COUNT(*) as bookings, 
              SUM(total_amount) as revenue,
              MIN(created_at) as fullDate
         FROM bookings
        WHERE created_at >= ? AND status IN ('confirmed', 'checked_in', 'checked_out')
        GROUP BY name
        ORDER BY name ASC`,
      [groupByFormat, startDate]
    );

    // 4. Booking Status
    const [statusRows]: any = await pool.query(
      "SELECT status, COUNT(*) as count FROM bookings WHERE created_at >= ? GROUP BY status",
      [startDate]
    );
    const bookingStats = {
      confirmed: statusRows.find((r: any) => r.status === "confirmed" || r.status === "checked_in" || r.status === "checked_out")?.count || 0,
      canceled: statusRows.find((r: any) => r.status === "cancelled")?.count || 0,
      refunded: statusRows.find((r: any) => r.status === "refunded")?.count || 0,
    };

    // 5. Top Hotels
    const [topHotels]: any = await pool.query(
      `SELECT p.id, p.name, p.city, 
              SUM(b.total_amount) as revenue, 
              COUNT(b.id) as orders,
              SUM(b.platform_fee_amount) as commission
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
        WHERE b.status IN ('confirmed', 'checked_in', 'checked_out') AND b.created_at >= ?
        GROUP BY p.id, p.name, p.city
        ORDER BY revenue DESC
        LIMIT 5`,
      [startDate]
    );

    // 6. Top Cities
    const [topCities]: any = await pool.query(
      `SELECT p.city, 
              COUNT(b.id) as bookings,
              SUM(b.total_amount) as revenue
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
        WHERE b.status IN ('confirmed', 'checked_in', 'checked_out') AND b.created_at >= ?
        GROUP BY p.city
        ORDER BY bookings DESC
        LIMIT 5`,
      [startDate]
    );

    // 7. Recent Activity
    const [recentBookings]: any = await pool.query(
      `SELECT 'booking' as type, u.full_name as user, 'vừa đặt phòng' as action, 
              p.name as target, b.created_at as time, b.id as targetId
         FROM bookings b
         JOIN users u ON u.id = b.customer_id
         JOIN properties p ON p.id = b.property_id
        ORDER BY b.created_at DESC
        LIMIT 5`
    );
    const [recentPartners]: any = await pool.query(
      `SELECT 'partner' as type, u.full_name as user, 'đã đăng ký đối tác' as action,
              pp.business_name as target, pp.created_at as time, pp.id as targetId
         FROM partner_profiles pp
         JOIN users u ON u.id = pp.user_id
        ORDER BY pp.created_at DESC
        LIMIT 5`
    );
    const recentActivity = [...recentBookings, ...recentPartners].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    res.json({
      totalRevenue: currentRev,
      revenueGrowth,
      pendingPartners: partners.count,
      pendingRooms: rooms.count,
      pendingRoomChangeRequests: changeRequests.count,
      pendingBookingActions: pendingBookings.count,
      activeBookings: activeBookings.count,
      bookingsInPeriod: bookingsInPeriod.count,
      newCustomers: newCustomers.count,
      customerGrowth,
      trends: trendRows.map((r: any) => ({ 
        ...r, 
        revenue: Number(r.revenue || 0), 
        bookings: Number(r.bookings || 0),
        fullDate: r.fullDate 
      })),
      recentActivity,
      topHotels,
      topCities,
      bookingStats
    });
  } catch (e) { next(e); }
});

// Staff management
router.get("/admin/admins", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT u.id, u.email, u.full_name AS fullName, u.created_at AS createdAt
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
        WHERE r.slug = 'admin'
        ORDER BY u.created_at DESC`
    );
    res.json({
      admins: rows.map((r: any) => ({
        ...r,
        fullName: r.fullName || "",
      })),
    });
  } catch (e) { next(e); }
});

router.post("/admin/admins", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ error: "Thiếu thông tin" });
    
    const [dup]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (dup.length) return res.status(409).json({ error: "Email đã tồn tại" });

    const hash = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r]: any = await conn.query(
        `INSERT INTO users (uuid, email, password_hash, full_name, user_type, status, email_verified_at)
         VALUES (?, ?, ?, ?, 'staff', 'active', NOW())`,
        [crypto.randomUUID(), email, hash, fullName]
      );
      const [role]: any = await conn.query("SELECT id FROM roles WHERE slug='admin' LIMIT 1");
      if (role.length) {
        await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [r.insertId, role[0].id]);
      }
      await conn.commit();
      res.json({ ok: true });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (e) { next(e); }
});

router.delete("/admin/admins/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (id === req.session?.userId) return res.status(400).json({ error: "Không thể xoá chính mình" });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM user_roles WHERE user_id = ?", [id]);
      await conn.query("DELETE FROM users WHERE id = ?", [id]);
      await conn.commit();
      res.json({ ok: true });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (e) { next(e); }
});

router.patch("/admin/admins/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { email, password, fullName } = req.body;
    
    if (!email || !fullName) return res.status(400).json({ error: "Thiếu thông tin email hoặc họ tên" });

    // Check email dup
    const [dup]: any = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, id]);
    if (dup.length) return res.status(409).json({ error: "Email đã được sử dụng bởi tài khoản khác" });

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET email = ?, full_name = ?, password_hash = ? WHERE id = ?", [email, fullName, hash, id]);
    } else {
      await pool.query("UPDATE users SET email = ?, full_name = ? WHERE id = ?", [email, fullName, id]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
