import crypto from "crypto";
import { pool } from "../../db.js";
import { normalizeText } from "../../utils/helpers.js";

// Types & Interfaces
export interface RoomPrice {
  id?: number;
  label: string;
  pricePerNight: number;
  totalInventory?: number;
  area?: number | null;
  capacity?: number | null;
  bedInfo?: string | null;
  amenities?: string | null;
  imageUrls?: string[];
}

export interface NearbyPlace {
  name: string;
  type: string;
  distanceM: number;
  lat: number;
  lon: number;
}

export interface GalleryImage {
  category: string;
  url: string;
  caption?: string | null;
}

export interface PropertyPolicy {
  checkInTime: string;
  checkOutTime: string;
  childrenFreeAge: number | null;
  refundable: boolean;
  freeCancelHours: number | null;
  cancellationNote?: string | null;
  petAllowed: boolean;
  smokingAllowed: boolean;
  otherRules?: string | null;
}

export interface PropertyPayload {
  name: string;
  description?: string | null;
  roomType: string;
  area?: number | null;
  capacity: number;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  nearbyPlaces: NearbyPlace[];
  prices: RoomPrice[];
  images: GalleryImage[];
  policy: PropertyPolicy;
  highlights: string[];
  transportConnections: Array<{ name: string; distance: string; note?: string | null }>;
  platformFeePct: number;
  promotionPct: number;
}

// Helper functions
export function parseJsonValue(value: any, fallback: any = null): any {
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

export function normalizeBoolean(value: any, fallback = false): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on", "co"].includes(normalized)) return true;
  if (["false", "0", "no", "off", "khong"].includes(normalized)) return false;
  return fallback;
}

export function normalizeTimeValue(value: any): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
  return text;
}

export function formatTimeValue(value: any): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, 5);
}

export async function getPartnerProfileId(userId: number, conn: any = pool): Promise<number | null> {
  const [rows]: any = await conn.query("SELECT id FROM partner_profiles WHERE user_id=? LIMIT 1", [userId]);
  return rows[0]?.id || null;
}

export async function getPendingChangeRequestByProperty(propertyId: number, conn: any = pool, lock = false): Promise<any | null> {
  const [rows]: any = await conn.query(
    `SELECT *
       FROM property_change_requests
      WHERE property_id=? AND status='pending'
      ORDER BY created_at DESC, id DESC
      LIMIT 1${lock ? " FOR UPDATE" : ""}`,
    [propertyId]
  );
  return rows[0] || null;
}

