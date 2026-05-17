import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import logger from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runDatabasePatches(): Promise<void> {
  const patchesDir = path.join(__dirname, "patches");
  try {
    const files = (await fs.readdir(patchesDir)).filter((f) => f.endsWith(".sql")).sort();
    
    // Create database_patches table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS database_patches (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const file of files) {
      const [applied]: any = await pool.query("SELECT 1 FROM database_patches WHERE filename = ?", [file]);
      if (applied.length) continue;

      logger.info({ filename: file }, "Applying database patch");
      const sql = await fs.readFile(path.join(patchesDir, file), "utf-8");
      const statements = sql.split(";").filter((s) => s.trim());
      
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const statement of statements) {
          await conn.query(statement);
        }
        await conn.query("INSERT INTO database_patches (filename) VALUES (?)", [file]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    }
  } catch (e: any) {
    if (e.code === "ENOENT") return; // No patches dir
    logger.error({ err: e }, "Patch application failed");
    throw e;
  }
}
