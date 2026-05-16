import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(toolRoot, "..", "..");
const applyPath = path.join(toolRoot, "output", "saved", "apply.sql");
const dataSqlPath = path.join(projectRoot, "database", "snapshots", "data.sql");
const requireFromBackend = createRequire(path.join(projectRoot, "backend", "package.json"));
const mysql = requireFromBackend("mysql2/promise");
const dotenv = requireFromBackend("dotenv");

const partnerIds = [3, 4, 5, 11];
const hotelsPerPartner = 50;

dotenv.config({ path: path.join(projectRoot, ".env") });
dotenv.config({ path: path.join(projectRoot, "backend", ".env"), override: true });

function dbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "agoda_clone",
    multipleStatements: true,
  };
}

function splitHotelBlocks(sqlText) {
  const start = sqlText.indexOf("-- Row ");
  if (start < 0) return [];
  return sqlText
    .slice(start)
    .split(/\n(?=-- Row \d+: )/)
    .map((block) => block.trim())
    .map((block) => block.replace(/\nCOMMIT;?\s*$/i, "").trim())
    .filter(Boolean);
}

function propertySlugs(sqlText) {
  return [...sqlText.matchAll(/SET @property_slug := '([^']+)';/g)].map((match) => match[1]);
}

async function usablePartnerIds(conn) {
  const [rows] = await conn.query(
    `SELECT pp.id
       FROM partner_profiles pp
       JOIN users u ON u.id = pp.user_id
      WHERE pp.id IN (?)
        AND pp.kyc_status = 'approved'
        AND u.status = 'active'
        AND u.user_type = 'partner'`,
    [partnerIds]
  );
  return rows.map((row) => Number(row.id));
}

async function propertySlugCollation(conn) {
  const [rows] = await conn.query(
    `SELECT COLLATION_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME = 'slug'
      LIMIT 1`
  );
  const collation = rows[0]?.COLLATION_NAME || "utf8mb4_0900_ai_ci";
  if (!/^[a-zA-Z0-9_]+$/.test(collation)) {
    throw new Error(`Collation slug khong hop le: ${collation}`);
  }
  return collation;
}

function assignPartner(block, index) {
  const partnerIndex = Math.min(Math.floor(index / hotelsPerPartner), partnerIds.length - 1);
  const partnerId = partnerIds[partnerIndex];
  return block.replace(/SET @partner_id := \d+;/g, `SET @partner_id := ${partnerId};`);
}

function normalizeBlockForLiveDb(block, slugCollation) {
  return block.replace(
    /SET @existing_property_id := \(SELECT id FROM properties WHERE slug = @property_slug LIMIT 1\);/g,
    `SET @existing_property_id := (SELECT id FROM properties WHERE slug COLLATE ${slugCollation} = @property_slug COLLATE ${slugCollation} LIMIT 1);`
  );
}

async function main() {
  const applySql = await fs.readFile(applyPath, "utf8").catch(() => "");

  if (!applySql.trim()) {
    console.log(JSON.stringify({ ok: true, message: "apply.sql already empty", appendedHotels: 0 }, null, 2));
    return;
  }

  const conn = await mysql.createConnection(dbConfig());
  try {
    await conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    const slugCollation = await propertySlugCollation(conn);
    const usableIds = await usablePartnerIds(conn);
    const missingPartners = partnerIds.filter((partnerId) => !usableIds.includes(partnerId));
    if (missingPartners.length) {
      throw new Error(`Partner khong usable trong DB live: ${missingPartners.join(", ")}`);
    }

    const blocks = splitHotelBlocks(applySql);
    const slugs = propertySlugs(applySql);
    if (!blocks.length || blocks.length !== slugs.length) {
      throw new Error(`apply.sql khong hop le: blocks=${blocks.length}, slugs=${slugs.length}`);
    }

    const seenSlugs = new Set();
    const uniqueBlocks = [];
    const uniqueSlugs = [];
    const skippedDuplicateSlugs = [];
    blocks.forEach((block, index) => {
      const slug = slugs[index];
      if (seenSlugs.has(slug)) {
        skippedDuplicateSlugs.push(slug);
        return;
      }
      seenSlugs.add(slug);
      uniqueBlocks.push(block);
      uniqueSlugs.push(slug);
    });

    const existingSlugs = [];
    for (let index = 0; index < uniqueSlugs.length; index += 100) {
      const chunk = uniqueSlugs.slice(index, index + 100);
      if (!chunk.length) continue;
      const [rows] = await conn.query("SELECT slug FROM properties WHERE slug IN (?)", [chunk]);
      existingSlugs.push(...rows.map((row) => row.slug));
    }
    const existingSet = new Set(existingSlugs);
    const finalBlocks = [];
    const skippedExistingSlugs = [];
    uniqueBlocks.forEach((block, index) => {
      const slug = uniqueSlugs[index];
      if (existingSet.has(slug)) {
        skippedExistingSlugs.push(slug);
        return;
      }
      finalBlocks.push(block);
    });

    const assignedBlocks = finalBlocks.map((block, index) => normalizeBlockForLiveDb(assignPartner(block, index), slugCollation));
    const distribution = partnerIds.map((partnerId) => ({
      partnerId,
      hotels: (assignedBlocks.join("\n").match(new RegExp(`SET @partner_id := ${partnerId};`, "g")) || []).length,
    }));
    if (assignedBlocks.length) {
      const payload = [
        "START TRANSACTION;",
        ...assignedBlocks,
        "COMMIT;",
      ].join("\n");
      await conn.query(payload);
    }

    await fs.writeFile(applyPath, "", "utf8");

    const { exportDataSync } = await import(pathToFileURL(path.join(projectRoot, "database", "snapshots", "export.mjs")).href);
    await exportDataSync();

    console.log(JSON.stringify({
      ok: true,
      mode: "live-db-and-snapshot",
      dataSqlPath,
      applyPath,
      appendedHotels: assignedBlocks.length,
      skippedDuplicateSlugs: skippedDuplicateSlugs.length,
      skippedExistingSlugs: skippedExistingSlugs.length,
      distribution,
      applySqlBytesAfter: 0,
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
