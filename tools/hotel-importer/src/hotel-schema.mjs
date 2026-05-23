export const HOTEL_SCHEMA_VERSION = 1;

export const FIELD_SOURCES = Object.freeze({
  AGODA: "agoda",
  OSM: "osm",
  GENERATED: "generated",
  MANUAL: "manual",
});

export const REVIEW_INPUT_HEADERS = [
  "agoda_url",
  "hotel_name",
  "city",
  "country_code",
  "address",
  "district",
  "latitude",
  "longitude",
  "star_rating",
  "avg_rating",
  "total_reviews",
  "description",
  "amenities",
  "highlights",
  "area_sqm",
  "capacity",
  "check_in_time",
  "check_out_time",
  "price_per_night",
  "room_label",
  "room_area_sqm",
  "room_capacity",
  "bed_info",
  "total_inventory",
  "room_options",
  "transport_connections",
  "cancellation_type",
  "free_cancel_hours",
  "pets_allowed",
  "smoking_allowed",
  "children_allowed",
  "children_free_age",
  "cancellation_policy_text",
  "gallery_images",
  "nearby_places",
  "field_sources",
];

export const HOTEL_SCHEMA = Object.freeze({
  version: HOTEL_SCHEMA_VERSION,
  property: [
    "agoda_url",
    "agoda_hotel_id",
    "hotel_name",
    "property_type",
    "description",
    "address",
    "city",
    "district",
    "country_code",
    "latitude",
    "longitude",
    "star_rating",
    "avg_rating",
    "total_reviews",
    "status",
  ],
  content: [
    "amenities",
    "highlights",
    "gallery_images",
    "nearby_places",
    "transport_connections",
  ],
  rooms: [
    "room_options",
    "price_per_night",
    "room_label",
    "room_area_sqm",
    "room_capacity",
    "bed_info",
    "total_inventory",
    "area_sqm",
    "capacity",
  ],
  policies: [
    "check_in_time",
    "check_out_time",
    "cancellation_type",
    "free_cancel_hours",
    "pets_allowed",
    "smoking_allowed",
    "children_allowed",
    "children_free_age",
    "cancellation_policy_text",
  ],
});

export const CRITICAL_QUALITY_FIELDS = [
  "hotel_name",
  "address",
  "latitude",
  "longitude",
  "gallery_images",
  "room_options",
  "nearby_places",
];

export function parseFieldSources(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return sanitizeFieldSources(value);
  try {
    return sanitizeFieldSources(JSON.parse(String(value)));
  } catch {
    return {};
  }
}

export function stringifyFieldSources(value) {
  const sources = sanitizeFieldSources(value);
  return Object.keys(sources).length ? JSON.stringify(sources) : "";
}

export function sanitizeFieldSources(value) {
  const allowed = new Set(Object.values(FIELD_SOURCES));
  const output = {};
  for (const [field, source] of Object.entries(value || {})) {
    if (allowed.has(source)) output[field] = source;
  }
  return output;
}

export function markFieldSource(sources, field, source) {
  if (!field || !Object.values(FIELD_SOURCES).includes(source)) return sources || {};
  return { ...(sources || {}), [field]: source };
}

export function markFieldSources(sources, fields, source) {
  return fields.reduce((next, field) => markFieldSource(next, field, source), sources || {});
}

export function inferManualSources(record) {
  let sources = parseFieldSources(record?.field_sources);
  for (const header of REVIEW_INPUT_HEADERS) {
    if (header === "field_sources") continue;
    const value = record?.[header];
    if (value !== undefined && value !== null && String(value).trim() !== "" && !sources[header]) {
      sources[header] = FIELD_SOURCES.MANUAL;
    }
  }
  return sources;
}
