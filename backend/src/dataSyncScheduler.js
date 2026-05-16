import path from "path";
import { pathToFileURL } from "url";

import config from "./utils/config.js";
import logger from "./utils/logger.js";

const dataSyncModuleUrl = pathToFileURL(
  path.resolve(process.cwd(), "../database/snapshots/export.mjs")
).href;

let isRunning = false;

async function runDataSync() {
  if (isRunning) {
    logger.warn("[data-sync] Previous sync still running, skip this tick");
    return;
  }

  isRunning = true;
  try {
    const { exportDataSync } = await import(dataSyncModuleUrl);
    await exportDataSync();
    logger.info("[data-sync] Exported schema.sql and data.sql");
  } catch (error) {
    logger.warn({ err: error }, "[data-sync] Export failed");
  } finally {
    isRunning = false;
  }
}

export function startDataSyncScheduler() {
  if (!config.DATA_SYNC_ENABLED) {
    logger.info("[data-sync] Disabled");
    return null;
  }

  const intervalMs = config.DATA_SYNC_INTERVAL_MINUTES * 60 * 1000;
  logger.info({ minutes: config.DATA_SYNC_INTERVAL_MINUTES }, "[data-sync] Scheduler started");

  runDataSync();
  const timer = setInterval(runDataSync, intervalMs);
  timer.unref?.();
  return timer;
}
