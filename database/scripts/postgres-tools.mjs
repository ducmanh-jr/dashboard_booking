import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const databaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const projectRoot = path.resolve(databaseDir, "..");
export const backendDir = path.join(projectRoot, "backend");
export const snapshotsDir = path.join(databaseDir, "snapshots");

export async function loadEnvFile(filePath, override = false) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...rest] = line.split("=");
      const name = key.trim();
      const value = rest.join("=").trim().replace(/^"|"$/g, "");
      if (override || process.env[name] == null) process.env[name] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function loadDatabaseEnv() {
  await loadEnvFile(path.join(databaseDir, ".env"));
  await loadEnvFile(path.join(projectRoot, ".env"));
  await loadEnvFile(path.join(backendDir, ".env"));
}

export function databaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_CONSUMER;
  if (!url) throw new Error("DATABASE_URL is required.");
  return url;
}

export function parseDatabaseUrl(rawUrl = databaseUrl()) {
  const url = new URL(rawUrl);
  return {
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\//, "") || "postgres",
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || ""),
  };
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: false,
      stdio: options.stdio || (options.input != null ? ["pipe", "inherit", "inherit"] : "inherit"),
      env: { ...process.env, ...options.env },
    });
    const stdout = [];
    const stderr = [];
    if (child.stdout) child.stdout.on("data", (chunk) => stdout.push(chunk));
    if (child.stderr) child.stderr.on("data", (chunk) => stderr.push(chunk));
    if (options.input != null && child.stdin) {
      child.stdin.end(options.input);
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      } else {
        const detail = Buffer.concat(stderr).toString("utf8").trim();
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}${detail ? `\n${detail}` : ""}`));
      }
    });
  });
}

export async function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  try {
    await run(checker, [command], { stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

export async function ensureDockerPostgres() {
  const composeFile = path.resolve(projectRoot, process.env.POSTGRES_DOCKER_COMPOSE || "backend/docker-compose.yml");
  const service = process.env.POSTGRES_DOCKER_SERVICE || "postgres";
  if (process.env.POSTGRES_SKIP_DOCKER_UP === "1") return;
  await run("docker", ["compose", "-f", composeFile, "up", "-d", "--quiet-pull", service], {
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export async function waitForPostgres(deadlineMs = 60000) {
  const started = Date.now();
  const parsed = parseDatabaseUrl();
  while (Date.now() - started < deadlineMs) {
    try {
      await run("docker", [
        "exec",
        process.env.POSTGRES_DOCKER_CONTAINER || "nowayhome-postgres",
        "pg_isready",
        "-U",
        parsed.user,
        "-d",
        parsed.database,
      ], { stdio: ["ignore", "ignore", "ignore"] });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw new Error("PostgreSQL is not ready.");
}

export async function runPgTool(tool, args, options = {}) {
  const parsed = parseDatabaseUrl();
  if (await commandExists(tool)) {
    return run(tool, args, {
      ...options,
      env: { ...(options.env || {}), PGPASSWORD: parsed.password },
    });
  }

  await ensureDockerPostgres();
  await waitForPostgres();
  return run("docker", [
    "exec",
    "-i",
    "-e",
    `PGPASSWORD=${parsed.password}`,
    process.env.POSTGRES_DOCKER_CONTAINER || "nowayhome-postgres",
    tool,
    ...args,
  ], options);
}
