import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import logger from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runDatabaseBootstrap(): Promise<void> {
  const [rows]: any = await pool.query("SHOW TABLES LIKE 'users'");
  if (rows.length > 0) {
    logger.info("[bootstrap] DB đã có bảng, bỏ qua bootstrap.");
    return;
  }

  const sqlPath = path.join(__dirname, "../../schema.sql");
  try {
    const sql = await fs.readFile(sqlPath, "utf-8");
    const statements = sql.split(";").filter((s) => s.trim());
    for (const statement of statements) {
      await pool.query(statement);
    }
    logger.info("[bootstrap] Đã khởi tạo cấu trúc database từ schema.sql");
  } catch (e) {
    logger.error({ err: e }, "[bootstrap] Lỗi khởi tạo database");
    throw e;
  }
}