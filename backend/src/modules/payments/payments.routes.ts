import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";

const router = Router();

// Mock payment processing
router.post("/process", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;
    if (!bookingId) return res.status(400).json({ error: "Thiếu bookingId" });

    // Mock success
    await pool.query(
      "UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?",
      [bookingId]
    );

    res.json({ 
      success: true, 
      transactionId: `TX${Date.now()}${Math.floor(Math.random() * 1000)}`,
      message: "Thanh toán giả lập thành công"
    });
  } catch (e) { next(e); }
});

// Backward compatibility for /api/mock-payment
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: "Thiếu bookingId" });

    await pool.query(
      "UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?",
      [bookingId]
    );

    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
