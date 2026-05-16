import { Router } from "express";
import crypto from "crypto";
import { pool } from "../db.js";
import logger from "../utils/logger.js";
import config from "../utils/config.js";
import { AppError } from "../utils/errors.js";
import { clampInt, normalizeText } from "../utils/helpers.js";
import { requireAdmin, requireAuth, requirePartner } from "./auth.js";
import { createNotification, notifyAdmins } from "../utils/notifications.js";

const router = Router();

function requireCustomer(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.session?.role !== "customer") return res.status(403).json({ error: "Chi danh cho khach hang" });
    next();
  });
}

// ===== Cache trong RAM cho dich vu dia diem ben thu ba =====
const placesCache = new Map(); // key -> { val, exp }
const PLACES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 gio
const PLACES_CACHE_MAX = 500;
function placesCacheGet(key) {
  const entry = placesCache.get(key);
  if (!entry) return null;
  if (entry.exp < Date.now()) { placesCache.delete(key); return null; }
  return entry.val;
}
function placesCacheSet(key, val) {
  placesCache.set(key, { val, exp: Date.now() + PLACES_CACHE_TTL_MS });
  if (placesCache.size > PLACES_CACHE_MAX) {
    const firstKey = placesCache.keys().next().value;
    if (firstKey !== undefined) placesCache.delete(firstKey);
  }
}

// User-Agent dat theo TOS Nominatim (yeu cau xac dinh ung dung)
const PLACES_USER_AGENT = config.PLACES_USER_AGENT
  || "VietnamHotelBookingApp/1.0 (admin@local)";

router.get("/places/search", async (req, res, next) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.json({ results: [] });
  if (q.length > 200) return res.status(400).json({ error: "Tu khoa qua dai" });

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = placesCacheGet(cacheKey);
  if (cached) return res.json({ results: cached });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&accept-language=vi&countrycodes=vn&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, { headers: { "User-Agent": PLACES_USER_AGENT } });
    if (!response.ok) return res.status(502).json({ error: "Khong goi duoc dich vu tim dia diem" });
    const data = await response.json();
    const results = (Array.isArray(data) ? data : []).map((item) => ({
      name: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
    })).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
    placesCacheSet(cacheKey, results);
    res.json({ results });
  } catch (e) {
    logger.warn({ err: e, q }, "[places/search] Lỗi gọi Nominatim");
    res.status(502).json({ error: "Không gọi được dịch vụ tìm địa điểm" });
  }
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const CAT_FILTERS = {
  tourism: [
    '["tourism"~"attraction|museum|viewpoint|theme_park|zoo|aquarium"]',
    '["historic"~"monument|memorial|ruins|castle|fort|archaeological_site"]',
    '["amenity"="place_of_worship"]',
    '["leisure"~"park|garden|nature_reserve"]',
  ],
  restaurant: ['["amenity"="restaurant"]'],
  cafe: ['["amenity"="cafe"]'],
  hospital: ['["amenity"="hospital"]', '["amenity"="clinic"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  bank: ['["amenity"="bank"]'],
  atm: ['["amenity"="atm"]'],
  bus_station: ['["amenity"~"bus_station|bus_stop"]'],
  fuel: ['["amenity"="fuel"]'],
  cinema: ['["amenity"="cinema"]'],
  marketplace: ['["amenity"="marketplace"]'],
  school: ['["amenity"~"school|university|college"]'],
  mall: ['["shop"~"mall|department_store"]'],
  supermarket: ['["shop"="supermarket"]'],
  convenience: ['["shop"="convenience"]'],
  railway: ['["railway"~"station|halt|subway_entrance"]'],
  airport: ['["aeroway"~"aerodrome|terminal"]'],
};

const CAT_LABELS = {
  tourism: "Du lich",
  restaurant: "Nha hang",
  cafe: "Ca phe",
  hospital: "Y te",
  pharmacy: "Nha thuoc",
  bank: "Ngan hang",
  atm: "ATM",
  bus_station: "Ben xe",
  fuel: "Cay xang",
  cinema: "Rap phim",
  marketplace: "Cho",
  school: "Truong hoc",
  mall: "TTTM",
  supermarket: "Sieu thi",
  convenience: "Tien loi",
  railway: "Ga tau",
  airport: "San bay",
};

const NO_NAME_RE = /^(unnamed|noname|no name|n\/a|\?)$/i;

function hasMeaningfulName(name) {
  return !!String(name || "").trim() && !NO_NAME_RE.test(String(name).trim());
}

function detectNearbyCategory(tags = {}) {
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "hospital" || tags.amenity === "clinic") return "hospital";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (tags.amenity === "bank") return "bank";
  if (tags.amenity === "atm") return "atm";
  if (tags.amenity === "bus_station" || tags.amenity === "bus_stop") return "bus_station";
  if (tags.amenity === "fuel") return "fuel";
  if (tags.amenity === "cinema") return "cinema";
  if (tags.amenity === "marketplace") return "marketplace";
  if (["school", "university", "college"].includes(tags.amenity)) return "school";
  if (tags.shop === "supermarket") return "supermarket";
  if (["mall", "department_store"].includes(tags.shop)) return "mall";
  if (tags.shop === "convenience") return "convenience";
  if (tags.railway) return "railway";
  if (tags.aeroway) return "airport";
  if (
    tags.tourism
    || tags.historic
    || tags.amenity === "place_of_worship"
    || ["park", "garden", "nature_reserve"].includes(tags.leisure)
  ) return "tourism";
  return null;
}

function buildNearbyQuery(lat, lon, radius, cats) {
  const activeCats = cats.length ? cats : Object.keys(CAT_FILTERS);
  const statements = activeCats
    .flatMap((cat) => (CAT_FILTERS[cat] || []).flatMap((filter) => (
      ["node", "way", "relation"].map((kind) => `${kind}${filter}(around:${radius},${lat},${lon});`)
    )))
    .join("\n");
  return `[out:json][timeout:25];\n(\n${statements}\n);\nout center tags;`;
}

async function fetchNearbyPlaces(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const data = await Promise.any(
      OVERPASS_ENDPOINTS.map(async (endpoint) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain", "User-Agent": PLACES_USER_AGENT },
          body: query,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Overpass ${response.status}`);
        return response.json();
      })
    );
    controller.abort();
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

router.get("/places/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const radius = Math.min(Math.max(Number(req.query.radius) || 1500, 100), 5000);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: "lat/lon khong hop le" });
  }

  const cats = String(req.query.cats || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => CAT_FILTERS[item]);

  const cacheKey = `nearby:${lat.toFixed(5)}:${lon.toFixed(5)}:${radius}:${cats.sort().join(",")}`;
  const cached = placesCacheGet(cacheKey);
  if (cached) return res.json({ results: cached });

  try {
    const data = await fetchNearbyPlaces(buildNearbyQuery(lat, lon, radius, cats));
    if (!data?.elements) {
      return res.status(502).json({ error: "Khong goi duoc dich vu dia diem gan" });
    }

    const seen = new Set();
    const results = (data.elements || [])
      .map((element) => {
        const tags = element.tags || {};
        const pointLat = element.type === "node" ? Number(element.lat) : Number(element.center?.lat);
        const pointLon = element.type === "node" ? Number(element.lon) : Number(element.center?.lon);
        const name = tags["name:vi"] || tags.name || tags["name:en"] || "";
        const category = detectNearbyCategory(tags);
        if (!Number.isFinite(pointLat) || !Number.isFinite(pointLon) || !hasMeaningfulName(name) || !category) {
          return null;
        }

        const dedupeKey = `${name}|${pointLat.toFixed(5)}|${pointLon.toFixed(5)}`;
        if (seen.has(dedupeKey)) return null;
        seen.add(dedupeKey);

        return {
          name,
          type: CAT_LABELS[category] || category,
          distanceM: Math.round(haversine(lat, lon, pointLat, pointLon)),
          lat: pointLat,
          lon: pointLon,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 50);

    placesCacheSet(cacheKey, results);
    res.json({ results });
  } catch (e) {
    logger.warn({ err: e, lat, lon }, "[places/nearby] Lỗi gọi Overpass");
    res.status(502).json({ error: "Không gọi được dịch vụ địa điểm gần" });
  }
});

function parseJsonValue(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}



const REQUIRED_IMAGE_CATEGORY_LABELS = {
  hotel_front: "mat tien khach san",
  lobby: "sanh / le tan",
  room_overview: "phong mau",
  common_area: "khu vuc chung",
  exterior: "khuon vien / ngoai canh",
};

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on", "co"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "khong"].includes(normalized)) return false;
  return fallback;
}

function normalizeTimeValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  return text;
}

function formatTimeValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, 5);
}



async function getPartnerProfileId(userId, conn = pool) {
  const [rows] = await conn.query("SELECT id FROM partner_profiles WHERE user_id=? LIMIT 1", [userId]);
  return rows[0]?.id || null;
}

async function getPendingChangeRequestByProperty(propertyId, conn = pool, lock = false) {
  const [rows] = await conn.query(
    `SELECT *
       FROM property_change_requests
      WHERE property_id=? AND status='pending'
      ORDER BY created_at DESC, id DESC
      LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [propertyId]
  );
  return rows[0] || null;
}

async function getPropertyForPartner(propertyId, userId, conn = pool, lock = false) {
  const [rows] = await conn.query(
    `SELECT p.*,
            pp.user_id AS partner_user_id,
            pp.business_name AS partner_hotel_name,
            u.email AS partner_email
       FROM properties p
       JOIN partner_profiles pp ON pp.id = p.partner_id
       JOIN users u ON u.id = pp.user_id
      WHERE p.id=? AND pp.user_id=?
      LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [propertyId, userId]
  );
  return rows[0] || null;
}

async function getPropertyWithPartner(propertyId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT p.*,
            pp.user_id AS partner_user_id,
            pp.business_name AS partner_hotel_name,
            u.email AS partner_email
       FROM properties p
       JOIN partner_profiles pp ON pp.id = p.partner_id
       JOIN users u ON u.id = pp.user_id
      WHERE p.id=?
      LIMIT 1`,
    [propertyId]
  );
  return rows[0] || null;
}

function slugifyBase(name) {
  return String(name).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 240) || "property";
}
function makeSlug(name) {
  return `${slugifyBase(name)}-${crypto.randomBytes(4).toString("hex")}`;
}

