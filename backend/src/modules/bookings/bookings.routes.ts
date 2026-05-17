import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import * as hotelsService from "../hotels/hotels.service.js";
import { clampInt, normalizeText } from "../../utils/helpers.js";

import { requireAuth, requireAdmin, requirePartner, loadVerifiedSession } from "../auth/auth.middleware.js";

const router = Router();

// Helper for mapping report rows
async function getBookingReportRooms(filter: { partnerUserId?: number } = {}) {
  let partnerJoinWhere = "";
  const args: any[] = [];
  if (filter.partnerUserId) {
    partnerJoinWhere = " AND pp.user_id = ?";
    args.push(filter.partnerUserId);
  }

  const [propertyRows]: any = await pool.query(
    `SELECT p.id, p.name, p.city, p.address, p.status,
            pp.business_name AS partner_hotel_name,
            u.email AS partner_email
       FROM properties p
       JOIN partner_profiles pp ON pp.id = p.partner_id
       JOIN users u ON u.id = pp.user_id
      WHERE 1=1 ${partnerJoinWhere}
      ORDER BY p.created_at DESC`,
    args
  );

  const reports: any[] = [];
  for (const p of propertyRows) {
    const [bookingRows]: any = await pool.query(
      `SELECT b.*,
              u.email AS customer_email, u.full_name AS customer_name, u.phone AS customer_phone
         FROM bookings b
         LEFT JOIN users u ON u.id = b.customer_id
        WHERE b.property_id = ?
        ORDER BY b.created_at DESC`,
      [p.id]
    );

    const mappedBookings = bookingRows.map((b: any) => ({
      id: b.id,
      bookingCode: b.booking_code,
      customerName: b.customer_name || b.guest_name || "",
      customerEmail: b.customer_email || b.guest_email || "",
      customerPhone: b.customer_phone || b.guest_phone || "",
      priceLabel: b.price_label || "",
      checkInDate: hotelsService.dateOnlyFromDb(b.check_in_date),
      checkOutDate: hotelsService.dateOnlyFromDb(b.check_out_date),
      nights: b.nights,
      adults: b.adult_count,
      children: b.child_count,
      status: b.status,
      paymentStatus: b.payment_status,
      total: Number(b.total_amount),
      platformFee: Number(b.platform_fee_amount),
      partnerPayout: Number(b.partner_payout_amount),
      createdAt: b.created_at,
      specialRequests: b.special_requests || "",
      isCompleted: b.status === "checked_out" || (b.status === "confirmed" && hotelsService.dateOnlyFromDb(b.check_out_date) < hotelsService.dateOnlyFromDb(new Date())),
      isCurrentStay: (b.status === "confirmed" || b.status === "checked_in") && 
                     hotelsService.dateOnlyFromDb(b.check_in_date) <= hotelsService.dateOnlyFromDb(new Date()) && 
                     hotelsService.dateOnlyFromDb(b.check_out_date) > hotelsService.dateOnlyFromDb(new Date()),
      isFutureStay: b.status === "confirmed" && hotelsService.dateOnlyFromDb(b.check_in_date) > hotelsService.dateOnlyFromDb(new Date())
    }));

    reports.push({
      propertyId: p.id,
      propertyName: p.name || "",
      city: p.city || "",
      address: p.address || "",
      partnerHotelName: p.partner_hotel_name || "",
      partnerEmail: p.partner_email || "",
      isActiveHotel: p.status === "active",
      bookings: mappedBookings
    });
  }
  return reports;
}

router.get("/admin/booking-report", requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ hotels: await getBookingReportRooms() });
  } catch (e) { next(e); }
});

router.get("/partner/booking-report", requirePartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ hotels: await getBookingReportRooms({ partnerUserId: req.session?.userId }) });
  } catch (e) { next(e); }
});

