import { resetFromSnapshots } from "./import.mjs";
import {
  databaseUrl,
  loadDatabaseEnv,
  parseDatabaseUrl,
  runPgTool,
} from "../scripts/postgres-tools.mjs";

function pgToolUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.delete("schema");
  return url.toString();
}

async function scalar(sql) {
  const output = await runPgTool("psql", [
    "--dbname",
    pgToolUrl(databaseUrl()),
    "--tuples-only",
    "--no-align",
    "--quiet",
    "--command",
    sql,
  ], { stdio: ["ignore", "pipe", "inherit"] });
  return output.stdout.trim();
}

async function main() {
  await loadDatabaseEnv();
  const parsed = parseDatabaseUrl();
  const tableCount = Number(await scalar(`
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
  `));

  if (tableCount > 0) {
    console.log(`PostgreSQL database ${parsed.database} already has ${tableCount} tables. Snapshot import skipped.`);
    console.log("Use pnpm db:reset when you intentionally want to replace current local data with snapshots.");
    return;
  }

  console.log(`PostgreSQL database ${parsed.database} is empty. Importing database snapshots...`);
  await resetFromSnapshots();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