function inferCityFromAddress(address) {
  const parts = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ignored = new Set(["vietnam", "viet nam"]);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const normalized = parts[i].toLowerCase();
    if (!ignored.has(normalized) && !/^\d+$/.test(parts[i])) return parts[i];
  }
  return "";
}

function normalizeRoomPayload(body) {
  const policyInput = body?.policy ?? {};
  const payload = {
    name: String(body?.name || "").trim(),
    description: normalizeText(body?.description),
    roomType: String(body?.roomType || "").trim(),
    area: body?.area === undefined || body?.area === null || body?.area === "" ? null : Number(body.area),
    capacity: Number(body?.capacity ?? 2),
    address: String(body?.address || "").trim(),
    city: String(body?.city || "").trim(),
    latitude: Number(body?.latitude),
    longitude: Number(body?.longitude),
    amenities: Array.isArray(body?.amenities)
      ? [...new Set(body.amenities.map((item) => String(item || "").trim()).filter(Boolean))]
      : [],
    nearbyPlaces: Array.isArray(body?.nearbyPlaces)
      ? body.nearbyPlaces
        .map((item) => ({
          name: String(item?.name || "").trim(),
          type: String(item?.type || "place").trim() || "place",
          distanceM: Number(item?.distanceM) || 0,
          lat: Number(item?.lat) || 0,
          lon: Number(item?.lon) || 0,
        }))
        .filter((item) => item.name)
      : [],
    prices: Array.isArray(body?.prices)
      ? body.prices
        .map((item) => {
          const imageUrls = Array.isArray(item?.imageUrls)
            ? item.imageUrls.map((url) => String(url || "").trim()).filter(Boolean)
            : (typeof item?.imageUrl === "string" && item.imageUrl.trim()
              ? [item.imageUrl.trim()] : []);
          const cap = Number(item?.capacity);
          const ar = item?.area === undefined || item?.area === null || item?.area === ""
            ? null : Number(item.area);
          return {
            label: String(item?.label || "").trim(),
            pricePerNight: Number(item?.pricePerNight),
            area: Number.isFinite(ar) && ar >= 0 ? ar : null,
            capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
            bedInfo: normalizeText(item?.bedInfo),
            amenities: normalizeText(item?.amenities),
            imageUrls,
          };
        })
        .filter((item) => item.label && Number.isFinite(item.pricePerNight) && item.pricePerNight > 0)
      : [],
    images: Array.isArray(body?.images)
      ? body.images
        .map((item) => ({
          category: String(item?.category || "").trim(),
          url: String(item?.url || "").trim(),
          caption: normalizeText(item?.caption),
        }))
        .filter((item) => item.category && item.url)
      : [],
    policy: {
      checkInTime: normalizeTimeValue(policyInput.checkInTime),
      checkOutTime: normalizeTimeValue(policyInput.checkOutTime),
      childrenFreeAge: policyInput.childrenFreeAge === undefined
        || policyInput.childrenFreeAge === null
        || policyInput.childrenFreeAge === ""
        ? null
        : Number(policyInput.childrenFreeAge),
      refundable: normalizeBoolean(policyInput.refundable, true),
      freeCancelHours: policyInput.freeCancelHours === undefined
        || policyInput.freeCancelHours === null
        || policyInput.freeCancelHours === ""
        ? null
        : Number(policyInput.freeCancelHours),
      cancellationNote: normalizeText(policyInput.cancellationNote),
      petAllowed: normalizeBoolean(policyInput.petAllowed, false),
      smokingAllowed: normalizeBoolean(policyInput.smokingAllowed, false),
      otherRules: normalizeText(policyInput.otherRules),
    },
    highlights: Array.isArray(body?.highlights)
      ? [...new Set(body.highlights.map((item) => String(item || "").trim()).filter(Boolean))]
      : [],
    transportConnections: Array.isArray(body?.transportConnections)
      ? body.transportConnections
        .map((item) => ({
          name: String(item?.name || "").trim(),
          distance: String(item?.distance || "").trim(),
          note: normalizeText(item?.note),
        }))
        .filter((item) => item.name && item.distance)
      : [],
    platformFeePct: Number(body?.platformFeePct ?? 10),
    promotionPct: Number(body?.promotionPct ?? 0),
  };

  if (!payload.name) throw new Error("Thieu truong name");
  if (payload.name.length > 200) throw new Error("Ten qua dai");
  if (!payload.roomType) throw new Error("Thieu truong roomType");
  if (!payload.address) throw new Error("Thieu truong address");
  if (payload.address.length > 500) throw new Error("Dia chi qua dai");
  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    throw new Error("Toa do khong hop le");
  }
  if (!Number.isFinite(payload.capacity) || payload.capacity < 1) {
    throw new Error("Suc chua khong hop le");
  }
  if (payload.area != null && (!Number.isFinite(payload.area) || payload.area < 0)) {
    throw new Error("Dien tich khong hop le");
  }
  if (!payload.prices.length) throw new Error("Vui long nhap it nhat mot muc gia");
  for (const price of payload.prices) {
    if (price.label.length > 64) throw new Error("Ten hang phong qua dai");
    if (price.pricePerNight > 1_000_000_000) throw new Error("Gia mot dem qua lon");
  }
  if (payload.images.length < 5) throw new Error("Vui long cung cap it nhat 5 anh chat luong cao");
  for (const [category, label] of Object.entries(REQUIRED_IMAGE_CATEGORY_LABELS)) {
    if (!payload.images.some((item) => item.category === category)) {
      throw new Error(`Vui long bo sung anh ${label}`);
    }
  }
  if (!/^\d{2}:\d{2}$/.test(payload.policy.checkInTime)) {
    throw new Error("Gio nhan phong khong hop le");
  }
  if (!/^\d{2}:\d{2}$/.test(payload.policy.checkOutTime)) {
    throw new Error("Gio tra phong khong hop le");
  }
  if (
    payload.policy.childrenFreeAge == null
    || !Number.isFinite(payload.policy.childrenFreeAge)
    || payload.policy.childrenFreeAge < 0
  ) {
    throw new Error("Vui long nhap do tuoi tre em duoc o mien phi");
  }
  if (payload.policy.refundable) {
    if (
      payload.policy.freeCancelHours == null
      || !Number.isFinite(payload.policy.freeCancelHours)
      || payload.policy.freeCancelHours < 1
    ) {
      throw new Error("Vui long nhap thoi han huy phong truoc khi duoc hoan tien");
    }
  } else {
    payload.policy.freeCancelHours = null;
  }
  if (!payload.highlights.length) {
    throw new Error("Vui long nhap it nhat mot diem nhan noi bat");
  }
  if (!payload.transportConnections.length) {
    throw new Error("Vui long nhap it nhat mot ket noi giao thong quan trong");
  }
  if (!Number.isFinite(payload.platformFeePct) || payload.platformFeePct < 0 || payload.platformFeePct > 100) {
    throw new Error("Phi nen tang khong hop le");
  }
  if (!Number.isFinite(payload.promotionPct) || payload.promotionPct < 0 || payload.promotionPct > 100) {
    throw new Error("Khuyen mai khong hop le");
  }

  payload.city = payload.city || inferCityFromAddress(payload.address) || "Chua xac dinh";
  return payload;
}

