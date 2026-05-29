import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../../../shared/components/ui";
import { fetchBookingReport, markBookingPaid, cancelBooking } from "../../../../api/bookingsApi";
import { approveRoom } from "../../../../api/roomsApi";

type BookingItem = {
  id: number;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  priceLabel: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  status: string;
  paymentStatus: string;
  total: number;
  platformFee: number;
  partnerPayout: number;
  createdAt: string;
  specialRequests: string | null;
  isCompleted: boolean;
  isCurrentStay: boolean;
  isFutureStay: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  propertyStatus?: string | null;
  propertyIsArchived?: boolean;
  propertyArchivedLabel?: string | null;
};

type HotelReport = {
  propertyId: number;
  propertyName: string;
  city: string | null;
  address: string;
  partnerHotelName: string | null;
  partnerEmail: string | null;
  propertyStatus?: string;
  isArchived?: boolean;
  archivedLabel?: string | null;
  isActiveHotel: boolean;
  currentStayCount: number;
  totalBookings: number;
  earnedRevenue: number;
  pendingRevenue: number;
  earnedCommission: number;
  pendingCommission: number;
  earnedPartnerPayout: number;
  pendingPartnerPayout: number;
  bookings: BookingItem[];
};

function fmtVnd(value: number) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
}

function fmtDate(value: string) {
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${Number(day)}/${Number(month)}/${year}` : "-";
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function belongsToUpcomingTab(booking: BookingItem) {
  return (
    (booking.isFutureStay || booking.isCurrentStay || booking.status === "pending") &&
    !booking.isCompleted &&
    booking.status !== "cancelled"
  );
}

function getPresetRange(preset: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") return { from: toDateOnly(today), to: toDateOnly(today) };
  if (preset === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toDateOnly(start), to: toDateOnly(end) };
  }
  if (preset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: toDateOnly(start), to: toDateOnly(end) };
  }
  return { from: "", to: "" };
}

function bookingStatusKey(booking: BookingItem) {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.isCompleted) return "completed";
  if (booking.status === "pending") return "pending";
  if (booking.isCurrentStay) return "current";
  if (booking.isFutureStay) return "upcoming";
  return "unfinished";
}

function bookingInRange(booking: BookingItem, from: string, to: string) {
  if (!from && !to) return true;
  const checkIn = String(booking.checkInDate).slice(0, 10);
  const checkOut = String(booking.checkOutDate).slice(0, 10);
  if (from && checkOut < from) return false;
  if (to && checkIn > to) return false;
  return true;
}

function splitMoney(done: number, pending: number) {
  return (
    <span>
      <span className="font-bold text-slate-950">{fmtVnd(done)}</span>
      {pending > 0 && <span className="ml-1 font-bold text-amber-700">+ {fmtVnd(pending)}</span>}
    </span>
  );
}

function splitCount(done: number, pending: number) {
  return (
    <span>
      <span className="font-bold text-slate-950">{done}</span>
      {pending > 0 && <span className="ml-1 font-bold text-amber-700">+ {pending}</span>}
    </span>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  );
}

function DateInput({ value, onChange, disabled, title }: { value: string; onChange: (val: string) => void; disabled?: boolean; title?: string }) {
  return (
    <div className="relative h-9 rounded-md border bg-white px-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
      {title && <span className="pointer-events-none absolute -top-1.5 left-2 bg-white px-1 text-[9px] font-semibold text-slate-400">{title}</span>}
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full bg-transparent text-xs outline-none"
      />
    </div>
  );
}

let bookingReportCache: HotelReport[] | null = null;

export function BookingsTab() {
  const { state: locState } = useLocation();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<HotelReport[]>(() => bookingReportCache || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [timePreset, setTimePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<HotelReport | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);

  useEffect(() => {
    if (locState?.filter) {
      if (locState.filter.from) setDateFrom(String(locState.filter.from).slice(0, 10));
      if (locState.filter.to) setDateTo(String(locState.filter.to).slice(0, 10));
      setTimePreset("custom");
    }
    if (locState?.targetId) {
      setTargetId(locState.targetId);
      // Auto open modal if we found the hotel
      const targetHotel = hotels.find(h => h.bookings.some(b => b.id === locState.targetId));
      if (targetHotel) {
        setDetail(targetHotel);
      }
    }
    if (locState?.targetPropertyId) {
      const targetHotel = hotels.find(h => h.propertyId === locState.targetPropertyId);
      if (targetHotel) {
        setDetail(targetHotel);
      }
    }
    if (locState?.highlight) {
      setShouldHighlight(true);
      const timer = setTimeout(() => {
        setShouldHighlight(false);
        setTargetId(null);
      }, 3000);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [locState, hotels]);

  async function load() {
    if (!bookingReportCache || bookingReportCache.length === 0) {
      setLoading(true);
    }
    setErr("");
    try {
      const result = await fetchBookingReport();
      const hotels = result.hotels || [];
      bookingReportCache = hotels;
      setHotels(hotels);
      setDetail((current) =>
        current
          ? hotels.find((hotel: HotelReport) => hotel.propertyId === current.propertyId) || current
          : current
      );
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveHotel(propertyId: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await approveRoom(propertyId);
      // Optimistic update: chỉ cập nhật hotel đó, không reload toàn bộ
      setHotels((prev) =>
        prev.map((h) =>
          h.propertyId === propertyId ? { ...h, isActiveHotel: true } : h
        )
      );
    } catch (error: any) {
      alert(error.message);
    }
  }

  useEffect(() => {
    if (bookingReportCache) {
      setHotels(bookingReportCache);
    }
    load().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = timePreset === "custom" ? { from: dateFrom, to: dateTo } : getPresetRange(timePreset);
    return hotels.map((hotel) => {
      const bookings = hotel.bookings.filter((booking) => {
        const matchStatus = statusFilter === "all" || bookingStatusKey(booking) === statusFilter;
        return matchStatus && bookingInRange(booking, range.from, range.to);
      });
      const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
      const sum = (rows: BookingItem[], key: "total" | "partnerPayout" | "platformFee") => rows.reduce((total, item) => total + Number(item[key] || 0), 0);
      
      const completed = activeBookings.filter(b => b.isCompleted);
      const earnedRevenue = sum(completed, "total");
      const grossRevenue = sum(activeBookings, "total");
      const earnedCommission = sum(completed, "platformFee");
      const grossCommission = sum(activeBookings, "platformFee");
      const earnedPartnerPayout = sum(completed, "partnerPayout");
      const grossPartnerPayout = sum(activeBookings, "partnerPayout");

      return {
        ...hotel,
        bookings,
        currentStayCount: activeBookings.filter((booking) => booking.isCurrentStay).length,
        totalBookings: activeBookings.length,
        completedBookingsCount: completed.length,
        pendingBookingsCount: activeBookings.length - completed.length,
        earnedRevenue,
        pendingRevenue: grossRevenue - earnedRevenue,
        earnedCommission,
        pendingCommission: grossCommission - earnedCommission,
        earnedPartnerPayout,
        pendingPartnerPayout: grossPartnerPayout - earnedPartnerPayout,
      };
    }).filter((hotel) => {
      const matchSearch = !q || [
        hotel.propertyName,
        hotel.city || "",
        hotel.partnerHotelName || "",
        hotel.partnerEmail || ""
      ].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));

      const range = timePreset === "custom" ? { from: dateFrom, to: dateTo } : getPresetRange(timePreset);
      const isFiltering = q || range.from || range.to || statusFilter !== "all";
      // Luôn hiển thị khách sạn chờ duyệt (isActiveHotel = false)
      return matchSearch && (!isFiltering || hotel.bookings.length > 0 || !hotel.isActiveHotel);
    }).sort((a, b) => {
      // 1. Ưu tiên có đơn đặt (totalBookings > 0)
      if (a.totalBookings > 0 && b.totalBookings === 0) return -1;
      if (b.totalBookings > 0 && a.totalBookings === 0) return 1;

      // Nếu cả hai đều có đơn, sắp xếp theo số đơn giảm dần
      if (a.totalBookings > 0 && b.totalBookings > 0) {
        if (b.totalBookings !== a.totalBookings) {
          return b.totalBookings - a.totalBookings;
        }
      }

      // 2. Tiếp theo ưu tiên đã duyệt (isActiveHotel === true) trước chờ duyệt (isActiveHotel === false)
      if (a.isActiveHotel && !b.isActiveHotel) return -1;
      if (!a.isActiveHotel && b.isActiveHotel) return 1;

      // 3. Cùng nhóm sắp xếp theo bảng chữ cái tên khách sạn
      return a.propertyName.localeCompare(b.propertyName);
    });
  }, [hotels, search, timePreset, dateFrom, dateTo, statusFilter]);

  const totals = useMemo(() => ({
    currentStay: filtered.reduce((sum, hotel) => sum + hotel.currentStayCount, 0),
    completedBookings: filtered.reduce((sum, hotel) => sum + hotel.completedBookingsCount, 0),
    pendingBookings: filtered.reduce((sum, hotel) => sum + hotel.pendingBookingsCount, 0),
    earnedRevenue: filtered.reduce((sum, hotel) => sum + hotel.earnedRevenue, 0),
    pendingRevenue: filtered.reduce((sum, hotel) => sum + hotel.pendingRevenue, 0),
    earnedCommission: filtered.reduce((sum, hotel) => sum + hotel.earnedCommission, 0),
    pendingCommission: filtered.reduce((sum, hotel) => sum + hotel.pendingCommission, 0),
  }), [filtered]);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-950">Quản lý đặt phòng</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Theo dõi lưu trú, đơn đặt phòng, doanh thu và hoa hồng của hệ thống.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Đang lưu trú" value={String(totals.currentStay)} tone="blue" highlight={shouldHighlight && !targetId} />
        <Stat label="Số đơn" value={splitCount(totals.completedBookings, totals.pendingBookings)} tone="indigo" highlight={shouldHighlight && !targetId} />
        <Stat label="Doanh thu" value={splitMoney(totals.earnedRevenue, totals.pendingRevenue)} tone="emerald" highlight={shouldHighlight && !targetId} />
        <Stat label="Hoa hồng" value={splitMoney(totals.earnedCommission, totals.pendingCommission)} tone="amber" highlight={shouldHighlight && !targetId} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[1fr_160px_160px_140px_140px]">
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
            <input
              placeholder="Tìm khách sạn, đối tác, thành phố..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Select value={timePreset} onChange={setTimePreset} options={[
            ["all", "Tất cả thời gian"],
            ["today", "Hôm nay"],
            ["week", "Tuần này"],
            ["month", "Tháng này"],
            ["custom", "Tùy chọn ngày"],
          ]} />
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            ["all", "Tất cả trạng thái"],
            ["pending", "Chờ thanh toán"],
            ["current", "Đang lưu trú"],
            ["upcoming", "Chưa đến"],
            ["completed", "Đã hoàn thành"],
            ["cancelled", "Đã hủy"],
          ]} />
          <DateInput
            value={dateFrom}
            title="Từ ngày nhận phòng"
            onChange={(val) => {
              setDateFrom(val);
              setTimePreset("custom");
            }}
          />
          <DateInput
            value={dateTo}
            title="Đến ngày nhận phòng"
            onChange={(val) => {
              setDateTo(val);
              setTimePreset("custom");
            }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden max-h-[70vh] overflow-y-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/50 text-left sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-bold">Khách sạn</th>
              <th className="px-4 py-3 font-bold">Đối tác</th>
              <th className="w-[110px] px-4 py-3 font-bold text-center">Lưu trú</th>
              <th className="px-4 py-3 font-bold text-center">Số đơn</th>
              <th className="px-4 py-3 font-bold">Doanh thu</th>
              <th className="px-4 py-3 font-bold">Hoa hồng</th>
              <th className="px-4 py-3 font-bold text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-medium">Không có dữ liệu</td>
              </tr>
            )}
            {filtered.map((hotel) => {
              const isTarget = shouldHighlight && targetId && hotel.bookings.some(b => b.id === targetId);
              return (
                <tr 
                  key={hotel.propertyId} 
                  onClick={() => setDetail(hotel)} 
                  className={cn(
                    "cursor-pointer transition-all duration-500 hover:bg-indigo-50/50",
                    isTarget ? "animate-highlight-pulse bg-primary/10" : "",
                    !hotel.isActiveHotel && "bg-slate-50 opacity-75"
                  )}
                >
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold text-slate-950">{hotel.propertyName}</div>
                    {hotel.isArchived ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Khách sạn đã ngừng hoạt động</span>
                    ) : !hotel.isActiveHotel && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Chờ duyệt</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{hotel.city || hotel.address}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-xs text-slate-800">{hotel.partnerHotelName || "-"}</div>
                  <div className="text-[10px] text-slate-500">{hotel.partnerEmail || "-"}</div>
                </td>
                <td className="w-[110px] px-4 py-3 text-center">
                  {hotel.currentStayCount > 0 ? (
                    <span className="inline-flex min-w-[76px] items-center justify-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold leading-5 text-blue-700">{hotel.currentStayCount} đang ở</span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm">{splitCount(hotel.completedBookingsCount, hotel.pendingBookingsCount)}</td>
                <td className="px-4 py-3 text-sm">{splitMoney(hotel.earnedRevenue, Number(hotel.pendingRevenue || 0))}</td>
                <td className="px-4 py-3 text-sm">{splitMoney(hotel.earnedCommission, Number(hotel.pendingCommission || 0))}</td>
                <td className="px-4 py-3 text-right">
                  {!hotel.isActiveHotel && !hotel.isArchived && (
                    <button
                      onClick={(e) => approveHotel(hotel.propertyId, e)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-green-600 text-white hover:bg-green-700 transition shadow-sm"
                    >
                      Duyệt
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <BookingDetailModal 
          hotel={detail} 
          onClose={() => setDetail(null)} 
          onRefresh={load} 
          onNavigateToRoom={(propertyId) => navigate("/rooms", { state: { filter: "approved", targetId: propertyId, highlight: true, fromTab: "bookings", fromTargetPropertyId: propertyId } })} 
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone, highlight }: { label: string; value: React.ReactNode; tone: "slate" | "blue" | "indigo" | "emerald" | "amber"; highlight?: boolean }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className={cn(
      "rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:shadow-md duration-500",
      highlight && "animate-highlight-pulse ring-2 ring-primary/20"
    )}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("mt-2 inline-flex rounded border px-2 py-0.5 text-xs font-bold leading-none sm:text-sm", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function BookingDetailModal({ hotel, onClose, onRefresh, onNavigateToRoom }: { hotel: HotelReport; onClose: () => void; onRefresh: () => void; onNavigateToRoom?: (hotelId: number) => void }) {
  const [selectedSingle, setSelectedSingle] = useState<BookingItem | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  const filteredBookings = useMemo(() => {
    if (activeTab === "cancelled") return hotel.bookings.filter(b => b.status === "cancelled");
    if (activeTab === "completed") return hotel.bookings.filter(b => b.isCompleted && b.status !== "cancelled");
    return hotel.bookings.filter(belongsToUpcomingTab);
  }, [hotel.bookings, activeTab]);

  return (
    <>
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border rounded-lg w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold truncate">{hotel.propertyName}</h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold uppercase shrink-0">ID: {hotel.propertyId}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{hotel.isArchived && <span className="mr-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Khách sạn đã ngừng hoạt động</span>}{hotel.address} | Đối tác: {hotel.partnerEmail}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onNavigateToRoom && (
              <button
                onClick={() => onNavigateToRoom(hotel.propertyId)}
                className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-md text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                title="Chuyển sang trang Quản lý phòng chi tiết"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Chi tiết phòng
              </button>
            )}
            <div className="flex border rounded-md overflow-hidden bg-background">
              {(["upcoming", "completed", "cancelled"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-bold transition-all ${activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {tab === "upcoming" ? "Chưa đến" : tab === "completed" ? "Đã xong" : "Đã hủy"}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-xl transition-colors">×</button>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-bold">Mã đặt</th>
                <th className="px-4 py-3 font-bold">Khách hàng</th>
                <th className="px-4 py-3 font-bold">Phòng</th>
                <th className="px-4 py-3 font-bold text-center">Thời gian</th>
                <th className="px-4 py-3 font-bold text-center">Trạng thái</th>
                <th className="px-4 py-3 font-bold text-right">Hoa hồng</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-medium">Không có dữ liệu</td>
                </tr>
              )}
              {filteredBookings.map((booking) => {
                return (
                <tr key={booking.id} onClick={() => setSelectedSingle(booking)} className={`cursor-pointer hover:bg-muted/30 transition-colors ${booking.propertyIsArchived || hotel.isArchived ? "opacity-60 bg-slate-50" : ""}`}>
                  <td className="p-4 font-bold text-xs uppercase">{booking.bookingCode}</td>
                  <td className="p-4">
                    <div className="font-bold">{booking.customerName}</div>
                    <div className="text-[10px] text-muted-foreground">{booking.customerEmail}</div>
                  </td>
                  <td className="p-4 text-xs font-medium">
                    {booking.priceLabel || "-"}
                  </td>
                  <td className="p-4 text-center">
                    <div className="font-bold text-xs">{fmtDate(booking.checkInDate)} - {fmtDate(booking.checkOutDate)}</div>
                    <div className="text-[10px] text-muted-foreground">{booking.nights} đêm</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        booking.isCompleted ? "text-green-600 border-green-200 bg-green-50" :
                        booking.status === "pending" ? "text-amber-600 border-amber-200 bg-amber-50" :
                        booking.status === "cancelled" ? "text-destructive border-red-200 bg-red-50" :
                        "text-green-600 border-green-200 bg-green-50"
                      }`}>
                        {booking.isCompleted ? "Đã xong" :
                         booking.status === "pending" ? "Chờ thanh toán" :
                         booking.status === "cancelled" ? "Đã hủy" :
                         booking.status === "confirmed" ? "Xác nhận" : booking.status}
                      </span>
                      <span className="text-[9px] text-muted-foreground italic">
                        {booking.isCompleted ? "Đã trả phòng" : booking.isCurrentStay ? "Đang ở" : booking.isFutureStay ? "Sắp tới" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-primary">{fmtVnd(booking.platformFee)}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSingle && <SingleBookingDetailModal booking={selectedSingle} onClose={() => setSelectedSingle(null)} onRefresh={onRefresh} />}
    </div>
    </>
  );
}

