import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";
import { requireAuth } from "../auth/auth.middleware.js";

const router = Router();

router.get("/unread-count", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.session?.userId]
    );
    res.json({ count: rows[0].count });
  } catch (e) { next(e); }
});

router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, title, body, type, entity_id AS entityId, is_read AS isRead, created_at AS createdAt
         FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      [req.session?.userId]
    );
    res.json({ notifications: rows.map((r: any) => ({
      ...r,
      isRead: !!r.isRead,
      body: r.body || "",
    })) });
  } catch (e) { next(e); }
});

router.post("/:id/read", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.session?.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/read-all", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [req.session?.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