async function replacePricing(conn, propertyId, prices) {
  // Lay danh sach gia hien tai
  const [existing] = await conn.query("SELECT id, label FROM property_pricing WHERE property_id=?", [propertyId]);
  const existingMap = new Map(existing.map((row) => [row.label, row.id]));
  const processedIds = [];

  let sortOrder = 0;
  for (const price of prices) {
    const existingId = existingMap.get(price.label);
    if (existingId) {
      // Cap nhat neu da ton tai trung ten (label)
      await conn.query(
        `UPDATE property_pricing 
            SET price_per_night=?, total_inventory=?, area_sqm=?, capacity=?, bed_info=?, amenities=?, image_urls_json=?, sort_order=?
          WHERE id=?`,
        [
          price.pricePerNight,
          price.totalInventory || 1,
          price.area,
          price.capacity,
          price.bedInfo,
          price.amenities,
          JSON.stringify(price.imageUrls || []),
          sortOrder++,
          existingId
        ]
      );
      processedIds.push(existingId);
    } else {
      // Them moi neu chua co
      const [res] = await conn.query(
        `INSERT INTO property_pricing
         (property_id, label, price_per_night, total_inventory, area_sqm, capacity, bed_info, amenities, image_urls_json, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
        [
          propertyId,
          price.label,
          price.pricePerNight,
          price.totalInventory || 1,
          price.area,
          price.capacity,
          price.bedInfo,
          price.amenities,
          JSON.stringify(price.imageUrls || []),
          sortOrder++,
        ]
      );
      processedIds.push(res.insertId);
    }
  }

  // Xoa nhung hang khong con trong danh sach moi
  if (processedIds.length > 0) {
    await conn.query("DELETE FROM property_pricing WHERE property_id=? AND id NOT IN (?)", [propertyId, processedIds]);
  } else {
    await conn.query("DELETE FROM property_pricing WHERE property_id=?", [propertyId]);
  }
}

async function replaceNearbyPlaces(conn, propertyId, nearbyPlaces) {
  await conn.query("DELETE FROM property_nearby_places WHERE property_id=?", [propertyId]);
  for (const place of nearbyPlaces) {
    await conn.query(
      `INSERT INTO property_nearby_places (property_id, name, category, distance_m, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [propertyId, place.name, place.type, place.distanceM, place.lat, place.lon]
    );
  }
}

async function replaceGalleryImages(conn, propertyId, images) {
  await conn.query("DELETE FROM property_gallery_images WHERE property_id=?", [propertyId]);
  let sortOrder = 0;
  for (const image of images) {
    await conn.query(
      `INSERT INTO property_gallery_images (property_id, category, image_url, caption, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [propertyId, image.category, image.url, image.caption, sortOrder++]
    );
  }
}

async function upsertPropertyPolicy(conn, propertyId, policy) {
  const cancellationType = policy.refundable
    ? (policy.freeCancelHours != null && policy.freeCancelHours >= 24 ? "free" : "flexible")
    : "non_refundable";

  await conn.query(
    `INSERT INTO property_policies
     (property_id, cancellation_type, free_cancel_hours, cancellation_policy_text,
      check_in_from, check_in_until, check_out_until,
      pets_allowed, smoking_allowed, children_allowed, children_free_age, custom_rules)
     VALUES (?, ?, ?, ?, ?, '23:59:00', ?, ?, ?, 1, ?, ?)
     ON DUPLICATE KEY UPDATE
       cancellation_type = VALUES(cancellation_type),
       free_cancel_hours = VALUES(free_cancel_hours),
       cancellation_policy_text = VALUES(cancellation_policy_text),
       check_in_from = VALUES(check_in_from),
       check_in_until = VALUES(check_in_until),
       check_out_until = VALUES(check_out_until),
       pets_allowed = VALUES(pets_allowed),
       smoking_allowed = VALUES(smoking_allowed),
       children_allowed = VALUES(children_allowed),
       children_free_age = VALUES(children_free_age),
       custom_rules = VALUES(custom_rules)`,
    [
      propertyId,
      cancellationType,
      policy.freeCancelHours,
      policy.cancellationNote,
      policy.checkInTime,
      policy.checkOutTime,
      Number(policy.petAllowed),
      Number(policy.smokingAllowed),
      policy.childrenFreeAge,
      policy.otherRules,
    ]
  );
}

async function insertProperty(conn, partnerId, payload) {
  // Slugify retry chong va cham (UNIQUE tren slug)
  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = makeSlug(payload.name);
    try {
      const [result] = await conn.query(
        `INSERT INTO properties
         (partner_id, slug, name, property_type, description, address, city,
          latitude, longitude, area_sqm, capacity,
          amenities_json, highlights_json, transport_connections_json,
          platform_fee_pct, promotion_pct, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?, ?, 'pending_review')`,
        [
          partnerId,
          slug,
          payload.name,
          payload.roomType,
          payload.description,
          payload.address,
          payload.city,
          payload.latitude,
          payload.longitude,
          payload.area,
          payload.capacity,
          JSON.stringify(payload.amenities),
          JSON.stringify(payload.highlights),
          JSON.stringify(payload.transportConnections),
          payload.platformFeePct,
          payload.promotionPct,
        ]
      );
      await replacePricing(conn, result.insertId, payload.prices);
      await replaceNearbyPlaces(conn, result.insertId, payload.nearbyPlaces);
      await replaceGalleryImages(conn, result.insertId, payload.images);
      await upsertPropertyPolicy(conn, result.insertId, payload.policy);
      return result.insertId;
    } catch (e) {
      lastErr = e;
      if (e?.code === "ER_DUP_ENTRY" && /slug/i.test(e?.sqlMessage || "")) continue;
      throw e;
    }
  }
  throw lastErr || new Error("Khong tao duoc khach san");
}

async function updatePropertyFromPayload(conn, propertyId, payload, options = {}) {
  const sets = [
    "name=?",
    "property_type=?",
    "description=?",
    "address=?",
    "city=?",
    "latitude=?",
    "longitude=?",
    "area_sqm=?",
    "capacity=?",
    "amenities_json=CAST(? AS JSON)",
    "highlights_json=CAST(? AS JSON)",
    "transport_connections_json=CAST(? AS JSON)",
    "platform_fee_pct=?",
    "promotion_pct=?",
  ];
  const args = [
    payload.name,
    payload.roomType,
    payload.description,
    payload.address,
    payload.city,
    payload.latitude,
    payload.longitude,
    payload.area,
    payload.capacity,
    JSON.stringify(payload.amenities),
    JSON.stringify(payload.highlights),
    JSON.stringify(payload.transportConnections),
    payload.platformFeePct,
    payload.promotionPct,
  ];

  if (options.status !== undefined) {
    sets.push("status=?");
    args.push(options.status);
  }
  if (options.clearRejectReason) {
    sets.push("reject_reason=NULL");
  }
  if (options.reviewedBy !== undefined) {
    if (options.reviewedBy === null) {
      sets.push("reviewed_by=NULL");
      sets.push("reviewed_at=NULL");
    } else {
      sets.push("reviewed_by=?");
      sets.push("reviewed_at=NOW()");
      args.push(options.reviewedBy);
    }
  }

  args.push(propertyId);
  await conn.query(`UPDATE properties SET ${sets.join(", ")} WHERE id=?`, args);
  await replacePricing(conn, propertyId, payload.prices);
  await replaceNearbyPlaces(conn, propertyId, payload.nearbyPlaces);
  await replaceGalleryImages(conn, propertyId, payload.images);
  await upsertPropertyPolicy(conn, propertyId, payload.policy);
}


function mapChangeRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    action: row.action_type,
    status: row.status,
    note: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    payload: parseJsonValue(row.payload_json, null),
  };
}

async function mapProperty(row, options = {}) {
  const [pricing] = await pool.query(
    `SELECT id, label, price_per_night, total_inventory, area_sqm, capacity, bed_info, amenities, image_urls_json
       FROM property_pricing
      WHERE property_id=?
      ORDER BY sort_order, id`,
    [row.id]
  );
  const [nearby] = await pool.query(
    "SELECT name, category, distance_m, latitude, longitude FROM property_nearby_places WHERE property_id=? ORDER BY distance_m, id",
    [row.id]
  );
  const [images] = await pool.query(
    `SELECT category, image_url, caption
       FROM property_gallery_images
      WHERE property_id=?
      ORDER BY sort_order, id`,
    [row.id]
  );
  const [policyRows] = await pool.query(
    `SELECT check_in_from, check_out_until, children_free_age, cancellation_type,
            free_cancel_hours, cancellation_policy_text, pets_allowed, smoking_allowed, custom_rules
       FROM property_policies
      WHERE property_id=?
      LIMIT 1`,
    [row.id]
  );
  const policyRow = policyRows[0] || null;
  const pendingRequestRow = options.includePendingRequest
    ? await getPendingChangeRequestByProperty(row.id)
    : null;
  const [bookingStatRows] = await pool.query(
    `SELECT
        COUNT(*) AS total_bookings,
        COALESCE(SUM(total_amount), 0) AS gross_revenue,
        COALESCE(SUM(partner_payout_amount), 0) AS partner_revenue,
        SUM(status IN ('confirmed','checked_in')
          AND check_in_date <= CURDATE()
          AND check_out_date > CURDATE()) AS active_booking_count
       FROM bookings
      WHERE property_id=?
        AND status IN ('pending','confirmed','checked_in','checked_out')`,
    [row.id]
  );
  const bookingStats = bookingStatRows[0] || {};

  return {
    id: row.id,
    partnerId: row.partner_id,
    name: row.name,
    description: row.description,
    roomType: row.property_type,
    area: row.area_sqm == null ? null : Number(row.area_sqm),
    capacity: Number(row.capacity ?? 0),
    address: row.address,
    city: row.city,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    amenities: parseJsonValue(row.amenities_json, []) || [],
    highlights: parseJsonValue(row.highlights_json, []) || [],
    transportConnections: parseJsonValue(row.transport_connections_json, []) || [],
    nearbyPlaces: nearby.map((item) => ({
      name: item.name,
      type: item.category,
      distanceM: Number(item.distance_m),
      lat: Number(item.latitude),
      lon: Number(item.longitude),
    })),
    images: images.map((item) => ({
      category: item.category,
      url: item.image_url,
      caption: item.caption,
    })),
    prices: pricing.map((item) => ({
      id: item.id,
      label: item.label,
      pricePerNight: Number(item.price_per_night),
      totalInventory: item.total_inventory == null ? 1 : Number(item.total_inventory),
      area: item.area_sqm == null ? null : Number(item.area_sqm),
      capacity: item.capacity == null ? null : Number(item.capacity),
      bedInfo: item.bed_info || null,
      amenities: item.amenities || null,
      imageUrls: parseJsonValue(item.image_urls_json, []) || [],
    })),
    policy: {
      checkInTime: formatTimeValue(policyRow?.check_in_from || row.check_in_time),
      checkOutTime: formatTimeValue(policyRow?.check_out_until || row.check_out_time),
      childrenFreeAge: policyRow?.children_free_age == null ? null : Number(policyRow.children_free_age),
      refundable: policyRow ? policyRow.cancellation_type !== "non_refundable" : true,
      freeCancelHours: policyRow?.free_cancel_hours == null ? null : Number(policyRow.free_cancel_hours),
      cancellationNote: policyRow?.cancellation_policy_text || null,
      petAllowed: !!policyRow?.pets_allowed,
      smokingAllowed: !!policyRow?.smoking_allowed,
      otherRules: policyRow?.custom_rules || null,
    },
    platformFeePct: Number(row.platform_fee_pct ?? 0),
    promotionPct: Number(row.promotion_pct ?? 0),
    status: row.status === "active" ? "approved"
      : row.status === "pending_review" ? "pending"
        : row.status,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    partnerEmail: row.partner_email || null,
    partnerHotelName: row.partner_hotel_name || null,
    pendingRequest: mapChangeRequest(pendingRequestRow),
    bookingStats: {
      isActiveHotel: row.status === "active",
      hasCurrentGuest: Number(bookingStats.active_booking_count || 0) > 0,
      activeBookingCount: Number(bookingStats.active_booking_count || 0),
      totalBookings: Number(bookingStats.total_bookings || 0),
      grossRevenue: Number(bookingStats.gross_revenue || 0),
      partnerRevenue: Number(bookingStats.partner_revenue || 0),
    },
  };
}

function normalizeDateOnly(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function diffNights(checkIn, checkOut) {
  const inDate = new Date(`${checkIn}T00:00:00Z`);
  const outDate = new Date(`${checkOut}T00:00:00Z`);
  return Math.round((outDate.getTime() - inDate.getTime()) / 86400000);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function listNightDates(checkIn, checkOut) {
  const nights = diffNights(checkIn, checkOut);
  return Array.from({ length: Math.max(0, nights) }, (_item, index) => addDays(checkIn, index));
}

function maxDateText(a, b) {
  return a > b ? a : b;
}

function minDateText(a, b) {
  return a < b ? a : b;
}

function dateOnlyFromDb(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || "").slice(0, 10);
}

function makeBookingCode() {
  return `BK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`.slice(0, 30);
}

function applyFeeConfig(config, baseAmount) {
  if (!config) return 0;
  let amount = config.fee_type === "fixed"
    ? Number(config.fee_value || 0)
    : baseAmount * Number(config.fee_value || 0) / 100;
  if (config.min_fee != null) amount = Math.max(amount, Number(config.min_fee));
  if (config.max_fee != null) amount = Math.min(amount, Number(config.max_fee));
  return Math.round(amount);
}

async function getActiveFeeConfig(kind) {
  const nameFilter = kind === "tax"
    ? "%vat%"
    : "%platform%";
  const altNameFilter = kind === "tax"
    ? "%thue%"
    : "%nen tang%";
  const [rows] = await pool.query(
    `SELECT id, name, fee_type, fee_value, min_fee, max_fee
       FROM platform_fee_configs
      WHERE is_active=1
        AND effective_from <= CURDATE()
        AND (effective_to IS NULL OR effective_to >= CURDATE())
        AND (LOWER(name) LIKE ? OR LOWER(name) LIKE ?)
      ORDER BY effective_from DESC, id DESC
      LIMIT 1`,
    [nameFilter, altNameFilter]
  );
  return rows[0] || null;
}

async function getDailyOverrides(conn, pricingId, checkInDate, checkOutDate) {
  if (!pricingId) return new Map();
  const [rows] = await conn.query(
    `SELECT stay_date, price_per_night, open_inventory, is_closed
       FROM property_pricing_daily_overrides
      WHERE pricing_id=?
        AND stay_date >= ?
        AND stay_date < ?`,
    [pricingId, checkInDate, checkOutDate]
  );
  return new Map(rows.map((row) => [dateOnlyFromDb(row.stay_date), row]));
}

async function getPriceAvailabilityByNight(conn, { propertyId, pricingId = null, priceLabel, checkInDate, checkOutDate, totalInventory, basePricePerNight = null }) {
  const dates = listNightDates(checkInDate, checkOutDate);
  const total = Number(totalInventory || 1);
  const bookedByDate = new Map(dates.map((date) => [date, 0]));
  const overrides = await getDailyOverrides(conn, pricingId, checkInDate, checkOutDate);

  if (dates.length === 0) {
    return { dates: [], minRemaining: total, isAvailable: true, subtotal: 0 };
  }

  const [bookings] = await conn.query(
    `SELECT check_in_date, check_out_date
       FROM bookings
      WHERE property_id=?
        AND price_label=?
        AND (
          status IN ('confirmed', 'checked_in')
          OR (status = 'pending' AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE))
        )
        AND check_in_date < ?
        AND check_out_date > ?`,
    [propertyId, priceLabel, checkOutDate, checkInDate]
  );

  for (const booking of bookings) {
    const overlapStart = maxDateText(dateOnlyFromDb(booking.check_in_date), checkInDate);
    const overlapEnd = minDateText(dateOnlyFromDb(booking.check_out_date), checkOutDate);
    for (const date of listNightDates(overlapStart, overlapEnd)) {
      bookedByDate.set(date, (bookedByDate.get(date) || 0) + 1);
    }
  }

  const availability = dates.map((date) => {
    const override = overrides.get(date);
    const effectiveInventory = override?.is_closed ? 0 : Number(override?.open_inventory ?? total);
    const effectivePrice = Number(override?.price_per_night ?? basePricePerNight ?? 0);
    const booked = bookedByDate.get(date) || 0;
    const remaining = Math.max(0, effectiveInventory - booked);
    return {
      date,
      totalInventory: effectiveInventory,
      booked,
      remaining,
      pricePerNight: effectivePrice,
      isClosed: !!override?.is_closed,
      hasOverride: !!override,
      isSoldOut: remaining <= 0,
    };
  });
  const minRemaining = availability.reduce((min, day) => Math.min(min, day.remaining), total);
  const subtotal = availability.reduce((sum, day) => sum + Number(day.pricePerNight || 0), 0);

  return {
    dates: availability,
    minRemaining,
    subtotal,
    isAvailable: minRemaining > 0,
  };
}

async function quoteBooking(propertyId, priceLabel, checkInDate, checkOutDate, conn = pool, options = {}) {
  const nights = diffNights(checkInDate, checkOutDate);
  if (nights < 1 || nights > 60) throw new Error("Ngay nhan/tra phong khong hop le");

  const [propertyRows] = await conn.query(
    `SELECT id, name, status, platform_fee_pct FROM properties WHERE id=? LIMIT 1${options.lockProperty ? " FOR UPDATE" : ""}`,
    [propertyId]
  );
  const property = propertyRows[0];
  if (!property || property.status !== "active") throw new Error("Khach san khong kha dung");

  const [priceRows] = await conn.query(
    `SELECT id, label, price_per_night, total_inventory
       FROM property_pricing
      WHERE property_id=?
      ORDER BY sort_order, id`,
    [propertyId]
  );
  const selected = priceRows.find((item) => item.label === priceLabel) || priceRows[0];
  if (!selected) throw new Error("Khach san chua co hang phong");

  // Kiem tra tinh trang phong (Availability)
  // Bo qua cac don 'pending' da qua 15 phut (coi nhu khach khong thanh toan)
  const totalInv = Number(selected.total_inventory || 1);
  const [overlapping] = await pool.query(
    `SELECT COUNT(*) AS count
       FROM bookings
      WHERE property_id=?
        AND price_label=?
        AND (
          status IN ('confirmed', 'checked_in')
          OR (status = 'pending' AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE))
        )
        AND check_in_date < ?
        AND check_out_date > ?`,
    [propertyId, selected.label, checkOutDate, checkInDate]
  );
  const bookedCount = Number(overlapping[0].count || 0);
  
  if (false && bookedCount >= totalInv) {
    throw new Error("Hết phòng: Loại phòng này đã được đặt hết trong khoảng thời gian bạn chọn.");
  }

  const availability = await getPriceAvailabilityByNight(conn, {
    propertyId,
    pricingId: selected.id,
    priceLabel: selected.label,
    checkInDate,
    checkOutDate,
    totalInventory: totalInv,
    basePricePerNight: Number(selected.price_per_night),
  });
  if (!availability.isAvailable) {
    throw new Error("Het phong: Loai phong nay khong con du ton kho trong mot hoac nhieu ngay ban chon.");
  }

  const pricePerNight = Number(selected.price_per_night);
  const subtotal = Math.round(availability.subtotal || pricePerNight * nights);
  const taxConfig = await getActiveFeeConfig("tax");
  const platformConfig = await getActiveFeeConfig("platform");
  const taxAmount = 0; // Thue da bao gom trong gia phong
  const platformFeeAmount = platformConfig
    ? applyFeeConfig(platformConfig, subtotal)
    : Math.round(subtotal * Number(property.platform_fee_pct || 0) / 100);
  
  // Tong tien khach tra dung bang gia phong hien thi
  const total = subtotal; 

  return {
    property,
    price: selected,
    nights,
    pricePerNight,
    subtotal,
    taxAmount,
    platformFeeAmount,
    total,
    taxConfig,
    platformConfig,
    isAvailable: true,
    remainingRooms: availability.minRemaining,
    dailyAvailability: availability.dates,
  };
}

router.get("/public/rooms", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const star = String(req.query.star || "").trim();
    const minPrice = Number(req.query.minPrice || 0);
    const maxPrice = Number(req.query.maxPrice || 0);
    const limit = clampInt(req.query.limit, 24, 1, 100);

    const [rows] = await pool.query(
      `SELECT p.*, u.email AS partner_email, pp.business_name AS partner_hotel_name
         FROM properties p
         LEFT JOIN partner_profiles pp ON pp.id = p.partner_id
         LEFT JOIN users u ON u.id = pp.user_id
        WHERE p.status='active'
        ORDER BY p.reviewed_at DESC, p.created_at DESC
        LIMIT ?`,
      [limit]
    );
    let rooms = await Promise.all(rows.map((row) => mapProperty(row)));

    if (q) {
      rooms = rooms.filter((room) => [room.name, room.address, room.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)));
    }
    if (star) rooms = rooms.filter((room) => room.roomType === star);
    if (Number.isFinite(minPrice) && minPrice > 0) {
      rooms = rooms.filter((room) => room.prices.some((price) => price.pricePerNight >= minPrice));
    }
    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      rooms = rooms.filter((room) => room.prices.some((price) => price.pricePerNight <= maxPrice));
    }

    res.json({ rooms });
  } catch (e) { next(e); }
});

router.get("/public/rooms/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });
  
  const checkIn = normalizeDateOnly(req.query.checkIn);
  const checkOut = normalizeDateOnly(req.query.checkOut);

  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.email AS partner_email, pp.business_name AS partner_hotel_name
         FROM properties p
         LEFT JOIN partner_profiles pp ON pp.id = p.partner_id
         LEFT JOIN users u ON u.id = pp.user_id
        WHERE p.id=? AND p.status='active'
        LIMIT 1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Khong tim thay khach san" });
    
    const room = await mapProperty(rows[0]);

    // Neu co ngay nhan/tra phong, kiem tra tung hang phong
    if (checkIn && checkOut && diffNights(checkIn, checkOut) >= 1) {
      for (const price of room.prices) {
        const availability = await getPriceAvailabilityByNight(pool, {
          propertyId: id,
          pricingId: price.id,
          priceLabel: price.label,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          totalInventory: price.totalInventory || 1,
          basePricePerNight: price.pricePerNight,
        });
        price.isAvailable = availability.isAvailable;
        price.remainingRooms = availability.minRemaining;
        price.dailyAvailability = availability.dates;
      }
    }

    res.json({ room });
  } catch (e) { next(e); }
});

router.post("/bookings/quote", async (req, res) => {
  const propertyId = Number(req.body?.propertyId);
  const checkInDate = normalizeDateOnly(req.body?.checkInDate);
  const checkOutDate = normalizeDateOnly(req.body?.checkOutDate);
  const priceLabel = String(req.body?.priceLabel || "").trim();
  if (!propertyId || !checkInDate || !checkOutDate) {
    return res.status(400).json({ error: "Thieu thong tin tinh gia" });
  }
  try {
    const quote = await quoteBooking(propertyId, priceLabel, checkInDate, checkOutDate);
    res.json({ quote: {
      nights: quote.nights,
      priceLabel: quote.price.label,
      pricePerNight: quote.pricePerNight,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      platformFeeAmount: quote.platformFeeAmount,
      total: quote.total,
      remainingRooms: quote.remainingRooms,
      dailyAvailability: quote.dailyAvailability,
    } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/bookings", requireCustomer, async (req, res, next) => {
  const propertyId = Number(req.body?.propertyId);
  const checkInDate = normalizeDateOnly(req.body?.checkInDate);
  const checkOutDate = normalizeDateOnly(req.body?.checkOutDate);
  const priceLabel = String(req.body?.priceLabel || "").trim();
  const guestName = String(req.body?.guestName || "").trim();
  const guestPhone = String(req.body?.guestPhone || "").trim();
  const adults = clampInt(req.body?.adults, 1, 1, 20);
  const children = clampInt(req.body?.children, 0, 0, 20);
  const specialRequests = normalizeText(req.body?.specialRequests);
  const bookingNote = [`So dien thoai khach: ${guestPhone}`, specialRequests].filter(Boolean).join("\n");

  const paymentMethod = req.body?.paymentMethod || "hotel";
  const initialStatus = paymentMethod === "online" ? "pending" : "confirmed";

  if (!propertyId || !checkInDate || !checkOutDate || !guestName || !guestPhone) {
    return res.status(400).json({ error: "Vui long nhap du thong tin dat phong" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Re-check availability inside the transaction while locking the property row.
    // This serializes bookings for the same property and prevents overbooking.
    const quote = await quoteBooking(propertyId, priceLabel, checkInDate, checkOutDate, conn, { lockProperty: true });

    const bookingCode = makeBookingCode();
    const [insert] = await conn.query(
    `INSERT INTO bookings
       (booking_code, customer_id, property_id, price_label, check_in_date, check_out_date, num_nights,
        num_adults, num_children, subtotal_amount, tax_amount, total_amount,
        platform_fee_amount, partner_payout_amount, payment_status, status, source_channel,
        special_requests)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, 'web', ?)`,
      [
        bookingCode,
        req.session.userId,
        propertyId,
        quote.price.label,
        checkInDate,
        checkOutDate,
        quote.nights,
        adults,
        children,
        quote.subtotal,
        quote.taxAmount,
        quote.total,
        quote.platformFeeAmount,
        quote.subtotal - quote.platformFeeAmount,
        initialStatus,
        bookingNote,
      ]
    );
    await conn.query(
      "INSERT INTO booking_guests (booking_id, full_name, is_primary) VALUES (?, ?, 1)",
      [insert.insertId, guestName]
    );
    await conn.query(
      `UPDATE customer_profiles
          SET total_bookings = total_bookings + 1
        WHERE user_id=?`,
      [req.session.userId]
    );
    await conn.commit();
    res.json({
      booking: {
        id: insert.insertId,
        bookingCode,
        propertyId,
        propertyName: quote.property.name,
        status: initialStatus,
        paymentStatus: "unpaid",
        checkInDate,
        checkOutDate,
        total: quote.total,
      },
    });
  } catch (error) {
    await conn.rollback();
    if (error?.message) return res.status(400).json({ error: error.message });
    next(error);
  } finally {
    conn.release();
  }
});

router.get("/bookings/mine", requireCustomer, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.booking_code, b.property_id, b.check_in_date, b.check_out_date,
              b.num_nights, b.num_adults, b.num_children, b.total_amount,
              b.status, b.payment_status, b.created_at, p.name AS property_name,
              p.city, p.address,
              ppol.check_in_from, ppol.check_out_until
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
         LEFT JOIN property_policies ppol ON ppol.property_id = p.id
        WHERE b.customer_id=?
        ORDER BY b.created_at DESC`,
      [req.session.userId]
    );
    res.json({
      bookings: rows.map((row) => ({
        id: row.id,
        bookingCode: row.booking_code,
        propertyId: row.property_id,
        priceLabel: row.price_label,
        propertyName: row.property_name,
        city: row.city,
        address: row.address,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        nights: Number(row.num_nights),
        adults: Number(row.num_adults),
        children: Number(row.num_children),
        total: Number(row.total_amount),
        status: row.status,
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
        checkInTime: formatTimeValue(row.check_in_from),
        checkOutTime: formatTimeValue(row.check_out_until),
      })),
    });
  } catch (e) { next(e); }
});

