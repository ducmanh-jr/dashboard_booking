import { useState, useEffect } from "react";
import { searchPlaces, createRoom, requestUpdateRoom, fetchNearbyPlaces } from "../../../api/roomsApi";
import { Room, NearbyPlace, ROOM_TYPES, CÓMMON_AMENITIES } from "../../../shared/types";

const REQUIRED_IMAGE_SLOTS = [
  { key: "hotel_front", label: "Mặt tiền khách sạn" },
  { key: "lobby", label: "Sảnh / lễ tân" },
  { key: "room_overview", label: "Không gian nghỉ ngơi" },
  { key: "common_area", label: "Khu vực chung" },
  { key: "exterior", label: "Khuôn viên / ngoại cảnh" },
] as const;

const EXTRA_IMAGE_CATEGORIES = [
  { value: "amenity", label: "Tiện ích" },
  { value: "balcony", label: "Ban cong / view" },
  { value: "lobby", label: "Sanh / le tan" },
  { value: "other", label: "Khác" },
];

const NEARBY_CATS: { key: string; label: string; icon: string }[] = [
  { key: "tourism", label: "Du lịch", icon: "🏛️" },
  { key: "restaurant", label: "Nhà hàng", icon: "🍽️" },
  { key: "cafe", label: "Cà phê", icon: "☕" },
  { key: "supermarket", label: "Siêu thị", icon: "🛒" },
  { key: "mall", label: "TTTM", icon: "🏬" },
  { key: "convenience", label: "Tiện lợi", icon: "🏪" },
  { key: "marketplace", label: "Chợ", icon: "🧺" },
  { key: "hospital", label: "Bệnh viện", icon: "🏥" },
  { key: "pharmacy", label: "Nhà thuốc", icon: "💊" },
  { key: "school", label: "Trường học", icon: "🏫" },
  { key: "bank", label: "Ngân hàng", icon: "🏦" },
  { key: "atm", label: "ATM", icon: "🏧" },
  { key: "fuel", label: "Cây xăng", icon: "⛽" },
  { key: "cinema", label: "Rạp phim", icon: "🎬" },
  { key: "bus_station", label: "Bến xe", icon: "🚌" },
  { key: "railway", label: "Ga tàu", icon: "🚉" },
  { key: "airport", label: "Sân bay", icon: "✈️" },
];

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const OVERPASS_FILTERS: Record<string, string[]> = {
  tourism: [
    '["tourism"~"attraction|museum|viewpoint|theme_park|zoo|aquarium"]',
    '["historic"~"monument|memorial|ruins|castle|fort|archaeological_site"]',
    '["amenity"="place_of_worship"]',
    '["leisure"~"park|garden|nature_reserve"]',
  ],
  restaurant: ['["amenity"="restaurant"]'],
  cafe: ['["amenity"="cafe"]'],
  supermarket: ['["shop"="supermarket"]'],
  mall: ['["shop"~"mall|department_store"]'],
  convenience: ['["shop"="convenience"]'],
  marketplace: ['["amenity"="marketplace"]'],
  hospital: ['["amenity"="hospital"]', '["amenity"="clinic"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  school: ['["amenity"~"school|university|college"]'],
  bank: ['["amenity"="bank"]'],
  atm: ['["amenity"="atm"]'],
  fuel: ['["amenity"="fuel"]'],
  cinema: ['["amenity"="cinema"]'],
  bus_station: ['["amenity"~"bus_station|bus_stop"]'],
  railway: ['["railway"~"station|halt|subway_entrance"]'],
  airport: ['["aeroway"~"aerodrome|terminal"]'],
};

const NO_NAME_RE = /^(unnamed|noname|no name|n\/a|\?)$/i;

const STEPS = ["Thông tin", "Vị trí", "Tiện ích", "Lân cận", "Ảnh & chính sách", "Hạng phòng", "Xác nhận"];

function fmtVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function inferCityFromAddress(label: string) {
  const parts = label.split(",").flatMap((part) => {
    const p = part.trim();
    return p ? [p] : [];
  });
  const ignored = new Set(["vietnam", "viet nam", "viet nam"]);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const normalized = parts[i].toLowerCase();
    if (!ignored.has(normalized) && !/^\d+$/.test(parts[i])) return parts[i];
  }
  return "";
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function hasMeaningfulName(name: string) {
  return !!name.trim() && !NO_NAME_RE.test(name.trim());
}

function getNearbyLabel(key: string) {
  return NEARBY_CATS.find((item) => item.key === key)?.label || key;
}

function detectNearbyCategory(tags: Record<string, string | undefined>) {
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "mall" || tags.shop === "department_store") return "mall";
  if (tags.shop === "convenience") return "convenience";
  if (tags.amenity === "marketplace") return "marketplace";
  if (tags.amenity === "hospital" || tags.amenity === "clinic") return "hospital";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (tags.amenity === "school" || tags.amenity === "university" || tags.amenity === "college") return "school";
  if (tags.amenity === "bank") return "bank";
  if (tags.amenity === "atm") return "atm";
  if (tags.amenity === "fuel") return "fuel";
  if (tags.amenity === "cinema") return "cinema";
  if (tags.amenity === "bus_station" || tags.amenity === "bus_stop") return "bus_station";
  if (tags.railway) return "railway";
  if (tags.aeroway) return "airport";
  if (
    tags.tourism
    || tags.historic
    || tags.amenity === "place_of_worship"
    || tags.leisure === "park"
    || tags.leisure === "garden"
    || tags.leisure === "nature_reserve"
  ) return "tourism";
  return null;
}

