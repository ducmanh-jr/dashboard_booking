import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

const router = Router();

// Ping check
router.get("/mock-payment/ping", (req, res) => res.json({ msg: "pong" }));

// Lấy thông tin thanh toán
router.get("/mock-payment/info", async (req, res, next) => {
  const bookingCode = req.query.bookingCode;
  if (!bookingCode) return next(new AppError("Thiếu mã đặt phòng", 400));

  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.booking_code, b.total_amount, b.payment_status, p.name as property_name
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       WHERE b.booking_code = ?`,
      [bookingCode]
    );

    if (rows.length === 0) return next(new AppError("Không tìm thấy đơn hàng", 404));
    res.json({ booking: rows[0] });
  } catch (error) {
    next(error);
  }
});

// Sinh OTP ảo
router.post("/mock-payment/request-otp", async (req, res, next) => {
  const { bookingId } = req.body;
  if (!bookingId) return next(new AppError("Thiếu bookingId", 400));

  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  try {
    await pool.query(
      `INSERT INTO mock_payment_otps (booking_id, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [bookingId, otp, expiresAt]
    );
    res.json({ otp }); // Trong thực tế không trả về otp ở đây, nhưng đây là mock
  } catch (error) {
    next(error);
  }
});

// Xác nhận thanh toán
router.post("/mock-payment/confirm", async (req, res, next) => {
  const { bookingId, otp } = req.body;
  if (!bookingId || !otp) return next(new AppError("Thiếu thông tin xác thực", 400));

  try {
    const [rows] = await pool.query(
      "SELECT otp FROM mock_payment_otps WHERE booking_id = ? AND expires_at > NOW()",
      [bookingId]
    );

    if (rows.length === 0 || rows[0].otp !== otp) {
      return next(new AppError("OTP sai hoặc hết hạn", 400));
    }

    await pool.query(
      "UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?",
      [bookingId]
    );
    
    await pool.query("DELETE FROM mock_payment_otps WHERE booking_id = ?", [bookingId]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Polling trạng thái (cho frontend máy tính)
router.get("/mock-payment/status/:bookingCode", async (req, res, next) => {
  const { bookingCode } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT payment_status FROM bookings WHERE booking_code = ?",
      [bookingCode]
    );
    if (rows.length === 0) return next(new AppError("Không tìm thấy đơn hàng", 404));
    res.json({ status: rows[0].payment_status });
  } catch (error) {
    next(error);
  }
});

export default router;