router.post("/bookings/:id/cancel", requireCustomer, async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || "Khach hang huy tren web").trim().slice(0, 1000);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });
  try {
    const [result] = await pool.query(
      `UPDATE bookings
          SET status='cancelled', cancellation_reason=?, cancelled_by=?, cancelled_at=NOW()
        WHERE id=? AND customer_id=? AND status IN ('pending','confirmed')`,
      [reason, req.session.userId, id, req.session.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Khong tim thay booking co the huy" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/partner/availability", requirePartner, async (req, res, next) => {
  const propertyId = Number(req.query.propertyId);
  const from = normalizeDateOnly(req.query.from) || new Date().toISOString().slice(0, 10);
  const to = normalizeDateOnly(req.query.to) || addDays(from, 30);
  const nights = diffNights(from, to);

  if (!propertyId) return res.status(400).json({ error: "Thieu khach san" });
  if (nights < 1 || nights > 90) return res.status(400).json({ error: "Khoang ngay phai tu 1 den 90 dem" });

  try {
    const property = await getPropertyForPartner(propertyId, req.session.userId);
    if (!property) return res.status(404).json({ error: "Khong tim thay khach san" });

    const [prices] = await pool.query(
      `SELECT id, label, price_per_night, total_inventory
         FROM property_pricing
        WHERE property_id=?
        ORDER BY sort_order, id`,
      [propertyId]
    );

    const availability = [];
    for (const price of prices) {
      const daily = await getPriceAvailabilityByNight(pool, {
        propertyId,
        pricingId: price.id,
        priceLabel: price.label,
        checkInDate: from,
        checkOutDate: to,
        totalInventory: price.total_inventory || 1,
        basePricePerNight: Number(price.price_per_night || 0),
      });
      availability.push({
        priceId: price.id,
        label: price.label,
        pricePerNight: Number(price.price_per_night || 0),
        totalInventory: Number(price.total_inventory || 1),
        minRemaining: daily.minRemaining,
        isAvailable: daily.isAvailable,
        days: daily.dates,
      });
    }

    res.json({
      property: { id: property.id, name: property.name },
      from,
      to,
      prices: availability,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/partner/availability", requirePartner, async (req, res, next) => {
  const propertyId = Number(req.body?.propertyId);
  const priceId = Number(req.body?.priceId);
  const date = normalizeDateOnly(req.body?.date);
  const pricePerNightRaw = req.body?.pricePerNight;
  const openInventoryRaw = req.body?.openInventory;
  const isClosed = !!req.body?.isClosed;
  const reset = !!req.body?.reset;

  if (!propertyId || !priceId || !date) {
    return res.status(400).json({ error: "Thieu thong tin cap nhat ton kho" });
  }

  const pricePerNight = pricePerNightRaw === null || pricePerNightRaw === "" || pricePerNightRaw === undefined
    ? null
    : Number(pricePerNightRaw);
  const openInventory = openInventoryRaw === null || openInventoryRaw === "" || openInventoryRaw === undefined
    ? null
    : Number(openInventoryRaw);

  if (pricePerNight != null && (!Number.isFinite(pricePerNight) || pricePerNight <= 0 || pricePerNight > 1_000_000_000)) {
    return res.status(400).json({ error: "Gia khong hop le" });
  }
  if (openInventory != null && (!Number.isInteger(openInventory) || openInventory < 0 || openInventory > 10000)) {
    return res.status(400).json({ error: "So phong mo ban khong hop le" });
  }

  try {
    const property = await getPropertyForPartner(propertyId, req.session.userId);
    if (!property) return res.status(404).json({ error: "Khong tim thay khach san" });

    const [priceRows] = await pool.query(
      "SELECT id, property_id, label FROM property_pricing WHERE id=? AND property_id=? LIMIT 1",
      [priceId, propertyId]
    );
    const price = priceRows[0];
    if (!price) return res.status(404).json({ error: "Khong tim thay loai phong" });

    if (reset) {
      await pool.query(
        "DELETE FROM property_pricing_daily_overrides WHERE pricing_id=? AND stay_date=?",
        [priceId, date]
      );
      return res.json({ ok: true, reset: true });
    }

    if (openInventory != null) {
      const daily = await getPriceAvailabilityByNight(pool, {
        propertyId,
        pricingId: priceId,
        priceLabel: price.label,
        checkInDate: date,
        checkOutDate: addDays(date, 1),
        totalInventory: 10000,
      });
      const booked = Number(daily.dates[0]?.booked || 0);
      if (openInventory < booked) {
        return res.status(400).json({ error: `Ngay nay da co ${booked} phong duoc dat, khong the mo ban thap hon so do` });
      }
    }

    await pool.query(
      `INSERT INTO property_pricing_daily_overrides
        (property_id, pricing_id, stay_date, price_per_night, open_inventory, is_closed, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        price_per_night=VALUES(price_per_night),
        open_inventory=VALUES(open_inventory),
        is_closed=VALUES(is_closed),
        updated_by=VALUES(updated_by)`,
      [propertyId, priceId, date, pricePerNight, openInventory, isClosed ? 1 : 0, req.session.userId]
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/partner/availability/bulk", requirePartner, async (req, res, next) => {
  const propertyId = Number(req.body?.propertyId);
  const priceId = Number(req.body?.priceId);
  const from = normalizeDateOnly(req.body?.from);
  const to = normalizeDateOnly(req.body?.to);
  const pricePerNightRaw = req.body?.pricePerNight;
  const openInventoryRaw = req.body?.openInventory;
  const isClosed = !!req.body?.isClosed;
  const skipBookedDays = !!req.body?.skipBookedDays;
  const applyForever = !!req.body?.applyForever;
  const reset = !!req.body?.reset;
  const effectiveTo = applyForever ? addDays(from, 365) : to;
  const nights = diffNights(from, effectiveTo);

  if (!propertyId || !priceId || !from || (!applyForever && !to)) {
    return res.status(400).json({ error: "Thieu thong tin cap nhat hang loat" });
  }
  if (nights < 1 || nights > (applyForever ? 365 : 180)) {
    return res.status(400).json({ error: applyForever ? "Khoang ap dung toi da 365 ngay" : "Khoang ngay phai tu 1 den 180 dem" });
  }

  const pricePerNight = pricePerNightRaw === null || pricePerNightRaw === "" || pricePerNightRaw === undefined
    ? null
    : Number(pricePerNightRaw);
  const openInventory = openInventoryRaw === null || openInventoryRaw === "" || openInventoryRaw === undefined
    ? null
    : Number(openInventoryRaw);

  if (pricePerNight != null && (!Number.isFinite(pricePerNight) || pricePerNight <= 0 || pricePerNight > 1_000_000_000)) {
    return res.status(400).json({ error: "Gia khong hop le" });
  }
  if (openInventory != null && (!Number.isInteger(openInventory) || openInventory < 0 || openInventory > 10000)) {
    return res.status(400).json({ error: "So phong mo ban khong hop le" });
  }
  if (!reset && pricePerNight == null && openInventory == null && !isClosed) {
    return res.status(400).json({ error: "Chua co noi dung can cap nhat" });
  }

  try {
    const property = await getPropertyForPartner(propertyId, req.session.userId);
    if (!property) return res.status(404).json({ error: "Khong tim thay khach san" });

    const [priceRows] = await pool.query(
      "SELECT id, property_id, label FROM property_pricing WHERE id=? AND property_id=? LIMIT 1",
      [priceId, propertyId]
    );
    const price = priceRows[0];
    if (!price) return res.status(404).json({ error: "Khong tim thay loai phong" });

    if (reset) {
      await pool.query(
        "DELETE FROM property_pricing_daily_overrides WHERE pricing_id=? AND stay_date >= ? AND stay_date < ?",
        [priceId, from, effectiveTo]
      );
      return res.json({ ok: true, reset: true, updated: nights, skipped: [] });
    }

    if (applyForever && !isClosed) {
      const sets = [];
      const args = [];
      if (pricePerNight != null) {
        sets.push("price_per_night=?");
        args.push(pricePerNight);
      }
      if (openInventory != null) {
        sets.push("total_inventory=?");
        args.push(openInventory);
      }
      if (!sets.length) return res.status(400).json({ error: "Chua co noi dung can cap nhat" });
      args.push(priceId, propertyId);
      await pool.query(
        `UPDATE property_pricing SET ${sets.join(", ")} WHERE id=? AND property_id=?`,
        args
      );
      await pool.query(
        "DELETE FROM property_pricing_daily_overrides WHERE pricing_id=? AND stay_date >= ?",
        [priceId, from]
      );
      return res.json({ ok: true, updatedDefault: true, updated: 0, skipped: [] });
    }

    const daily = await getPriceAvailabilityByNight(pool, {
      propertyId,
      pricingId: priceId,
      priceLabel: price.label,
      checkInDate: from,
      checkOutDate: effectiveTo,
      totalInventory: 10000,
    });

    const blockedDays = daily.dates.filter((day) => openInventory != null && openInventory < day.booked);
    if (blockedDays.length && !skipBookedDays) {
      return res.status(400).json({
        error: `Co ${blockedDays.length} ngay da co booking vuot qua so phong mo ban moi`,
        blockedDays: blockedDays.map((day) => ({ date: day.date, booked: day.booked })),
      });
    }

    const dates = listNightDates(from, effectiveTo);
    const skipped = new Set(blockedDays.map((day) => day.date));
    let updated = 0;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const date of dates) {
        if (skipped.has(date)) continue;
        await conn.query(
          `INSERT INTO property_pricing_daily_overrides
            (property_id, pricing_id, stay_date, price_per_night, open_inventory, is_closed, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            price_per_night=VALUES(price_per_night),
            open_inventory=VALUES(open_inventory),
            is_closed=VALUES(is_closed),
            updated_by=VALUES(updated_by)`,
          [propertyId, priceId, date, pricePerNight, openInventory, isClosed ? 1 : 0, req.session.userId]
        );
        updated += 1;
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    res.json({
      ok: true,
      updated,
      skipped: blockedDays.map((day) => ({ date: day.date, booked: day.booked })),
    });
  } catch (error) {
    next(error);
  }
});

async function updatePartnerBookingStatus(req, res, next, { nextStatus, allowedStatuses, label }) {
  const bookingId = Number(req.params.id);
  if (Number.isNaN(bookingId)) return res.status(400).json({ error: "ID khong hop le" });

  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.status, b.property_id, p.name AS property_name
         FROM bookings b
         JOIN properties p ON p.id = b.property_id
         JOIN partner_profiles pp ON pp.id = p.partner_id
        WHERE b.id=? AND pp.user_id=?
        LIMIT 1`,
      [bookingId, req.session.userId]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: "Khong tim thay booking" });
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(409).json({ error: `Khong the ${label} booking o trang thai hien tai` });
    }

    await pool.query(
      "UPDATE bookings SET status=? WHERE id=?",
      [nextStatus, bookingId]
    );

    res.json({ ok: true, booking: { id: bookingId, status: nextStatus } });
  } catch (error) {
    next(error);
  }
}

router.post("/partner/bookings/:id/check-in", requirePartner, (req, res, next) => {
  updatePartnerBookingStatus(req, res, next, {
    nextStatus: "checked_in",
    allowedStatuses: ["confirmed"],
    label: "check-in",
  });
});

router.post("/partner/bookings/:id/check-out", requirePartner, (req, res, next) => {
  updatePartnerBookingStatus(req, res, next, {
    nextStatus: "checked_out",
    allowedStatuses: ["checked_in"],
    label: "check-out",
  });
});

router.post("/partner/bookings/:id/no-show", requirePartner, (req, res, next) => {
  updatePartnerBookingStatus(req, res, next, {
    nextStatus: "no_show",
    allowedStatuses: ["pending", "confirmed"],
    label: "bao no-show",
  });
});

function mapBookingReportRow(row) {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    priceLabel: row.price_label,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    nights: Number(row.num_nights || 0),
    adults: Number(row.num_adults || 0),
    children: Number(row.num_children || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal_amount || 0),
    total: Number(row.total_amount || 0),
    platformFee: Number(row.platform_fee_amount || 0),
    partnerPayout: Number(row.partner_payout_amount || 0),
    createdAt: row.created_at,
    specialRequests: row.special_requests,
    isCompleted: !!row.is_completed,
    isCurrentStay: !!row.is_current_stay,
    isFutureStay: !!row.is_future_stay,
    checkInTime: formatTimeValue(row.check_in_from),
    checkOutTime: formatTimeValue(row.check_out_until),
  };
}

async function getBookingReportRooms({ partnerUserId = null } = {}) {
  const args = [];
  let partnerJoinWhere = "";
  if (partnerUserId) {
    partnerJoinWhere = "AND pp.user_id=?";
    args.push(partnerUserId);
  }

  const [propertyRows] = await pool.query(
    `SELECT p.id, p.name, p.city, p.address, p.status,
            pp.business_name AS partner_hotel_name,
            u.email AS partner_email
       FROM properties p
       JOIN partner_profiles pp ON pp.id = p.partner_id
       JOIN users u ON u.id = pp.user_id
      WHERE 1=1 ${partnerJoinWhere}
      ORDER BY p.created_at DESC`,
    args
  );

  const reports = [];
  for (const property of propertyRows) {
    const [bookingRows] = await pool.query(
      `SELECT b.*,
              cu.full_name AS customer_name,
              cu.email AS customer_email,
              cu.phone AS customer_phone,
              ppol.check_in_from, ppol.check_out_until,
              (b.status IN ('checked_out') OR (b.status IN ('confirmed','checked_in') AND b.check_out_date <= CURDATE())) AS is_completed,
              (b.status IN ('confirmed','checked_in') AND b.check_in_date <= CURDATE() AND b.check_out_date > CURDATE()) AS is_current_stay,
              (b.status IN ('pending','confirmed') AND b.check_in_date > CURDATE()) AS is_future_stay
         FROM bookings b
         JOIN users cu ON cu.id = b.customer_id
         LEFT JOIN property_policies ppol ON ppol.property_id = b.property_id
        WHERE b.property_id=?
        ORDER BY b.created_at DESC`,
      [property.id]
    );
    const bookings = bookingRows.map(mapBookingReportRow);
    // Chi tinh cac don da xac nhan hoac thanh cong vao thong ke chinh
    const activeBookings = bookings.filter((booking) => !["cancelled", "pending"].includes(booking.status));
    const completed = activeBookings.filter((booking) => booking.isCompleted);
    const notCompleted = activeBookings.filter((booking) => !booking.isCompleted);

    const sum = (rows, key) => rows.reduce((total, item) => total + Number(item[key] || 0), 0);
    const paidBookings = activeBookings.filter((b) => b.paymentStatus === "paid");

    reports.push({
      propertyId: property.id,
      propertyName: property.name,
      city: property.city,
      address: property.address,
      partnerHotelName: property.partner_hotel_name,
      partnerEmail: property.partner_email,
      isActiveHotel: property.status === "active",
      currentStayCount: activeBookings.filter((booking) => booking.isCurrentStay).length,
      totalBookings: activeBookings.length,
      
      // Doanh thu tong (bao gom ca cac don Confirmed nhung chua tra tien)
      grossRevenue: sum(activeBookings, "total"),
      grossPartnerPayout: sum(activeBookings, "partnerPayout"),
      
      // Doanh thu thuc thu (da thanh toan qua QR hoac check-out thanh cong)
      paidRevenue: sum(paidBookings, "total"),
      paidPartnerPayout: sum(paidBookings, "partnerPayout"),
      
      // Doanh thu cho (chua hoan thanh chuyen di)
      pendingRevenue: sum(notCompleted, "total"),
      pendingPartnerPayout: sum(notCompleted, "partnerPayout"),
      
      completedCommission: sum(completed, "platformFee"),
      pendingCommission: sum(notCompleted, "platformFee"),
      bookings, // Van giu lai tat ca de xem chi tiet (bao gom ca pending)
    });
  }
  return reports;
}

router.get("/admin/booking-report", requireAdmin, async (_req, res, next) => {
  try {
    res.json({ hotels: await getBookingReportRooms() });
  } catch (e) { next(e); }
});

router.get("/partner/booking-report", requirePartner, async (req, res, next) => {
  try {
    res.json({ hotels: await getBookingReportRooms({ partnerUserId: req.session.userId }) });
  } catch (e) { next(e); }
});

router.get("/rooms/mine", requirePartner, async (req, res, next) => {
  try {
    const partnerId = await getPartnerProfileId(req.session.userId);
    if (!partnerId) return res.json({ rooms: [] });

    const [rows] = await pool.query(
      "SELECT * FROM properties WHERE partner_id=? ORDER BY created_at DESC",
      [partnerId]
    );

    const rooms = await Promise.all(rows.map((r) => mapProperty(r, { includePendingRequest: true })));
    res.json({ rooms });
  } catch (e) { next(e); }
});

router.get("/rooms/:id", requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });

  try {
    let room;
    if (req.session.role === "admin") {
      room = await getPropertyWithPartner(id);
    } else {
      room = await getPropertyForPartner(id, req.session.userId);
    }

    if (!room) return res.status(404).json({ error: "Khong tim thay phong" });
    const mapped = await mapProperty(room, { includePendingRequest: true });
    res.json({ room: mapped });
  } catch (e) { next(e); }
});


router.post("/rooms", requirePartner, async (req, res, next) => {
  let payload;
  try {
    payload = normalizeRoomPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const partnerId = await getPartnerProfileId(req.session.userId);
  if (!partnerId) {
    return res.status(403).json({ error: "Tai khoan doi tac chua hoan tat ho so" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const propertyId = await insertProperty(conn, partnerId, payload);
    await conn.commit();

    // Thong bao cho admin
    await notifyAdmins(pool, {
      type: "new_property_creation",
      title: "Khach san moi cho duyet",
      body: `Doi tac vua tao khach san moi: "${payload.name}".`,
      entityType: "property",
      entityId: propertyId
    });

    res.json({ room: { id: propertyId } });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.patch("/rooms/:id/request-update", requirePartner, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });

  let payload;
  try {
    payload = normalizeRoomPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const room = await getPropertyForPartner(id, req.session.userId, conn, true);
    if (!room) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay phong" });
    }

    // Khoa cac yeu cau pending de chong race condition (2 tab gui cung luc)
    const pendingRequest = await getPendingChangeRequestByProperty(id, conn, true);
    if (pendingRequest) {
      await conn.rollback();
      return res.status(409).json({ error: "Phong dang co yeu cau cho admin duyet" });
    }

    await conn.query(
      `INSERT INTO property_change_requests
       (property_id, partner_id, action_type, payload_json, requested_by, status)
       VALUES (?, ?, 'update', CAST(? AS JSON), ?, 'pending')`,
      [id, room.partner_id, JSON.stringify(payload), req.session.userId]
    );
    await conn.commit();

    // Thong bao cho admin
    await notifyAdmins(pool, {
      type: "property_update_request",
      title: "Yeu cau sua thong tin khach san",
      body: `Doi tac yeu cau cap nhat thong tin cho "${room.name}".`,
      entityType: "property",
      entityId: id
    });

    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.delete("/rooms/:id/request-delete", requirePartner, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const room = await getPropertyForPartner(id, req.session.userId, conn, true);
    if (!room) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay phong" });
    }

    const pendingRequest = await getPendingChangeRequestByProperty(id, conn, true);
    if (pendingRequest) {
      await conn.rollback();
      return res.status(409).json({ error: "Phong dang co yeu cau cho admin duyet" });
    }

    await conn.query(
      `INSERT INTO property_change_requests
       (property_id, partner_id, action_type, requested_by, status)
       VALUES (?, ?, 'delete', ?, 'pending')`,
      [id, room.partner_id, req.session.userId]
    );
    await conn.commit();

    // Thong bao cho admin
    await notifyAdmins(pool, {
      type: "property_delete_request",
      title: "Yeu cau xoa khach san",
      body: `Doi tac yeu cau xoa khach san: "${room.name}".`,
      entityType: "property",
      entityId: id
    });

    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.get("/admin/rooms", requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || "pending");
    const limit = clampInt(req.query.limit, 50, 1, 1000);
    const offset = clampInt(req.query.offset, 0, 0, 1000000);

    let where = "1=1";
    if (status === "pending") {
      where = `(p.status='pending_review'
        OR EXISTS (
          SELECT 1
            FROM property_change_requests cr
           WHERE cr.property_id = p.id
             AND cr.status = 'pending'
        ))`;
    } else if (status === "approved") {
      where = "p.status='active'";
    } else if (status === "rejected") {
      where = "p.status='rejected'";
    } else if (status === "all") {
      where = "1=1";
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM properties p WHERE ${where}`, []);
    const [rows] = await pool.query(
      `SELECT p.*, u.email AS partner_email, pp.business_name AS partner_hotel_name
         FROM properties p
         LEFT JOIN partner_profiles pp ON pp.id = p.partner_id
         LEFT JOIN users u ON u.id = pp.user_id
        WHERE ${where}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const rooms = await Promise.all(rows.map((row) => mapProperty(row, { includePendingRequest: true })));
    res.json({ rooms, total: countRows[0].total, limit, offset });
  } catch (e) { next(e); }
});

router.get("/admin/partners/:id/rooms", requireAdmin, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) return res.status(400).json({ error: "ID khong hop le" });

    const partnerId = await getPartnerProfileId(userId);
    if (!partnerId) return res.json({ rooms: [] });

    const [rows] = await pool.query(
      `SELECT p.*, u.email AS partner_email, pp.business_name AS partner_hotel_name
         FROM properties p
         LEFT JOIN partner_profiles pp ON pp.id = p.partner_id
         LEFT JOIN users u ON u.id = pp.user_id
        WHERE p.partner_id=? 
        ORDER BY p.created_at DESC`,
      [partnerId]
    );
    const rooms = await Promise.all(rows.map((row) => mapProperty(row, { includePendingRequest: true })));
    res.json({ rooms });
  } catch (e) { next(e); }
});

router.patch("/admin/rooms/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });

  let payload;
  try {
    payload = normalizeRoomPayload(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const room = await getPropertyWithPartner(id, conn);
    if (!room) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay phong" });
    }

    const pendingRequest = await getPendingChangeRequestByProperty(id, conn, true);
    if (pendingRequest) {
      await conn.rollback();
      return res.status(409).json({ error: "Phong dang co yeu cau doi tac cho duyet" });
    }

    await updatePropertyFromPayload(conn, id, payload);
    await createNotification(conn, {
      userId: room.partner_user_id,
      type: "admin_room_updated",
      title: "Admin da cap nhat phong",
      body: `Admin vua cap nhat thong tin phong "${payload.name}".`,
      data: { propertyId: id },
      entityType: "property",
      entityId: id,
    });

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.delete("/admin/rooms/:id", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const room = await getPropertyWithPartner(id, conn);
    if (!room) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay phong" });
    }

    const pendingRequest = await getPendingChangeRequestByProperty(id, conn, true);
    if (pendingRequest) {
      await conn.rollback();
      return res.status(409).json({ error: "Phong dang co yeu cau doi tac cho duyet" });
    }

    await createNotification(conn, {
      userId: room.partner_user_id,
      type: "admin_room_deleted",
      title: "Admin da xoa phong",
      body: `Phong "${room.name}" da bi xoa boi admin.`,
      data: { propertyId: id },
      entityType: "property",
      entityId: id,
    });
    await conn.query("DELETE FROM properties WHERE id=?", [id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post("/admin/rooms/:id/approve", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const room = await getPropertyWithPartner(id, conn);
    if (!room) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay phong" });
    }

    await conn.query(
      "UPDATE properties SET status='active', reviewed_at=NOW(), reviewed_by=?, reject_reason=NULL WHERE id=?",
      [req.session.userId, id]
    );
    await createNotification(conn, {
      userId: room.partner_user_id,
      type: "room_approved",
      title: "Khach san da du được duyet",
      body: `Khach san "${room.name}" da duoc admin duyet hien thi.`,
      data: { propertyId: id },
      entityType: "property",
      entityId: id,
    });

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post("/admin/rooms/:id/reject", requireAdmin, async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });
  if (!reason) return res.status(400).json({ error: "Vui long nhap ly do tu choi" });
  if (reason.length > 1000) return res.status(400).json({ error: "Ly do qua dai" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const room = await getPropertyWithPartner(id, conn);
    if (!room) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay phong" });
    }

    await conn.query(
      "UPDATE properties SET status='rejected', reviewed_at=NOW(), reviewed_by=?, reject_reason=? WHERE id=?",
      [req.session.userId, reason, id]
    );
    await createNotification(conn, {
      userId: room.partner_user_id,
      type: "room_rejected",
      title: "Khach san bi tu choi",
      body: `Khach san "${room.name}" bi tu choi. Ly do: ${reason}`,
      data: { propertyId: id, reason },
      entityType: "property",
      entityId: id,
    });

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post("/admin/room-change-requests/:id/approve", requireAdmin, async (req, res, next) => {
  const requestId = Number(req.params.id);
  if (Number.isNaN(requestId)) return res.status(400).json({ error: "ID khong hop le" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT cr.*,
              p.name AS property_name,
              pp.user_id AS partner_user_id
         FROM property_change_requests cr
         JOIN partner_profiles pp ON pp.id = cr.partner_id
         LEFT JOIN properties p ON p.id = cr.property_id
        WHERE cr.id=? AND cr.status='pending'
        LIMIT 1
        FOR UPDATE`,
      [requestId]
    );
    const requestRow = rows[0];
    if (!requestRow) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay yeu cau" });
    }

    if (requestRow.action_type === "update") {
      if (!requestRow.property_id) {
        await conn.rollback();
        return res.status(404).json({ error: "Khong tim thay phong" });
      }
      const payload = parseJsonValue(requestRow.payload_json, null);
      if (!payload) {
        await conn.rollback();
        return res.status(400).json({ error: "Yeu cau cap nhat khong hop le" });
      }

      await updatePropertyFromPayload(conn, requestRow.property_id, payload, {
        status: "active",
        clearRejectReason: true,
        reviewedBy: req.session.userId,
      });
      await conn.query(
        `UPDATE property_change_requests
            SET status='approved', review_note=NULL, reviewed_by=?, reviewed_at=NOW()
          WHERE id=?`,
        [req.session.userId, requestId]
      );
      await createNotification(conn, {
        userId: requestRow.partner_user_id,
        type: "partner_room_update_approved",
        title: "Yeu cau sua khach san da duoc duyet",
        body: `Admin da duyet yeu cau sua khach san "${payload.name}".`,
        data: { propertyId: requestRow.property_id, requestId, action: "update" },
        entityType: "property",
        entityId: requestRow.property_id,
      });
    } else if (requestRow.action_type === "delete") {
      const propertyId = Number(requestRow.property_id);
      const propertyName = requestRow.property_name || "Phong";
      await conn.query(
        `UPDATE property_change_requests
            SET status='approved', review_note=NULL, reviewed_by=?, reviewed_at=NOW()
          WHERE id=?`,
        [req.session.userId, requestId]
      );
      await createNotification(conn, {
        userId: requestRow.partner_user_id,
        type: "partner_room_delete_approved",
        title: "Yeu cau xoa khach san da duoc duyet",
        body: `Khach san "${propertyName}" da duoc xoa khoi he thong.`,
        data: { propertyId, requestId, action: "delete" },
        entityType: "property",
        entityId: propertyId,
      });
      await conn.query("DELETE FROM properties WHERE id=?", [propertyId]);
    } else {
      await conn.rollback();
      return res.status(400).json({ error: "Loai yeu cau khong hop le" });
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.post("/admin/room-change-requests/:id/reject", requireAdmin, async (req, res, next) => {
  const requestId = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  if (Number.isNaN(requestId)) return res.status(400).json({ error: "ID khong hop le" });
  if (!reason) return res.status(400).json({ error: "Vui long nhap ly do tu choi" });
  if (reason.length > 1000) return res.status(400).json({ error: "Ly do qua dai" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT cr.*,
              p.name AS property_name,
              pp.user_id AS partner_user_id
         FROM property_change_requests cr
         JOIN partner_profiles pp ON pp.id = cr.partner_id
         LEFT JOIN properties p ON p.id = cr.property_id
        WHERE cr.id=? AND cr.status='pending'
        LIMIT 1
        FOR UPDATE`,
      [requestId]
    );
    const requestRow = rows[0];
    if (!requestRow) {
      await conn.rollback();
      return res.status(404).json({ error: "Khong tim thay yeu cau" });
    }

    await conn.query(
      `UPDATE property_change_requests
          SET status='rejected', review_note=?, reviewed_by=?, reviewed_at=NOW()
        WHERE id=?`,
      [reason, req.session.userId, requestId]
    );
    await createNotification(conn, {
      userId: requestRow.partner_user_id,
      type: requestRow.action_type === "delete"
        ? "partner_room_delete_rejected"
        : "partner_room_update_rejected",
      title: requestRow.action_type === "delete"
        ? "Yeu cau xoa khach san bi tu choi"
        : "Yeu cau sua khach san bi tu choi",
      body: `Admin da tu choi yeu cau cua khach san "${requestRow.property_name || "Khach san"}". Ly do: ${reason}`,
      data: { propertyId: requestRow.property_id, requestId, action: requestRow.action_type, reason },
      entityType: "property",
      entityId: requestRow.property_id,
    });

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.get("/notifications/unread-count", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id=? AND is_read=0",
      [req.session.userId]
    );
    res.json({ count: Number(rows[0].count || 0) });
  } catch (e) { next(e); }
});

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const offset = clampInt(req.query.offset, 0, 0, 1000000);
    const [countRows] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(is_read = 0) AS unread FROM notifications WHERE user_id=?",
      [req.session.userId]
    );
    const [rows] = await pool.query(
      `SELECT id, type, title, body, data, entity_type, entity_id, is_read, read_at, created_at
         FROM notifications
        WHERE user_id=?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      [req.session.userId, limit, offset]
    );

    res.json({
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        data: parseJsonValue(row.data, {}),
        entityType: row.entity_type,
        entityId: row.entity_id,
        isRead: !!row.is_read,
        readAt: row.read_at,
        createdAt: row.created_at,
      })),
      total: Number(countRows[0].total || 0),
      unread: Number(countRows[0].unread || 0),
      limit,
      offset,
    });
  } catch (e) { next(e); }
});

router.post("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });
    await pool.query(
      "UPDATE notifications SET is_read=1, read_at=COALESCE(read_at, NOW()) WHERE id=? AND user_id=?",
      [id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read=1, read_at=COALESCE(read_at, NOW()) WHERE user_id=? AND is_read=0",
      [req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete("/notifications/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID khong hop le" });
    await pool.query(
      "DELETE FROM notifications WHERE id=? AND user_id=?",
      [id, req.session.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
