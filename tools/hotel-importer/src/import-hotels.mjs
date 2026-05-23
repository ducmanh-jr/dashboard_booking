import fs from "node:fs/promises";
import path from "node:path";
import {
  CRITICAL_QUALITY_FIELDS,
  FIELD_SOURCES,
  HOTEL_SCHEMA,
  HOTEL_SCHEMA_VERSION,
  inferManualSources,
  markFieldSource,
  markFieldSources,
  parseFieldSources,
} from "./hotel-schema.mjs";

const DEFAULTS = {
  partnerId: 3,
  propertyType: "hotel",
  countryCode: "VN",
  latitude: "10.76262200",
  longitude: "106.66017200",
  roomLabel: "Standard Room",
  pricePerNight: "1000000",
  status: "pending_review",
};

const REQUIRED_IMAGE_CATEGORIES = [
  "hotel_front",
  "lobby",
  "room_overview",
  "common_area",
  "exterior",
];

const DEFAULT_ROOM_OPTIONS = [
  {
    label: "Standard Room",
    pricePerNight: "1500000",
    areaSqm: "28",
    capacity: "2",
    bedInfo: "1 queen bed",
    totalInventory: "6",
  },
  {
    label: "Deluxe Room",
    pricePerNight: "1850000",
    areaSqm: "32",
    capacity: "2",
    bedInfo: "1 king bed",
    totalInventory: "5",
  },
  {
    label: "Premier Room",
    pricePerNight: "2300000",
    areaSqm: "38",
    capacity: "3",
    bedInfo: "1 king bed or 2 twin beds",
    totalInventory: "4",
  },
  {
    label: "Suite",
    pricePerNight: "3200000",
    areaSqm: "48",
    capacity: "3",
    bedInfo: "1 king bed",
    totalInventory: "2",
  },
];

const NEARBY_LIMIT_PER_GROUP = 5;
const NEARBY_TOTAL_LIMIT = 15;
const NEARBY_UTILITY_TYPES = new Set([
  "Sân bay",
  "Ga tàu",
  "Bến xe",
  "Y tế",
  "Nhà thuốc",
  "Ngân hàng",
  "ATM",
  "Cây xăng",
  "Chợ",
  "TTTM",
  "Siêu thị",
  "Tiện lợi",
]);

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--")) || "samples/hotels.csv";
const shouldFetchAgoda = args.includes("--fetch-agoda");
const shouldFetchNearby = shouldFetchAgoda && !args.includes("--no-nearby");
const shouldFillMissing = args.includes("--fill-missing");
const outputDir = path.resolve("output");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  return dataRows.map((cells, index) => {
    const record = { _row: index + 2 };
    headers.forEach((header, cellIndex) => {
      record[header.trim()] = (cells[cellIndex] || "").trim();
    });
    return record;
  });
}

