import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "dotenv/config";

import logger from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patchesDir = path.resolve(__dirname, "../../database/migrations");

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

async function readPatchFiles() {
  try {
    const entries = await fs.readdir(patchesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function runDatabasePatches() {
  const conn = await mysql.createConnection(connectionConfig());
  try {
    const files = await readPatchFiles();
    for (const filename of files) {
      const sqlPath = path.join(patchesDir, filename);
      const sql = await fs.readFile(sqlPath, "utf8");
      logger.info({ filename }, "Applying database patch");
      await conn.query(sql);
    }
  } finally {
    await conn.end();
  }
}

if (process.argv[1] === __filename) {
  runDatabasePatches()
    .then(() => {
      logger.info("Database patches applied");
    })
    .catch((error) => {
      logger.error({ err: error }, "Database patch failed");
      process.exit(1);
    });
}
