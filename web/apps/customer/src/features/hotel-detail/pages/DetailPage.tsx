import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchHotelDetail } from "../../../api/hotelsApi";
import { Price, Room } from "@/shared/types";
import { fmtVnd, todayOffset } from "@/shared/utils/format";
import { roomImage } from "@/shared/utils/room";
import { Panel } from "@/shared/components/UIComponents";

export function DetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const navigate = useNavigate();

  const [dateInput, setDateInput] = useState({
    checkIn: params.get("checkIn") || todayOffset(1),
    checkOut: params.get("checkOut") || todayOffset(2),
    guests: Number(params.get("guests") || 2),
  });

  useEffect(() => {
    setDateInput({
      checkIn: params.get("checkIn") || todayOffset(1),
      checkOut: params.get("checkOut") || todayOffset(2),
      guests: Number(params.get("guests") || 2),
    });
  }, [params]);

  function handleDateChange(fields: Partial<typeof dateInput>) {
    const nextInput = { ...dateInput, ...fields };
    setDateInput(nextInput);
    
    const nextParams = new URLSearchParams(params);
    nextParams.set("checkIn", nextInput.checkIn);
    nextParams.set("checkOut", nextInput.checkOut);
    nextParams.set("guests", String(nextInput.guests));
    setParams(nextParams);
  }

  useEffect(() => {
    const checkIn = params.get("checkIn") || "";
    const checkOut = params.get("checkOut") || "";
    const queryParams: Record<string, string> = {};
    if (checkIn) queryParams.checkIn = checkIn;
    if (checkOut) queryParams.checkOut = checkOut;

    fetchHotelDetail(id!, queryParams)
      .then((result) => {
        setRoom(result.room);
        const available = result.room?.prices?.find((p: Price) => p.isAvailable !== false);
        setSelected(available?.label || result.room?.prices?.[0]?.label || "");
      })
      .finally(() => setLoading(false));
  }, [id, params]);

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground">Đang tải khách sạn...</div>;
  if (!room) return <Navigate to="/search" replace />;

  const r = room;
  const images = [roomImage(r), ...r.images.slice(1, 5).map((item) => item.url)];
  const selectedPrice = r.prices.find((price) => price.label === selected) || r.prices[0];

  function book() {
    const next = new URLSearchParams(params);
    next.set("priceLabel", selectedPrice.label);
    navigate(`/checkout/${r.id}?${next.toString()}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{room.name}</h1>
          <p className="text-muted-foreground mt-1">{room.address}</p>
        </div>
        <span className="text-sm px-3 py-1 rounded-full bg-secondary border whitespace-nowrap">{room.roomType}</span>
      </div>

      {/* Date selection bar */}
      <div className="bg-card border rounded-2xl p-5 shadow-sm grid gap-4 sm:grid-cols-[1fr_1fr_120px] items-end">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Nhận phòng</label>
          <input 
            type="date" 
            value={dateInput.checkIn} 
            onChange={(e) => handleDateChange({ checkIn: e.target.value })} 
            className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Trả phòng</label>
          <input 
            type="date" 
            value={dateInput.checkOut} 
            onChange={(e) => handleDateChange({ checkOut: e.target.value })} 
            className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Số khách</label>
          <input 
            type="number" 
            min={1} 
            max={20}
            value={dateInput.guests} 
            onChange={(e) => handleDateChange({ guests: Number(e.target.value) })} 
            className="w-full px-3 py-2.5 border rounded-xl bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
        {images.slice(0, 5).map((src, index) => (
          <img key={`${id}-${src}-${index}`} src={src} alt={room.name} className={`w-full object-cover rounded-lg border ${index === 0 ? "md:row-span-2 h-72 md:h-full" : "h-40"}`} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <Panel title="Tổng quan">
            <p className="text-sm text-muted-foreground leading-6">{room.description || "Khách sạn đã được admin duyệt và sẵn sàng nhận booking."}</p>
            <div className="flex gap-2 flex-wrap mt-3">
              {room.amenities
                .filter(item => !item.toLowerCase().includes("agoda source"))
                .map((item) => <span key={item} className="text-xs px-2 py-1 rounded-full border bg-background">{item}</span>)}
            </div>
          </Panel>
          <Panel title="Tiện ích và vị trí">
            <div className="grid gap-3 sm:grid-cols-2">
              {room.nearbyPlaces.slice(0, 6).map((item) => (
                <div key={`${item.name}-${item.distanceM}`} className="text-sm border rounded-md p-3">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-muted-foreground">{item.type} - {item.distanceM}m</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Chính sách">
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>Nhận phòng: <b>{room.policy.checkInTime || "14:00"}</b></div>
              <div>Trả phòng: <b>{room.policy.checkOutTime || "12:00"}</b></div>
              <div>Hủy phòng: <b>{room.policy.refundable ? "Có hỗ trợ" : "Không hoàn"}</b></div>
              <div>Thú cưng: <b>{room.policy.petAllowed ? "Cho phép" : "Không"}</b></div>
            </div>
          </Panel>
        </section>
        <aside className="bg-card border rounded-lg p-4 h-fit space-y-3">
          <div className="font-bold text-lg">Chọn hạng phòng</div>
          <div className="space-y-2">
            {room.prices.map((price) => {
              const soldOut = price.isAvailable === false;
              return (
                <label key={price.label} className={`block border rounded-lg p-3 ${soldOut ? "opacity-60 cursor-not-allowed bg-muted/50" : "cursor-pointer"} ${selected === price.label ? "border-primary bg-secondary" : "bg-background"}`}>
                  <div className="flex gap-2 items-start">
                    <input 
                      type="radio" 
                      disabled={soldOut}
                      checked={selected === price.label} 
                      onChange={() => setSelected(price.label)} 
                      className="mt-1" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-semibold">{price.label}</div>
                        {soldOut && <span className="text-[10px] font-bold text-destructive uppercase bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">Hết phòng</span>}
                        {!soldOut && price.remainingRooms != null && price.remainingRooms <= 3 && (
                          <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Chỉ còn {price.remainingRooms} phòng</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{price.bedInfo || "Phòng tiêu chuẩn"} - tối đa {price.capacity || room.capacity} khách</div>
                      <div className="font-bold mt-1">{fmtVnd(price.pricePerNight)} / đêm</div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <button onClick={book} disabled={!selectedPrice || selectedPrice.isAvailable === false} className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-bold disabled:opacity-50">
            {selectedPrice?.isAvailable === false ? "Hết phòng" : "Đặt phòng"}
          </button>
        </aside>
      </div>
    </div>
  );
}