function buildNearbyQuery(lat: number, lon: number, radius: number, cats: string[]) {
  const activeCats = cats.length ? cats : Object.keys(OVERPASS_FILTERS);
  const statements = activeCats
    .flatMap((cat) => (OVERPASS_FILTERS[cat] || []).flatMap((filter) => (
      ["node", "way", "relation"].map((kind) => `${kind}${filter}(around:${radius},${lat},${lon});`)
    )))
    .join("\n");
  return `[out:json][timeout:25];\n(\n${statements}\n);\nout center tags;`;
}

async function fetchNearbyDirect(lat: number, lon: number, radius: number, cats: string[]) {
  const query = buildNearbyQuery(lat, lon, radius, cats);
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
      });
      if (!response.ok) continue;
      const data = await response.json();
      const seen = new Set<string>();
      const results = (data.elements || [])
        .flatMap((element: any) => {
          const tags = (element.tags || {}) as Record<string, string | undefined>;
          const pointLat = element.type === "node" ? Number(element.lat) : Number(element.center?.lat);
          const pointLon = element.type === "node" ? Number(element.lon) : Number(element.center?.lon);
          const name = tags["name:vi"] || tags.name || tags["name:en"] || "";
          const category = detectNearbyCategory(tags);
          if (!Number.isFinite(pointLat) || !Number.isFinite(pointLon) || !hasMeaningfulName(name) || !category) return [];
          const dedupeKey = `${name}|${pointLat.toFixed(5)}|${pointLon.toFixed(5)}`;
          if (seen.has(dedupeKey)) return [];
          seen.add(dedupeKey);
          return [{
            name,
            type: getNearbyLabel(category),
            distanceM: Math.round(haversine(lat, lon, pointLat, pointLon)),
            lat: pointLat,
            lon: pointLon,
          }];
        })
        .sort((a: any, b: any) => a.distanceM - b.distanceM)
        .slice(0, 50);
      return results as NearbyPlace[];
    } catch { continue; }
  }
  return null;
}

function nearbyKey(place: Pick<NearbyPlace, "name" | "lat" | "lon">) {
  return `${place.name}|${place.lat}|${place.lon}`;
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label} {required && <span className="text-destructive">*</span>}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background" />
    </div>
  );
}

function buildRequiredImageState(room?: Room | null) {
  return Object.fromEntries(
    REQUIRED_IMAGE_SLOTS.map((slot) => {
      const image = room?.images?.find((item) => item.category === slot.key);
      return [slot.key, { url: image?.url || "", caption: image?.caption || "" }];
    })
  ) as Record<string, { url: string; caption: string }>;
}

function buildExtraImages(room?: Room | null) {
  return (room?.images || [])
    .filter((item) => !REQUIRED_IMAGE_SLOTS.some((slot) => slot.key === item.category))
    .map((item) => ({
      category: item.category || "other",
      url: item.url,
      caption: item.caption || "",
    }));
}

