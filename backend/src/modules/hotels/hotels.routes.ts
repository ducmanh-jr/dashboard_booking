import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import * as hotelsService from "./hotels.service.js";
import { clampInt } from "../../utils/helpers.js";
import { createNotification, notifyAdmins } from "../../utils/notifications.js";

import { requireAuth, requireAdmin, requirePartner } from "../auth/auth.middleware.js";

const router = Router();

// Public: List rooms with filters
router.get("/public/rooms", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const city = req.query.city as string;
    const guestCount = clampInt(req.query.guests, 1, 1, 20);
    
    let query = `
      SELECT p.*,
             (SELECT MIN(price_per_night) FROM property_pricing WHERE property_id = p.id) as min_price
        FROM properties p
       WHERE p.status = 'active'
    `;
    const params: any[] = [];
    
    if (city) {
      query += " AND p.city = ?";
      params.push(city);
    }
    
    if (guestCount) {
      query += " AND p.capacity >= ?";
      params.push(guestCount);
    }
    
    query += " ORDER BY p.created_at DESC";
    
    const [rows]: any = await pool.query(query, params);
    const hotels = await Promise.all(rows.map((r: any) => hotelsService.mapProperty(r)));
    res.json({ hotels, rooms: hotels });
  } catch (e) { next(e); }
});

// Public: Get single hotel detail
router.get("/public/rooms/:slug", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const isId = /^\d+$/.test(req.params.slug as string);
    const [rows]: any = await pool.query(
      `SELECT p.*,
              pp.business_name as partner_hotel_name,
              u.email as partner_email
         FROM properties p
         JOIN partner_profiles pp ON pp.id = p.partner_id
         JOIN users u ON u.id = pp.user_id
        WHERE ${isId ? "p.id = ?" : "p.slug = ?"} AND p.status = 'active'
        LIMIT 1`,
      [isId ? Number(req.params.slug) : req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy khách sạn" });
    
    const hotel = await hotelsService.mapProperty(rows[0]);
    res.json({ hotel, room: hotel });
  } catch (e) { next(e); }
});

