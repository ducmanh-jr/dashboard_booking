import pinoHttp from "pino-http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import os from "os";

import config from "./utils/config.js";
import { pool } from "./db.js";
import logger from "./utils/logger.js";
import { runDatabaseBootstrap } from "./databaseBootstrap.js";
import { runDatabasePatches } from "./databasePatches.js";
import { startDataSyncScheduler } from "./dataSyncScheduler.js";

import authRoutes from "./routes/auth.js";
import roomsRoutes from "./routes/rooms.js";
import paymentsRoutes from "./routes/payments.js";
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
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (!isProduction && allowedOrigins.length === 0) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

app.use(pinoHttp({ logger })); // Log each request/response

app.use("/api", paymentsRoutes);
app.use("/api", authRoutes);
app.use("/api", roomsRoutes);

// Error middleware: log đầy đủ ở server, chỉ trả về thông báo tóm tắt cho client
app.use((err, _req, res, _next) => {
  // Log lỗi chi tiết
  if (err instanceof AppError) {
    logger.warn({ err }, `[api error] ${err.message}`);
  } else {
    logger.error({ err }, "[api crash]");
  }

  if (res.headersSent) return;

  // Trả về lỗi đã được xử lý (Operational Errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.errorCode,
    });
  }

  // Trả về lỗi server chưa xác định (500)
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

  // Lấy id role 'admin'
  const [roleRows] = await pool.query("SELECT id FROM roles WHERE slug='admin' LIMIT 1");
  if (!roleRows.length) {
    logger.warn("[bootstrap] Role 'admin' chưa tồn tại.");
    return;
  }
  const roleId = roleRows[0].id;

  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (rows.length) {
    await pool.query(
      "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [rows[0].id, roleId]
    );
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO users (uuid, email, password_hash, full_name, user_type, status, email_verified_at)
       VALUES (?, ?, ?, ?, 'staff', 'active', NOW())`,
      [crypto.randomUUID(), email, hash, fullName]
    );
    await conn.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [r.insertId, roleId]
    );
    await conn.commit();
    logger.info({ email }, "Bootstrap admin created");
  } catch (e) { 
    await conn.rollback(); 
    throw e; 
  } finally { 
    conn.release(); 
  }
}

const PORT = config.PORT;
runDatabaseBootstrap()
  .then(runDatabasePatches)
  .then(bootstrapAdmin)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Backend API is running on port ${PORT}`);
      
      startDataSyncScheduler();

      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === "IPv4" && !net.internal) {
            logger.info(`🌐 Network: http://${net.address}:${PORT}`);
          }
        }
      }
    });
  })
  .catch((e) => {
    logger.error({ err: e }, "Startup failed");
    process.exit(1);
  });

