import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REVIEW_INPUT_HEADERS } from "./hotel-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output");
const storeDir = path.join(outputDir, "store", "hotels");
const savedDir = path.join(outputDir, "saved");

const MIN_QUALITY = 90;
const BAD_TEXT_TOKENS = ["Ã", "Æ", "Ä", "áº", "á»", "Â", "â€“", "â€"];
const TEST_TOKENS = ["overwrite-flow-test", "Imported Hotel"];

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function decodeMojibake(value) {
  if (value === null || value === undefined) return value;
  const text = String(value);
  if (!BAD_TEXT_TOKENS.some((token) => text.includes(token))) return text;
  const decoded = Buffer.from(text, "latin1").toString("utf8");
  return scoreBadText(decoded) <= scoreBadText(text) ? decoded : text;
}

function scoreBadText(value) {
  const text = String(value || "");
  return BAD_TEXT_TOKENS.reduce((score, token) => score + text.split(token).length - 1, 0);
}

function deepRepair(value) {
  if (Array.isArray(value)) return value.map(deepRepair);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepRepair(item)]));
  }
  return typeof value === "string" ? decodeMojibake(value) : value;
}

function imageUrlsFromGallery(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const colon = item.indexOf(":");
      return colon >= 0 ? item.slice(colon + 1).trim() : item;
    });
}

function shouldKeep(payload) {
  const record = payload.record || payload.reportRecord || payload;
  const editable = record.editable || payload.editable || {};
  const text = JSON.stringify(payload);
  const quality = Number(record.quality?.score || payload.qualityScore || payload.quality?.score || 0);
  const gallery = imageUrlsFromGallery(editable.gallery_images);
  const sourceUrl = String(record.sourceUrl || editable.agoda_url || payload.sourceUrl || "");
  const name = String(record.name || editable.hotel_name || payload.name || "");
  const status = record.status || payload.status;

  const reasons = [];
  if (status !== "ready") reasons.push("not_ready");
  if (quality < MIN_QUALITY) reasons.push("quality_below_90");
  if (!gallery.some((url) => /pix\d+\.agoda\.net\/hotelImages/i.test(url))) reasons.push("no_agoda_gallery");
  if (/images\.unsplash\.com/i.test(text)) reasons.push("has_unsplash");
  if (TEST_TOKENS.some((token) => sourceUrl.includes(token) || name.includes(token))) reasons.push("test_or_placeholder");
  if (!editable.room_options || String(editable.room_options).split("|").filter(Boolean).length < 2) reasons.push("not_enough_rooms");
  if (!editable.nearby_places || String(editable.nearby_places).split("|").filter(Boolean).length < 12) reasons.push("not_enough_nearby");
  return { keep: reasons.length === 0, reasons, quality, status, name, sourceUrl };
}

function cleanEditable(payload) {
  const repaired = deepRepair(payload);
  const record = repaired.record || repaired.reportRecord || repaired;
  const editable = { ...(record.editable || repaired.editable || {}) };
  const name = editable.hotel_name || record.name || repaired.name || "Hotel";
  const city = editable.city || record.city || repaired.city || "Vietnam";
  editable.hotel_name = name;
  editable.city = city;
  editable.description = String(editable.description || "")
    .replace(/\s*Some fields were filled automatically for preview\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!editable.description || /imported hotel profile/i.test(editable.description)) {
    editable.description = `${name} la khach san cao cap tai ${city}, cung cap dich vu luu tru chuyen nghiep voi day du tien nghi hien dai.`;
  }
  editable.field_sources = typeof editable.field_sources === "string"
    ? editable.field_sources
    : JSON.stringify(record.fieldSources || {});
  return REVIEW_INPUT_HEADERS.map((header) => csvCell(editable[header] ?? "")).join(",");
}