function SingleBookingDetailModal({ booking, onClose, onRefresh }: { booking: BookingItem; onClose: () => void; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const isCancelled = booking.status === 'cancelled';
  const isPaidOnline = booking.paymentStatus === 'paid';
  
  let displayPaymentStatus = '';
  let statusColor = 'text-amber-600';
  
  if (isCancelled) {
    statusColor = 'text-red-600';
    displayPaymentStatus = isPaidOnline ? 'Đã hủy (He thong da hoan tien)' : 'Đã hủy (He thong tu dong huy)';
  } else if (isPaidOnline) {
    displayPaymentStatus = 'Da thanh toan (Online)';
    statusColor = 'text-green-600';
  } else if (booking.isCompleted) {
    displayPaymentStatus = 'Đã thanh toán (Tại khách sạn)';
    statusColor = 'text-green-600';
  } else {
    displayPaymentStatus = 'Chờ thanh toán';
  }

  const initialMethod = isPaidOnline ? 'Chuyển khoản / Thẻ (Online)' : 'Thanh toán tại khách sạn';
  const paymentMethod = isCancelled ? `${initialMethod} (Đơn đã hủy)` : (isPaidOnline ? initialMethod : (booking.status === 'confirmed' || booking.isCompleted ? 'Tiền mặt / Quẹt thẻ (Tại khách sạn)' : 'Chưa xác định'));

  async function handleAction(action: string) {
    if (!confirm(`Xác nhận thực hiện: ${action}?`)) return;
    setLoading(true);
    try {
      if (action === 'confirm_payment') {
        await markBookingPaid(booking.id);
      } else if (action === 'cancel') {
        await cancelBooking(booking.id);
      }
      onRefresh();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border rounded-lg w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg">Đơn hàng {booking.bookingCode}</h3>
            {isCancelled ? (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Đã hủy</span>
            ) : booking.isCompleted ? (
              <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Hoàn tất</span>
            ) : null}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors">×</button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className={`space-y-5 ${isCancelled ? 'opacity-60' : ''}`}>
            <section className="space-y-2">
              <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Thông tin khách hàng</div>
              <div className="bg-muted/10 p-4 rounded border">
                <div className="font-bold text-base text-foreground">{booking.customerName}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{booking.customerEmail}</div>
                <div className="text-sm text-muted-foreground">{booking.customerPhone || "Chưa cung cấp số điện thoại"}</div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Chi tiết đặt phòng</div>
              <div className="grid grid-cols-2 gap-px bg-border border rounded overflow-hidden">
                <div className="bg-card p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Loại phòng</div>
                  <div className="font-bold text-sm">{booking.priceLabel || "Chưa xác định"}</div>
                </div>
                <div className="bg-card p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Số đêm</div>
                  <div className="font-bold text-sm">{booking.nights} đêm</div>
                </div>
                <div className="bg-card p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Nhận phòng</div>
                  <div className="font-bold text-sm">{fmtDate(booking.checkInDate)}</div>
                </div>
                <div className="bg-card p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Trả phòng</div>
                  <div className="font-bold text-sm">{fmtDate(booking.checkOutDate)}</div>
                </div>
              </div>
            </section>
            
            {booking.specialRequests && (
              <section className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Yêu cầu đặc biệt</div>
                <div className="bg-amber-50/50 border border-amber-200 p-3 rounded text-sm italic text-amber-900/80">
                  "{booking.specialRequests}"
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Tai chinh (VND)</div>
              <div className="border rounded divide-y bg-muted/5">
                <div className="p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng khách trả:</span>
                    <span className={isCancelled ? 'line-through' : 'font-bold'}>{fmtVnd(booking.total)}</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold">
                    <span>Hoa hồng Admin:</span>
                    <span className={isCancelled ? 'line-through opacity-50' : ''}>{fmtVnd(isCancelled ? 0 : booking.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tra cho Đối tác:</span>
                    <span className={isCancelled ? 'line-through opacity-50' : ''}>{fmtVnd(isCancelled ? 0 : booking.partnerPayout)}</span>
                  </div>
                </div>

                <div className="p-3 space-y-2 bg-muted/20">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground font-bold uppercase">Phương thức:</span>
                    <span className="font-bold">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground font-bold uppercase">Trạng thái:</span>
                    <span className={`font-bold ${statusColor}`}>
                      {displayPaymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {!isCancelled && !booking.isCompleted && (
            <section className="space-y-2">
              <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Hành động Admin</div>
              <div className="grid grid-cols-2 gap-2">
                {!isPaidOnline && (
                  <button 
                    disabled={loading}
                    onClick={() => handleAction('confirm_payment')}
                    className="py-2 text-xs font-bold border rounded hover:bg-green-50 text-green-700 border-green-200 transition-colors"
                  >
                    Xác nhận thanh toán
                  </button>
                )}
                <button 
                  disabled={loading}
                  onClick={() => handleAction('cancel')}
                  className="py-2 text-xs font-bold border rounded hover:bg-red-50 text-red-700 border-red-200 transition-colors"
                >
                  Hủy đơn hàng
                </button>
              </div>
            </section>
          )}
        </div>
        <div className="p-4 border-t">
          <button onClick={onClose} className="w-full py-3 rounded bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
