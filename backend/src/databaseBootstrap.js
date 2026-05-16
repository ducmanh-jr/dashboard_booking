/**
 * databaseBootstrap.js
 *
 * Khi server khởi động lần đầu (DB chưa có bảng nào), tự động nạp:
 *   1. database/snapshots/schema.sql  (schema)
 *   2. database/snapshots/data.sql    (dữ liệu)
 *
 * Nếu DB đã có bảng → bỏ qua, không làm gì.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "dotenv/config";

import logger from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const snapshotsDir = path.resolve(__dirname, "../../database/snapshots");
const tablesFile = path.join(snapshotsDir, "schema.sql");
const dataFile = path.join(snapshotsDir, "data.sql");

function connectionConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "agoda_clone",
    multipleStatements: true,
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra DB có bảng nào chưa.
 * Trả về true nếu DB trống (chưa có bảng).
 */
async function isDatabaseEmpty(conn) {
  const dbName = process.env.DB_NAME || "agoda_clone";
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
    [dbName]
  );
  return Number(rows[0].cnt) === 0;
}

/**
 * Chạy toàn bộ nội dung một file SQL.
 */
async function runSqlFile(conn, filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  await conn.query(sql);
}

/**
 * Entry point: gọi hàm này trong startup chain trước runDatabasePatches().
 */
export async function runDatabaseBootstrap() {
  // Kiểm tra file SQL có tồn tại không
  const hasTablesFile = await fileExists(tablesFile);
  const hasDataFile = await fileExists(dataFile);

  if (!hasTablesFile) {
    logger.info("[bootstrap] Không tìm thấy snapshots/schema.sql, bỏ qua bootstrap.");
    return;
  }

  const conn = await mysql.createConnection(connectionConfig());
  try {
    const empty = await isDatabaseEmpty(conn);
    const force = process.env.DB_FORCE_BOOTSTRAP === "true" || process.argv.includes("--force");

    if (!empty && !force) {
      logger.info("[bootstrap] DB đã có bảng, bỏ qua bootstrap.");
      return;
    }

    if (force) {
      logger.warn("[bootstrap] Đang thực hiện RESET cưỡng bức (FORCE BOOTSTRAP)...");
      const [tableRows] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
      const dbName = process.env.DB_NAME || "agoda_clone";
      const tableKey = `Tables_in_${dbName}`;
      const tables = tableRows.map((row) => row[tableKey] || Object.values(row)[0]).filter(Boolean);
      
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const table of tables) {
        await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
      }
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      logger.info("[bootstrap] Đã xóa toàn bộ các bảng cũ.");
    }

    // DB trống hoặc buộc reset → nạp schema
    logger.info("[bootstrap] Bắt đầu nạp dữ liệu từ snapshots...");

    logger.info("[bootstrap] Đang nạp schema.sql...");
    await runSqlFile(conn, tablesFile);
    logger.info("[bootstrap] Nạp schema.sql thành công.");

    if (hasDataFile) {
      logger.info("[bootstrap] Đang nạp data.sql (dữ liệu)...");
      await runSqlFile(conn, dataFile);
      logger.info("[bootstrap] Nạp data.sql thành công.");
    } else {
      logger.info("[bootstrap] Không tìm thấy snapshots/data.sql, chỉ nạp schema.");
    }

    logger.info("[bootstrap] ✅ Bootstrap hoàn tất. DB đã sẵn sàng.");
  } finally {
    await conn.end();
  }
}

// Cho phép chạy trực tiếp file này để reset DB
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDatabaseBootstrap()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}