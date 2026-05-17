import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchHotels } from "../../../api/hotelsApi";
import { Room, SearchState, STAR_FILTERS } from "@/shared/types";
import { diffNights, fmtVnd, todayOffset } from "@/shared/utils/format";
import { roomImage, minPrice } from "@/shared/utils/room";
import { SearchBox } from "@/shared/components/SearchBox";
import { Field, Empty } from "@/shared/components/UIComponents";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [star, setStar] = useState(params.get("star") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");

  const search: SearchState = {
    q: params.get("q") || "",
    checkIn: params.get("checkIn") || todayOffset(1),
    checkOut: params.get("checkOut") || todayOffset(2),
    guests: Number(params.get("guests") || 2),
  };

  useEffect(() => {
    const query = Object.fromEntries(params.entries());
    setLoading(true);
    setErr("");
    searchHotels(query)
      .then((result) => setRooms(result.rooms || []))
      .catch((error) => setErr(error.message))
      .finally(() => setLoading(false));
  }, [params]);

  function applyFilters() {
    const next = new URLSearchParams(params);
    star ? next.set("star", star) : next.delete("star");
    maxPrice ? next.set("maxPrice", maxPrice) : next.delete("maxPrice");
    setParams(next);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <SearchBox initial={search} compact />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="bg-card border rounded-lg p-4 h-fit space-y-3">
          <div className="font-semibold">Bộ lọc</div>
          <Field label="Hạng sao / loại hình">
            <select value={star} onChange={(e) => setStar(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-background">
              <option value="">Tất cả</option>
              {STAR_FILTERS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Giá tối đa / đêm">
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="numeric" placeholder="1000000" className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
          <button onClick={applyFilters} className="w-full py-2 rounded-md bg-primary text-primary-foreground font-medium">Áp dụng</button>
        </aside>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">{loading ? "Đang tìm..." : `${rooms.length} khách sạn phù hợp`}</h2>
            <span className="text-sm text-muted-foreground">{diffNights(search.checkIn, search.checkOut)} đêm</span>
          </div>
          {err && <div className="text-sm text-destructive bg-red-50 border border-red-200 rounded-lg p-3">{err}</div>}
          {!loading && rooms.length === 0 && <Empty text="Chưa có khách sạn active phù hợp. Hãy thử điểm đến khác." />}
          {rooms.map((room) => (
            <Link key={room.id} to={`/hotels/${room.id}?${params.toString()}`} className="block bg-card border rounded-lg overflow-hidden hover:bg-accent/40 transition">
              <div className="grid sm:grid-cols-[220px_1fr]">
                <img src={roomImage(room)} alt={room.name} className="w-full h-48 sm:h-full object-cover" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{room.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{room.address}</p>
                    </div>
                    <span className="text-xs h-fit px-2 py-1 rounded-full bg-secondary text-secondary-foreground border">{room.roomType}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {room.highlights
                      .filter(item => !item.toLowerCase().includes("agoda source"))
                      .slice(0, 4)
                      .map((item) => <span key={item} className="text-xs px-2 py-1 rounded-full border bg-background">{item}</span>)}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div className="text-sm text-muted-foreground">{room.prices.length} hạng phòng</div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Từ</div>
                      <div className="font-bold text-lg">{fmtVnd(minPrice(room))}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