// Partner: List my properties
router.get("/partner/rooms", requirePartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT p.* FROM properties p
         JOIN partner_profiles pp ON pp.id = p.partner_id
        WHERE pp.user_id = ?
        ORDER BY 
          CASE p.status 
            WHEN 'active' THEN 1 
            WHEN 'pending_review' THEN 2 
            ELSE 3 
          END ASC,
          p.created_at DESC`,
      [req.session?.userId]
    );
    const hotels = await Promise.all(rows.map((r: any) => hotelsService.mapProperty(r, { includePendingRequest: true })));
    res.json({ hotels, rooms: hotels });
  } catch (e) { next(e); }
});

// Partner: Get single property
router.get("/partner/rooms/:id", requirePartner, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const [rows]: any = await pool.query(
      `SELECT p.* FROM properties p
         JOIN partner_profiles pp ON pp.id = p.partner_id
        WHERE p.id = ? AND pp.user_id = ?
        LIMIT 1`,
      [req.params.id, req.session?.userId]
    );
    if (!rows.length) return res.status(404).json({ error: "Không tìm thấy phòng" });
    
    const hotel = await hotelsService.mapProperty(rows[0], { includePendingRequest: true });
    res.json({ hotel, room: hotel });
  } catch (e) { next(e); }
});

// Partner: Create property
router.post("/partner/rooms", requirePartner, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const partnerId = await hotelsService.getPartnerProfileId(req.session!.userId, conn);
    if (!partnerId) return res.status(403).json({ error: "Không tìm thấy profile đối tác" });
    
    const payload = hotelsService.normalizeRoomPayload(req.body);
    const propertyId = await hotelsService.insertProperty(conn, partnerId, payload);
    
    await conn.commit();
    
    // Notify admin
    await notifyAdmins({
      title: "Khách sạn mới chờ duyệt",
      content: `Đối tác vừa tạo khách sạn mới: ${payload.name}`,
      type: "property_review",
      targetId: propertyId
    });

    res.json({ id: propertyId, message: "Đã gửi yêu cầu tạo khách sạn, vui lòng chờ duyệt" });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// Partner: Request to update a property
router.patch("/partner/rooms/:id/request-update", requirePartner, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const partnerId = await hotelsService.getPartnerProfileId(req.session!.userId, conn);
    if (!partnerId) return res.status(403).json({ error: "Không tìm thấy profile đối tác" });

    const propertyId = Number(req.params.id);
    const [props]: any = await conn.query("SELECT id, name FROM properties WHERE id = ? AND partner_id = ?", [propertyId, partnerId]);
    if (!props.length) return res.status(404).json({ error: "Không tìm thấy khách sạn" });

    const payload = hotelsService.normalizeRoomPayload(req.body);
    await conn.query(
      "INSERT INTO property_change_requests (property_id, partner_id, action_type, payload_json, requested_by, status) VALUES (?, ?, 'update', ?, ?, 'pending')",
      [propertyId, partnerId, JSON.stringify(payload), req.session!.userId]
    );

    await notifyAdmins({
      title: "Yêu cầu sửa thông tin khách sạn",
      content: `Đối tác yêu cầu cập nhật thông tin cho "${props[0].name}".`,
      type: "property_update_request",
      targetId: propertyId
    });

    await conn.commit();
    res.json({ ok: true, message: "Đã gửi yêu cầu cập nhật" });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
});

// Partner: Request to delete a property
router.delete("/partner/rooms/:id/request-delete", requirePartner, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const partnerId = await hotelsService.getPartnerProfileId(req.session!.userId, pool);
    if (!partnerId) return res.status(403).json({ error: "Không tìm thấy profile đối tác" });

    const propertyId = Number(req.params.id);
    const [props]: any = await pool.query("SELECT id, name FROM properties WHERE id = ? AND partner_id = ?", [propertyId, partnerId]);
    if (!props.length) return res.status(404).json({ error: "Không tìm thấy khách sạn" });

    await pool.query(
      "INSERT INTO property_change_requests (property_id, partner_id, action_type, payload_json, requested_by, status) VALUES (?, ?, 'delete', ?, ?, 'pending')",
      [propertyId, partnerId, "{}", req.session!.userId]
    );

    await notifyAdmins({
      title: "Yêu cầu xoá khách sạn",
      content: `Đối tác yêu cầu xoá khách sạn "${props[0].name}".`,
      type: "property_delete_request",
      targetId: propertyId
    });

    res.json({ ok: true, message: "Đã gửi yêu cầu xoá" });
  } catch (e) { next(e); }
});

// Admin: List all rooms
router.get("/admin/rooms", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusFilter = req.query.status as string;
    console.log(`[AdminRooms] Filter: ${statusFilter}`);
    
    let query = `
      SELECT p.*, pp.business_name as partner_hotel_name, u.email as partner_email
        FROM properties p
        JOIN partner_profiles pp ON pp.id = p.partner_id
        JOIN users u ON u.id = pp.user_id
       WHERE 1=1
    `;
    
    if (statusFilter === "pending") {
      query += ` AND (p.status = 'pending_review' OR EXISTS (SELECT 1 FROM property_change_requests WHERE property_id = p.id AND status = 'pending'))`;
    } else if (statusFilter === "approved") {
      query += " AND p.status = 'active'";
    } else if (statusFilter === "rejected") {
      query += " AND p.status = 'rejected'";
    }
    
    query += " ORDER BY p.created_at DESC";
    
    const [rows]: any = await pool.query(query);
    const hotels = await Promise.all(rows.map((r: any) => hotelsService.mapProperty(r, { includePendingRequest: true })));
    res.json({ rooms: hotels });
  } catch (e) { next(e); }
});

// Admin: List rooms by partner
router.get("/admin/partners/:id/rooms", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.params.id;
    const [rows]: any = await pool.query(
      `SELECT p.*, pp.business_name as partner_hotel_name, u.email as partner_email
         FROM properties p
         JOIN partner_profiles pp ON pp.id = p.partner_id
         JOIN users u ON u.id = pp.user_id
        WHERE u.id = ?
        ORDER BY p.created_at DESC`,
      [partnerId]
    );
    const hotels = await Promise.all(rows.map((r: any) => hotelsService.mapProperty(r, { includePendingRequest: true })));
    res.json({ rooms: hotels });
  } catch (e) { next(e); }
});

// Admin: Approve room
router.post("/admin/rooms/:id/approve", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyId = req.params.id;
    await pool.query(
      "UPDATE properties SET status = 'active', reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
      [req.session?.userId, propertyId]
    );
    
    const [prop]: any = await pool.query("SELECT partner_id, name FROM properties WHERE id = ?", [propertyId]);
    if (prop.length) {
      const [partner]: any = await pool.query("SELECT user_id FROM partner_profiles WHERE id = ?", [prop[0].partner_id]);
      if (partner.length) {
        await createNotification({
          userId: partner[0].user_id,
          title: "Khách sạn đã được duyệt",
          content: `Khách sạn "${prop[0].name}" của bạn đã được duyệt và hiển thị công khai.`,
          type: "system"
        });
      }
    }
    
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin: Edit room directly
router.patch("/admin/rooms/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const conn = await pool.getConnection();
  try {
    const propertyId = Number(req.params.id);
    const payload = hotelsService.normalizeRoomPayload(req.body);
    await conn.beginTransaction();
    await hotelsService.updatePropertyFromPayload(conn, propertyId, payload);
    await conn.commit();
    res.json({ ok: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message || "Lỗi cập nhật khách sạn" });
  } finally {
    conn.release();
  }
});

// Admin: Delete room
router.delete("/admin/rooms/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyId = Number(req.params.id);
    await pool.query("DELETE FROM properties WHERE id=?", [propertyId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin: Reject room
router.post("/admin/rooms/:id/reject", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyId = Number(req.params.id);
    const { reason } = req.body;
    await pool.query(
      "UPDATE properties SET status = 'rejected', reject_reason = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
      [reason || "", req.session?.userId, propertyId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin: Approve room change request
router.post("/admin/room-change-requests/:id/approve", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  const conn = await pool.getConnection();
  try {
    const requestId = Number(req.params.id);
    await conn.beginTransaction();
    const [reqRows]: any = await conn.query("SELECT * FROM property_change_requests WHERE id = ? AND status = 'pending' FOR UPDATE", [requestId]);
    if (!reqRows.length) throw new Error("Yêu cầu không tồn tại hoặc đã được xử lý");
    const changeReq = reqRows[0];
    
    if (changeReq.action_type === 'update') {
      const payload = typeof changeReq.payload_json === 'string' ? JSON.parse(changeReq.payload_json) : changeReq.payload_json;
      await hotelsService.updatePropertyFromPayload(conn, changeReq.property_id, payload);
    } else if (changeReq.action_type === 'delete') {
      await conn.query("DELETE FROM properties WHERE id = ?", [changeReq.property_id]);
    }
    
    await conn.query("UPDATE property_change_requests SET status = 'approved', reviewed_at = NOW(), reviewed_by = ? WHERE id = ?", [req.session?.userId, requestId]);

    // Send notification to partner
    const [partner]: any = await conn.query("SELECT user_id FROM partner_profiles WHERE id = ?", [changeReq.partner_id]);
    if (partner.length) {
      await conn.query(
        `INSERT INTO notifications (user_id, title, body, type, entity_id, is_read)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [
          partner[0].user_id,
          "Yêu cầu thay đổi đã được duyệt",
          changeReq.action_type === 'delete' 
            ? "Yêu cầu xóa khách sạn của bạn đã được duyệt thành công." 
            : "Yêu cầu cập nhật thông tin khách sạn của bạn đã được duyệt thành công.",
          "property_review",
          changeReq.property_id
        ]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e: any) {
    await conn.rollback();
    res.status(400).json({ error: e.message || "Lỗi duyệt yêu cầu" });
  } finally {
    conn.release();
  }
});

