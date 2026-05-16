import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@nowayhome/api-client";
import { AuthLayout, GoogleButton } from "@nowayhome/auth-ui";
import { Booking, Room, SearchState, STAR_FILTERS, User, Price } from "@/shared/types";
import { diffNights, fmtDate, fmtVnd } from "@/shared/utils/format";
import { QRCodeSVG } from "qrcode.react";

const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

function todayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function roomImage(room: Room) {
  return room.images[0]?.url || room.prices.find((price) => price.imageUrls[0])?.imageUrls[0] || fallbackImage;
}

function minPrice(room: Room) {
  return room.prices.length ? Math.min(...room.prices.map((price) => price.pricePerNight)) : 0;
}

function Shell({ user, onLogout, children }: { user: User | null; onLogout: () => void; children: React.ReactNode }) {
  const location = useLocation();
  const tabs = [
    { id: "home", label: "Trang chủ", path: "/" },
    { id: "search", label: "Tìm phòng", path: "/search" },
    { id: "trips", label: "Chuyến đi", path: "/trips" },
    { id: "account", label: user ? "Tài khoản" : "Đăng nhập", path: user ? "/account" : "/login" },
  ];
  const currentTab = location.pathname === "/"
    ? "home"
    : location.pathname.startsWith("/search") || location.pathname.startsWith("/hotels") || location.pathname.startsWith("/checkout")
      ? "search"
    : location.pathname.startsWith("/trips")
        ? "trips"
        : location.pathname.startsWith("/account")
          ? "account"
        : location.pathname.startsWith("/login")
          ? "account"
          : "home";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="min-w-0">
            <div className="font-bold text-lg leading-tight">Đặt phòng nhanh</div>
            <div className="text-xs text-muted-foreground truncate">
              {user
                ? `Xin chào khách hàng ${user.fullName}`
                : "Hãy đăng nhập hoặc đăng ký để đặt phòng nhanh hơn"}
            </div>
          </Link>
          {user ? (
            <button onClick={onLogout} className="text-sm px-3 py-1.5 border rounded-md hover:bg-accent whitespace-nowrap">Đăng xuất</button>
          ) : null}
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <nav className="grid grid-cols-4 min-w-0">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`min-w-0 px-2 sm:px-4 py-2 text-sm text-center border-b-2 transition-all whitespace-nowrap truncate ${
                  currentTab === tab.id
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function SearchBox({ initial, compact = false }: { initial?: Partial<SearchState>; compact?: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SearchState>({
    q: initial?.q || "",
    checkIn: initial?.checkIn || todayOffset(1),
    checkOut: initial?.checkOut || todayOffset(2),
    guests: initial?.guests || 2,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      q: form.q,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guests: String(form.guests),
    });
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className={`bg-card border rounded-lg p-3 shadow-sm ${compact ? "" : "max-w-5xl"}`}>
      <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_.8fr_auto]">
        <Field label="Địa điểm">
          <input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="Đà Nẵng, Hà Nội..." className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label="Nhận phòng">
          <input type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label="Trả phòng">
          <input type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <Field label="Số khách">
          <input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary" />
        </Field>
        <button className="md:self-end h-10 px-5 rounded-md bg-primary text-primary-foreground font-bold">Tìm</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function Home() {
  return (
    <div>
      <section className="border-b bg-secondary">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <div className="grid md:grid-cols-[1fr_360px] gap-6 items-center">
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-normal">Đặt phòng khách sạn nhanh và gọn</h1>
                <p className="text-muted-foreground mt-2 max-w-2xl">Nhập điểm đến, ngày ở và số khách. Web chỉ hiển thị khách sạn đã được admin duyệt active.</p>
              </div>
              <SearchBox />
            </div>
            <img src={fallbackImage} alt="Khách sạn" className="hidden md:block w-full aspect-[4/3] object-cover rounded-lg border" />
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-8 grid gap-3 md:grid-cols-3">
        {["Tìm phòng nhanh", "Giá rõ ràng", "Thanh toán tại khách sạn"].map((item) => (
          <div key={item} className="bg-card border rounded-lg p-4">
            <div className="font-semibold">{item}</div>
            <div className="text-sm text-muted-foreground mt-1">Thiết kế tối giản để khách đặt phòng không bị rối.</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SearchPage() {
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
    const query = new URLSearchParams(params);
    setLoading(true);
    setErr("");
    api(`/public/rooms?${query.toString()}`)
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

function DetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkIn = params.get("checkIn") || "";
    const checkOut = params.get("checkOut") || "";
    const qs = new URLSearchParams();
    if (checkIn) qs.set("checkIn", checkIn);
    if (checkOut) qs.set("checkOut", checkOut);

    api(`/public/rooms/${id}?${qs.toString()}`)
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
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
        {images.slice(0, 5).map((src, index) => (
          <img key={`${src}-${index}`} src={src} alt={room.name} className={`w-full object-cover rounded-lg border ${index === 0 ? "md:row-span-2 h-72 md:h-full" : "h-40"}`} />
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border rounded-lg p-4">
      <h2 className="font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function CheckoutPage({ user }: { user: User | null }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const [room, setRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({ guestName: user?.fullName || "", guestPhone: "", specialRequests: "" });
  const [paymentMethod, setPaymentMethod] = useState<"hotel" | "online">("hotel");
  const [booking, setBooking] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const checkIn = params.get("checkIn") || todayOffset(1);
  const checkOut = params.get("checkOut") || todayOffset(2);
  const guests = Number(params.get("guests") || 2);
  const priceLabel = params.get("priceLabel") || "";

  useEffect(() => {
    api(`/public/rooms/${id}`).then((result) => setRoom(result.room));
  }, [id]);

  useEffect(() => {
    if (user && !form.guestName) setForm((old) => ({ ...old, guestName: user.fullName }));
  }, [user, form.guestName]);

  useEffect(() => {
    if (booking && paymentMethod === "online" && !isPaid) {
      const timer = setInterval(async () => {
        try {
          const res = await api(`/mock-payment/status/${booking.bookingCode}`);
          if (res.status === "paid") {
            setIsPaid(true);
            clearInterval(timer);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [booking, paymentMethod, isPaid]);

  const price = room?.prices.find((item) => item.label === priceLabel) || room?.prices[0];
  const nights = diffNights(checkIn, checkOut);
  const subtotal = (price?.pricePerNight || 0) * nights;
  const total = subtotal;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(currentLocation.pathname + currentLocation.search)}`);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const result = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          propertyId: Number(id),
          checkInDate: checkIn,
          checkOutDate: checkOut,
          priceLabel: price?.label,
          guestName: form.guestName,
          guestPhone: form.guestPhone,
          adults: guests,
          children: 0,
          specialRequests: form.specialRequests,
          paymentMethod: paymentMethod,
        }),
      });
      setBooking(result.booking);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!room || !price) return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground">Đang tải checkout...</div>;
  
  if (booking) {
    const paymentUrl = `${window.location.origin}/payment?bookingCode=${booking.bookingCode}`;
    
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-card border rounded-2xl p-8 text-center space-y-6 shadow-xl animate-in zoom-in-95 duration-300">
          {paymentMethod === "online" && !isPaid ? (
            <>
              <div className="space-y-2">
                <div className="text-primary font-bold text-sm uppercase tracking-wider">Chờ thanh toán trực tuyến</div>
                <h1 className="text-2xl font-bold">Quét QR để thanh toán</h1>
                <p className="text-muted-foreground text-sm">Dùng điện thoại quét mã dưới đây để tiếp tục thanh toán {fmtVnd(total)}</p>
              </div>
              <div className="inline-block p-6 bg-white rounded-2xl shadow-inner border-4 border-primary/10">
                <QRCodeSVG value={paymentUrl} size={200} />
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Đang chờ bạn xác nhận trên điện thoại...
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">Hoặc bấm vào link dưới đây nếu bạn đang dùng điện thoại:</p>
                <a href={paymentUrl} target="_blank" className="text-primary font-bold hover:underline">Link thanh toán trực tiếp</a>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto">✓</div>
              <div className="space-y-2">
                <div className="text-green-700 font-bold text-sm uppercase tracking-wider">
                  {isPaid ? "Thanh toán thành công" : "Đặt phòng thành công"}
                </div>
                <h1 className="text-3xl font-black tracking-tight">{booking.bookingCode}</h1>
                <p className="text-muted-foreground">
                  {isPaid 
                    ? "Chúc mừng! Bạn đã thanh toán thành công đơn hàng này." 
                    : "Vui lòng thanh toán tại khách sạn khi nhận phòng."}
                </p>
              </div>
              <div className="pt-4 flex gap-3">
                <Link to="/trips" className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Xem chuyến đi</Link>
                <Link to="/" className="flex-1 py-3 rounded-xl border font-bold hover:bg-muted transition-all">Về trang chủ</Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-[1fr_360px] gap-8">
      <section className="space-y-5">
        <Panel title="Thông tin khách">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Họ tên">
              <input required value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
            <Field label="Số điện thoại">
              <input required value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-background" />
            </Field>
          </div>
          <Field label="Yêu cầu thêm">
            <textarea value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md bg-background" />
          </Field>
        </Panel>
        <Panel title="Phương thức thanh toán">
          <div className="grid gap-3">
            <label className={`flex gap-3 items-start border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'hotel' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:border-slate-300'}`}>
              <input type="radio" checked={paymentMethod === 'hotel'} onChange={() => setPaymentMethod('hotel')} className="mt-1" />
              <span>
                <span className="block font-bold text-slate-800">Thanh toán tại khách sạn</span>
                <span className="text-sm text-muted-foreground">Bạn sẽ thanh toán khi đến check-in tại quầy lễ tân.</span>
              </span>
            </label>
            <label className={`flex gap-3 items-start border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === 'online' ? 'bg-primary/5 border-primary shadow-sm' : 'hover:border-slate-300'}`}>
              <input type="radio" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="mt-1" />
              <span>
                <span className="block font-bold text-slate-800">Thanh toán online (Mock QR)</span>
                <span className="text-sm text-muted-foreground">Sử dụng ví điện tử hoặc ngân hàng để quét mã QR thanh toán ngay.</span>
              </span>
            </label>
          </div>
        </Panel>
      </section>
      <aside className="bg-card border rounded-lg p-4 h-fit space-y-3 shadow-sm">
        <div>
          <div className="font-bold text-lg">{room.name}</div>
          <div className="text-sm text-muted-foreground">{price.label}</div>
        </div>
        <div className="text-sm border-y py-3 space-y-2">
          <Row label="Nhận phòng" value={fmtDate(checkIn)} />
          <Row label="Trả phòng" value={fmtDate(checkOut)} />
          <Row label="Số đêm" value={`${nights} đêm`} />
          <Row label="Số khách" value={`${guests} khách`} />
        </div>
        <div className="text-sm space-y-2 border-t pt-3">
          <Row label="Giá tạm tính" value={fmtVnd(subtotal)} />
          <div className="flex justify-between pt-2 border-t font-bold text-xl">
            <span>Tổng cộng</span>
            <span className="text-primary">{fmtVnd(total)}</span>
          </div>
        </div>
        {err && <div className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">{err}</div>}
        <button disabled={loading} className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
          {loading ? "Đang xử lý..." : paymentMethod === 'online' ? "Tiếp tục thanh toán" : "Xác nhận đặt phòng"}
        </button>
      </aside>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right">{value}</span></div>;
}

function ModernLoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });
  const [err, setErr] = useState("");
  const next = params.get("next") || "/";
  const inputClass = "w-full h-[48px] pl-[44px] pr-[14px] rounded-xl border border-[#e2e8f0] bg-[#f8fafc]/50 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#3b82f6] focus:bg-white focus:ring-4 focus:ring-[#3b82f6]/5 focus:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setErr("");
    try {
      const result = mode === "login"
        ? await api("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) })
        : await api("/customer/auth/register", { method: "POST", body: JSON.stringify(form) });
      if (result.user?.role !== "customer") throw new Error("Tai khoan nay khong phai khach hang");
      onLogin(result.user);
      navigate(next, { replace: true });
    } catch (error: any) {
      setErr(error.message);
    }
  }

  return (
    <AuthLayout
      title={mode === "login" ? "Welcome back" : "Create account"}
      subtitle="Please enter your details"
      footer={
        <p className="text-center text-sm text-[#64748b]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErr("");
            }}
            className="font-semibold text-[#3b82f6] underline underline-offset-4 hover:text-[#2563eb] transition-colors"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-3">
          {mode === "register" && (
            <>
              <div className="relative">
                <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full name" className={inputClass} />
              </div>
              <div className="relative">
                <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.31-2.31a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className={inputClass} />
              </div>
            </>
          )}
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" className={inputClass} />
          </div>
          <div className="relative">
            <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className={inputClass} />
          </div>
        </div>

        {err && <div className="text-xs font-medium text-destructive">{err}</div>}

        <div className="pt-2 space-y-4">
          <button className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200">
            {mode === "login" ? "Sign in" : "Sign up"}
          </button>

          {mode === "login" && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#e2e8f0]"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="bg-[#fcfdfe] px-2 text-[#94a3b8]">Or continue with</span>
                </div>
              </div>
              <GoogleButton href="/api/auth/google/start" />
            </>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}

function TripsPage({ user }: { user: User | null }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  async function load() {
    setLoading(true);
    try {
      const result = await api("/bookings/mine");
      setBookings(result.bookings || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load().catch(() => setLoading(false));
  }, [user]);

  async function cancel(id: number) {
    if (!confirm("Bạn chắc chắn muốn hủy đặt phòng này?")) return;
    await api(`/bookings/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason: "Khách hàng hủy trên web" }) });
    await load();
    setSelected(null);
  }

  if (!user) return <Navigate to="/login?next=/trips" replace />;
  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10 text-muted-foreground animate-pulse">Đang tải chuyến đi...</div>;

  const filtered = bookings.filter(b => {
    if (activeTab === "cancelled") return b.status === "cancelled";
    if (activeTab === "completed") return b.status === "checked_out" || (b.status === "confirmed" && new Date(b.checkOutDate) < new Date());
    return b.status !== "cancelled" && (b.status === "pending" || b.status === "confirmed" || b.status === "checked_in") && new Date(b.checkOutDate) >= new Date();
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'cancelled': return { label: 'Đã hủy', color: 'text-red-600 bg-red-50 border-red-100', icon: '❌' };
      case 'pending': return { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: '⌛' };
      case 'confirmed': return { label: 'Đã xác nhận', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: '✅' };
      case 'checked_in': return { label: 'Đang lưu trú', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: '🏠' };
      case 'checked_out': return { label: 'Đã hoàn thành', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: '🏁' };
      default: return { label: status, color: 'text-slate-600 bg-slate-50 border-slate-100', icon: '•' };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chuyến đi của tôi</h1>
          <p className="text-muted-foreground mt-1">Xem lại lịch sử đặt phòng và các chuyến đi sắp tới.</p>
        </div>
        <div className="flex p-1 bg-muted/50 rounded-xl border w-fit">
          {(["upcoming", "completed", "cancelled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === tab 
                  ? "bg-card shadow-sm text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "upcoming" ? "Sắp tới" : tab === "completed" ? "Đã xong" : "Đã hủy"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-card border border-dashed rounded-3xl">
          <div className="text-4xl mb-4">🧳</div>
          <p className="text-muted-foreground font-medium">Bạn chưa có đặt phòng nào trong mục này.</p>
          <Link to="/search" className="inline-block mt-4 text-primary font-bold hover:underline">Khám phá khách sạn ngay →</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((booking) => {
            const status = getStatusInfo(booking.status);
            return (
              <div
                key={booking.id}
                onClick={() => setSelected(booking)}
                className="group relative bg-card border rounded-2xl p-5 cursor-pointer hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Thumbnail giá (giá thôi, thực tế nên có ảnh property) */}
                  <div className="w-full sm:w-32 h-24 bg-muted rounded-xl overflow-hidden flex-shrink-0 border">
                    <img 
                      src={`https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80&sig=${booking.id}`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      alt="" 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{booking.bookingCode}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{booking.propertyName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{booking.address}</p>
                    
                    <div className="flex items-center gap-4 pt-2 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">📅</span>
                        <span>{fmtDate(booking.checkInDate)} - {fmtDate(booking.checkOutDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">🌙</span>
                        <span>{booking.nights} đêm</span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0">
                    <div className="text-xl font-black text-primary">{fmtVnd(booking.total)}</div>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      Xem chi tiết & QR →
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[50] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-bold text-xl">Thông tin đặt phòng</h3>
              <button onClick={() => setSelected(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-xl">×</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-block p-5 bg-white rounded-3xl shadow-xl border-4 border-muted/20">
                  <QRCodeSVG value={selected.bookingCode} size={200} />
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-2xl font-black tracking-[0.2em] text-primary uppercase">{selected.bookingCode}</div>
                  <p className="text-xs text-muted-foreground font-medium">Xuất trình mã này khi làm thủ tục nhận phòng</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="font-black text-2xl tracking-tight leading-tight">{selected.propertyName}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span>📍 </span> {selected.address}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border bg-muted/20 space-y-1">
                    <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Nhận phòng</div>
                    <div className="font-bold text-base">{fmtDate(selected.checkInDate)}</div>
                    <div className="text-xs font-medium text-muted-foreground">Sau {selected.checkInTime || "14:00"}</div>
                  </div>
                  <div className="p-4 rounded-2xl border bg-muted/20 space-y-1">
                    <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Trả phòng</div>
                    <div className="font-bold text-base">{fmtDate(selected.checkOutDate)}</div>
                    <div className="text-xs font-medium text-muted-foreground">Trước {selected.checkOutTime || "12:00"}</div>
                  </div>
                </div>

                <div className="space-y-3 bg-muted/10 p-5 rounded-2xl border border-dashed">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Lưu trú:</span>
                    <span className="font-bold">{selected.nights} đêm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Số khách:</span>
                    <span className="font-bold">{selected.adults} người lớn, {selected.children} trẻ em</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground font-medium">Trạng thái:</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getStatusInfo(selected.status).color}`}>
                      {getStatusInfo(selected.status).label}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-muted-foreground/20 text-xl font-black">
                    <span>Tổng tiền</span>
                    <span className="text-primary">{fmtVnd(selected.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/10 border-t flex gap-3">
              {selected.status !== "cancelled" && new Date(selected.checkInDate) > new Date() && (
                <button
                  onClick={() => cancel(selected.id)}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-destructive/20 text-destructive font-black text-sm hover:bg-destructive hover:text-white transition-all duration-300"
                >
                  Hủy đặt phòng
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPage({ user, onUpdate, onLogout }: { user: User | null; onUpdate: (user: User) => void; onLogout: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName, phone: user.phone || "" });
  }, [user]);

  if (!user) return <Navigate to="/login?next=/account" replace />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const result = await api("/customer/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      onUpdate(result.user);
      setEditing(false);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-card border rounded-2xl p-8 max-w-2xl shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold">Tài khoản</h1>
            <p className="text-muted-foreground mt-2">Quản lý thông tin cá nhân và bảo mật.</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold uppercase tracking-wider">Đang hoạt động</span>
        </div>

        {editing ? (
          <form onSubmit={save} className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid gap-6">
              <Field label="Họ tên">
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="09xx xxx xxx"
                />
              </Field>
            </div>
            {err && <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">{err}</div>}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl border font-bold hover:bg-muted transition-all"
              >
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="group border rounded-2xl p-5 hover:border-primary/50 transition-all bg-muted/5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Họ tên</div>
              <div className="font-bold text-lg">{user.fullName}</div>
            </div>
            <div className="group border rounded-2xl p-5 hover:border-primary/50 transition-all bg-muted/5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Email</div>
              <div className="font-bold text-lg">{user.email}</div>
            </div>
            <div className="group border rounded-2xl p-5 hover:border-primary/50 transition-all bg-muted/5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Số điện thoại</div>
              <div className="font-bold text-lg">{user.phone || "Chưa cập nhật"}</div>
            </div>
            <div className="group border rounded-2xl p-5 hover:border-primary/50 transition-all bg-muted/5">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Vai tro</div>
              <div className="font-bold text-lg">Khách hàng thành viên</div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t">
              <button
                onClick={() => setEditing(true)}
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Sửa thông tin
              </button>
              <Link
                to="/trips"
                className="px-8 py-3 rounded-xl border font-bold hover:bg-muted transition-all"
              >
                Xem chuyến đi
              </Link>
              <button
                onClick={onLogout}
                className="px-8 py-3 rounded-xl border border-destructive/20 text-destructive font-bold hover:bg-destructive hover:text-white transition-all ml-auto"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">{text}</div>;
}

function PaymentPage() {
  const [params] = useSearchParams();
  const bookingCode = params.get("bookingCode");
  const [booking, setBooking] = useState<any>(null);
  const [step, setStep] = useState<"account" | "otp" | "success">("account");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState("");

  const banks = [
    { id: "vcb", name: "Vietcombank", icon: "🏦" },
    { id: "tcb", name: "Techcombank", icon: "💳" },
    { id: "mb", name: "MB Bank", icon: "🏛️" },
    { id: "momo", name: "MoMo", icon: "📱" },
  ];

  useEffect(() => {
    if (bookingCode) {
      api(`/mock-payment/info?bookingCode=${bookingCode}`)
        .then((res) => setBooking(res.booking))
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false));
    }
  }, [bookingCode]);

  async function requestOtp() {
    if (!selectedBank) return;
    setConfirming(true);
    try {
      const res = await api("/mock-payment/request-otp", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id }),
      });
      setServerOtp(res.otp);
      setStep("otp");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setConfirming(false);
    }
  }

  async function confirm() {
    setConfirming(true);
    setErr("");
    try {
      await api("/mock-payment/confirm", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id, otp }),
      });
      setStep("success");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (err && !booking) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border rounded-2xl p-8 max-w-sm w-full text-center shadow-sm">
        <div className="text-destructive text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Lỗi hệ thống</h2>
        <p className="text-slate-500 text-sm mb-6">{err}</p>
        <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Thử lại</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <div className="bg-white border-b px-6 py-8 md:py-12">
        <div className="max-w-md mx-auto text-center space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Xác nhận thanh toán</p>
          <h1 className="text-4xl font-black tracking-tight">{fmtVnd(booking.total_amount)}</h1>
          <div className="pt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
              Mã đơn: {booking.booking_code}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 -mt-4">
        <div className="bg-white border rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
          {step === "account" && (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Chọn phương thức</h2>
                <p className="text-slate-400 text-sm">Vui lòng chọn ngân hàng hoặc ví điện tử</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {banks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => setSelectedBank(bank.id)}
                    className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                      selectedBank === bank.id 
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                        : "border-slate-100 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="text-2xl mb-3">{bank.icon}</div>
                    <div className={`font-bold text-sm ${selectedBank === bank.id ? "text-primary" : "text-slate-700"}`}>
                      {bank.name}
                    </div>
                    {selectedBank === bank.id && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">✓</div>
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Dịch vụ</span>
                  <span className="font-semibold text-slate-700">{booking.property_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tổng phí</span>
                  <span className="font-semibold text-slate-700">{fmtVnd(booking.total_amount)}</span>
                </div>
              </div>

              <button
                disabled={!selectedBank || confirming}
                onClick={requestOtp}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {confirming ? "Đang xử lý..." : "Tiếp tục thanh toán"}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Xác thực OTP</h2>
                <p className="text-slate-400 text-sm">Nhập mã xác thực gửi đến thiết bị của bạn</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center text-4xl font-black tracking-[0.5em] py-6 border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-0 transition-all placeholder:text-slate-100"
                  />
                </div>
                
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                  <p className="text-xs text-amber-700 font-medium mb-1 uppercase tracking-wider">Mã OTP giả lập (Mock)</p>
                  <p className="text-2xl font-mono font-bold text-amber-900">{serverOtp}</p>
                </div>
              </div>

              {err && <p className="text-center text-sm font-bold text-destructive animate-bounce">{err}</p>}

              <button
                disabled={otp.length !== 6 || confirming}
                onClick={confirm}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-30"
              >
                {confirming ? "Đang xác thực..." : "Xác nhận thanh toán"}
              </button>

              <button onClick={() => setStep("account")} className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                Quay lại
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="p-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-5xl mx-auto border-4 border-white shadow-xl shadow-green-100/50 animate-bounce">
                ✓
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">Thành công!</h2>
                <p className="text-slate-400 text-sm px-4">Giao dịch đã được xác nhận. Bạn có thể đóng cửa sổ này.</p>
              </div>
              <div className="pt-4">
                <button onClick={() => window.close()} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20">
                  Hoàn tất
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-8 text-[10px] text-slate-300 uppercase tracking-widest font-bold">
          Secure Encrypted Payment • Agoda Cloud
        </p>
      </div>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api("/auth/me")
      .then((result) => setUser(result.user?.role === "customer" ? result.user : null))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    navigate("/");
  }

  const routes = useMemo(() => (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/hotels/:id" element={<DetailPage />} />
      <Route path="/checkout/:id" element={<CheckoutPage user={user} />} />
      <Route path="/login" element={user ? <Navigate to="/" /> : <ModernLoginPage onLogin={setUser} />} />
      <Route path="/trips" element={<TripsPage user={user} />} />
      <Route path="/account" element={<AccountPage user={user} onUpdate={setUser} onLogout={logout} />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ), [user]);

  const location = useLocation();
  const isPaymentPage = location.pathname === "/payment";

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;

  if (isPaymentPage) {
    return <main>{routes}</main>;
  }

  return <Shell user={user} onLogout={logout}>{routes}</Shell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