export function RoomEditorForm({
  mode,
  room,
  onDone,
  onCancel,
}: {
  mode: "create" | "edit";
  room?: Room | null;
  onDone: (message: string) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(room?.name || "");
  const [description, setDescription] = useState(room?.description || "");
  const [roomType, setRoomType] = useState(room?.roomType || ROOM_TYPES[0]);
  const [area, setArea] = useState(room?.area == null ? "" : String(room.area));
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 2));
  const [highlights, setHighlights] = useState<string[]>((room?.highlights || []).filter(h => !h.toLowerCase().includes("agoda source")));
  const [customHighlight, setCustomHighlight] = useState("");
  const [city, setCity] = useState(room?.city || "");
  const [addressQuery, setAddressQuery] = useState(room?.address || "");
  const [addressResults, setAddressResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ name: string; lat: number; lon: number } | null>(
    room ? { name: room.address, lat: room.latitude, lon: room.longitude } : null
  );
  const [transportConnections, setTransportConnections] = useState<{ name: string; distance: string; note: string }[]>(
    room?.transportConnections?.length
      ? room.transportConnections.map((item) => ({ name: item.name, distance: item.distance, note: item.note || "" }))
      : [{ name: "", distance: "", note: "" }]
  );
  const [amenities, setAmenities] = useState<string[]>((room?.amenities || []).filter(a => !a.toLowerCase().includes("agoda source")));
  const [customAmenity, setCustomAmenity] = useState("");
  const [radius, setRadius] = useState(1500);
  const [selectedCats, setSelectedCats] = useState<string[]>(["tourism", "restaurant", "cafe", "supermarket", "hospital"]);
  const [nearby, setNearby] = useState<NearbyPlace[]>(room?.nearbyPlaces || []);
  const [pickedNearby, setPickedNearby] = useState<Record<string, boolean>>(() => Object.fromEntries(
    (room?.nearbyPlaces || []).map((item) => [nearbyKey(item), true])
  ));
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [searchedNearby, setSearchedNearby] = useState(Boolean(room?.nearbyPlaces?.length));
  const [requiredImages, setRequiredImages] = useState<Record<string, { url: string; caption: string }>>(() => buildRequiredImageState(room));
  const [extraImages, setExtraImages] = useState<{ category: string; url: string; caption: string }[]>(() => buildExtraImages(room));
  const [policy, setPolicy] = useState({
    checkInTime: room?.policy?.checkInTime || "14:00",
    checkOutTime: room?.policy?.checkOutTime || "12:00",
    childrenFreeAge: room?.policy?.childrenFreeAge == null ? "6" : String(room.policy.childrenFreeAge),
    refundable: room?.policy?.refundable ?? true,
    freeCancelHours: room?.policy?.freeCancelHours == null ? "24" : String(room.policy.freeCancelHours),
    cancellationNote: room?.policy?.cancellationNote || "",
    petAllowed: room?.policy?.petAllowed ?? false,
    smokingAllowed: room?.policy?.smokingAllowed ?? false,
    otherRules: room?.policy?.otherRules || "",
  });
  const [prices, setPrices] = useState<{ label: string; pricePerNight: string; totalInventory: string; area: string; capacity: string; bedInfo: string; amenities: string; imageUrls: string[] }[]>(
    room?.prices?.length
      ? room.prices.map((item) => ({
        label: item.label,
        pricePerNight: String(item.pricePerNight),
        totalInventory: String(item.totalInventory ?? 1),
        area: item.area == null ? "" : String(item.area),
        capacity: item.capacity == null ? "" : String(item.capacity),
        bedInfo: item.bedInfo || "",
        amenities: item.amenities || "",
        imageUrls: item.imageUrls || [],
      }))
      : [{ label: "Standard", pricePerNight: "", totalInventory: "1", area: "", capacity: "2", bedInfo: "", amenities: "", imageUrls: [] }]
  );

  const [platformFeePct, setPlatformFeePct] = useState(String(room?.platformFeePct ?? 10));
  const [promotionPct, setPromotionPct] = useState(String(room?.promotionPct ?? 0));
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function searchAddress() {
    if (!addressQuery.trim()) return;
    setSearching(true);
    setErr("");
    try {
      const result = await searchPlaces(addressQuery);
      setAddressResults(result.results);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setSearching(false);
    }
  }

  async function searchNearby() {
    if (!picked) return;
    setLoadingNearby(true);
    setSearchedNearby(true);
    setErr("");
    setNearby([]);
    try {
      const directResults = await fetchNearbyDirect(picked.lat, picked.lon, radius, selectedCats);
      if (directResults) {
        setNearby(directResults);
        return;
      }
      const cats = selectedCats.join(",");
      const result = await fetchNearbyPlaces(picked.lat, picked.lon, radius, cats);
      setNearby(result.results);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoadingNearby(false);
    }
  }

  function toggleAmenity(item: string) {
    setAmenities((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  function addCustomAmenity() {
    const value = customAmenity.trim();
    if (value && !amenities.includes(value)) setAmenities([...amenities, value]);
    setCustomAmenity("");
  }

  function addHighlight() {
    const value = customHighlight.trim();
    if (value && !highlights.includes(value)) setHighlights([...highlights, value]);
    setCustomHighlight("");
  }

  function toggleCat(item: string) {
    setSelectedCats((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  function toggleNearby(place: NearbyPlace) {
    const key = nearbyKey(place);
    setPickedNearby((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateTransport(index: number, key: "name" | "distance" | "note", value: string) {
    const next = [...transportConnections];
    next[index] = { ...next[index], [key]: value };
    setTransportConnections(next);
  }

  function updateRequiredImage(category: string, key: "url" | "caption", value: string) {
    setRequiredImages((current) => ({
      ...current,
      [category]: { ...current[category], [key]: value },
    }));
  }

  function updateExtraImage(index: number, key: "category" | "url" | "caption", value: string) {
    const next = [...extraImages];
    next[index] = { ...next[index], [key]: value };
    setExtraImages(next);
  }

  const validPrices = prices
    .filter((item) => item.label.trim() && Number(item.pricePerNight) > 0)
    .map((item) => ({
      label: item.label.trim(),
      pricePerNight: Number(item.pricePerNight),
      totalInventory: Number(item.totalInventory || 1),
      area: item.area ? Number(item.area) : null,
      capacity: item.capacity ? Number(item.capacity) : null,
      bedInfo: item.bedInfo.trim() || null,
      imageUrls: item.imageUrls.filter(u => u.trim()),
      amenities: (item.amenities || "").split(",").filter(a => !a.toLowerCase().includes("agoda source")).join(","),
    }));

  const validTransportConnections = transportConnections
    .map((item) => ({ name: item.name.trim(), distance: item.distance.trim(), note: item.note.trim() || null }))
    .filter((item) => item.name && item.distance);
  const selectedNearbyList = nearby.filter((item) => pickedNearby[nearbyKey(item)]);
  const serializedImages = [
    ...REQUIRED_IMAGE_SLOTS
      .map((slot) => ({
        category: slot.key,
        url: requiredImages[slot.key]?.url.trim() || "",
        caption: requiredImages[slot.key]?.caption.trim() || "",
      }))
      .filter((item) => item.url),
    ...extraImages
      .map((item) => ({
        category: item.category.trim(),
        url: item.url.trim(),
        caption: item.caption.trim(),
      }))
      .filter((item) => item.category && item.url),
  ];
  const hasRequiredImages = REQUIRED_IMAGE_SLOTS.every((slot) => requiredImages[slot.key]?.url.trim());
  const hasPolicyBasics = !!policy.checkInTime
    && !!policy.checkOutTime
    && policy.childrenFreeAge !== ""
    && (!policy.refundable || Number(policy.freeCancelHours) > 0);

  function canNext() {
    if (step === 1) return !!name.trim() && highlights.length > 0;
    if (step === 2) return !!picked && validTransportConnections.length > 0;
    if (step === 5) return hasRequiredImages && hasPolicyBasics;
    if (step === 6) return validPrices.length > 0;
    return true;
  }

  async function submit() {
    if (!picked) {
      setErr("Thiếu vị trí");
      return;
    }
    if (!validPrices.length) {
      setErr("Thiếu giá");
      return;
    }

    setSubmitting(true);
    setErr("");
    try {
      const body = {
        name,
        description,
        roomType,
        area: area ? Number(area) : null,
        capacity: Number(capacity),
        address: picked.name,
        city: city.trim() || inferCityFromAddress(picked.name),
        latitude: picked.lat,
        longitude: picked.lon,
        amenities,
        highlights,
        transportConnections: validTransportConnections,
        nearbyPlaces: selectedNearbyList,
        images: serializedImages.map((item) => ({
          category: item.category,
          url: item.url,
          caption: item.caption || null,
        })),
        policy: {
          checkInTime: policy.checkInTime,
          checkOutTime: policy.checkOutTime,
          childrenFreeAge: Number(policy.childrenFreeAge),
          refundable: policy.refundable,
          freeCancelHours: policy.refundable ? Number(policy.freeCancelHours) : null,
          cancellationNote: policy.cancellationNote.trim() || null,
          petAllowed: policy.petAllowed,
          smokingAllowed: policy.smokingAllowed,
          otherRules: policy.otherRules.trim() || null,
        },
        prices: validPrices,
        platformFeePct: Number(platformFeePct),
        promotionPct: Number(promotionPct),
      };

      if (mode === "create") {
        await createRoom(body);
        onDone("Đã gửi khách sạn mới chờ admin duyệt.");
      } else if (room) {
        await requestUpdateRoom(room.id, body);
        onDone(`Đã gửi yêu cầu sửa khách sạn "${name}" chờ admin duyệt.`);
      }

    } catch (error: any) {
      setErr(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs flex-wrap">
          {STEPS.map((label, index) => {
            const currentStep = index + 1;
            return (
              <div key={currentStep} className={`flex items-center gap-1.5 ${currentStep === step ? "text-primary font-semibold" : currentStep < step ? "text-foreground" : "text-muted-foreground"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${currentStep <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {currentStep}
                </span>
                <span>{label}</span>
                {currentStep < STEPS.length && <span className="text-muted-foreground/50 mx-0.5">&gt;</span>}
              </div>
            );
          })}
        </div>
        {onCancel && (
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border hover:bg-accent">
            Hủy
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <Input label="Tên khách sạn" value={name} onChange={setName} required />
          <div>
            <label className="block text-sm font-medium mb-1">Hạng sao / Loại hình *</label>
            <select
              value={roomType}
              onChange={(event) => {
                setRoomType(event.target.value);
                if (prices.length === 1 && !prices[0].pricePerNight) {
                  setPrices([{ label: "Standard", pricePerNight: "", totalInventory: "1", area: "", capacity: "2", bedInfo: "", amenities: "", imageUrls: [] }]);
                }
              }}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              {ROOM_TYPES.map((item: string) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Diện tích (m2)" type="number" value={area} onChange={setArea} />
            <Input label="Sức chứa (người)" type="number" value={capacity} onChange={setCapacity} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="w-full px-3 py-2 border rounded-md bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Điểm nhấn nổi bật *</label>
            <div className="flex flex-wrap gap-2">
              {highlights.map((item) => (
                <span key={item} className="text-xs px-2 py-1 rounded-full bg-muted">
                  {item} <button onClick={() => setHighlights(highlights.filter((value) => value !== item))} className="ml-1 text-destructive">×</button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customHighlight}
                onChange={(event) => setCustomHighlight(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHighlight();
                  }
                }}
                placeholder='VD: Yen tinh, Check-in 24/7, Gan khu an uong'
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
              />
              <button type="button" onClick={addHighlight} className="px-3 py-2 text-sm rounded-md bg-muted hover:bg-accent">Thêm</button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Input label="Thành phố" value={city} onChange={setCity} />
          <div>
            <label className="block text-sm font-medium mb-1">Tìm địa chỉ thật (OpenStreetMap) *</label>
            <div className="flex gap-2">
              <input
                value={addressQuery}
                onChange={(event) => setAddressQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchAddress();
                  }
                }}
                placeholder="VD: 123 Le Loi, Thu Duc"
                className="flex-1 px-3 py-2 border rounded-md bg-background"
              />
              <button type="button" onClick={searchAddress} disabled={searching} className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">
                {searching ? "Đang tìm..." : "Tìm"}
              </button>
            </div>
          </div>
          {addressResults.length > 0 && (
            <ul className="border rounded-md divide-y max-h-60 overflow-y-auto bg-card shadow-sm">
              {addressResults.map((item, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(item);
                      setAddressQuery(item.name);
                      setCity((current) => current.trim() || inferCityFromAddress(item.name));
                      setAddressResults([]);
                      setNearby([]);
                      setPickedNearby({});
                      setSearchedNearby(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picked && (
            <div className="bg-muted/10 p-3 rounded-md text-sm border">
              <div className="font-medium">Đã chọn vị trí:</div>
              <div>{picked.name}</div>
              <div className="text-xs text-muted-foreground mt-1">Tọa độ: {picked.lat.toFixed(5)}, {picked.lon.toFixed(5)}</div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Kết nối giao thông / địa điểm quan trọng *</label>
              <button type="button" onClick={() => setTransportConnections([...transportConnections, { name: "", distance: "", note: "" }])} className="text-sm text-primary font-medium">
                + Thêm mục
              </button>
            </div>
            <div className="space-y-2">
              {transportConnections.map((item, index) => (
                <div key={index} className="grid md:grid-cols-[1.2fr,0.7fr,1fr,auto] gap-2">
                  <input value={item.name} onChange={(event) => updateTransport(index, "name", event.target.value)} placeholder="Địa điểm" className="px-3 py-2 border rounded-md bg-background text-sm" />
                  <input value={item.distance} onChange={(event) => updateTransport(index, "distance", event.target.value)} placeholder="Khoảng cách" className="px-3 py-2 border rounded-md bg-background text-sm" />
                  <input value={item.note} onChange={(event) => updateTransport(index, "note", event.target.value)} placeholder="Ghi chú thêm" className="px-3 py-2 border rounded-md bg-background text-sm" />
                  {transportConnections.length > 1 && (
                    <button type="button" onClick={() => setTransportConnections(transportConnections.filter((_, itemIndex) => itemIndex !== index))} className="px-2 text-destructive font-bold">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Chọn tiện ích chung của khách sạn</label>
            <div className="flex flex-wrap gap-2">
              {CÓMMON_AMENITIES.map((item: string) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleAmenity(item)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition ${amenities.includes(item) ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={customAmenity}
                onChange={(event) => setCustomAmenity(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomAmenity();
                  }
                }}
                placeholder="Them tien ich khac (vd: San vuon)"
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
              />
              <button type="button" onClick={addCustomAmenity} className="px-3 py-2 text-sm rounded-md bg-muted hover:bg-accent font-medium">Thêm</button>
            </div>
            {amenities.filter((item) => !CÓMMON_AMENITIES.includes(item)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {amenities.filter((item) => !CÓMMON_AMENITIES.includes(item)).map((item) => (
                  <span key={item} className="text-xs px-2 py-0.5 rounded bg-muted flex items-center gap-1 border">
                    {item} <button onClick={() => toggleAmenity(item)} className="text-destructive font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 italic">Đã chọn {amenities.length} tiện ích.</p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          {!picked && <p className="text-sm text-destructive">Vui long chon vi tri o buoc 2 truoc.</p>}
          {picked && (
            <>
              <div className="bg-muted/10 border rounded-md p-3 text-xs text-muted-foreground">
                Tâm bán kính: <b className="text-foreground">{picked.name}</b>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Bán kính tìm kiếm</label>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{(radius / 1000).toFixed(1)} km</span>
                </div>
                <input type="range" min={300} max={5000} step={100} value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
                  <span>300m</span>
                  <span>5km</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Danh mục cần tìm</label>
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => setSelectedCats(NEARBY_CATS.map((item) => item.key))} className="text-primary underline">Chọn tất cả</button>
                    <button type="button" onClick={() => setSelectedCats([])} className="text-muted-foreground underline">Bỏ chọn</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {NEARBY_CATS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleCat(item.key)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition ${selectedCats.includes(item.key) ? "bg-primary/10 border-primary text-primary font-medium" : "bg-card border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={searchNearby} disabled={loadingNearby || selectedCats.length === 0} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {loadingNearby ? "Đang tìm..." : "Tìm địa điểm gần đây"}
              </button>
              {searchedNearby && !loadingNearby && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-muted-foreground">Kết quả</span>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {nearby.length} địa điểm · đã chọn {selectedNearbyList.length}
                    </span>
                  </div>
                  {nearby.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md bg-muted/10">
                      Không tìm thấy địa điểm nào trong bán kính này.
                    </div>
                  ) : (
                    <div className="border rounded-md max-h-80 overflow-y-auto divide-y bg-card">
                      {nearby.map((item, index) => {
                        const checked = !!pickedNearby[nearbyKey(item)];
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => toggleNearby(item)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition ${checked ? "bg-primary/5" : "hover:bg-accent"}`}
                          >
                            <input type="checkbox" readOnly checked={checked} className="accent-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.type}</div>
                            </div>
                            <span className={`text-xs font-bold ${item.distanceM < 500 ? "text-green-600" : "text-muted-foreground"}`}>{item.distanceM} m</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Hình ảnh khách sạn *</label>
              <span className="text-xs text-muted-foreground">Cần 5 ảnh bắt buộc, có thể thêm ảnh bổ sung</span>
            </div>
            <div className="space-y-3">
              {REQUIRED_IMAGE_SLOTS.map((slot) => (
                <div key={slot.key} className="border rounded-lg p-3 space-y-2 bg-muted/10">
                  <div className="text-sm font-bold text-foreground">{slot.label}</div>
                  <input value={requiredImages[slot.key]?.url || ""} onChange={(event) => updateRequiredImage(slot.key, "url", event.target.value)} placeholder="URL ảnh chất lượng cao" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  <input value={requiredImages[slot.key]?.caption || ""} onChange={(event) => updateRequiredImage(slot.key, "caption", event.target.value)} placeholder="Mô tả ngắn (không bắt buộc)" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                  {requiredImages[slot.key]?.url && <img src={requiredImages[slot.key].url} alt={slot.label} className="w-full h-40 object-cover rounded-md border shadow-sm" />}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Ảnh bổ sung</label>
              <button type="button" onClick={() => setExtraImages([...extraImages, { category: "other", url: "", caption: "" }])} className="text-sm text-primary font-medium">
                + Thêm ảnh
              </button>
            </div>
            <div className="space-y-2">
              {extraImages.length === 0 && <div className="text-sm text-muted-foreground italic">Không có ảnh bổ sung.</div>}
              {extraImages.map((item, index) => (
                <div key={index} className="grid md:grid-cols-[0.8fr,1.5fr,1fr,auto] gap-2 p-3 border rounded-lg bg-muted/10">
                  <select value={item.category} onChange={(event) => updateExtraImage(index, "category", event.target.value)} className="px-3 py-2 border rounded-md bg-background text-sm">
                    {EXTRA_IMAGE_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <input value={item.url} onChange={(event) => updateExtraImage(index, "url", event.target.value)} placeholder="URL ảnh" className="px-3 py-2 border rounded-md bg-background text-sm" />
                  <input value={item.caption} onChange={(event) => updateExtraImage(index, "caption", event.target.value)} placeholder="Mô tả" className="px-3 py-2 border rounded-md bg-background text-sm" />
                  <button type="button" onClick={() => setExtraImages(extraImages.filter((_, itemIndex) => itemIndex !== index))} className="px-2 text-destructive font-bold">×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
            <div className="font-bold text-foreground">Chính sách & quy định</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="font-medium mb-1">Giờ nhận phòng *</div>
                <input type="time" value={policy.checkInTime} onChange={(event) => setPolicy({ ...policy, checkInTime: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
              </label>
              <label className="text-sm">
                <div className="font-medium mb-1">Giờ trả phòng *</div>
                <input type="time" value={policy.checkOutTime} onChange={(event) => setPolicy({ ...policy, checkOutTime: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
              </label>
              <label className="text-sm">
                <div className="font-medium mb-1">Tre em mien phi (tuoi)? *</div>
                <input type="number" min={0} value={policy.childrenFreeAge} onChange={(event) => setPolicy({ ...policy, childrenFreeAge: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
              </label>
              <label className="text-sm">
                <div className="font-medium mb-1">Chính sách hủy phòng *</div>
                <select value={policy.refundable ? "refundable" : "non_refundable"} onChange={(event) => setPolicy({ ...policy, refundable: event.target.value === "refundable" })} className="w-full px-3 py-2 border rounded-md bg-background">
                  <option value="refundable">Co hoan tien</option>
                  <option value="non_refundable">Không hoàn tiền</option>
                </select>
              </label>
              {policy.refundable && (
                <label className="text-sm col-span-2">
                  <div className="font-medium mb-1">Cho huy mien phi truoc bao lau? (gio) *</div>
                  <input type="number" min={1} value={policy.freeCancelHours} onChange={(event) => setPolicy({ ...policy, freeCancelHours: event.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
                </label>
              )}
            </div>
            <textarea value={policy.cancellationNote} onChange={(event) => setPolicy({ ...policy, cancellationNote: event.target.value })} rows={2} placeholder="Mô tả thêm về chính sách hủy phòng / hoàn tiền" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2 border rounded-md px-3 py-2 bg-card">
                <input type="checkbox" checked={policy.petAllowed} onChange={(event) => setPolicy({ ...policy, petAllowed: event.target.checked })} className="accent-primary" />
                Cho phep thu cung
              </label>
              <label className="flex items-center gap-2 border rounded-md px-3 py-2 bg-card">
                <input type="checkbox" checked={policy.smokingAllowed} onChange={(event) => setPolicy({ ...policy, smokingAllowed: event.target.checked })} className="accent-primary" />
                Cho phep hut thuoc
              </label>
            </div>
            <textarea value={policy.otherRules} onChange={(event) => setPolicy({ ...policy, otherRules: event.target.value })} rows={3} placeholder="Quy định khác..." className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-4">Danh sách các hạng phòng (Loại phòng)</label>
            <div className="space-y-6">
              {prices.map((price, index) => (
                <div key={index} className="p-5 border rounded-xl bg-muted/10 relative space-y-4 shadow-sm">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-bold uppercase text-primary">Hạng phòng #{index + 1}</span>
                    {prices.length > 1 && (
                      <button type="button" onClick={() => setPrices(prices.filter((_, i) => i !== index))} className="text-xs text-destructive font-bold hover:underline">
                        Xóa hạng phòng này
                      </button>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Tên loại phòng *</label>
                      <input value={price.label} onChange={(e) => { const next = [...prices]; next[index].label = e.target.value; setPrices(next); }} placeholder="VD: Deluxe King Room" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Giá 1 đêm (₫) *</label>
                      <input type="number" value={price.pricePerNight} onChange={(e) => { const next = [...prices]; next[index].pricePerNight = e.target.value; setPrices(next); }} placeholder="VD: 1200000" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Sức chứa (người)</label>
                      <input type="number" value={price.capacity} onChange={(e) => { const next = [...prices]; next[index].capacity = e.target.value; setPrices(next); }} placeholder="VD: 2" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Số phòng phục vụ/ngày *</label>
                      <input type="number" min={1} value={price.totalInventory} onChange={(e) => { const next = [...prices]; next[index].totalInventory = e.target.value; setPrices(next); }} placeholder="VD: 5" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Diện tích (m2)</label>
                      <input type="number" value={price.area} onChange={(e) => { const next = [...prices]; next[index].area = e.target.value; setPrices(next); }} placeholder="VD: 30" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Thông tin giường</label>
                      <input value={price.bedInfo} onChange={(e) => { const next = [...prices]; next[index].bedInfo = e.target.value; setPrices(next); }} placeholder="VD: 1 giường đôi lớn" className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Tiện ích riêng</label>
                      <input value={price.amenities} onChange={(e) => { const next = [...prices]; next[index].amenities = e.target.value; setPrices(next); }} placeholder="VD: Bồn tắm, Ban công..." className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold uppercase text-muted-foreground">URL Anh ({price.imageUrls.length})</label>
                        <button type="button" onClick={() => { const next = [...prices]; next[index].imageUrls.push(""); setPrices(next); }} className="text-[10px] text-primary font-bold underline">+ Thêm URL ảnh</button>
                      </div>
                      <div className="space-y-2">
                        {price.imageUrls.map((url, uIdx) => (
                          <div key={uIdx} className="flex gap-2">
                            <input value={url} onChange={(e) => { const next = [...prices]; next[index].imageUrls[uIdx] = e.target.value; setPrices(next); }} placeholder="https://..." className="flex-1 px-3 py-1.5 border rounded-md bg-background text-xs shadow-sm" />
                            <button type="button" onClick={() => { const next = [...prices]; next[index].imageUrls.splice(uIdx, 1); setPrices(next); }} className="text-destructive font-bold">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setPrices([...prices, { label: "", pricePerNight: "", totalInventory: "1", area: "", capacity: "2", bedInfo: "", amenities: "", imageUrls: [] }])} className="w-full py-4 border-2 border-dashed border-primary/20 rounded-xl text-primary font-bold hover:bg-primary/5 hover:border-primary/30 transition">
                + Thêm hạng phòng mới
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/10">
            <Input label="Phí nền tảng (%)" type="number" value={platformFeePct} onChange={setPlatformFeePct} />
            <Input label="Khuyến mãi (%)" type="number" value={promotionPct} onChange={setPromotionPct} />
          </div>
          <p className="text-xs text-muted-foreground italic">Phí nền tảng và khuyến mãi sẽ áp dụng trên giá khách thanh toán cuối cùng.</p>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground border-b pb-2">{mode === "create" ? "Xác nhận thông tin khách sạn" : "Xác nhận yêu cầu sửa khách sạn"}</h3>
          <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <section className="border rounded-lg p-4 space-y-1.5 bg-card shadow-sm">
              <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Thông tin cơ bản</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tên khách sạn</span><span className="font-bold">{name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Loại hình / Hạng sao</span><span className="font-bold">{roomType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sức chứa</span><span className="font-bold">{capacity} người{area && ` · ${area} m²`}</span></div>
              {description && <div className="text-sm text-muted-foreground border-t pt-2 mt-2 italic">"{description}"</div>}
            </section>
            <section className="border rounded-lg p-4 bg-card shadow-sm">
              <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Điểm nhấn nổi bật ({highlights.length})</div>
              <div className="flex flex-wrap gap-1.5">
                {highlights.map((item) => <span key={item} className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium border">{item}</span>)}
              </div>
            </section>
            <section className="border rounded-lg p-4 space-y-1.5 bg-card shadow-sm">
              <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Vị trí</div>
              <div className="text-sm font-medium">{picked?.name}</div>
              <div className="text-xs text-muted-foreground">Tọa độ: {picked?.lat.toFixed(5)}, {picked?.lon.toFixed(5)}{city && ` · ${city}`}</div>
            </section>
            <section className="border rounded-lg p-4 bg-card shadow-sm">
              <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Hình ảnh ({serializedImages.length})</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {serializedImages.map((item, index) => (
                  <div key={index} className="border rounded-md p-1.5 space-y-1">
                    <img src={item.url} alt={item.category} className="w-full h-24 object-cover rounded bg-muted" />
                    <div className="text-[10px] font-bold uppercase truncate">{item.category}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="border rounded-lg p-4 space-y-2 bg-card shadow-sm">
              <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Giá và phí</div>
              {validPrices.map((price, index) => {
                const fee = Math.round(price.pricePerNight * Number(platformFeePct) / 100);
                const promo = Math.round(price.pricePerNight * Number(promotionPct) / 100);
                const final = price.pricePerNight + fee - promo;
                return (
                  <div key={index} className="border-t pt-3 first:border-t-0 first:pt-0">
                    <div className="flex justify-between font-bold text-sm"><span>{price.label}</span><span>{fmtVnd(price.pricePerNight)}</span></div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5 mt-1 pl-2 border-l-2 border-primary/30">
                      <div className="flex justify-between"><span>+ Phi nen tang ({platformFeePct}%)</span><span>{fmtVnd(fee)}</span></div>
                      <div className="flex justify-between"><span>- Khuyen mai ({promotionPct}%)</span><span>-{fmtVnd(promo)}</span></div>
                      <div className="flex justify-between text-primary font-bold pt-1"><span>Khách thanh toán</span><span>{fmtVnd(final)}</span></div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-md font-medium">
            {mode === "create"
              ? "Sau khi gửi, khách sạn sẽ ở trạng thái chờ duyệt và chỉ hiển thị sau khi admin xác nhận."
              : "Sau khi gửi, yêu cầu sửa thông tin sẽ chờ admin duyệt trước khi áp dụng lên dữ liệu hiện tại."}
          </div>
        </div>
      )}

      {err && <div className="text-sm text-destructive font-medium bg-destructive/5 p-2 rounded border border-destructive/10">{err}</div>}

      <div className="flex justify-between pt-4 border-t items-center">
        <button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-5 py-2 rounded-md border font-medium disabled:opacity-50 hover:bg-accent">
          ← Quay lai
        </button>
        <div className="flex gap-3">
          {step < 7 ? (
            <button type="button" onClick={() => { setErr(""); setStep(step + 1); }} disabled={!canNext()} className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50">
              Tiep →
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="px-8 py-2.5 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50">
              {submitting ? "Đang gửi..." : mode === "create" ? "Xác nhận tạo" : "Gửi yêu cầu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}