// Admin: Reject room change request
router.post("/admin/room-change-requests/:id/reject", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = Number(req.params.id);
    const { reason } = req.body;
    await pool.query(
      "UPDATE property_change_requests SET status = 'rejected', review_note = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
      [reason || "", req.session?.userId, requestId]
    );

    // Send notification to partner
    const [reqRows]: any = await pool.query("SELECT partner_id, property_id, action_type FROM property_change_requests WHERE id = ?", [requestId]);
    if (reqRows.length) {
      const changeReq = reqRows[0];
      const [partner]: any = await pool.query("SELECT user_id FROM partner_profiles WHERE id = ?", [changeReq.partner_id]);
      if (partner.length) {
        await createNotification({
          userId: partner[0].user_id,
          title: "Yêu cầu thay đổi bị từ chối",
          content: `Yêu cầu ${changeReq.action_type === 'delete' ? 'xóa' : 'cập nhật'} khách sạn của bạn đã bị từ chối. Lý do: ${reason || 'Không có lý do'}`,
          type: "property_review",
          targetId: changeReq.property_id
        });
      }
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Partner: Get availability calendar
router.get("/partner/availability", requirePartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId, from, to } = req.query;
    if (!propertyId || !from || !to) return res.status(400).json({ error: "Thiếu thông tin tra cứu" });

    const prop = await hotelsService.getPropertyForPartner(Number(propertyId), req.session!.userId);
    if (!prop) return res.status(403).json({ error: "Không có quyền truy cập khách sạn này" });

    const [pricing]: any = await pool.query(
      "SELECT id, label, price_per_night, total_inventory FROM property_pricing WHERE property_id=? ORDER BY sort_order, id",
      [propertyId]
    );

    const results = await Promise.all(pricing.map(async (p: any) => {
      const avail = await hotelsService.getPriceAvailabilityByNight(pool, {
        propertyId,
        pricingId: p.id,
        priceLabel: p.label,
        checkInDate: from,
        checkOutDate: to,
        totalInventory: p.total_inventory,
        basePricePerNight: p.price_per_night
      });
      return {
        priceId: p.id,
        label: p.label,
        pricePerNight: p.price_per_night,
        totalInventory: p.total_inventory,
        minRemaining: avail.minRemaining,
        isAvailable: avail.isAvailable,
        days: avail.dates
      };
    }));

    res.json({ propertyId, propertyName: prop.name, prices: results });
  } catch (e) { next(e); }
});