// Customer: List my trips
router.get("/bookings/mine", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT b.*, p.name as propertyName, p.address, p.city
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
        WHERE b.customer_id = ?
        ORDER BY b.created_at DESC`,
      [req.session?.userId]
    );
    res.json({ 
      bookings: rows.map((b: any) => ({
        id: b.id,
        bookingCode: b.booking_code,
        propertyId: b.property_id,
        propertyName: b.propertyName || "",
        city: b.city,
        address: b.address,
        checkInDate: b.check_in_date,
        checkOutDate: b.check_out_date,
        nights: b.num_nights,
        adults: b.num_adults,
        children: b.num_children,
        total: Number(b.total_amount),
        status: b.status,
        paymentStatus: b.payment_status,
        createdAt: b.created_at,
        guestName: b.guest_name,
        guestEmail: b.guest_email,
        guestPhone: b.guest_phone,
        specialRequests: b.special_requests,
      }))
    });
  } catch (e) { next(e); }
});

// Partner: Handle booking actions (check-in, check-out, no-show)
router.post("/partner/bookings/:id/:action", requirePartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, action } = req.params;
    let status = "";
    if (action === "check-in") status = "checked_in";
    else if (action === "check-out") status = "checked_out";
    else if (action === "no-show") status = "no_show";
    else return res.status(400).json({ error: "Hành động không hợp lệ" });

    await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Create booking (Public & Flat Client checkout)
router.post(["/public/bookings", "/bookings"], async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Manually load verified session
    const s = await loadVerifiedSession(req.cookies?.["session_customer"]) 
           || await loadVerifiedSession(req.cookies?.["session_partner"])
           || await loadVerifiedSession(req.cookies?.["session_admin"])
           || await loadVerifiedSession(req.cookies?.["session"]);
    
    if (!s) {
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." });
    }
    req.session = s;

    const { propertyId, checkInDate, checkOutDate, specialRequests } = req.body;
    
    let pricingId = req.body.pricingId;
    const priceLabel = req.body.priceLabel;

    if (!pricingId && priceLabel) {
      const [pricingRows]: any = await pool.query(
        "SELECT id FROM property_pricing WHERE label = ? AND property_id = ? LIMIT 1",
        [priceLabel, propertyId]
      );
      if (pricingRows.length) {
        pricingId = pricingRows[0].id;
      }
    }

    let guestInfo = req.body.guestInfo;
    const guestName = req.body.guestName;
    const guestPhone = req.body.guestPhone;

    if (!guestInfo && (guestName || guestPhone)) {
      let guestEmail = "guest@example.com";
      if (req.session?.userId) {
        const [userRows]: any = await pool.query(
          "SELECT email FROM users WHERE id = ? LIMIT 1",
          [req.session.userId]
        );
        if (userRows.length) {
          guestEmail = userRows[0].email;
        }
      }
      guestInfo = {
        name: guestName || "",
        phone: guestPhone || "",
        email: guestEmail,
      };
    }

    if (!propertyId || !pricingId || !checkInDate || !checkOutDate || !guestInfo?.email) {
      return res.status(400).json({ error: "Thiếu thông tin đặt phòng" });
    }

    if (!guestInfo?.phone || !/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/.test(String(guestInfo.phone).trim())) {
      return res.status(400).json({ error: "Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng số điện thoại Việt Nam (ví dụ: 0912345678)." });
    }

    const [pricing]: any = await pool.query(
      "SELECT label, price_per_night, total_inventory FROM property_pricing WHERE id = ? AND property_id = ?",
      [pricingId, propertyId]
    );
    if (!pricing.length) return res.status(404).json({ error: "Gói giá không tồn tại" });

    // Check availability
    const avail = await hotelsService.getPriceAvailabilityByNight(conn, {
      propertyId,
      pricingId,
      priceLabel: pricing[0].label,
      checkInDate,
      checkOutDate,
      totalInventory: pricing[0].total_inventory,
      basePricePerNight: pricing[0].price_per_night
    });

    if (!avail.isAvailable) return res.status(400).json({ error: "Phòng đã hết trong khoảng thời gian này" });

    const nights = Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000);
    const totalAmount = avail.subtotal;
    
    // Calculate fee
    const [prop]: any = await pool.query("SELECT platform_fee_pct FROM properties WHERE id = ?", [propertyId]);
    const feePct = prop[0]?.platform_fee_pct || 10;
    const platformFee = Math.round(totalAmount * (feePct / 100));
    const partnerPayout = totalAmount - platformFee;

    const bookingCode = `BK${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const numAdults = req.body.adults || 2;
    const numChildren = req.body.children || 0;

    const [result]: any = await conn.query(
      `INSERT INTO bookings 
       (property_id, customer_id, booking_code, price_label, check_in_date, check_out_date, 
        num_nights, num_adults, num_children, subtotal_amount, total_amount, platform_fee_amount, partner_payout_amount, 
        guest_name, guest_email, guest_phone, special_requests, status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')`,
      [
        propertyId,
        req.session?.userId || null,
        bookingCode,
        pricing[0].label,
        checkInDate,
        checkOutDate,
        nights,
        numAdults,
        numChildren,
        totalAmount, // subtotal_amount
        totalAmount, // total_amount
        platformFee,
        partnerPayout,
        guestInfo.name,
        guestInfo.email,
        guestInfo.phone,
        specialRequests,
      ]
    );

    await conn.commit();
    res.json({ id: result.insertId, booking: { id: result.insertId, bookingCode, totalAmount } });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

// Admin: Mark booking as paid
router.post("/admin/bookings/:id/mark-paid", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    await pool.query("UPDATE bookings SET payment_status = 'paid' WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Admin: Cancel booking
router.post("/admin/bookings/:id/cancel", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
