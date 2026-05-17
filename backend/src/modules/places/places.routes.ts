import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db.js";

const router = Router();

// Get unique cities from properties
router.get("/public/places/cities", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT DISTINCT city FROM properties WHERE status = 'active' AND city IS NOT NULL AND city != '' ORDER BY city ASC"
    );
    res.json({ cities: rows.map((r: any) => r.city) });
  } catch (e) { next(e); }
});

// Search places (for autocomplete/suggestions)
router.get("/public/places/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q) return res.json({ places: [] });
    
    const [rows]: any = await pool.query(
      `SELECT DISTINCT city as name, 'city' as type FROM properties WHERE city LIKE ? AND status = 'active'
       UNION
       SELECT name, 'hotel' as type FROM properties WHERE name LIKE ? AND status = 'active'
       LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );
    res.json({ places: rows });
  } catch (e) { next(e); }
});

export default router;
