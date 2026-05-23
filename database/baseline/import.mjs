import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  databaseUrl,
  loadDatabaseEnv,
  parseDatabaseUrl,
  runPgTool,
  snapshotsDir,
} from "../scripts/postgres-tools.mjs";

const baselineDir = path.dirname(fileURLToPath(import.meta.url));
const RESET_PUBLIC_SCHEMA_SQL = [
  "-- Reset PostgreSQL public schema before loading can_lam database snapshots.",
  "SET client_min_messages TO warning;",
  "DROP SCHEMA IF EXISTS public CASCADE;",
  "CREATE SCHEMA public;",
  "GRANT ALL ON SCHEMA public TO public;",
  "",
].join("\n");

function pgToolUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.delete("schema");
  return url.toString();
}

async function ensureSnapshotFiles() {
  const schemaPath = path.join(snapshotsDir, "schema.sql");
  const dataPath = path.join(snapshotsDir, "data.sql");
  await fs.access(schemaPath);
  await fs.access(dataPath);
  return { schemaPath, dataPath };
}

async function runPsql(sql) {
  const url = pgToolUrl(databaseUrl());
  await runPgTool("psql", [
    "--dbname",
    url,
    "--quiet",
    "--set",
    "ON_ERROR_STOP=1",
  ], { input: sql, stdio: ["pipe", "pipe", "inherit"] });
}

export async function resetFromSnapshots() {
  await loadDatabaseEnv();
  const parsed = parseDatabaseUrl();
  const { schemaPath, dataPath } = await ensureSnapshotFiles();
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  const dataSql = await fs.readFile(dataPath, "utf8");

  console.log(`Resetting PostgreSQL database: ${parsed.database}`);
  console.log("Loading schema and data snapshots...");
  await runPsql([RESET_PUBLIC_SCHEMA_SQL, schemaSql, dataSql].join("\n\n"));
  console.log("Database reset completed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  resetFromSnapshots().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