export async function getPropertyForPartner(propertyId: number, userId: number, conn: any = pool, lock = false): Promise<any | null> {
  const [rows]: any = await conn.query(
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

export async function getPropertyWithPartner(propertyId: number, conn: any = pool): Promise<any | null> {
  const [rows]: any = await conn.query(
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

export function slugifyBase(name: string): string {
  return String(name).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 240) || "property";
}

export function makeSlug(name: string): string {
  return `${slugifyBase(name)}-${crypto.randomBytes(4).toString("hex")}`;
}

export function inferCityFromAddress(address: string): string {
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

const REQUIRED_IMAGE_CATEGORY_LABELS: Record<string, string> = {
  hotel_front: "mat tien khach san",
  lobby: "sanh / le tan",
  room_overview: "phong mau",
  common_area: "khu vuc chung",
  exterior: "khuon vien / ngoai canh",
};

export function normalizeRoomPayload(body: any): PropertyPayload {
  const policyInput = body?.policy ?? {};
  const payload: PropertyPayload = {
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
      ? [...new Set(body.amenities.map((item: any) => String(item || "").trim()).filter(Boolean))] as string[]
      : [],
    nearbyPlaces: Array.isArray(body?.nearbyPlaces)
      ? body.nearbyPlaces
        .map((item: any) => ({
          name: String(item?.name || "").trim(),
          type: String(item?.type || "place").trim() || "place",
          distanceM: Number(item?.distanceM) || 0,
          lat: Number(item?.lat) || 0,
          lon: Number(item?.lon) || 0,
        }))
        .filter((item: any) => item.name)
      : [],
    prices: Array.isArray(body?.prices)
      ? body.prices
        .map((item: any) => {
          const imageUrls = Array.isArray(item?.imageUrls)
            ? item.imageUrls.map((url: any) => String(url || "").trim()).filter(Boolean)
            : (typeof item?.imageUrl === "string" && item.imageUrl.trim()
              ? [item.imageUrl.trim()] : []);
          const cap = Number(item?.capacity);
          const ar = item?.area === undefined || item?.area === null || item?.area === ""
            ? null : Number(item.area);
          return {
            label: String(item?.label || "").trim(),
            pricePerNight: Number(item?.pricePerNight),
            area: Number.isFinite(ar) && ar! >= 0 ? ar : null,
            capacity: Number.isFinite(cap) && cap > 0 ? cap : null,
            bedInfo: normalizeText(item?.bedInfo),
            amenities: normalizeText(item?.amenities),
            imageUrls,
          };
        })
        .filter((item: any) => item.label && Number.isFinite(item.pricePerNight) && item.pricePerNight > 0)
      : [],
    images: Array.isArray(body?.images)
      ? body.images
        .map((item: any) => ({
          category: String(item?.category || "").trim(),
          url: String(item?.url || "").trim(),
          caption: normalizeText(item?.caption),
        }))
        .filter((item: any) => item.category && item.url)
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
      ? [...new Set(body.highlights.map((item: any) => String(item || "").trim()).filter(Boolean))] as string[]
      : [],
    transportConnections: Array.isArray(body?.transportConnections)
      ? body.transportConnections
        .map((item: any) => ({
          name: String(item?.name || "").trim(),
          distance: String(item?.distance || "").trim(),
          note: normalizeText(item?.note),
        }))
        .filter((item: any) => item.name && item.distance)
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
  // Removed strict requirements for highlights and transportConnections 
  // as existing rooms might not have them.
  // if (!payload.highlights.length) {
  //   throw new Error("Vui long nhap it nhat mot diem nhan noi bat");
  // }
  // if (!payload.transportConnections.length) {
  //   throw new Error("Vui long nhap it nhat mot ket noi giao thong quan trong");
  // }
  if (!Number.isFinite(payload.platformFeePct) || payload.platformFeePct < 0 || payload.platformFeePct > 100) {
    throw new Error("Phi nen tang khong hop le");
  }
  if (!Number.isFinite(payload.promotionPct) || payload.promotionPct < 0 || payload.promotionPct > 100) {
    throw new Error("Khuyen mai khong hop le");
  }

  payload.city = payload.city || inferCityFromAddress(payload.address) || "Chua xac dinh";
  return payload;
}

export async function replacePricing(conn: any, propertyId: number, prices: RoomPrice[]) {
  const [existing]: any = await conn.query("SELECT id, label FROM property_pricing WHERE property_id=?", [propertyId]);
  const existingMap = new Map(existing.map((row: any) => [row.label, row.id]));
  const processedIds: number[] = [];

  let sortOrder = 0;
  for (const price of prices) {
    const existingId = existingMap.get(price.label) as number | undefined;
    if (existingId) {
      await conn.query(
        `UPDATE property_pricing 
            SET price_per_night=?, total_inventory=?, area_sqm=?, capacity=?, bed_info=?, amenities=?, image_urls_json=?, sort_order=?
          WHERE id=?`,
        [
          price.pricePerNight,
          (price as any).totalInventory || 1,
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
      const [res]: any = await conn.query(
        `INSERT INTO property_pricing
         (property_id, label, price_per_night, total_inventory, area_sqm, capacity, bed_info, amenities, image_urls_json, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
        [
          propertyId,
          price.label,
          price.pricePerNight,
          (price as any).totalInventory || 1,
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

  if (processedIds.length > 0) {
    await conn.query("DELETE FROM property_pricing WHERE property_id=? AND id NOT IN (?)", [propertyId, processedIds]);
  } else {
    await conn.query("DELETE FROM property_pricing WHERE property_id=?", [propertyId]);
  }
}

export async function replaceNearbyPlaces(conn: any, propertyId: number, nearbyPlaces: NearbyPlace[]) {
  await conn.query("DELETE FROM property_nearby_places WHERE property_id=?", [propertyId]);
  for (const place of nearbyPlaces) {
    await conn.query(
      `INSERT INTO property_nearby_places (property_id, name, category, distance_m, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [propertyId, place.name, place.type, place.distanceM, place.lat, place.lon]
    );
  }
}

export async function replaceGalleryImages(conn: any, propertyId: number, images: GalleryImage[]) {
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

export async function upsertPropertyPolicy(conn: any, propertyId: number, policy: PropertyPolicy) {
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

export async function insertProperty(conn: any, partnerId: number, payload: PropertyPayload): Promise<number> {
  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = makeSlug(payload.name);
    try {
      const [result]: any = await conn.query(
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
    } catch (e: any) {
      lastErr = e;
      if (e?.code === "ER_DUP_ENTRY" && /slug/i.test(e?.sqlMessage || "")) continue;
      throw e;
    }
  }
  throw lastErr || new Error("Khong tao duoc khach san");
}

export async function updatePropertyFromPayload(conn: any, propertyId: number, payload: PropertyPayload, options: any = {}) {
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

export function mapChangeRequest(row: any): any | null {
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

export async function mapProperty(row: any, options: any = {}): Promise<any> {
  const [pricing]: any = await pool.query(
    `SELECT id, label, price_per_night, total_inventory, area_sqm, capacity, bed_info, amenities, image_urls_json
       FROM property_pricing
      WHERE property_id=?
      ORDER BY sort_order, id`,
    [row.id]
  );
  const [nearby]: any = await pool.query(
    "SELECT name, category, distance_m, latitude, longitude FROM property_nearby_places WHERE property_id=? ORDER BY distance_m, id",
    [row.id]
  );
  const [images]: any = await pool.query(
    `SELECT category, image_url, caption
       FROM property_gallery_images
      WHERE property_id=?
      ORDER BY sort_order, id`,
    [row.id]
  );
  const [policyRows]: any = await pool.query(
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
  const [bookingStatRows]: any = await pool.query(
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
    name: row.name || "",
    description: row.description || "",
    roomType: (row.property_type && /^[1-5]$/.test(row.property_type.trim())) ? `${row.property_type.trim()} sao` : (row.property_type || ""),
    area: row.area_sqm == null ? null : Number(row.area_sqm),
    capacity: Number(row.capacity ?? 0),
    address: row.address || "",
    city: row.city || "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    amenities: (parseJsonValue(row.amenities_json, []) || []).filter((i: any) => typeof i === "string"),
    highlights: (parseJsonValue(row.highlights_json, []) || []).filter((i: any) => typeof i === "string"),
    transportConnections: (parseJsonValue(row.transport_connections_json, []) || []).filter((i: any) => i && typeof i === "object"),
    nearbyPlaces: nearby.map((item: any) => ({
      name: item.name || "",
      type: item.category || "place",
      distanceM: Number(item.distance_m),
      lat: Number(item.latitude),
      lon: Number(item.longitude),
    })),
    images: images.map((item: any) => ({
      category: item.category || "other",
      url: item.image_url || "",
      caption: item.caption || "",
    })),
    prices: pricing.map((item: any) => ({
      id: item.id,
      label: item.label || "",
      pricePerNight: Number(item.price_per_night),
      totalInventory: item.total_inventory == null ? 1 : Number(item.total_inventory),
      area: item.area_sqm == null ? null : Number(item.area_sqm),
      capacity: item.capacity == null ? null : Number(item.capacity),
      bedInfo: item.bed_info || "",
      amenities: item.amenities || "",
      imageUrls: parseJsonValue(item.image_urls_json, []) || [],
    })),
    policy: {
      checkInTime: formatTimeValue(policyRow?.check_in_from || row.check_in_time) || "14:00",
      checkOutTime: formatTimeValue(policyRow?.check_out_until || row.check_out_time) || "12:00",
      childrenFreeAge: policyRow?.children_free_age == null ? null : Number(policyRow.children_free_age),
      refundable: policyRow ? policyRow.cancellation_type !== "non_refundable" : true,
      freeCancelHours: policyRow?.free_cancel_hours == null ? null : Number(policyRow.free_cancel_hours),
      cancellationNote: policyRow?.cancellation_policy_text || "",
      petAllowed: !!policyRow?.pets_allowed,
      smokingAllowed: !!policyRow?.smoking_allowed,
      otherRules: policyRow?.custom_rules || "",
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

export function maxDateText(a: string, b: string): string {
  return a > b ? a : b;
}

export function minDateText(a: string, b: string): string {
  return a < b ? a : b;
}

export function dateOnlyFromDb(value: any): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || "").slice(0, 10);
}

export function applyFeeConfig(config: any, baseAmount: number): number {
  if (!config) return 0;
  let amount = config.fee_type === "fixed"
    ? Number(config.fee_value || 0)
    : baseAmount * Number(config.fee_value || 0) / 100;
  if (config.min_fee != null) amount = Math.max(amount, Number(config.min_fee));
  if (config.max_fee != null) amount = Math.min(amount, Number(config.max_fee));
  return Math.round(amount);
}

export async function getActiveFeeConfig(kind: "tax" | "platform"): Promise<any | null> {
  const nameFilter = kind === "tax"
    ? "%vat%"
    : "%platform%";
  const altNameFilter = kind === "tax"
    ? "%thue%"
    : "%nen tang%";
  const [rows]: any = await pool.query(
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

export async function getDailyOverrides(conn: any, pricingId: number, checkInDate: string, checkOutDate: string): Promise<Map<string, any>> {
  if (!pricingId) return new Map();
  const [rows]: any = await conn.query(
    `SELECT stay_date, price_per_night, open_inventory, is_closed
       FROM property_pricing_daily_overrides
      WHERE pricing_id=?
        AND stay_date >= ?
        AND stay_date < ?`,
    [pricingId, checkInDate, checkOutDate]
  );
  return new Map(rows.map((row: any) => [dateOnlyFromDb(row.stay_date), row]));
}

export async function getPriceAvailabilityByNight(conn: any, { propertyId, pricingId = null, priceLabel, checkInDate, checkOutDate, totalInventory, basePricePerNight = null }: any): Promise<any> {
  const dates = Array.from({ length: Math.round((new Date(`${checkOutDate}T00:00:00Z`).getTime() - new Date(`${checkInDate}T00:00:00Z`).getTime()) / 86400000) }, (_item, index) => {
    const d = new Date(`${checkInDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + index);
    return d.toISOString().slice(0, 10);
  });

  const total = Number(totalInventory || 1);
  const bookedByDate = new Map(dates.map((date) => [date, 0]));
  const overrides = await getDailyOverrides(conn, pricingId!, checkInDate, checkOutDate);

  if (dates.length === 0) {
    return { dates: [], minRemaining: total, isAvailable: true, subtotal: 0 };
  }

  const [bookings]: any = await conn.query(
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
    
    const nights = Math.round((new Date(`${overlapEnd}T00:00:00Z`).getTime() - new Date(`${overlapStart}T00:00:00Z`).getTime()) / 86400000);
    for (let i = 0; i < nights; i++) {
      const d = new Date(`${overlapStart}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
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