// Partner: Update availability/price for a day
router.patch("/partner/availability", requirePartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { priceId, stayDate, price, inventory, isClosed } = req.body;
    if (!priceId || !stayDate) return res.status(400).json({ error: "Thiếu thông tin cập nhật" });

    await pool.query(
      `INSERT INTO property_pricing_daily_overrides (pricing_id, stay_date, price_per_night, open_inventory, is_closed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
          price_per_night = COALESCE(VALUES(price_per_night), price_per_night),
          open_inventory = COALESCE(VALUES(open_inventory), open_inventory),
          is_closed = COALESCE(VALUES(is_closed), is_closed)`,
      [priceId, stayDate, price, inventory, isClosed ? 1 : 0]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Partner: Bulk update availability
router.patch("/partner/availability/bulk", requirePartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { priceId, startDate, endDate, price, inventory, isClosed, daysOfWeek } = req.body;
    if (!priceId || !startDate || !endDate) return res.status(400).json({ error: "Thiếu thông tin" });

    const dates: string[] = [];
    let cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      const day = cur.getDay(); // 0=Sun, 1=Mon...
      if (!daysOfWeek || daysOfWeek.includes(day)) {
        dates.push(cur.toISOString().slice(0, 10));
      }
      cur.setDate(cur.getDate() + 1);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const d of dates) {
        await conn.query(
          `INSERT INTO property_pricing_daily_overrides (pricing_id, stay_date, price_per_night, open_inventory, is_closed)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
              price_per_night = COALESCE(VALUES(price_per_night), price_per_night),
              open_inventory = COALESCE(VALUES(open_inventory), open_inventory),
              is_closed = COALESCE(VALUES(is_closed), is_closed)`,
          [priceId, d, price, inventory, isClosed ? 1 : 0]
        );
      }
      await conn.commit();
      res.json({ ok: true });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (e) { next(e); }
});

export default router;