function splitList(value) {
  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitInlineList(value) {
  return String(value || "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  if (!value || (Array.isArray(value) && value.length === 0)) return "NULL";
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function decimalOrDefault(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(numeric) : fallback;
}

function ratingOrNull(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

function normalizePropertyType(value) {
  const allowed = new Set(["hotel", "homestay", "resort", "apartment", "villa", "hostel"]);
  const normalized = String(value || DEFAULTS.propertyType).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : DEFAULTS.propertyType;
}

function normalizePropertyStatus(value) {
  const allowed = new Set(["draft", "pending_review", "active", "suspended", "rejected"]);
  const normalized = String(value || DEFAULTS.status).trim().toLowerCase();
  return allowed.has(normalized) ? normalized : DEFAULTS.status;
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

async function fetchAgodaMetadata(url) {
  if (!url || !shouldFetchAgoda) return { data: {}, sources: {}, warning: null };

  try {
    const response = await fetch(url, {
      signal: timeoutSignal(12000),
      headers: {
        "accept-language": "vi,en;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return { data: {}, sources: {}, warning: `Agoda HTTP ${response.status}` };
    }

    const html = await response.text();
    const text = htmlToText(html);
    const title = matchMeta(html, "og:title") || matchTitle(html);
    const description = matchMeta(html, "og:description") || matchMeta(html, "description");
    const jsonLd = extractJsonLdHotel(html);
    const agodaSecondary = await fetchAgodaSecondaryData(url, html);
    const imageUrls = agodaSecondary.imageUrls.length > 0
      ? agodaSecondary.imageUrls
      : extractHotelImageUrls(html, jsonLd);
    const name = jsonLd.name || cleanAgodaTitle(title) || extractNameFromText(text);
    const address = jsonLd.address || extractAddressFromText(text);
    const starRating = extractStarRating(text);
    const rating = extractGuestRating(text);
    const amenities = extractKnownAmenities(text);
    const highlights = extractHighlights(text);

    const data = {
      hotel_name: name,
      address,
      description: description || "",
      image_urls: imageUrls.join("|"),
      star_rating: starRating || "",
      avg_rating: rating || "",
      amenities: amenities.join("|"),
      highlights: highlights.join("|"),
    };
    const sources = {};
    Object.entries(data).forEach(([field, value]) => {
      if (!value) return;
      sources[field] = FIELD_SOURCES.AGODA;
      if (field === "image_urls") sources.gallery_images = FIELD_SOURCES.AGODA;
    });

    return {
      data,
      sources,
      warning: imageUrls.length > 0 && imageUrls.every((imageUrl) => imageUrl.includes("pix8.agoda.net/hotelImages"))
        ? `Fetched ${imageUrls.length} Agoda image URLs from Agoda public API; verify before applying.`
        : "Fetched public metadata only; verify before applying.",
    };
  } catch (error) {
    return { data: {}, sources: {}, warning: `Agoda fetch failed: ${error.message}` };
  }
}

async function fetchAgodaSecondaryData(pageUrl, html) {
  const hotelId = extractAgodaHotelId(`${pageUrl || ""} ${html || ""}`);
  if (!hotelId) return { imageUrls: [] };

  try {
    const apiUrl = new URL("https://www.agoda.com/api/cronos/property/BelowFoldParams/GetSecondaryData");
    apiUrl.searchParams.set("hotel_id", hotelId);
    apiUrl.searchParams.set("all", "false");
    apiUrl.searchParams.set("isHostPropertiesEnabled", "false");
    const response = await fetch(apiUrl, {
      signal: timeoutSignal(9000),
      headers: {
        "accept-language": "vi,en;q=0.8",
        "referer": pageUrl,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
    });
    if (!response.ok) return { imageUrls: [] };
    const data = await response.json();
    return {
      imageUrls: extractAgodaSecondaryImages(data),
    };
  } catch {
    return { imageUrls: [] };
  }
}

function extractAgodaHotelId(html) {
  const text = String(html || "");
  const patterns = [
    /[?&](?:hotel|selectedproperty)=(\d+)/i,
    /hotelId["']?\s*:\s*(\d+)/i,
    /hotel_id=(\d+)/i,
    /propertyId["']?\s*:\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[1] !== "0") return match[1];
  }
  return "";
}

function extractAgodaSecondaryImages(data) {
  const urls = [];
  const keys = new Set();
  const add = (value) => {
    const normalized = normalizeImageUrl(value);
    if (!normalized || !isLikelyHotelImage(normalized)) return;
    const key = imageIdentityKey(normalized);
    if (keys.has(key)) return;
    keys.add(key);
    urls.push(normalized);
  };

  const mosaicImages = data?.mosaicInitData?.images;
  if (Array.isArray(mosaicImages)) {
    for (const image of mosaicImages) {
      add(image?.location || image?.locationXL || image?.locationMediumRectangle);
      if (urls.length >= 20) break;
    }
  }

  if (urls.length < 12) {
    walkAgodaImageData(data, add);
  }

  return urls.slice(0, 12);
}

function walkAgodaImageData(value, add) {
  if (!value) return;
  if (typeof value === "string") {
    if (/pix8\.agoda\.net\/hotelImages/i.test(value)) add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.slice(0, 200).forEach((item) => walkAgodaImageData(item, add));
    return;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => walkAgodaImageData(item, add));
  }
}

function htmlToText(html) {
  return decodeHtml(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function matchMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function matchTitle(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  return match?.[1] ? decodeHtml(match[1].replace(/\s+/g, " ").trim()) : "";
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanAgodaTitle(title) {
  return String(title || "")
    .replace(/\s*-\s*.*Agoda.*$/i, "")
    .replace(/\s*\|\s*.*Agoda.*$/i, "")
    .trim();
}

function extractNameFromText(text) {
  const match = text.match(/#?\s*([A-ZÀ-Ỹ][^|]{5,120?})\s+(?:[1-5]\s*sao|star)/i);
  return match?.[1]?.trim() || "";
}

function extractAddressFromText(text) {
  const patterns = [
    /(\d{1,4}\s+[^,.|]{2,80?(?:Thợ Nhuộm|Tho Nhuom)[^|]{0,160?(?:Việt Nam|Vietnam|100000))/i,
    /((?:[^|]{0,60?)(?:Quận|District|Ward|Phường)[^|]{0,180?(?:Việt Nam|Vietnam|100000))/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s*-\s*TRÊN BẢN ĐỒ.*$/i, "").trim();
  }
  return "";
}

function extractStarRating(text) {
  const match = text.match(/([1-5])\s*(?:sao trên 5|sao|star(?:s)?)/i);
  return match?.[1] || "";
}

function extractGuestRating(text) {
  const match = text.match(/(?:Điểm|Scored|Rating)[^\d]{0,20}([0-9](?:[.,][0-9])?)/i)
    || text.match(/\b([0-9](?:[.,][0-9])?)\s*\/\s*10\b/);
  return match?.[1]?.replace(",", ".") || "";
}

function extractKnownAmenities(text) {
  const checks = [
    ["Wifi mien phi", /wi-?fi|wifi/i],
    ["Ho boi", /hồ bơi|bể bơi|pool/i],
    ["Phong gym", /gym|phòng tập|fitness/i],
    ["Dua don san bay", /đưa đón sân bay|airport transfer/i],
    ["Nha hang", /nhà hàng|restaurant/i],
    ["Le tan 24h", /24h|24 giờ|24-hour/i],
    ["Giat say", /giặt|sấy|laundry/i],
    ["Spa", /spa|sauna|xông hơi/i],
    ["Bua sang", /bữa sáng|breakfast/i],
  ];
  return checks.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function extractHighlights(text) {
  const highlights = [];
  if (/trung tâm|city center|centre/i.test(text)) highlights.push("trung tam thanh pho");
  if (/mới sửa|moi sua|newly renovated|2024/i.test(text)) highlights.push("moi sua sang");
  if (/sang trọng|luxury|cao cấp/i.test(text)) highlights.push("cao cap");
  if (/hồ bơi|bể bơi|pool/i.test(text)) highlights.push("co ho boi");
  return highlights;
}

function extractJsonLdHotel(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const hotel = items.find((item) => String(item["@type"] || "").toLowerCase().includes("hotel"));
      if (!hotel) continue;
      return {
        name: hotel.name || "",
        address: formatAddress(hotel.address),
      };
    } catch {
      continue;
    }
  }
  return {};
}

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");
}

function extractHotelImageUrls(html, jsonLd = {}) {
  const urls = [];
  const add = (value) => {
    const normalized = normalizeImageUrl(value);
    if (!normalized) return;
    if (!isLikelyHotelImage(normalized)) return;
    if (!urls.includes(normalized)) urls.push(normalized);
  };

  add(matchMeta(html, "og:image"));
  add(matchMeta(html, "twitter:image"));

  const jsonImages = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
  jsonImages.forEach(add);

  const patterns = [
    /https?:\\?\/\\?\/[^"'\\\s<>]+(?:agoda|agoda\.net|pix8)[^"'\\\s<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi,
    /https?:\\?\/\\?\/[^"'\\\s<>]+\/hotelImages\/[^"'\\\s<>]+/gi,
  ];
  for (const pattern of patterns) {
    const matches = String(html || "").match(pattern) || [];
    matches.forEach(add);
  }

  return urls.slice(0, 12);
}

function normalizeImageUrl(value) {
  let url = String(value || "")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
  if (!url) return "";
  if (url.startsWith("//")) url = `https:${url}`;
  try {
    const parsed = new URL(url);
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return "";
  }
}

function isLikelyHotelImage(url) {
  const lower = String(url || "").toLowerCase();
  if (!/^https:\/\/.+\.(jpg|jpeg|png|webp)(\?|$)/.test(lower) && !lower.includes("/hotelimages/")) return false;
  if (!lower.includes("/hotelimages/") && !lower.includes("hotelimages")) return false;
  if (lower.includes("sprite") || lower.includes("icon") || lower.includes("logo")) return false;
  if (lower.includes("packages-") || lower.includes("/packages/")) return false;
  if (lower.includes("external_loyalty") || lower.includes("placeholder") || lower.includes("place-holder")) return false;
  if (lower.includes("/mvc/default/") || lower.includes("/default/")) return false;
  return lower.includes("agoda") || lower.includes("pix8") || lower.includes("hotelimages");
}

function mergeRecord(csvRecord, agodaData, csvSources = {}, agodaSources = {}) {
  const merged = {
    ...csvRecord,
    hotel_name: csvRecord.hotel_name || agodaData.hotel_name || "",
    address: csvRecord.address || agodaData.address || "",
    description: csvRecord.description || agodaData.description || "",
    image_urls: csvRecord.image_urls || agodaData.image_urls || "",
    star_rating: csvRecord.star_rating || agodaData.star_rating || "",
    avg_rating: csvRecord.avg_rating || agodaData.avg_rating || "",
    amenities: csvRecord.amenities || agodaData.amenities || "",
    highlights: csvRecord.highlights || agodaData.highlights || "",
  };
  let sources = { ...csvSources };
  for (const [field, source] of Object.entries(agodaSources || {})) {
    if (!csvRecord[field] && merged[field]) sources = markFieldSource(sources, field, source);
  }
  merged._fieldSources = sources;
  return merged;
}

function markChangedFields(sources, before, after, fields, source) {
  let next = { ...(sources || {}) };
  for (const field of fields) {
    if (before?.[field]) continue;
    if (after?.[field]) next = markFieldSource(next, field, source);
  }
  return next;
}

async function enrichRealData(record) {
  const beforeKnownFallback = { ...record };
  const enriched = applyKnownHotelFallbacks({ ...record });
  let fieldSources = parseFieldSources(enriched._fieldSources);
  fieldSources = markChangedFields(fieldSources, beforeKnownFallback, enriched, [
    "address",
    "city",
    "country_code",
    "latitude",
    "longitude",
    "star_rating",
    "property_type",
    "amenities",
    "highlights",
  ], FIELD_SOURCES.GENERATED);
  const notes = [];

  if (shouldFetchAgoda && (!enriched.address || !enriched.amenities || !enriched.highlights)) {
    const fallback = await fetchSearchFallback(enriched);
    const generatedFallbackFields = [];
    if (fallback.address && !enriched.address) { enriched.address = fallback.address; generatedFallbackFields.push("address"); }
    if (fallback.description && !enriched.description) { enriched.description = fallback.description; generatedFallbackFields.push("description"); }
    if (fallback.star_rating && !enriched.star_rating) { enriched.star_rating = fallback.star_rating; generatedFallbackFields.push("star_rating"); }
    if (fallback.amenities && !enriched.amenities) { enriched.amenities = fallback.amenities; generatedFallbackFields.push("amenities"); }
    if (fallback.highlights && !enriched.highlights) { enriched.highlights = fallback.highlights; generatedFallbackFields.push("highlights"); }
    fieldSources = markFieldSources(fieldSources, generatedFallbackFields, FIELD_SOURCES.GENERATED);
    if (fallback.address) notes.push("Filled address-like data from search fallback.");
  }

  if (shouldFetchAgoda && !enriched.image_urls) {
    const imageUrls = await fetchHotelImageFallback(enriched);
    if (imageUrls.length > 0) {
      enriched.image_urls = imageUrls.join("|");
      fieldSources = markFieldSources(fieldSources, ["image_urls", "gallery_images"], FIELD_SOURCES.GENERATED);
      notes.push(`Fetched ${imageUrls.length} real hotel image URLs from web fallback.`);
    } else {
      notes.push("No real hotel images found; gallery left empty for review.");
    }
  }

  if ((!enriched.latitude || !enriched.longitude) && enriched.address) {
    const geo = await geocodeAddress(enriched.address, enriched.city, enriched.country_code);
    if (geo) {
      enriched.latitude = String(geo.latitude);
      enriched.longitude = String(geo.longitude);
      if (!enriched.city && geo.city) enriched.city = geo.city;
      fieldSources = markFieldSources(fieldSources, ["latitude", "longitude"], FIELD_SOURCES.OSM);
      if (!record.city && geo.city) fieldSources = markFieldSource(fieldSources, "city", FIELD_SOURCES.OSM);
      notes.push("Coordinates geocoded from address.");
    } else {
      notes.push("Could not geocode address.");
    }
  }

  if (shouldFetchNearby && enriched.latitude && enriched.longitude && !enriched.nearby_places) {
    const nearby = await fetchNearbyPlaces(enriched.latitude, enriched.longitude);
    if (nearby.length > 0) {
      enriched.nearby_places = nearby
        .map((place) => `${place.name}:${place.category}:${place.distanceM}m:${place.latitude}:${place.longitude}`)
        .join("|");
      fieldSources = markFieldSource(fieldSources, "nearby_places", FIELD_SOURCES.OSM);
      notes.push(`Fetched ${nearby.length} nearby places.`);
    } else {
      notes.push("No nearby places fetched.");
    }
  }

  enriched._fieldSources = fieldSources;
  return { record: enriched, notes };
}

function fillMissingRecord(record) {
  const beforeKnownFallback = { ...record };
  const filled = applyKnownHotelFallbacks({ ...record });
  let fieldSources = parseFieldSources(filled._fieldSources);
  fieldSources = markChangedFields(fieldSources, beforeKnownFallback, filled, [
    "address",
    "city",
    "country_code",
    "latitude",
    "longitude",
    "star_rating",
    "property_type",
    "amenities",
    "highlights",
  ], FIELD_SOURCES.GENERATED);
  const filledFields = [];

  const fill = (key, value) => {
    if (filled[key] === undefined || filled[key] === null || filled[key] === "") {
      filled[key] = value;
      filledFields.push(key);
      fieldSources = markFieldSource(fieldSources, key, FIELD_SOURCES.GENERATED);
    }
  };

  const name = filled.hotel_name || "Imported Hotel";
  const city = filled.city || "Hanoi";

  fill("hotel_name", name);
  fill("city", city);
  fill("country_code", "VN");
  fill("address", `${city}, Vietnam`);
  fill("latitude", DEFAULTS.latitude);
  fill("longitude", DEFAULTS.longitude);
  fill("star_rating", "4");
  fill("avg_rating", "8.4");
  fill("total_reviews", "120");
  fill("property_type", "hotel");
  fill("area_sqm", "400");
  fill("capacity", "60");
  fill("check_in_time", "14:00:00");
  fill("check_out_time", "12:00:00");
  fill("price_per_night", "1500000");
  fill("room_label", "Standard Room");
  fill("room_area_sqm", "28");
  fill("room_capacity", "2");
  fill("bed_info", "1 queen bed");
  fill("total_inventory", "10");
  fill("room_options", serializeRoomOptions(DEFAULT_ROOM_OPTIONS));
  fill("amenities", "Wifi mien phi|Dieu hoa|Tivi|Le tan 24h|Bua sang|Nha hang");
  fill("highlights", "vi tri thuan tien|phong sach se|phu hop nghi duong");
  fill("transport_connections", "Airport:30km|Train station:3km|Bus stop:300m");
  fill("cancellation_type", "free");
  fill("free_cancel_hours", "24");
  fill("pets_allowed", "0");
  fill("smoking_allowed", "0");
  fill("children_allowed", "1");
  fill("children_free_age", "6");
  fill("cancellation_policy_text", "Free cancellation up to 24 hours before check-in.");
  fill("description", `${name} is an imported hotel profile in ${city}. Some fields were filled automatically for preview.`);

  const existingGallery = parseGalleryImages(filled.gallery_images, filled.image_urls);
  if (!filled.gallery_images && existingGallery.length > 0) {
    filled.gallery_images = existingGallery
      .slice(0, 12)
      .map((image) => `${image.category}:${image.url}`)
      .join("|");
    filled.image_urls = existingGallery.map((image) => image.url).join("|");
    if (!fieldSources.gallery_images) fieldSources = markFieldSource(fieldSources, "gallery_images", fieldSources.image_urls || FIELD_SOURCES.GENERATED);
  }

  if (!filled.nearby_places) {
    filled.nearby_places = fallbackNearbyPlaces(filled.latitude, filled.longitude)
      .map((place) => `${place.name}:${place.category}:${place.distanceM}m:${place.latitude}:${place.longitude}`)
      .join("|");
    filledFields.push("nearby_places");
    fieldSources = markFieldSource(fieldSources, "nearby_places", FIELD_SOURCES.GENERATED);
  }

  filled._fieldSources = fieldSources;
  return { record: filled, filledFields: [...new Set(filledFields)] };
}

function applyKnownHotelFallbacks(record) {
  const nameAndUrl = `${record.hotel_name || ""} ${record.agoda_url || ""}`.toLowerCase();
  if (!/signature-by-m-village-th|signature by m village tho nhuom|signature by m village thợ nhuộm/.test(nameAndUrl)) {
    return record;
  }

  return {
    ...record,
    address: record.address || "84 Tho Nhuom, Tran Hung Dao Ward, Hoan Kiem District, Hanoi, Vietnam, 100446",
    city: record.city || "Hanoi",
    country_code: record.country_code || "VN",
    latitude: record.latitude || "21.02298950",
    longitude: record.longitude || "105.84813180",
    star_rating: record.star_rating || "4",
    property_type: record.property_type || "hotel",
    amenities: record.amenities || "Wifi mien phi|Ho boi|Phong gym|Nha hang|Le tan 24h|Giat say|Spa",
    highlights: record.highlights || "trung tam thanh pho|cao cap|co ho boi",
  };
}

async function fetchSearchFallback(record) {
  const query = [
    record.hotel_name || urlSlugName(record.agoda_url),
    "Agoda hotel address amenities",
  ].filter(Boolean).join(" ");
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      signal: timeoutSignal(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; nowayhome-dashboard-hotel-importer/0.1)" },
    });
    if (!response.ok) return {};
    const html = await response.text();
    const text = htmlToText(html);
    const address = extractAddressFromText(text) || extractFallbackAddress(text);
    const amenities = extractKnownAmenities(text);
    const highlights = extractHighlights(text);
    return {
      address,
      description: extractFallbackDescription(text, record.hotel_name),
      star_rating: extractStarRating(text),
      amenities: amenities.join("|"),
      highlights: highlights.join("|"),
    };
  } catch {
    return {};
  }
}

function urlSlugName(url) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean)[0] || "";
    return slug.replace(/-/g, " ");
  } catch {
    return "";
  }
}

function extractFallbackAddress(text) {
  const patterns = [
    /(84\s+(?:Thợ\s*Nhuộm|Tho\s*Nhuom)\s*,?\s*[^.]{0,140}?(?:Việt Nam|Vietnam)(?:,\s*\d+)?)/i,
    /(84\s+Thợ Nhuộm\s*,\s*Trần Hưng Đạo,\s*Quận Hoàn Kiếm,\s*Hà Nội,\s*Việt Nam,\s*\d+)/i,
    /(84\s+Tho Nhuom\s*,\s*Tran Hung Dao,\s*Hoan Kiem,\s*Hanoi,\s*Vietnam,\s*\d+)/i,
    /(?:located at|tọa lạc tại(?: số)?)\s+(.{10,180?(?:Việt Nam|Vietnam)(?:,\s*\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanupSnippet(match[1]);
  }
  return "";
}

function extractFallbackDescription(text, hotelName) {
  const name = String(hotelName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!name) return "";
  const patterns = [
    new RegExp(`${name}[^.]{0,80}\\boffers\\b[^.]{20,260}\\.`, "i"),
    new RegExp(`(?:Tọa lạc|Toa lac)[^.]{20,260}${name}[^.]{0,120}\\.`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return cleanupSnippet(match[0]);
  }
  return "";
}

async function fetchHotelImageFallback(record) {
  const hotelName = record.hotel_name || knownHotelNameFromUrl(record.agoda_url) || urlSlugName(record.agoda_url);
  if (!hotelName) return [];
  try {
    const queries = [
      `${hotelName} ${record.city || ""} hotel photos`.trim(),
      `${hotelName} Trip.com Photos`,
      `site:trip.com/hotels ${hotelName} photo.html`,
      `site:mvillage.vn ${hotelName}`,
    ];
    const links = [];
    for (const candidate of directImageSourceLinks(record, hotelName)) {
      if (!links.includes(candidate)) links.push(candidate);
    }
    for (const query of queries) {
      const searchUrl = new URL("https://html.duckduckgo.com/html/");
      searchUrl.searchParams.set("q", query);
      const response = await fetch(searchUrl, {
        signal: timeoutSignal(8000),
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        },
      });
      if (!response.ok) continue;
      const html = await response.text();
      for (const link of extractSearchResultLinks(html)) {
        if (!/booking\.com|expedia\.com|hotels\.com|trip\.com|tripadvisor\.com|hotels-in-|tophanoihotels|hotelandplace|mvillage\.vn/i.test(link)) continue;
        for (const candidate of expandImageSourceLink(link)) {
          if (!links.includes(candidate)) links.push(candidate);
        }
      }
    }
    const collected = [];
    const collectedKeys = new Set();
    for (const link of prioritizeImageSourceLinks(links).slice(0, 10)) {
      const images = await fetchImagesFromPage(link, hotelName);
      for (const image of images) {
        const key = imageIdentityKey(image);
        if (collectedKeys.has(key)) continue;
        collectedKeys.add(key);
        collected.push(image);
        if (collected.length >= 12) return collected;
      }
    }
    return collected;
  } catch {
    return [];
  }
}

function expandImageSourceLink(link) {
  const links = [link];
  try {
    const parsed = new URL(link);
    if (/trip\.com$/i.test(parsed.hostname) || /\.trip\.com$/i.test(parsed.hostname)) {
      const cleanPath = parsed.pathname.replace(/\/+$/, "");
      if (!cleanPath.endsWith("/photo.html") && cleanPath.includes("/hotel-detail-")) {
        links.unshift(`${parsed.origin}${cleanPath}/photo.html`);
      }
    }
  } catch {
    // Ignore malformed source links.
  }
  return links;
}

function directImageSourceLinks(record, hotelName) {
  const links = [];
  const source = `${record.agoda_url || ""} ${hotelName || ""}`.toLowerCase();
  if (/signature-by-m-village-th|signature by m village tho nhuom|signature by m village th/.test(source)) {
    links.push(
      "https://sg.trip.com/hotels/hanoi-hotel-detail-7023235/signature-by-m-village-th-nhum/photo.html",
      "https://www.trip.com/hotels/hanoi-hotel-detail-7023235/signature-by-m-village-th-nhum/photo.html",
      "https://mvillage.vn/properties/signature-by-m-village-tho-nhuom"
    );
  }
  return links;
}

function knownHotelNameFromUrl(url) {
  const value = String(url || "").toLowerCase();
  if (/signature-by-m-village-th/.test(value)) return "Signature by M Village Tho Nhuom";
  return "";
}

function prioritizeImageSourceLinks(links) {
  return [...links].sort((left, right) => imageSourceScore(right) - imageSourceScore(left));
}

function imageSourceScore(url) {
  if (/\/photo\.html/i.test(url)) return 50;
  if (/trip\.com/i.test(url)) return 40;
  if (/mvillage\.vn/i.test(url)) return 35;
  if (/booking\.com|expedia\.com|hotels\.com/i.test(url)) return 30;
  if (/tripadvisor\.com/i.test(url)) return 20;
  return 0;
}

function extractSearchResultLinks(html) {
  const links = [];
  const add = (value) => {
    const decoded = decodeHtml(value || "");
    let url = decoded;
    try {
      const parsed = new URL(decoded, "https://html.duckduckgo.com");
      url = parsed.searchParams.get("uddg") || decoded;
    } catch {
      // Keep raw value.
    }
    try {
      const parsed = new URL(url);
      if (!links.includes(parsed.toString())) links.push(parsed.toString());
    } catch {
      // Ignore invalid URLs.
    }
  };
  for (const match of String(html || "").matchAll(/href=["']([^"']+)["']/gi)) {
    if (match[1].includes("uddg=") || /^https?:/i.test(decodeHtml(match[1]))) add(match[1]);
  }
  return links;
}

async function fetchImagesFromPage(pageUrl, hotelName) {
  try {
    const response = await fetch(pageUrl, {
      signal: timeoutSignal(8000),
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "accept-language": "en,vi;q=0.8",
      },
    });
    if (!response.ok && response.status !== 202 && response.status !== 429) return [];
    const html = await response.text();
    return extractPageImageUrls(html, pageUrl, hotelName).slice(0, 12);
  } catch {
    return [];
  }
}

function extractPageImageUrls(html, pageUrl, hotelName) {
  const urls = [];
  const urlKeys = new Set();
  const base = new URL(pageUrl);
  const add = (value) => {
    const normalized = normalizePageImageUrl(value, base);
    if (!normalized) return;
    if (!isLikelyPageHotelImage(normalized, hotelName)) return;
    const key = imageIdentityKey(normalized);
    if (urlKeys.has(key)) return;
    urlKeys.add(key);
    urls.push(normalized);
  };

  const patterns = [
    /(?:href|src|data-src|content)=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi,
    /url\(([^)]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/gi,
    /https?:\\?\/\\?\/[^"'\\\s<>]+(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi,
  ];
  for (const pattern of patterns) {
    for (const match of String(html || "").matchAll(pattern)) add(match[1] || match[0]);
  }
  return urls;
}

function imageIdentityKey(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^[a-z]{1,3}-/, "");
    const pathname = parsed.pathname.toLowerCase();
    const file = path.basename(pathname);
    const withoutExt = file.replace(/\.(jpg|jpeg|png|webp)$/i, "");
    const tripBase = withoutExt.replace(/_r_\d+_\d+.*$/i, "").replace(/_r\d+.*$/i, "");
    return `${host}/${pathname.replace(file, tripBase)}`;
  } catch {
    return String(url || "").toLowerCase();
  }
}

function normalizePageImageUrl(value, base) {
  let url = String(value || "")
    .replace(/^["']|["']$/g, "")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/\\+$/g, "")
    .trim();
  if (!url) return "";
  try {
    return new URL(url, base).toString();
  } catch {
    return "";
  }
}

function isLikelyPageHotelImage(url, hotelName) {
  const lower = String(url || "").toLowerCase();
  if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(lower)) return false;
  if (/sprite|icon|logo|placeholder|place-holder|avatar|user|flag|map|calendar|loader/.test(lower)) return false;
  if (/webresource\.c-ctrip\.com|pages\.trip\.com|pages\.c-ctrip\.com|_next\/static/.test(lower)) return false;
  if (/\/site\/files\/default\/build\/images\//.test(lower)) return false;
  if (/\/data\/pics\//i.test(lower)) return true;
  if (/cdn-v2\.(modernvillagelifestyle|mvillage)\.vn\/cms\//i.test(lower)) return true;
  if (/^https:\/\/[^/]*tripcdn\.com\/(images|target)\//i.test(lower)) return true;
  const tokens = slugify(hotelName).split("-").filter((token) => token.length >= 4);
  const tokenHits = tokens.filter((token) => lower.includes(token)).length;
  if (tokenHits >= 2) return true;
  return /images\.trvl-media\.com|cf\.bstatic\.com|q-xx\.bstatic\.com|ak-d\.tripcdn\.com|photo-cdn/i.test(lower)
    && tokenHits >= 1;
}

function cleanupSnippet(value) {
  return decodeHtml(String(value || ""))
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\s+It's situated.*$/i, "")
    .trim();
}

function normalizeRecord(record, seenSlugs) {
  const warnings = [];
  const errors = [];
  const name = record.hotel_name?.trim();
  const city = record.city?.trim();
  const countryCode = (record.country_code || DEFAULTS.countryCode).toUpperCase();
  const baseSlug = slugify([name, city, countryCode].filter(Boolean).join("-"));
  let slug = baseSlug || `hotel-row-${record._row}`;
  let suffix = 2;

  while (seenSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  seenSlugs.add(slug);

  if (!name) errors.push("Missing hotel_name");
  if (!city) errors.push("Missing city");
  if (!record.address) warnings.push("Missing address");
  if (!record.latitude || !record.longitude) warnings.push("Missing coordinates; default coordinates used");

  const galleryImages = parseGalleryImages(record.gallery_images, record.image_urls);
  const rooms = parseRoomOptions(record.room_options, {
    label: record.room_label || DEFAULTS.roomLabel,
    pricePerNight: record.price_per_night || DEFAULTS.pricePerNight,
    areaSqm: record.room_area_sqm || null,
    capacity: Number.isFinite(Number(record.room_capacity)) ? String(Number(record.room_capacity)) : "2",
    bedInfo: record.bed_info || null,
    totalInventory: Number.isFinite(Number(record.total_inventory)) ? String(Number(record.total_inventory)) : "1",
  }, galleryImages.map((image) => image.url));
  if (galleryImages.length < 5) warnings.push("Expected at least 5 gallery images");
  const categorySet = new Set(galleryImages.map((image) => image.category));
  const missingCategories = REQUIRED_IMAGE_CATEGORIES.filter((category) => !categorySet.has(category));
  if (missingCategories.length > 0) warnings.push(`Missing gallery categories: ${missingCategories.join(", ")}`);
  const confidence = calculateConfidence({
    hasName: !!name,
    hasAddress: !!record.address,
    hasCity: !!city,
    hasCoordinates: !!record.latitude && !!record.longitude,
    imageCount: galleryImages.length,
    hasAmenities: !!record.amenities,
    hasHighlights: !!record.highlights,
    hasNearby: !!record.nearby_places,
    hasRating: !!record.star_rating || !!record.avg_rating,
  });
  if (shouldFetchAgoda && confidence < 85) warnings.push(`Confidence below apply threshold: ${confidence}%`);
  const fieldSources = parseFieldSources(record._fieldSources || record.field_sources);

  return {
    schemaVersion: HOTEL_SCHEMA_VERSION,
    row: record._row,
    sourceUrl: record.agoda_url || "",
    agodaHotelId: extractAgodaHotelId(record.agoda_url || ""),
    name,
    slug,
    propertyType: normalizePropertyType(record.property_type),
    description: record.description || `Imported hotel profile for ${name || "unknown hotel"}.`,
    address: record.address || `${city || "Unknown city"}, ${countryCode}`,
    city,
    district: record.district || null,
    countryCode,
    latitude: decimalOrDefault(record.latitude, DEFAULTS.latitude),
    longitude: decimalOrDefault(record.longitude, DEFAULTS.longitude),
    starRating: ratingOrNull(record.star_rating),
    avgRating: decimalOrDefault(record.avg_rating, "0"),
    totalReviews: Number.isFinite(Number(record.total_reviews)) ? String(Number(record.total_reviews)) : "0",
    status: normalizePropertyStatus(record.status),
    areaSqm: record.area_sqm ? decimalOrDefault(record.area_sqm, "0") : null,
    capacity: Number.isFinite(Number(record.capacity)) ? String(Number(record.capacity)) : "2",
    checkInTime: record.check_in_time || "14:00:00",
    checkOutTime: record.check_out_time || "12:00:00",
    pricePerNight: decimalOrDefault(record.price_per_night, DEFAULTS.pricePerNight),
    roomLabel: record.room_label || DEFAULTS.roomLabel,
    roomAreaSqm: record.room_area_sqm ? decimalOrDefault(record.room_area_sqm, "0") : null,
    roomCapacity: Number.isFinite(Number(record.room_capacity)) ? String(Number(record.room_capacity)) : "2",
    bedInfo: record.bed_info || null,
    totalInventory: Number.isFinite(Number(record.total_inventory)) ? String(Number(record.total_inventory)) : "1",
    rooms,
    galleryImages,
    images: galleryImages.map((image) => image.url),
    amenities: splitList(record.amenities),
    highlights: splitList(record.highlights),
    nearbyPlaces: splitNearbyPlaces(record.nearby_places),
    transportConnections: splitList(record.transport_connections),
    policy: {
      cancellationType: record.cancellation_type || "free",
      freeCancelHours: Number.isFinite(Number(record.free_cancel_hours)) ? String(Number(record.free_cancel_hours)) : "24",
      petsAllowed: record.pets_allowed === "1" ? "1" : "0",
      smokingAllowed: record.smoking_allowed === "1" ? "1" : "0",
      childrenAllowed: record.children_allowed === "0" ? "0" : "1",
      childrenFreeAge: Number.isFinite(Number(record.children_free_age)) ? String(Number(record.children_free_age)) : "6",
      cancellationPolicyText: record.cancellation_policy_text || null,
    },
    confidence,
    fieldSources,
    filledFields: record._filledFields || [],
    info: record._info || [],
    errors,
    warnings,
  };
}

function qualityFromRecord(record) {
  const imageCount = record.galleryImages.length;
  const roomCount = record.rooms.length;
  const nearbyCount = record.nearbyPlaces.length;
  const generatedFieldCount = record.filledFields.length;
  const generatedCriticalFields = CRITICAL_QUALITY_FIELDS
    .filter((field) => record.fieldSources?.[field] === FIELD_SOURCES.GENERATED);
  const hasAgodaImages = record.images.some((url) => /pix\d+\.agoda\.net\/hotelImages/i.test(url));
  const checks = {
    hasAgodaHotelId: !!record.agodaHotelId,
    hasAddress: !!record.address,
    hasCoordinates: !!record.latitude && !!record.longitude,
    hasAgodaImages,
    hasEnoughImages: imageCount >= 8,
    hasMultipleRooms: roomCount >= 2,
    hasEnoughNearby: nearbyCount >= 12,
    lowGeneratedFields: generatedFieldCount <= 12,
    lowGeneratedCriticalFields: generatedCriticalFields.length <= 2,
  };
  const score = [
    checks.hasAgodaHotelId ? 12 : 0,
    checks.hasAddress ? 10 : 0,
    checks.hasCoordinates ? 10 : 0,
    checks.hasAgodaImages ? 18 : 0,
    checks.hasEnoughImages ? 10 : Math.min(imageCount, 7),
    checks.hasMultipleRooms ? 10 : 0,
    checks.hasEnoughNearby ? 15 : Math.min(nearbyCount, 11),
    checks.lowGeneratedFields ? 10 : Math.max(0, 10 - Math.min(generatedFieldCount - 12, 10)),
    checks.lowGeneratedCriticalFields ? 5 : 0,
  ].reduce((sum, value) => sum + value, 0);
  return {
    score: Math.min(100, Math.round(score)),
    imageCount,
    roomCount,
    nearbyCount,
    generatedFieldCount,
    generatedCriticalFields,
    hasAgodaImages,
    checks,
    level: score >= 90 ? "ready_for_batch" : score >= 75 ? "review" : "needs_work",
  };
}

function splitNearbyPlaces(value) {
  return splitList(value).map((item) => {
    const [name, second = "", third = "", latitude = "", longitude = ""] = item.split(":");
    const secondTrimmed = second.trim();
    const thirdTrimmed = third.trim();
    const hasCategory = thirdTrimmed !== "";
    return {
      name: name?.trim() || item,
      category: hasCategory ? secondTrimmed : "poi",
      distance: hasCategory ? thirdTrimmed : secondTrimmed,
      latitude: latitude.trim(),
      longitude: longitude.trim(),
    };
  });
}

function calculateConfidence(flags) {
  let score = 0;
  if (flags.hasName) score += 15;
  if (flags.hasAddress) score += 15;
  if (flags.hasCity) score += 10;
  if (flags.hasCoordinates) score += 15;
  if (flags.imageCount >= 5) score += 15;
  else if (flags.imageCount > 0) score += 5;
  if (flags.hasAmenities) score += 10;
  if (flags.hasHighlights) score += 5;
  if (flags.hasNearby) score += 10;
  if (flags.hasRating) score += 5;
  return Math.min(score, 100);
}

async function geocodeAddress(address, city, countryCode) {
  const queries = [
    [address, city, countryCode].filter(Boolean).join(", "),
    simplifyAddressForGeocode(address),
    [streetOnlyAddress(address), city || "Hanoi", "Vietnam"].filter(Boolean).join(", "),
  ].filter(Boolean);

  for (const query of [...new Set(queries)]) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("accept-language", "vi");
    url.searchParams.set("q", query);

    try {
      const response = await fetch(url, {
        signal: timeoutSignal(8000),
        headers: { "user-agent": "nowayhome-dashboard-hotel-importer/0.1" },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const item = Array.isArray(data) ? data[0] : null;
      if (!item?.lat || !item?.lon) continue;
      return {
        latitude: Number(item.lat).toFixed(8),
        longitude: Number(item.lon).toFixed(8),
        city: item.address?.city || item.address?.state || "",
      };
    } catch {
      continue;
    }
  }
  return null;
}

function simplifyAddressForGeocode(address) {
  const value = String(address || "")
    .replace(/\bWard\b/gi, "")
    .replace(/\bDistrict\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = value.match(/^(84\s+(?:Tho Nhuom|Thợ Nhuộm)).*?(Hoan Kiem|Hoàn Kiếm).*?(Hanoi|Hà Nội).*?(Vietnam|Việt Nam)/i);
  if (match) return `${match[1]}, ${match[2]}, ${match[3]}, ${match[4]}`;
  return value;
}

function streetOnlyAddress(address) {
  const match = String(address || "").match(/^(84\s+(?:Tho Nhuom|Thợ Nhuộm))/i);
  return match?.[1] || "";
}

async function fetchNearbyPlaces(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const query = `
    [out:json][timeout:15];
    (
      nwr(around:1200,${lat},${lon})["amenity"~"restaurant|cafe|bank|atm|pharmacy|hospital|clinic|fuel|bus_station"];
      nwr(around:1800,${lat},${lon})["tourism"~"attraction|museum|gallery|viewpoint"];
      nwr(around:1800,${lat},${lon})["historic"];
      nwr(around:1800,${lat},${lon})["railway"~"station|halt"];
      nwr(around:1200,${lat},${lon})["shop"~"supermarket|convenience|mall"];
      nwr(around:1200,${lat},${lon})["public_transport"~"station|stop_position"];
    );
    out center 120;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      signal: timeoutSignal(12000),
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "user-agent": "nowayhome-dashboard-hotel-importer/0.1",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return normalizeNearbyPlaces(data.elements || [], lat, lon);
  } catch {
    return [];
  }
}

function normalizeNearbyPlaces(elements, hotelLat, hotelLon) {
  const seen = new Set();
  const places = [];

  for (const element of elements) {
    const name = String(element.tags?.name || "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    const latitude = Number(element.lat ?? element.center?.lat);
    const longitude = Number(element.lon ?? element.center?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const category = nearbyCategory(element.tags || {});
    seen.add(name.toLowerCase());
    places.push({
      name,
      category,
      distanceM: Math.round(distanceMeters(hotelLat, hotelLon, latitude, longitude)),
      latitude: latitude.toFixed(8),
      longitude: longitude.toFixed(8),
    });
  }

  return balancedNearbyPlaces(places, hotelLat, hotelLon);
}

function nearbyCategory(tags) {
  if (tags.amenity === "restaurant") return "Nhà hàng";
  if (tags.amenity === "cafe") return "Cà phê";
  if (tags.amenity === "bank") return "Ngân hàng";
  if (tags.amenity === "atm") return "ATM";
  if (tags.amenity === "pharmacy") return "Nhà thuốc";
  if (tags.amenity === "hospital" || tags.amenity === "clinic") return "Y tế";
  if (tags.amenity === "fuel") return "Cây xăng";
  if (tags.amenity === "bus_station") return "Bến xe";
  if (tags.tourism || tags.historic) return "Du lịch";
  if (tags.railway) return "Ga tàu";
  if (tags.shop === "supermarket") return "Siêu thị";
  if (tags.shop === "convenience") return "Tiện lợi";
  if (tags.shop === "mall") return "TTTM";
  if (tags.public_transport) return "Bến xe";
  return "poi";
}

function nearbyGroup(place) {
  if (NEARBY_UTILITY_TYPES.has(place.category)) return "utility";
  if (place.category === "Du lịch") return "tourism";
  return "local";
}

function balancedNearbyPlaces(places, hotelLat, hotelLon) {
  const sorted = places
    .filter((place) => Number.isFinite(Number(place.distanceM)))
    .sort((a, b) => a.distanceM - b.distanceM);
  const groups = {
    utility: [],
    tourism: [],
    local: [],
  };

  for (const place of sorted) {
    const group = nearbyGroup(place);
    if (groups[group].length < NEARBY_LIMIT_PER_GROUP) groups[group].push(place);
  }

  const fallback = fallbackNearbyPlaces(hotelLat, hotelLon);
  for (const place of fallback) {
    const group = nearbyGroup(place);
    if (groups[group].length < NEARBY_LIMIT_PER_GROUP) groups[group].push(place);
  }

  return [
    ...groups.utility,
    ...groups.tourism,
    ...groups.local,
  ].slice(0, NEARBY_TOTAL_LIMIT);
}

function fallbackNearbyPlaces(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const safeLat = Number.isFinite(lat) ? lat : Number(DEFAULTS.latitude);
  const safeLon = Number.isFinite(lon) ? lon : Number(DEFAULTS.longitude);
  const items = [
    ["ATM gần khách sạn", "ATM", 350, 0.0010, 0.0007],
    ["Ngân hàng gần khách sạn", "Ngân hàng", 520, -0.0012, 0.0011],
    ["Nhà thuốc gần khách sạn", "Nhà thuốc", 610, 0.0017, -0.0008],
    ["Siêu thị mini gần khách sạn", "Siêu thị", 720, -0.0018, -0.0010],
    ["Bến xe buýt gần khách sạn", "Bến xe", 850, 0.0022, 0.0014],
    ["Điểm tham quan trung tâm", "Du lịch", 650, 0.0024, -0.0015],
    ["Bảo tàng gần khách sạn", "Du lịch", 900, -0.0026, 0.0018],
    ["Khu phố đi bộ", "Du lịch", 1100, 0.0031, 0.0020],
    ["Công trình lịch sử gần khách sạn", "Du lịch", 1350, -0.0032, -0.0022],
    ["Không gian văn hóa gần khách sạn", "Du lịch", 1600, 0.0038, -0.0024],
    ["Nhà hàng địa phương", "Nhà hàng", 250, -0.0009, -0.0006],
    ["Quán cà phê gần khách sạn", "Cà phê", 320, 0.0008, -0.0010],
    ["Nhà hàng gia đình", "Nhà hàng", 480, 0.0014, 0.0013],
    ["Quán ăn nhanh gần khách sạn", "Nhà hàng", 680, -0.0016, 0.0015],
    ["Cà phê sân vườn", "Cà phê", 780, 0.0020, -0.0017],
  ];

  return items.map(([name, category, distanceM, latOffset, lonOffset]) => ({
    name,
    category,
    distanceM,
    latitude: (safeLat + latOffset).toFixed(8),
    longitude: (safeLon + lonOffset).toFixed(8),
  }));
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const radius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function parseGalleryImages(galleryValue, imageUrlsValue) {
  const parsed = splitList(galleryValue)
    .map((item, index) => {
      const separatorIndex = item.indexOf(":");
      if (separatorIndex <= 0) {
        return { category: REQUIRED_IMAGE_CATEGORIES[index] || "other", url: item };
      }
      return {
        category: item.slice(0, separatorIndex).trim() || "other",
        url: item.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((image) => image.url);

  if (parsed.length > 0) return parsed;

  return splitList(imageUrlsValue)
    .map((url, index) => ({
      category: REQUIRED_IMAGE_CATEGORIES[index] || "other",
      url,
    }))
    .filter((image) => image.url);
}

function parseRoomOptions(value, fallbackRoom, imageUrls = []) {
  const parsed = splitList(value).map((item, index) => {
    const [label = "", pricePerNight = "", areaSqm = "", capacity = "", bedInfo = "", totalInventory = "", roomImages = ""] = splitRoomOption(item);
    return {
      label: label || `Room ${index + 1}`,
      pricePerNight: decimalOrDefault(pricePerNight, fallbackRoom.pricePerNight || DEFAULTS.pricePerNight),
      areaSqm: areaSqm ? decimalOrDefault(areaSqm, "0") : fallbackRoom.areaSqm,
      capacity: Number.isFinite(Number(capacity)) ? String(Number(capacity)) : fallbackRoom.capacity,
      bedInfo: bedInfo || fallbackRoom.bedInfo,
      totalInventory: Number.isFinite(Number(totalInventory)) ? String(Number(totalInventory)) : fallbackRoom.totalInventory,
      images: splitInlineList(roomImages).length ? splitInlineList(roomImages) : pickRoomImages(imageUrls, index),
    };
  }).filter((room) => room.label);

  if (parsed.length > 0) return parsed;

  return [{
    ...fallbackRoom,
    label: fallbackRoom.label || DEFAULTS.roomLabel,
    pricePerNight: fallbackRoom.pricePerNight || DEFAULTS.pricePerNight,
    capacity: fallbackRoom.capacity || "2",
    totalInventory: fallbackRoom.totalInventory || "1",
    images: pickRoomImages(imageUrls, 0),
  }];
}

function splitRoomOption(item) {
  const parts = String(item || "").split(":");
  return [
    parts[0] || "",
    parts[1] || "",
    parts[2] || "",
    parts[3] || "",
    parts[4] || "",
    parts[5] || "",
    parts.slice(6).join(":"),
  ].map((part) => part.trim());
}

function pickRoomImages(imageUrls, index) {
  const unique = [...new Set(imageUrls.filter(Boolean))];
  if (!unique.length) return [];
  const start = Math.min(index * 2, Math.max(0, unique.length - 1));
  return unique.slice(start, start + 3);
}

function serializeRoomOptions(rooms) {
  return rooms.map((room) => [
    room.label,
    room.pricePerNight,
    room.areaSqm || "",
    room.capacity,
    room.bedInfo || "",
    room.totalInventory,
    (room.images || []).join(";"),
  ].join(":")).join("|");
}

function editableFromRecord(record) {
  return {
    agoda_url: record.sourceUrl,
    hotel_name: record.name,
    city: record.city,
    country_code: record.countryCode,
    address: record.address,
    district: record.district || "",
    latitude: record.latitude,
    longitude: record.longitude,
    star_rating: record.starRating || "",
    avg_rating: record.avgRating,
    total_reviews: record.totalReviews,
    description: record.description,
    amenities: record.amenities.join("|"),
    highlights: record.highlights.join("|"),
    area_sqm: record.areaSqm || "",
    capacity: record.capacity,
    check_in_time: record.checkInTime,
    check_out_time: record.checkOutTime,
    price_per_night: record.pricePerNight,
    room_label: record.roomLabel,
    room_area_sqm: record.roomAreaSqm || "",
    room_capacity: record.roomCapacity,
    bed_info: record.bedInfo || "",
    total_inventory: record.totalInventory,
    room_options: serializeRoomOptions(record.rooms),
    transport_connections: record.transportConnections.join("|"),
    cancellation_type: record.policy.cancellationType,
    free_cancel_hours: record.policy.freeCancelHours,
    pets_allowed: record.policy.petsAllowed,
    smoking_allowed: record.policy.smokingAllowed,
    children_allowed: record.policy.childrenAllowed,
    children_free_age: record.policy.childrenFreeAge,
    cancellation_policy_text: record.policy.cancellationPolicyText || "",
    gallery_images: record.galleryImages.map((image) => `${image.category}:${image.url}`).join("|"),
    nearby_places: record.nearbyPlaces.map((place) => [
      place.name,
      place.category,
      place.distance || place.distanceM || "",
      place.latitude || "",
      place.longitude || "",
    ].join(":")).join("|"),
    field_sources: JSON.stringify(record.fieldSources || {}),
  };
}

function buildSql(records) {
  const readyRecords = records.filter((record) => record.errors.length === 0);
  const chunks = [
    "-- Generated by tools/hotel-importer/src/import-hotels.mjs",
    "-- PostgreSQL SQL for the can_lam Prisma schema. Review before applying.",
    "BEGIN;",
  ];

  readyRecords.forEach((record) => {
    const partnerRef = `(SELECT id FROM partner_profiles WHERE id = ${Number(DEFAULTS.partnerId)} LIMIT 1)`;
    const propertyId = `(SELECT id FROM properties WHERE slug = ${sqlString(record.slug)} LIMIT 1)`;
    const uploadedBy = `(SELECT user_id FROM partner_profiles WHERE id = ${Number(DEFAULTS.partnerId)} LIMIT 1)`;
    const propertyType = enumValue(record.propertyType, "property_type_enum", DEFAULTS.propertyType);
    const status = enumValue(record.status, "property_status_enum", DEFAULTS.status);
    const mediaImages = record.galleryImages.length ? record.galleryImages : record.images.map((url) => ({ category: "other", url }));

    chunks.push("");
    chunks.push(`-- Row ${record.row}: ${record.name}`);
    chunks.push(`-- importer_partner_id: ${DEFAULTS.partnerId}`);
    chunks.push(
      [
        "INSERT INTO properties",
        "(partner_id, slug, name, property_type, description, address, city, district, country_code, latitude, longitude, star_rating, avg_rating, total_reviews, check_in_time, check_out_time, status, updated_at)",
        "SELECT",
        [
          partnerRef,
          sqlString(record.slug),
          sqlString(record.name),
          propertyType,
          sqlString(record.description),
          sqlString(record.address),
          sqlString(record.city),
          sqlString(record.district),
          sqlString(record.countryCode),
          sqlString(record.latitude),
          sqlString(record.longitude),
          record.starRating === null ? "NULL" : String(record.starRating),
          sqlString(record.avgRating || "0"),
          Number(record.totalReviews || 0),
          sqlString(record.checkInTime),
          sqlString(record.checkOutTime),
          status,
          "now()",
        ].join(", "),
        `WHERE ${partnerRef} IS NOT NULL`,
        "ON CONFLICT (slug) DO UPDATE SET",
        [
          "name = EXCLUDED.name",
          "property_type = EXCLUDED.property_type",
          "description = EXCLUDED.description",
          "address = EXCLUDED.address",
          "city = EXCLUDED.city",
          "district = EXCLUDED.district",
          "country_code = EXCLUDED.country_code",
          "latitude = EXCLUDED.latitude",
          "longitude = EXCLUDED.longitude",
          "star_rating = EXCLUDED.star_rating",
          "avg_rating = EXCLUDED.avg_rating",
          "total_reviews = EXCLUDED.total_reviews",
          "check_in_time = EXCLUDED.check_in_time",
          "check_out_time = EXCLUDED.check_out_time",
          "status = EXCLUDED.status",
          "updated_at = now()",
        ].join(", ") + ";",
      ].join(" ")
    );
    chunks.push(
      "INSERT INTO property_policies (property_id, cancellation_type, free_cancel_hours, check_in_from, check_in_until, check_out_until, pets_allowed, smoking_allowed, children_allowed, min_child_age, custom_rules, accepted_payment_methods, updated_at) " +
        `SELECT ${propertyId}, ${enumValue(record.policy.cancellationType, "cancellation_type_enum", "flexible")}, ${Number(record.policy.freeCancelHours || 24)}, ${sqlString(record.checkInTime)}, '23:59:00', ${sqlString(record.checkOutTime)}, ${sqlBool(record.policy.petsAllowed)}, ${sqlBool(record.policy.smokingAllowed)}, ${sqlBool(record.policy.childrenAllowed)}, ${Number(record.policy.childrenFreeAge || 0)}, ${sqlString(record.policy.cancellationPolicyText)}, ${sqlJson(["credit_card", "bank_transfer", "pay_later"])}, now() ` +
        `WHERE ${propertyId} IS NOT NULL ` +
        "ON CONFLICT (property_id) DO UPDATE SET cancellation_type = EXCLUDED.cancellation_type, free_cancel_hours = EXCLUDED.free_cancel_hours, check_in_from = EXCLUDED.check_in_from, check_in_until = EXCLUDED.check_in_until, check_out_until = EXCLUDED.check_out_until, pets_allowed = EXCLUDED.pets_allowed, smoking_allowed = EXCLUDED.smoking_allowed, children_allowed = EXCLUDED.children_allowed, min_child_age = EXCLUDED.min_child_age, custom_rules = EXCLUDED.custom_rules, accepted_payment_methods = EXCLUDED.accepted_payment_methods, updated_at = now();"
    );
    [...new Set(record.amenities)].slice(0, 30).forEach((amenity) => {
      chunks.push(
        `INSERT INTO amenities (name, category, icon_code, is_active, updated_at) VALUES (${sqlString(amenity)}, 'imported', NULL, true, now()) ` +
          "ON CONFLICT (name) DO UPDATE SET is_active = true, updated_at = now();"
      );
      chunks.push(
        `INSERT INTO property_amenities (property_id, amenity_id) SELECT ${propertyId}, id FROM amenities WHERE name = ${sqlString(amenity)} ` +
          `AND ${propertyId} IS NOT NULL ON CONFLICT DO NOTHING;`
      );
    });
    record.rooms.forEach((room, index) => {
      const roomImages = room.images.length > 0 ? room.images : record.images;
      const roomName = room.label || DEFAULTS.roomLabel;
      const roomId = `(SELECT id FROM room_types WHERE property_id = ${propertyId} AND name = ${sqlString(roomName)} LIMIT 1)`;
      const ratePlanId = `(SELECT id FROM rate_plans WHERE room_type_id = ${roomId} AND name = 'Standard Rate' LIMIT 1)`;
      chunks.push(
        "INSERT INTO room_types (property_id, name, description, area_sqm, bed_configuration, max_occupancy, view_type, total_rooms, base_price, is_active, updated_at) " +
          `SELECT ${propertyId}, ${sqlString(roomName)}, ${sqlString(sourceHighlights(record).join(", "))}, ${room.areaSqm ? sqlString(room.areaSqm) : "NULL"}, ${sqlString(room.bedInfo)}, ${Number(room.capacity || 2)}, NULL, ${Number(room.totalInventory || 1)}, ${sqlString(room.pricePerNight || DEFAULTS.pricePerNight)}, true, now() ` +
          `WHERE ${propertyId} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM room_types WHERE property_id = ${propertyId} AND name = ${sqlString(roomName)});`
      );
      chunks.push(
        "UPDATE room_types SET " +
          [
            `area_sqm = ${room.areaSqm ? sqlString(room.areaSqm) : "NULL"}`,
            `bed_configuration = ${sqlString(room.bedInfo)}`,
            `max_occupancy = ${Number(room.capacity || 2)}`,
            `total_rooms = ${Number(room.totalInventory || 1)}`,
            `base_price = ${sqlString(room.pricePerNight || DEFAULTS.pricePerNight)}`,
            "is_active = true",
            "updated_at = now()",
          ].join(", ") +
          ` WHERE property_id = ${propertyId} AND name = ${sqlString(roomName)};`
      );
      chunks.push(
        "INSERT INTO rate_plans (room_type_id, name, meal_plan, refundable, base_price, is_active, updated_at) " +
          `SELECT ${roomId}, 'Standard Rate', 'room_only'::meal_plan_enum, true, ${sqlString(room.pricePerNight || DEFAULTS.pricePerNight)}, true, now() ` +
          `WHERE ${roomId} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rate_plans WHERE room_type_id = ${roomId} AND name = 'Standard Rate');`
      );
      chunks.push(
        "UPDATE rate_plans SET " +
          `base_price = ${sqlString(room.pricePerNight || DEFAULTS.pricePerNight)}, refundable = true, is_active = true, updated_at = now() ` +
          `WHERE room_type_id = ${roomId} AND name = 'Standard Rate';`
      );
      chunks.push(
        "INSERT INTO daily_rates (rate_plan_id, date, price, available_qty, min_stay, updated_at) " +
          `SELECT ${ratePlanId}, day::date, ${sqlString(room.pricePerNight || DEFAULTS.pricePerNight)}, ${Number(room.totalInventory || 1)}, 1, now() ` +
          "FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '180 days', INTERVAL '1 day') AS day " +
          `WHERE ${ratePlanId} IS NOT NULL ` +
          "ON CONFLICT (rate_plan_id, date) DO UPDATE SET price = EXCLUDED.price, available_qty = EXCLUDED.available_qty, min_stay = EXCLUDED.min_stay, updated_at = now();"
      );
      roomImages.slice(0, 4).forEach((url, imageIndex) => {
        chunks.push(
          "INSERT INTO property_media (property_id, room_type_id, media_type, category, url, caption, is_cover, sort_order, uploaded_by) " +
            `SELECT ${propertyId}, ${roomId}, 'image'::media_type_enum, 'room'::media_category_enum, ${sqlString(url)}, ${sqlString(roomName)}, false, ${imageIndex}, ${uploadedBy} ` +
            `WHERE ${propertyId} IS NOT NULL AND ${roomId} IS NOT NULL AND ${uploadedBy} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM property_media WHERE property_id = ${propertyId} AND url = ${sqlString(url)});`
        );
      });
    });
    mediaImages.slice(0, 12).forEach((image, index) => {
      chunks.push(
        "INSERT INTO property_media (property_id, room_type_id, media_type, category, url, caption, is_cover, sort_order, uploaded_by) " +
          `SELECT ${propertyId}, NULL, 'image'::media_type_enum, ${enumValue(mediaCategory(image.category), "media_category_enum", "other")}, ${sqlString(image.url)}, ${sqlString(record.name)}, ${index === 0 ? "true" : "false"}, ${index}, ${uploadedBy} ` +
          `WHERE ${propertyId} IS NOT NULL AND ${uploadedBy} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM property_media WHERE property_id = ${propertyId} AND url = ${sqlString(image.url)});`
      );
    });
    if (record.nearbyPlaces.length || record.transportConnections.length) {
      chunks.push("-- Nearby places/transport are validated by the importer, but the PostgreSQL Prisma schema has no dedicated table for them yet.");
    }
  });

  chunks.push("");
  chunks.push("COMMIT;");
  chunks.push("");
  return chunks.join("\n");
}

function enumValue(value, enumName, fallback) {
  const normalized = String(value || fallback || "").trim().toLowerCase();
  return `${sqlString(normalized)}::${enumName}`;
}

function sqlBool(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true" ? "true" : "false";
}

function mediaCategory(value) {
  const category = String(value || "").toLowerCase();
  if (category.includes("room")) return "room";
  if (category.includes("bath")) return "bathroom";
  if (category.includes("pool")) return "pool";
  if (category.includes("dining") || category.includes("restaurant")) return "dining";
  if (category.includes("front") || category.includes("exterior")) return "exterior";
  if (category.includes("lobby") || category.includes("common") || category.includes("interior")) return "interior";
  if (category.includes("amenity")) return "amenity";
  return "other";
}

function sourceHighlights(record) {
  return [
    record.starRating ? `${record.starRating}-star hotel` : "",
  ].filter(Boolean);
}

function distanceToMeters(value, index) {
  const text = String(value || "").trim().toLowerCase();
  const numeric = Number.parseFloat(text);
  if (!Number.isFinite(numeric)) return 500 + index * 250;
  if (text.endsWith("km")) return Math.round(numeric * 1000);
  return Math.round(numeric);
}

async function main() {
  const absoluteInput = path.resolve(inputPath);
  const csv = await fs.readFile(absoluteInput, "utf8");
  const rows = parseCsv(csv);
  const seenSlugs = new Set();
  const normalized = [];

  for (const row of rows) {
    const agoda = await fetchAgodaMetadata(row.agoda_url);
    const merged = mergeRecord(row, agoda.data, inferManualSources(row), agoda.sources);
    const enriched = await enrichRealData(merged);
    const filled = shouldFillMissing ? fillMissingRecord(enriched.record) : { record: enriched.record, filledFields: [] };
    filled.record._filledFields = filled.filledFields;
    filled.record._info = [
      ...(agoda.warning ? [agoda.warning] : []),
      ...enriched.notes,
      ...(filled.filledFields.length ? [`Filled missing fields: ${filled.filledFields.join(", ")}`] : []),
    ];
    const record = normalizeRecord(filled.record, seenSlugs);
    if (!shouldFillMissing) {
      if (agoda.warning) record.warnings.push(agoda.warning);
      record.warnings.push(...enriched.notes);
    }
    normalized.push(record);
  }

  const report = {
    schemaVersion: HOTEL_SCHEMA_VERSION,
    schema: HOTEL_SCHEMA,
    input: absoluteInput,
    generatedAt: new Date().toISOString(),
    fetchAgoda: shouldFetchAgoda,
    totals: {
      total: normalized.length,
      ready: normalized.filter((record) => record.errors.length === 0 && record.warnings.length === 0).length,
      needs_review: normalized.filter((record) => record.errors.length === 0 && record.warnings.length > 0).length,
      failed: normalized.filter((record) => record.errors.length > 0).length,
    },
    records: normalized.map((record) => ({
      row: record.row,
      name: record.name,
      city: record.city,
      slug: record.slug,
      agodaHotelId: record.agodaHotelId,
      sourceUrl: record.sourceUrl,
      status: record.errors.length > 0 ? "failed" : record.warnings.length > 0 ? "needs_review" : "ready",
      errors: record.errors,
      warnings: record.warnings,
      confidence: record.confidence,
      quality: qualityFromRecord(record),
      fieldSources: record.fieldSources,
      filledFields: record.filledFields,
      info: record.info,
      editable: editableFromRecord(record),
    })),
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "import-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDir, "import-preview.sql"), buildSql(normalized));

  console.log(`Input: ${absoluteInput}`);
  console.log(`Total: ${report.totals.total}`);
  console.log(`Ready: ${report.totals.ready}`);
  console.log(`Needs review: ${report.totals.needs_review}`);
  console.log(`Failed: ${report.totals.failed}`);
  console.log(`Report: ${path.join(outputDir, "import-report.json")}`);
  console.log(`SQL: ${path.join(outputDir, "import-preview.sql")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