function runImporter(inputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ["src/import-hotels.mjs", inputPath, "--dry-run"],
      { cwd: rootDir, timeout: 1000 * 60 * 3 },
      (error, stdout, stderr) => {
        if (error) {
          error.message = `${error.message}\n${stderr || stdout || ""}`.trim();
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(savedDir, { recursive: true });
  const files = (await fs.readdir(storeDir)).filter((file) => file.endsWith(".json"));
  const keptRows = [];
  const keptIds = [];
  const rejected = [];
  const seenIds = new Set();

  for (const file of files) {
    const filePath = path.join(storeDir, file);
    const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
    const decision = shouldKeep(payload);
    const id = payload.agodaHotelId || payload.id || file.replace(/\.json$/, "");
    if (seenIds.has(id)) {
      rejected.push({ file, id, name: decision.name, reasons: ["duplicate_agoda_id"] });
      continue;
    }
    if (!decision.keep) {
      rejected.push({ file, id, name: decision.name, quality: decision.quality, status: decision.status, reasons: decision.reasons });
      continue;
    }
    seenIds.add(id);
    keptIds.push(String(id));
    keptRows.push(cleanEditable(payload));
  }

  const inputPath = path.join(outputDir, "input.csv");
  await fs.writeFile(inputPath, `${REVIEW_INPUT_HEADERS.join(",")}\n${keptRows.join("\n")}\n`, "utf8");
  const importer = await runImporter(inputPath);
  const previewSql = path.join(outputDir, "import-preview.sql");
  const applySql = path.join(savedDir, "apply.sql");

  await fs.mkdir(savedDir, { recursive: true });
  await fs.copyFile(previewSql, applySql);
  await markStoreApplied(keptIds);
  await cleanupOutputArtifacts();

  const report = {
    generatedAt: new Date().toISOString(),
    minQuality: MIN_QUALITY,
    scanned: files.length,
    kept: keptRows.length,
    rejected: rejected.length,
    files: {
      applySql,
    },
    importerStdout: importer.stdout,
    importerStderr: importer.stderr,
    rejectedSamples: rejected.slice(0, 50),
  };
  console.log(JSON.stringify(report, null, 2));
}

async function markStoreApplied(ids) {
  const idSet = new Set(ids);
  const indexPath = path.join(outputDir, "store", "index.json");
  let index = null;
  try {
    index = JSON.parse(await fs.readFile(indexPath, "utf8"));
  } catch {
    index = null;
  }
  if (index && Array.isArray(index.hotels)) {
    index.updatedAt = new Date().toISOString();
    index.hotels = index.hotels.map((hotel) => idSet.has(String(hotel.id)) ? { ...hotel, appliedSql: true } : hotel);
    await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  }
  await Promise.all(ids.map(async (id) => {
    const hotelPath = path.join(storeDir, `${id}.json`);
    try {
      const payload = JSON.parse(await fs.readFile(hotelPath, "utf8"));
      payload.appliedSql = true;
      payload.updatedAt = new Date().toISOString();
      await fs.writeFile(hotelPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    } catch {
      // Store cleanup should not block the SQL rebuild.
    }
  }));
}

async function cleanupOutputArtifacts() {
  const removable = [
    path.join(outputDir, "clean"),
    path.join(outputDir, "input.csv"),
    path.join(outputDir, "import-preview.sql"),
    path.join(outputDir, "import-report.json"),
    path.join(savedDir, "apply-clean.sql"),
    path.join(savedDir, "clean-report.json"),
    path.join(savedDir, "input-clean.csv"),
    path.join(savedDir, "input.csv"),
    path.join(savedDir, "report.json"),
    path.join(savedDir, "manifest.json"),
    path.join(savedDir, "history.json"),
  ];
  await Promise.all(removable.map((target) => fs.rm(target, { recursive: true, force: true })));
  const savedEntries = await fs.readdir(savedDir, { withFileTypes: true }).catch(() => []);
  await Promise.all(savedEntries.map(async (entry) => {
    if (entry.name === "apply.sql") return;
    await fs.rm(path.join(savedDir, entry.name), { recursive: true, force: true });
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
