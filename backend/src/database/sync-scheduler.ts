import { exec } from "child_process";
import { promisify } from "util";
import logger from "../utils/logger.js";
import config from "../config/index.js";

const execAsync = promisify(exec);

async function runSync() {
  try {
    const passwordArg = config.DB_PASSWORD ? `-p${config.DB_PASSWORD}` : "";
    
    // Dump schema
    await execAsync(`mysqldump -h ${config.DB_HOST} -u ${config.DB_USER} ${passwordArg} --no-data ${config.DB_NAME} > schema.sql`);
    // Dump data
    await execAsync(`mysqldump -h ${config.DB_HOST} -u ${config.DB_USER} ${passwordArg} --no-create-info ${config.DB_NAME} > data.sql`);
    
    logger.info("[data-sync] Exported schema.sql and data.sql");
  } catch (e) {
    logger.error({ err: e }, "[data-sync] Sync failed");
  }
}

export function startDataSyncScheduler(): void {
  if (config.NODE_ENV === "production") {
    logger.info("[data-sync] Disabled in production");
    return;
  }
  
  // Initial run
  runSync();
  
  const interval = 5 * 60 * 1000; // 5 mins
  setInterval(runSync, interval);
  logger.info({ minutes: 5 }, "[data-sync] Scheduler started");
}
