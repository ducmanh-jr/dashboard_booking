import { pinoHttp } from "pino-http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import config from "./config/index.js";
import { pool } from "./db.js";
import logger from "./utils/logger.js";
import { runDatabaseBootstrap } from "./database/bootstrap.js";
import { runDatabasePatches } from "./database/patches.js";
import { startDataSyncScheduler } from "./database/sync-scheduler.js";

import authRoutes from "./modules/auth/auth.routes.js";
import partnersRoutes from "./modules/partners/partners.routes.js";
import customersRoutes from "./modules/customers/customers.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import hotelsRoutes from "./modules/hotels/hotels.routes.js";
import bookingsRoutes from "./modules/bookings/bookings.routes.js";
import placesRoutes from "./modules/places/places.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import { AppError } from "./utils/errors.js";

const isProduction = config.NODE_ENV === "production";
const allowedOrigins = (config.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.set("trust proxy", 1);
app.use(cors({
  credentials: true,
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    if (!isProduction && allowedOrigins.length === 0) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/healthz", (_req: Request, res: Response) => res.json({ status: "ok" }));

app.use(pinoHttp({ logger })); 

// ===== Disable caching for admin APIs =====
app.use("/api/admin", (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ===== API Routing =====
app.use("/api/auth", authRoutes);
app.use("/api", partnersRoutes); 
app.use("/api/customer/auth", customersRoutes);
app.use("/api", customersRoutes);
app.use("/api", adminRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/mock-payment", paymentsRoutes);
app.use("/api", hotelsRoutes);
app.use("/api", bookingsRoutes);
app.use("/api", placesRoutes);
app.use("/api/notifications", notificationsRoutes);

// Error middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction): any => {
  if (err instanceof AppError) {
    logger.warn({ err }, `[api error] ${err.message}`);
  } else {
    logger.error({ err }, "[api crash]");
  }
  if (res.headersSent) return;
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.errorCode });
  }
  if (!isProduction && err?.message) {
    return res.status(500).json({ error: `Lỗi hệ thống: ${err.message}`, stack: err.stack });
  }
  res.status(500).json({ error: "Đã có lỗi hệ thống xảy ra, vui lòng thử lại sau" });
});

async function bootstrapAdmin() {
  const email = config.ADMIN_EMAIL;
  const password = config.ADMIN_PASSWORD;
  const fullName = config.ADMIN_NAME;
  if (!email || !password) return;
  const [roleRows]: any = await pool.query("SELECT id FROM roles WHERE slug='admin' LIMIT 1");
  if (!roleRows.length) return;
  const roleId = roleRows[0].id;
  const [rows]: any = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (rows.length) {
    await pool.query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [rows[0].id, roleId]);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r]: any = await conn.query(
      `INSERT INTO users (uuid, email, password_hash, full_name, user_type, status, email_verified_at)
       VALUES (?, ?, ?, ?, 'staff', 'active', NOW())`,
      [crypto.randomUUID(), email, hash, fullName]
    );
    await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [r.insertId, roleId]);
    await conn.commit();
    logger.info({ email }, "Bootstrap admin created");
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

const PORT = config.PORT;
runDatabaseBootstrap()
  .then(runDatabasePatches)
  .then(bootstrapAdmin)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Backend API is running on port ${PORT}`);
      startDataSyncScheduler();
    });
  })
  .catch((e) => {
    logger.error({ err: e }, "Startup failed");
    process.exit(1);
  });
