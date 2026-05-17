import config from "../../config/index.js";
import logger from "../../utils/logger.js";

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

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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

export const searchPlaces = async (q) => {
  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = placesCacheGet(cacheKey);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&accept-language=vi&countrycodes=vn&q=${encodeURIComponent(q)}`;
  const response = await fetch(url, { headers: { "User-Agent": PLACES_USER_AGENT } });
  if (!response.ok) throw new Error("Khong goi duoc dich vu tim dia diem");
  
  const data = await response.json();
  const results = (Array.isArray(data) ? data : []).map((item) => ({
    name: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
  })).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
  
  placesCacheSet(cacheKey, results);
  return results;
};

export const getNearbyPlaces = async (lat, lon, radius, cats) => {
  const filteredCats = cats.filter((item) => CAT_FILTERS[item]);
  const cacheKey = `nearby:${lat.toFixed(5)}:${lon.toFixed(5)}:${radius}:${filteredCats.sort().join(",")}`;
  const cached = placesCacheGet(cacheKey);
  if (cached) return cached;

  const data = await fetchNearbyPlaces(buildNearbyQuery(lat, lon, radius, filteredCats));
  if (!data?.elements) {
    throw new Error("Khong goi duoc dich vu dia diem gan");
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
  return results;
};
