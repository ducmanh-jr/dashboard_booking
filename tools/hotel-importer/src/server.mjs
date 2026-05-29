import { createServer } from "node:http";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIELD_SOURCES,
  HOTEL_SCHEMA_VERSION,
  REVIEW_INPUT_HEADERS,
  parseFieldSources,
  stringifyFieldSources,
} from "./hotel-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const outputDir = path.join(rootDir, "output");
const storeDir = path.join(outputDir, "store");
const port = Number(process.env.PORT || 4317);
const approvedPartnerIds = [3, 4, 5, 11];

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseUrls(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [url, hotelName = "", city = "", countryCode = "VN"] = line.split(",").map((part) => part.trim());
      return { url, hotelName, city, countryCode };
    });
}

function validateRows(rows) {
  return rows.map((row, index) => {
    let parsed = null;
    try {
      parsed = new URL(row.url);
    } catch {
      // Invalid URL.
    }
    const isAgodaHotel = !!parsed
      && parsed.hostname.includes("agoda.com")
      && (parsed.pathname.includes("/hotel/")
        || (parsed.pathname === "/search" && (parsed.searchParams.has("hotel") || parsed.searchParams.has("selectedproperty"))));
    return {
      row: index + 1,
      url: row.url,
      hotelName: row.hotelName,
      city: row.city,
      countryCode: row.countryCode || "VN",
      status: isAgodaHotel ? "pass" : "invalid",
      reason: isAgodaHotel ? "" : "URL phai la link Agoda hotel hoac Agoda search co hotel id",
    };
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  const requestPath = new URL(req.url, `http://localhost:${port}`).pathname;
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(publicDir, safePath));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const type = ext === ".html" ? "text/html; charset=utf-8"
      : ext === ".css" ? "text/css; charset=utf-8"
        : ext === ".js" ? "text/javascript; charset=utf-8"
          : "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

async function writeInputCsv(validRows, runDir = outputDir) {
  await fs.mkdir(runDir, { recursive: true });
  const headers = ["agoda_url", "hotel_name", "city", "country_code"];
  const csv = [
    headers.join(","),
    ...validRows.map((row) => [
      row.url,
      row.hotelName,
      row.city,
      row.countryCode || "VN",
    ].map(csvCell).join(",")),
  ].join("\n");
  const inputPath = path.join(runDir, "input.csv");
  await fs.writeFile(inputPath, `${csv}\n`, "utf8");
  return inputPath;
}

async function writeReviewInputCsv(records, edits = []) {
  const headers = REVIEW_INPUT_HEADERS;
  const editsByRow = new Map(edits.map((edit) => [String(edit.row), edit.fields || {}]));
  const rows = records.map((record) => {
    const base = record.editable || {};
    const editedFields = editsByRow.get(String(record.row)) || {};
    const merged = { ...base, ...editedFields };
    const fieldSources = {
      ...parseFieldSources(record.fieldSources || base.field_sources),
      ...parseFieldSources(base.field_sources),
    };
    Object.keys(editedFields).forEach((field) => {
      if (field !== "field_sources") fieldSources[field] = FIELD_SOURCES.MANUAL;
    });
    merged.field_sources = stringifyFieldSources(fieldSources);
    return headers.map((header) => csvCell(merged[header] ?? "")).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const inputPath = path.join(outputDir, "input.csv");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(inputPath, `${csv}\n`, "utf8");
  return inputPath;
}

async function appendSqlPackage(latestSql, sqlPath, manifestLabel, partnerId) {
  const sqlText = withPartnerId(await fs.readFile(latestSql, "utf8"), partnerId);
  const exists = await pathExists(sqlPath);
  const block = exists
    ? [
      "",
      "",
      `-- Saved package appended at ${new Date().toISOString()}: ${manifestLabel || "hotel-import"}`,
      sqlText.trim(),
      "",
    ].join("\n")
    : `${sqlText.trim()}\n`;
  await fs.mkdir(path.dirname(sqlPath), { recursive: true });
  await fs.appendFile(sqlPath, block, "utf8");
}

function rerunImporterForReview(inputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ["src/import-hotels.mjs", inputPath, "--fill-missing"],
      { cwd: rootDir, timeout: 1000 * 60 * 3 },
      (error, stdout, stderr) => {
        if (error) {
          error.message = compactError(`${error.message}\n${stderr || stdout || ""}`.trim());
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

function compactError(value) {
  return String(value || "")
    .split(/\n\s*sql:\s*/)[0]
    .split(/\n\s*sqlMessage:\s*/)[0]
    .slice(0, 1200);
}

async function applyReviewEdits(edits = []) {
  const latestReport = path.join(outputDir, "import-report.json");
  let report = null;
  try {
    report = JSON.parse(await fs.readFile(latestReport, "utf8"));
  } catch {
    throw new Error("Chua co report de sua. Hay chay tai du lieu truoc.");
  }
  const records = Array.isArray(report.records) ? report.records : [];
  if (!records.length) throw new Error("Report khong co khach san de sua.");
  const inputPath = await writeReviewInputCsv(records, Array.isArray(edits) ? edits : []);
  await rerunImporterForReview(inputPath);
}

async function keepOnlyReadyForApply() {
  const latestReport = path.join(outputDir, "import-report.json");
  let report = null;
  try {
    report = JSON.parse(await fs.readFile(latestReport, "utf8"));
  } catch {
    throw new Error("Chua co report de loc ready. Hay chay tai du lieu truoc.");
  }

  const records = Array.isArray(report.records) ? report.records : [];
  const readyRecords = records.filter((record) => record.status === "ready");
  const skippedNeedsReview = records.filter((record) => record.status === "needs_review").length;
  const skippedFailed = records.filter((record) => record.status === "failed").length;
  if (!readyRecords.length) {
    const error = new Error("Khong co khach san ready de luu vao apply.sql. Cac khach san needs_review can sua/kiem tra truoc.");
    error.code = "NO_READY_RECORDS";
    error.savePolicy = {
      total: records.length,
      ready: 0,
      skippedNeedsReview,
      skippedFailed,
    };
    throw error;
  }

  const inputPath = await writeReviewInputCsv(readyRecords, []);
  await rerunImporterForReview(inputPath);
  return {
    total: records.length,
    ready: readyRecords.length,
    skippedNeedsReview,
    skippedFailed,
  };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function safePackageName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function saveLatestPackage(label = "", options = {}) {
  const latestInput = path.join(outputDir, "input.csv");
  const latestReport = path.join(outputDir, "import-report.json");
  const latestSql = path.join(outputDir, "import-preview.sql");

  if (!await pathExists(latestSql) || !await pathExists(latestReport)) {
    throw new Error("Chua co SQL/report de luu. Hay chay tai du lieu truoc.");
  }

  let report = null;
  try {
    report = JSON.parse(await fs.readFile(latestReport, "utf8"));
  } catch {
    report = null;
  }

  const firstName = report?.records?.[0]?.name || "hotel-import";
  const packageId = "saved";
  const saveDir = path.join(outputDir, "saved");
  await fs.mkdir(saveDir, { recursive: true });

  const sqlPath = path.join(saveDir, "apply.sql");
  const inputText = await fs.readFile(latestInput, "utf8").catch(() => "");
  const inputUrls = extractInputUrls(inputText);
  const partnerId = Number(options.partnerId);
  if (!approvedPartnerIds.includes(partnerId)) {
    const error = new Error("Chon partner that dang hoat dong truoc khi luu.");
    error.code = "INVALID_PARTNER_ID";
    throw error;
  }

  const duplicate = await findStoredDuplicate(inputUrls);
  if (duplicate) {
    const error = new Error("Link nay da tung luu roi.");
    error.code = "DUPLICATE_SAVED_URL";
    error.duplicate = duplicate;
    throw error;
  }

  const manifestLabel = label || firstName;
  await appendSqlPackage(latestSql, sqlPath, manifestLabel, partnerId);

  const manifest = {
    packageId,
    savedAt: new Date().toISOString(),
    label: manifestLabel,
    totals: report?.totals || null,
    source: {
      latestInput,
      latestReport,
      latestSql,
    },
    partnerId,
    appliedSql: true,
    files: {
      sql: sqlPath,
      store: storeDir,
    },
    applyNote: "apply.sql is the only SQL artifact to load into the main project.",
    inputUrls,
  };
  const store = await writeStorePackage(report, manifest, latestSql, latestInput);
  manifest.store = store;
  await cleanupSavedArtifacts(saveDir);
  await cleanupRunArtifacts();
  return manifest;
}

function applySavedSqlToDataSql() {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      ["src/apply-to-data-sql.mjs"],
      { cwd: rootDir, timeout: 1000 * 60 * 3 },
      (error, stdout, stderr) => {
        if (error) {
          error.message = compactError(`${error.message}\n${stderr || stdout || ""}`.trim());
          reject(error);
          return;
        }
        const payload = String(stdout || "").trim();
        if (!payload) {
          reject(new Error(`Khong doc duoc ket qua nap data.sql.\n${stdout || stderr || ""}`.trim()));
          return;
        }
        try {
          resolve(JSON.parse(payload));
        } catch (parseError) {
          reject(new Error(`Ket qua nap data.sql khong hop le: ${parseError.message}`));
        }
      }
    );
  });
}

function withPartnerId(sqlText, partnerId) {
  const id = Number(partnerId);
  return String(sqlText || "")
    .replace(/-- importer_partner_id: \d+/g, `-- importer_partner_id: ${id}`)
    .replace(/partner_profiles WHERE id = \d+/g, `partner_profiles WHERE id = ${id}`);
}

async function readSavedSummary() {
  const saveDir = path.join(outputDir, "saved");
  const sqlPath = path.join(saveDir, "apply.sql");
  const sqlText = await fs.readFile(sqlPath, "utf8").catch(() => "");
  const sqlStat = await fs.stat(sqlPath).catch(() => null);
  return {
    savedHotels: (sqlText.match(/-- Row \d+:/g) || []).length,
    savePackages: 1,
    applySqlPath: sqlPath,
    inputPath: null,
    lastSavedAt: sqlStat?.mtime?.toISOString?.() || null,
    applySqlBytes: sqlStat?.size || 0,
    hasApplySql: !!sqlStat,
  };
}

function extractInputUrls(csvText) {
  return String(csvText || "")
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(",")[0]?.trim().replace(/^"|"$/g, ""))
    .filter(Boolean)
    .map((url) => normalizeUrlForDuplicate(url));
}

function normalizeUrlForDuplicate(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    if (parsed.pathname === "/search") {
      const hotelId = parsed.searchParams.get("hotel") || parsed.searchParams.get("selectedproperty") || "";
      parsed.search = "";
      if (hotelId) {
        parsed.searchParams.set("hotel", hotelId);
        parsed.searchParams.set("selectedproperty", hotelId);
      }
    } else {
      parsed.search = "";
    }
    return parsed.toString();
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function agodaHotelIdFromUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.searchParams.get("hotel") || parsed.searchParams.get("selectedproperty") || "";
  } catch {
    return "";
  }
}

function safeFileName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "hotel";
}

async function readStoreIndex() {
  const indexPath = path.join(storeDir, "index.json");
  try {
    const data = JSON.parse(await fs.readFile(indexPath, "utf8"));
    return {
      version: 1,
      updatedAt: data.updatedAt || null,
      hotels: Array.isArray(data.hotels) ? data.hotels : [],
    };
  } catch {
    return { version: 1, updatedAt: null, hotels: [] };
  }
}

async function readQueue() {
  const queuePath = path.join(storeDir, "queue.json");
  try {
    const data = JSON.parse(await fs.readFile(queuePath, "utf8"));
    return {
      version: 1,
      updatedAt: data.updatedAt || null,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return { version: 1, updatedAt: null, items: [] };
  }
}

async function writeQueue(queue) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: Array.isArray(queue.items) ? queue.items : [],
  };
  await fs.mkdir(storeDir, { recursive: true });
  await fs.writeFile(path.join(storeDir, "queue.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function queueIdForRow(row) {
  const hotelId = agodaHotelIdFromUrl(row.url);
  if (hotelId) return `agoda-${hotelId}`;
  return safeFileName(normalizeUrlForDuplicate(row.url));
}

async function addRowsToQueue(rows) {
  const queue = await readQueue();
  const store = await readStoreIndex();
  const existingIds = new Set(queue.items.map((item) => item.id));
  const importedIds = new Set(store.hotels.map((hotel) => hotel.id));
  const added = [];
  const skipped = [];

  for (const row of rows) {
    const id = queueIdForRow(row);
    if (existingIds.has(id)) {
      skipped.push({ id, url: row.url, reason: "already_in_queue" });
      continue;
    }
    if (importedIds.has(id)) {
      skipped.push({ id, url: row.url, reason: "already_in_store" });
      continue;
    }
    const item = {
      id,
      agodaHotelId: agodaHotelIdFromUrl(row.url),
      url: row.url,
      hotelName: row.hotelName || "",
      city: row.city || "",
      countryCode: row.countryCode || "VN",
      status: "pending",
      attempts: 0,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastError: "",
    };
    queue.items.push(item);
    existingIds.add(id);
    added.push(item);
  }

  const saved = await writeQueue(queue);
  return { queue: saved, added, skipped };
}

async function runQueueBatch(limit = 25) {
  const queue = await readQueue();
  const candidates = queue.items
    .filter((item) => ["pending", "failed"].includes(item.status) && Number(item.attempts || 0) < 3)
    .slice(0, Math.max(1, Math.min(Number(limit) || 25, 100)));
  if (!candidates.length) return { ok: true, message: "Khong co khach san nao dang cho.", queue };

  const now = new Date().toISOString();
  candidates.forEach((item) => {
    item.status = "running";
    item.attempts = Number(item.attempts || 0) + 1;
    item.updatedAt = now;
    item.lastError = "";
  });
  await writeQueue(queue);

  const inputPath = await writeInputCsv(candidates.map((item) => ({
    url: item.url,
    hotelName: item.hotelName,
    city: item.city,
    countryCode: item.countryCode,
  })), outputDir);
  const result = await runImporter(inputPath);
  const reportById = new Map((result.report?.records || []).map((record) => {
    const id = record.agodaHotelId ? `agoda-${record.agodaHotelId}` : safeFileName(record.slug || record.name);
    return [id, record];
  }));

  candidates.forEach((item) => {
    const record = reportById.get(item.id);
    if (result.ok && record && record.status !== "failed") {
      item.status = record.quality?.score >= 90 ? "ready_for_review" : "needs_review";
      item.qualityScore = record.quality?.score ?? record.confidence ?? 0;
      item.hotelName = record.name || item.hotelName;
      item.city = record.city || item.city;
    } else {
      item.status = "failed";
      item.lastError = result.error || record?.errors?.join("; ") || "Importer failed";
    }
    item.updatedAt = new Date().toISOString();
  });

  const savedQueue = await writeQueue(queue);
  let store = null;
  if (result.ok && result.report?.records?.length) {
    store = await writeStorePackage(result.report, {
      label: `queue-batch-${new Date().toISOString()}`,
      savedAt: new Date().toISOString(),
      files: result.files || {},
      inputUrls: candidates.map((item) => normalizeUrlForDuplicate(item.url)),
      autoStored: true,
    }, result.files.sql, result.files.input);
  }
  return { ...result, queue: savedQueue, store };
}

async function writeStorePackage(report, manifest, latestSql, latestInput) {
  if (!report || !Array.isArray(report.records)) return null;
  await fs.mkdir(path.join(storeDir, "hotels"), { recursive: true });
  const sqlText = await fs.readFile(latestSql, "utf8").catch(() => "");
  const inputText = await fs.readFile(latestInput, "utf8").catch(() => "");
  const storeIndex = await readStoreIndex();
  const byId = new Map(storeIndex.hotels.map((item) => [item.id, item]));
  const savedAt = manifest.savedAt || new Date().toISOString();
  const written = [];

  for (const record of report.records) {
    const agodaHotelId = record.agodaHotelId || agodaHotelIdFromUrl(record.sourceUrl) || agodaHotelIdFromUrl(record.editable?.agoda_url);
    const id = agodaHotelId ? `agoda-${agodaHotelId}` : safeFileName(record.slug || record.name);
    const hotelPath = path.join(storeDir, "hotels", `${id}.json`);
    const previousIndexItem = byId.get(id) || {};
    const previousPayload = await readStoreHotelPayload(id);
    const reviewStatus = previousPayload?.reviewStatus || previousIndexItem.reviewStatus || "unreviewed";
    const payload = {
      id,
      schemaVersion: report.schemaVersion || HOTEL_SCHEMA_VERSION,
      agodaHotelId,
      savedAt,
      updatedAt: new Date().toISOString(),
      sourceUrl: record.sourceUrl || record.editable?.agoda_url || "",
      name: record.name,
      city: record.city,
      slug: record.slug,
      status: record.status,
      reviewStatus,
      appliedSql: Boolean(manifest.appliedSql || previousPayload?.appliedSql || previousIndexItem.appliedSql),
      confidence: record.confidence,
      quality: record.quality || null,
      fieldSources: record.fieldSources || parseFieldSources(record.editable?.field_sources),
      warnings: record.warnings || [],
      errors: record.errors || [],
      filledFields: record.filledFields || [],
      info: record.info || [],
      editable: record.editable || {},
      manifest: {
        label: manifest.label,
        files: manifest.files,
        inputUrls: manifest.inputUrls || [],
      },
      artifacts: {
        sqlPreview: sqlText,
        inputCsv: inputText,
      },
    };
    await fs.writeFile(hotelPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    byId.set(id, {
      id,
      agodaHotelId,
      name: record.name,
      city: record.city,
      status: record.status,
      reviewStatus,
      appliedSql: Boolean(manifest.appliedSql || previousIndexItem.appliedSql),
      qualityScore: record.quality?.score ?? record.confidence ?? 0,
      qualityLevel: record.quality?.level || "unknown",
      sourceUrl: payload.sourceUrl,
      savedAt,
      updatedAt: payload.updatedAt,
      file: hotelPath,
    });
    written.push(id);
  }

  const nextIndex = {
    version: 1,
    updatedAt: new Date().toISOString(),
    hotels: [...byId.values()].sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt))),
  };
  await fs.writeFile(path.join(storeDir, "index.json"), `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
  await fs.appendFile(
    path.join(storeDir, "events.jsonl"),
    `${JSON.stringify({ type: "save", at: nextIndex.updatedAt, label: manifest.label, hotelIds: written })}\n`,
    "utf8"
  );
  return { storeDir, written };
}

async function readStoreHotelPayload(id) {
  try {
    return JSON.parse(await fs.readFile(path.join(storeDir, "hotels", `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

async function updateReviewStatus(id, reviewStatus) {
  const allowed = new Set(["unreviewed", "approved", "rejected"]);
  if (!allowed.has(reviewStatus)) throw new Error("Trang thai review khong hop le.");
  const storeIndex = await readStoreIndex();
  const item = storeIndex.hotels.find((hotel) => hotel.id === id);
  if (!item) throw new Error("Khong tim thay khach san trong store.");
  const payload = await readStoreHotelPayload(id);
  if (!payload) throw new Error("Khong doc duoc file khach san trong store.");
  const updatedAt = new Date().toISOString();
  payload.reviewStatus = reviewStatus;
  payload.updatedAt = updatedAt;
  item.reviewStatus = reviewStatus;
  item.updatedAt = updatedAt;
  await fs.writeFile(path.join(storeDir, "hotels", `${id}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const nextIndex = {
    version: 1,
    updatedAt,
    hotels: storeIndex.hotels.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt))),
  };
  await fs.writeFile(path.join(storeDir, "index.json"), `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");
  return nextIndex;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanSearchTitle(value) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*Agoda.*$/i, "")
    .replace(/\s*\|\s*Agoda.*$/i, "")
    .trim();
}

function normalizeAgodaHotelUrl(value) {
  try {
    const parsed = new URL(value);
    const isHotelUrl = parsed.pathname.includes("/hotel/")
      || (parsed.pathname === "/search" && (parsed.searchParams.has("hotel") || parsed.searchParams.has("selectedproperty")));
    if (!parsed.hostname.includes("agoda.com") || !isHotelUrl) return "";
    parsed.hash = "";
    if (parsed.pathname.includes("/hotel/")) {
      parsed.search = "";
    } else {
      const hotelId = parsed.searchParams.get("hotel") || parsed.searchParams.get("selectedproperty") || "";
      parsed.search = "";
      if (hotelId) {
        parsed.searchParams.set("hotel", hotelId);
        parsed.searchParams.set("selectedproperty", hotelId);
      }
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function extractAgodaSearchResults(html) {
  const results = [];
  const seen = new Set();
  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || "").matchAll(anchorPattern)) {
    let href = decodeHtml(match[1]);
    try {
      const parsed = new URL(href, "https://html.duckduckgo.com");
      href = parsed.searchParams.get("uddg") || href;
    } catch {
      // Keep raw href.
    }
    const url = normalizeAgodaHotelUrl(href);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    results.push({
      url,
      title: cleanSearchTitle(match[2]) || url,
    });
    if (results.length >= 8) break;
  }
  return results;
}

async function searchAgodaHotels(query, city = "") {
  const text = [query, city, "Agoda hotel"].filter(Boolean).join(" ").trim();
  if (!text) return [];
  const directResults = await searchAgodaSuggest(query, city);
  if (directResults.length > 0) return directResults;

  const searchUrl = new URL("https://html.duckduckgo.com/html/");
  searchUrl.searchParams.set("q", `site:agoda.com/hotel ${text}`);
  const response = await fetch(searchUrl, {
    signal: timeoutSignal(8000),
    headers: {
      "accept-language": "vi,en;q=0.8",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
  return extractAgodaSearchResults(await response.text());
}

async function discoverAgodaHotels(city = "Hanoi", limit = 100) {
  const max = Math.max(1, Math.min(Number(limit) || 100, 500));
  const results = [];
  const seen = new Set();
  const queries = discoveryQueries(city, max);
  const concurrency = 5;

  const addResults = (items) => {
    for (const item of items || []) {
      const url = normalizeAgodaHotelUrl(item.url);
      const id = agodaHotelIdFromUrl(url);
      const key = id ? `agoda-${id}` : url;
      if (!url || seen.has(key)) continue;
      seen.add(key);
      results.push({
        url,
        title: item.title || "Agoda hotel",
        city: item.city || city,
        hotelId: item.hotelId || id || null,
        image: item.image || "",
      });
      if (results.length >= max) break;
    }
  };

  for (let index = 0; index < queries.length && results.length < max; index += concurrency) {
    const batch = queries.slice(index, index + concurrency);
    const settled = await Promise.allSettled(batch.map((query) => searchAgodaSuggest(query, city)));
    settled.forEach((item) => {
      if (item.status === "fulfilled") addResults(item.value);
    });
  }

  if (results.length < Math.min(max, 30)) {
    for (const query of queries.slice(0, 8)) {
      if (results.length >= max) break;
      try {
        addResults(await searchAgodaHotels(query, city));
      } catch {
        // Search fallback can be blocked; keep the direct Agoda results.
      }
    }
  }

  return results.slice(0, max);
}

function discoveryQueries(city, limit) {
  const cleanCity = String(city || "Hanoi").trim() || "Hanoi";
  const cityKey = cleanCity.toLowerCase();
  const districts = cityKey.includes("hanoi") || cityKey.includes("ha noi") || cityKey.includes("hà nội")
    ? ["Hoan Kiem", "Ba Dinh", "Tay Ho", "Cau Giay", "Dong Da", "Hai Ba Trung", "Nam Tu Liem", "My Dinh", "Long Bien", "Thanh Xuan"]
    : cityKey.includes("ho chi minh") || cityKey.includes("sai gon") || cityKey.includes("saigon")
      ? ["District 1", "District 3", "District 4", "District 5", "District 7", "Binh Thanh", "Tan Binh", "Phu Nhuan", "Thu Duc"]
      : cityKey.includes("da nang") || cityKey.includes("đà nẵng")
        ? ["My Khe", "Hai Chau", "Son Tra", "Ngu Hanh Son", "An Thuong", "Han River"]
        : [];
  const types = [
    "hotel",
    "khach san",
    "apartment",
    "serviced apartment",
    "homestay",
    "resort",
    "boutique hotel",
    "luxury hotel",
    "4 star hotel",
    "5 star hotel",
    "near center hotel",
    "family hotel",
    "business hotel",
  ];
  const brands = ["M Village", "Sotetsu", "Citadines", "Somerset", "Lotte", "JW Marriott", "Novotel", "Mercure", "Muong Thanh", "Vinpearl", "La Siesta", "Aira", "Peridot"];
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const queries = [
    cleanCity,
    ...types.map((type) => `${type} ${cleanCity}`),
    ...districts.flatMap((district) => types.slice(0, 8).map((type) => `${type} ${district} ${cleanCity}`)),
    ...brands.map((brand) => `${brand} ${cleanCity}`),
  ];

  if (limit > 100) {
    queries.push(...letters.map((letter) => `${letter} hotel ${cleanCity}`));
    queries.push(...letters.map((letter) => `${letter} apartment ${cleanCity}`));
  }
  if (limit > 250) {
    queries.push(...letters.map((letter) => `${letter} homestay ${cleanCity}`));
    queries.push(...letters.map((letter) => `${letter} ${cleanCity} hotel`));
  }

  return [...new Set(queries)];
}

async function searchAgodaSuggest(query, city = "") {
  const results = [];
  const seen = new Set();
  const add = (item) => {
    const resultUrl = item?.ResultUrl ? new URL(item.ResultUrl, "https://www.agoda.com").toString() : "";
    const url = normalizeAgodaHotelUrl(resultUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    results.push({
      url,
      title: cleanSearchTitle(item.Name || item.ResultText || "Agoda hotel"),
      city: cleanSearchTitle(item.CityName || item.DisplayNames?.GeoHierarchyName || city),
      hotelId: item.ObjectId || null,
      image: item.HotelImage ? new URL(item.HotelImage, "https://www.agoda.com").toString() : "",
    });
  };

  const attempts = [
    [query, city].filter(Boolean).join(" "),
    query,
  ].filter(Boolean);

  for (const attempt of attempts) {
    const apiUrl = new URL("https://www.agoda.com/api/cronos/search/GetUnifiedSuggestResult/3/24/24/0/vi-vn/");
    apiUrl.searchParams.set("searchText", attempt);
    const response = await fetch(apiUrl, {
      signal: timeoutSignal(7000),
      headers: {
        "accept-language": "vi,en;q=0.8",
        "referer": "https://www.agoda.com/vi-vn/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
    });
    if (!response.ok) continue;
    const data = await response.json();
    const items = Array.isArray(data.ViewModelList) ? data.ViewModelList : [];
    items.filter((item) => item.IsHotel).forEach(add);
    if (results.length > 0) break;
  }

  return results.slice(0, 8);
}

async function findStoredDuplicate(inputUrls) {
  if (!inputUrls.length) return null;
  const ids = new Set(inputUrls.map(agodaHotelIdFromUrl).filter(Boolean));
  if (!ids.size) return null;
  const storeIndex = await readStoreIndex();
  const matched = storeIndex.hotels.find((hotel) => hotel.appliedSql && hotel.agodaHotelId && ids.has(String(hotel.agodaHotelId)));
  if (!matched) return null;
  return {
    matchedUrl: inputUrls.find((url) => ids.has(agodaHotelIdFromUrl(url))) || matched.sourceUrl || "",
    savedAt: matched.savedAt || matched.updatedAt || null,
    label: matched.name || matched.id || "output/store",
  };
}

async function cleanupSavedArtifacts(saveDir) {
  const keep = new Set(["apply.sql"]);
  const entries = await fs.readdir(saveDir, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries.map(async (entry) => {
    if (keep.has(entry.name)) return;
    await fs.rm(path.join(saveDir, entry.name), { recursive: true, force: true });
  }));
}

async function cleanupRunArtifacts() {
  await Promise.all([
    path.join(outputDir, "input.csv"),
    path.join(outputDir, "import-preview.sql"),
    path.join(outputDir, "import-report.json"),
  ].map((target) => fs.rm(target, { force: true })));
}

function runImporter(inputPath) {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      ["src/import-hotels.mjs", inputPath, "--dry-run", "--fetch-agoda", "--fill-missing"],
      { cwd: rootDir, timeout: 1000 * 60 * 8 },
      async (error, stdout, stderr) => {
        let report = null;
        let sqlPreview = "";
        const latestReport = path.join(outputDir, "import-report.json");
        const latestSql = path.join(outputDir, "import-preview.sql");
        try {
          report = JSON.parse(await fs.readFile(latestReport, "utf8"));
        } catch {
          // Report may be missing when import fails early.
        }
        try {
          sqlPreview = await fs.readFile(latestSql, "utf8");
        } catch {
          // SQL may be missing when import fails early.
        }
        resolve({
          ok: !error,
          stdout,
          stderr,
          error: error ? error.message : "",
          report,
          sqlPreview: sqlPreview.slice(0, 12000),
          files: {
            input: path.join(outputDir, "input.csv"),
            report: latestReport,
            sql: latestSql,
          },
        });
      }
    );
    child.stdin?.end();
  });
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && req.url === "/api/store") {
    json(res, 200, { ok: true, store: await readStoreIndex() });
    return;
  }

  if (req.method === "GET" && req.url === "/api/saved-summary") {
    json(res, 200, { ok: true, savedSummary: await readSavedSummary() });
    return;
  }

  if (req.method === "POST" && req.url === "/api/apply-to-data-sql") {
    try {
      const result = await applySavedSqlToDataSql();
      json(res, 200, { ok: true, result, savedSummary: await readSavedSummary() });
    } catch (error) {
      json(res, 400, { ok: false, error: compactError(error.message) });
    }
    return;
  }

  if (req.method === "GET" && req.url === "/api/partners") {
    json(res, 200, {
      ok: true,
      partners: [
        { id: 3, name: "Hoan Kiem", email: "doitac0.@gmail.com" },
        { id: 4, name: "Hang Buom", email: "doitac1@gmail.com" },
        { id: 5, name: "Ha Noi", email: "doitac2@gmail.com" },
        { id: 11, name: "chuong duong", email: "doitac8@gmail.com" },
      ],
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/review/status") {
    const body = await readBody(req);
    const store = await updateReviewStatus(String(body.id || ""), String(body.reviewStatus || ""));
    json(res, 200, { ok: true, store });
    return;
  }

  if (req.method === "GET" && req.url === "/api/queue") {
    json(res, 200, { ok: true, queue: await readQueue(), savedSummary: await readSavedSummary() });
    return;
  }

  if (req.method === "POST" && req.url === "/api/queue/clear") {
    const queue = await writeQueue({ items: [] });
    json(res, 200, { ok: true, queue, savedSummary: await readSavedSummary() });
    return;
  }

  if (req.method === "POST" && req.url === "/api/check") {
    const body = await readBody(req);
    const rows = parseUrls(body.urls);
    const checked = validateRows(rows);
    json(res, 200, {
      total: checked.length,
      pass: checked.filter((row) => row.status === "pass").length,
      invalid: checked.filter((row) => row.status !== "pass").length,
      rows: checked,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/search-agoda") {
    const body = await readBody(req);
    const query = String(body.query || "").trim();
    const city = String(body.city || "").trim();
    if (!query) {
      json(res, 400, { ok: false, error: "Nhap ten khach san de tim." });
      return;
    }
    const results = await searchAgodaHotels(query, city);
    json(res, 200, { ok: true, total: results.length, results });
    return;
  }

  if (req.method === "POST" && req.url === "/api/discover-agoda") {
    const body = await readBody(req);
    const city = String(body.city || "Hanoi").trim() || "Hanoi";
    const limit = Math.max(1, Math.min(Number(body.limit) || 100, 500));
    const results = await discoverAgodaHotels(city, limit);
    const rows = results.map((item) => ({
      url: item.url,
      hotelName: item.title || "",
      city: item.city || city,
      countryCode: "VN",
    }));
    const queueResult = await addRowsToQueue(rows);
    json(res, 200, {
      ok: true,
      city,
      requested: limit,
      discovered: results.length,
      results,
      ...queueResult,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/queue/add") {
    const body = await readBody(req);
    const checked = validateRows(parseUrls(body.urls));
    const validRows = checked.filter((row) => row.status === "pass");
    const result = await addRowsToQueue(validRows);
    json(res, 200, {
      ok: true,
      checked,
      ...result,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/queue/run") {
    const body = await readBody(req);
    const result = await runQueueBatch(body.limit);
    json(res, result.ok ? 200 : 500, result);
    return;
  }

  if (req.method === "POST" && req.url === "/api/run") {
    const body = await readBody(req);
    const checked = validateRows(parseUrls(body.urls));
    const validRows = checked.filter((row) => row.status === "pass");
    if (!validRows.length) {
      json(res, 400, { ok: false, error: "Chua co Agoda URL hop le.", checked });
      return;
    }
    const inputPath = await writeInputCsv(validRows, outputDir);
    const result = await runImporter(inputPath);
    json(res, result.ok ? 200 : 500, {
      ...result,
      checked,
      stages: [
        "Kiem tra URL pass",
        "Tai du lieu Agoda/fallback",
        "Tu dien phan thieu",
        "Sinh SQL va report",
        "Hoan thanh",
      ],
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/save") {
    const body = await readBody(req);
    try {
      await applyReviewEdits(body.edits);
      const savePolicy = await keepOnlyReadyForApply();
      const manifest = await saveLatestPackage(body.label, {
        overwriteDuplicate: body.overwriteDuplicate === true,
        partnerId: body.partnerId,
      });
      json(res, 200, { ok: true, manifest, savedSummary: await readSavedSummary(), savePolicy });
    } catch (error) {
      if (error.code === "DUPLICATE_SAVED_URL") {
        json(res, 409, {
          ok: false,
          duplicate: true,
          canOverwrite: true,
          error: error.message,
          duplicateInfo: error.duplicate,
        });
        return;
      }
      if (error.code === "NO_READY_RECORDS") {
        json(res, 422, {
          ok: false,
          error: error.message,
          savePolicy: error.savePolicy,
        });
        return;
      }
      throw error;
    }
    return;
  }

  json(res, 404, { error: "Not found" });
}

const server = createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    handleApi(req, res).catch((error) => json(res, 500, { error: error.message }));
    return;
  }
  serveStatic(req, res).catch((error) => {
    res.writeHead(500);
    res.end(error.message);
  });
});

server.listen(port, () => {
  console.log(`Hotel importer UI: http://localhost:${port}`);
});
