import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(toolRoot, "..", "..");
const applyPath = path.join(toolRoot, "output", "saved", "apply.sql");
const dataSqlPath = path.join(projectRoot, "database", "snapshots", "data.sql");

const partnerIds = [3, 4, 5, 11];
const hotelsPerPartner = 50;

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
  return [...sqlText.matchAll(/INSERT INTO properties[\s\S]*?\bVALUES|\bSELECT[\s\S]*?'([^']+)'/g)]
    .map((match) => match[1])
    .filter(Boolean);
}

function blockSlug(block) {
  const match = block.match(/INSERT INTO properties[\s\S]*?SELECT[\s\S]*?'([^']+)'/);
  return match?.[1] || "";
}

function assignPartner(block, index) {
  const partnerIndex = Math.min(Math.floor(index / hotelsPerPartner), partnerIds.length - 1);
  const partnerId = partnerIds[partnerIndex];
  return block
    .replace(/-- importer_partner_id: \d+/g, `-- importer_partner_id: ${partnerId}`)
    .replace(/partner_profiles WHERE id = \d+/g, `partner_profiles WHERE id = ${partnerId}`);
}

async function main() {
  const applySql = await fs.readFile(applyPath, "utf8").catch(() => "");

  if (!applySql.trim()) {
    console.log(JSON.stringify({ ok: true, message: "apply.sql already empty", appendedHotels: 0 }, null, 2));
    return;
  }

  const blocks = splitHotelBlocks(applySql);
  if (!blocks.length) {
    throw new Error("apply.sql khong co block hotel PostgreSQL hop le.");
  }

  const seenSlugs = new Set();
  const uniqueBlocks = [];
  const skippedDuplicateSlugs = [];
  for (const block of blocks) {
    const slug = blockSlug(block);
    if (!slug) {
      throw new Error("apply.sql co block khong tim thay property slug.");
    }
    if (seenSlugs.has(slug)) {
      skippedDuplicateSlugs.push(slug);
      continue;
    }
    seenSlugs.add(slug);
    uniqueBlocks.push(block);
  }

  const assignedBlocks = uniqueBlocks.map(assignPartner);
  const distribution = partnerIds.map((partnerId) => ({
    partnerId,
    hotels: (assignedBlocks.join("\n").match(new RegExp(`importer_partner_id: ${partnerId}`, "g")) || []).length,
  }));

  const existingData = await fs.readFile(dataSqlPath, "utf8").catch(() => "");
  const existingSlugs = new Set(propertySlugs(existingData));
  const finalBlocks = [];
  const skippedExistingSlugs = [];
  for (const block of assignedBlocks) {
    const slug = blockSlug(block);
    if (existingSlugs.has(slug)) {
      skippedExistingSlugs.push(slug);
      continue;
    }
    finalBlocks.push(block);
  }

  if (finalBlocks.length) {
    const payload = [
      existingData.trimEnd(),
      "",
      "-- Appended by tools/hotel-importer/src/apply-to-data-sql.mjs",
      "BEGIN;",
      ...finalBlocks,
      "COMMIT;",
      "",
    ].join("\n");
    await fs.mkdir(path.dirname(dataSqlPath), { recursive: true });
    await fs.writeFile(dataSqlPath, payload, "utf8");
  }

  await fs.writeFile(applyPath, "", "utf8");

  console.log(JSON.stringify({
    ok: true,
    mode: "postgresql-snapshot",
    dataSqlPath,
    applyPath,
    appendedHotels: finalBlocks.length,
    skippedDuplicateSlugs: skippedDuplicateSlugs.length,
    skippedExistingSlugs: skippedExistingSlugs.length,
    distribution,
    applySqlBytesAfter: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
