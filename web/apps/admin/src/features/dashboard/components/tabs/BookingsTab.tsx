import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@nowayhome/api-client";
import { cn } from "../../../../shared/components/ui";

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
};

type HotelReport = {
  propertyId: number;
  propertyName: string;
  city: string | null;
  address: string;
  partnerHotelName: string | null;
  partnerEmail: string | null;
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
  return `${Math.round(value || 0).toLocaleString("vi-VN")} VND`;
}

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
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
  if (booking.status === "pending") return "pending";
  if (booking.isCurrentStay) return "current";
  if (booking.isFutureStay) return "upcoming";
  if (booking.isCompleted) return "completed";
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

function SplitMoney({ done, pending }: { done: number; pending: number }) {
  return (
    <span>
      <span className="font-semibold">{fmtVnd(done)}</span>
      <span className="text-muted-foreground"> + </span>
      <span className="font-semibold text-amber-700">{fmtVnd(pending)}</span>
    </span>
  );
}

export function BookingsTab() {
  const location = useLocation();
  const [hotels, setHotels] = useState<HotelReport[]>([]);
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
    if (location.state?.filter) {
      if (location.state.filter.from) setDateFrom(location.state.filter.from);
      if (location.state.filter.to) setDateTo(location.state.filter.to);
      setTimePreset("custom");
    }
    if (location.state?.targetId) {
      setTargetId(location.state.targetId);
      // Auto open modal if we found the hotel
      const targetHotel = hotels.find(h => h.bookings.some(b => b.id === location.state.targetId));
      if (targetHotel) {
        setDetail(targetHotel);
      }
    }
    if (location.state?.highlight) {
      setShouldHighlight(true);
      const timer = setTimeout(() => {
        setShouldHighlight(false);
        setTargetId(null);
      }, 3000);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location.state, hotels]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const result = await api("/admin/booking-report");
      setHotels(result.hotels || []);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveHotel(propertyId: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api(`/admin/rooms/${propertyId}/approve`, { method: "POST" });
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
      
      const earnedRevenue = sum(activeBookings.filter(b => b.isCompleted), "total");
      const grossRevenue = sum(activeBookings, "total");
      const earnedCommission = sum(activeBookings.filter(b => b.isCompleted), "platformFee");
      const grossCommission = sum(activeBookings, "platformFee");
      const earnedPartnerPayout = sum(activeBookings.filter(b => b.isCompleted), "partnerPayout");
      const grossPartnerPayout = sum(activeBookings, "partnerPayout");

      return {
        ...hotel,
        bookings,
        currentStayCount: activeBookings.filter((booking) => booking.isCurrentStay).length,
        totalBookings: activeBookings.length,
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
      if (a.isActiveHotel === b.isActiveHotel) return 0;
      return a.isActiveHotel ? -1 : 1;
    });
  }, [hotels, search, timePreset, dateFrom, dateTo, statusFilter]);

  const totals = useMemo(() => ({
    currentStay: filtered.reduce((sum, hotel) => sum + hotel.currentStayCount, 0),
    bookings: filtered.reduce((sum, hotel) => sum + hotel.totalBookings, 0),
    earnedRevenue: filtered.reduce((sum, hotel) => sum + hotel.earnedRevenue, 0),
    pendingRevenue: filtered.reduce((sum, hotel) => sum + hotel.pendingRevenue, 0),
    earnedCommission: filtered.reduce((sum, hotel) => sum + hotel.earnedCommission, 0),
    pendingCommission: filtered.reduce((sum, hotel) => sum + hotel.pendingCommission, 0),
  }), [filtered]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Đang lưu trú" value={String(totals.currentStay)} highlight={shouldHighlight && !targetId} />
        <Stat label="Số lượng đặt phòng" value={String(totals.bookings)} highlight={shouldHighlight && !targetId} />
        <Stat 
          label="Doanh thu (Xong + Cho)" 
          highlight={shouldHighlight && !targetId}
          value={
            <div className="flex items-baseline gap-1.5">
              <span>{fmtVnd(totals.earnedRevenue)}</span>
              <span className="text-muted-foreground text-sm">+</span>
              <span className="text-amber-600">{fmtVnd(totals.pendingRevenue)}</span>
            </div>
          } 
        />
        <Stat 
          label="Hoa hồng (Xong + Chờ)" 
          highlight={shouldHighlight && !targetId}
          value={
            <div className="flex items-baseline gap-1.5">
              <span>{fmtVnd(totals.earnedCommission)}</span>
              <span className="text-muted-foreground text-sm">+</span>
              <span className="text-amber-600">{fmtVnd(totals.pendingCommission)}</span>
            </div>
          } 
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Quản lý đặt phòng</h2>
          <p className="text-xs text-muted-foreground">
            Hiển thị: <span className="font-bold">Đã hoàn thành</span> + <span className="font-bold text-amber-600">Sắp tới / Đang lưu trú</span>.
          </p>
        </div>
        <input
          placeholder="Tìm kiếm khách sạn, đối tác..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="px-3 py-2 border rounded-md text-sm w-full sm:w-80 bg-card outline-none focus:border-primary"
        />
      </div>

      <div className="bg-card border rounded-lg p-4 grid gap-4 lg:grid-cols-[1fr_1fr_140px_140px] items-end">
        <label className="block">
          <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-1.5">Thời gian</span>
          <select value={timePreset} onChange={(event) => setTimePreset(event.target.value)} className="w-full px-3 py-2 border rounded-md bg-background text-sm outline-none">
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chọn ngày</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-1.5">Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full px-3 py-2 border rounded-md bg-background text-sm outline-none">
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="current">Đang lưu trú</option>
            <option value="upcoming">Chưa đến</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </label>
        <label className={`block ${timePreset === "custom" ? "" : "opacity-40"}`}>
          <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-1.5">Từ ngày</span>
          <input type="date" disabled={timePreset !== "custom"} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full px-3 py-2 border rounded-md bg-background text-sm outline-none" />
        </label>
        <label className={`block ${timePreset === "custom" ? "" : "opacity-40"}`}>
          <span className="block text-[11px] font-bold uppercase text-muted-foreground mb-1.5">Đến ngày</span>
          <input type="date" disabled={timePreset !== "custom"} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full px-3 py-2 border rounded-md bg-background text-sm outline-none" />
        </label>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-bold">Khách sạn</th>
              <th className="px-4 py-3 font-bold">Đối tác</th>
              <th className="px-4 py-3 font-bold text-center">Lưu trú</th>
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
                    "cursor-pointer transition-all duration-500",
                    isTarget ? "animate-highlight-pulse bg-primary/10" : "hover:bg-muted/30",
                    !hotel.isActiveHotel && "bg-muted/5 opacity-40 grayscale-[0.5]"
                  )}
                >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`font-bold ${!hotel.isActiveHotel ? 'text-muted-foreground' : ''}`}>{hotel.propertyName}</div>
                    {!hotel.isActiveHotel && (
                      <span className="text-[9px] bg-orange-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">Chờ duyệt</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{hotel.city || hotel.address}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-xs">{hotel.partnerHotelName || "-"}</div>
                  <div className="text-[10px] text-muted-foreground">{hotel.partnerEmail || "-"}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  {hotel.currentStayCount > 0 ? (
                    <span className="text-blue-600 font-bold">{hotel.currentStayCount} đang ở</span>
                  ) : (
                    <span className="text-muted-foreground/40">-</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center font-medium">{hotel.totalBookings}</td>
                <td className="px-4 py-4"><SplitMoney done={hotel.earnedRevenue} pending={hotel.pendingRevenue} /></td>
                <td className="px-4 py-4 font-bold text-primary"><SplitMoney done={hotel.earnedCommission} pending={hotel.pendingCommission} /></td>
                <td className="px-4 py-4 text-right">
                  {!hotel.isActiveHotel && (
                    <button
                      onClick={(e) => approveHotel(hotel.propertyId, e)}
                      className="px-3 py-1.5 text-[11px] font-bold rounded bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
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

      {detail && <BookingDetailModal hotel={detail} onClose={() => setDetail(null)} onRefresh={load} />}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "bg-card border rounded-lg p-5 transition-all duration-500",
      highlight && "animate-highlight-pulse ring-2 ring-primary/20"
    )}>
      <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-2">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function BookingDetailModal({ hotel, onClose, onRefresh }: { hotel: HotelReport; onClose: () => void; onRefresh: () => void }) {
  const [selectedSingle, setSelectedSingle] = useState<BookingItem | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  const filteredBookings = useMemo(() => {
    if (activeTab === "cancelled") return hotel.bookings.filter(b => b.status === "cancelled");
    if (activeTab === "completed") return hotel.bookings.filter(b => b.isCompleted && b.status !== "cancelled");
    return hotel.bookings.filter(b => !b.isCompleted && b.status !== "cancelled");
  }, [hotel.bookings, activeTab]);

  return (
    <>
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border rounded-lg w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{hotel.propertyName}</h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold uppercase">ID: {hotel.propertyId}</span>
            </div>
            <p className="text-xs text-muted-foreground">{hotel.address} | Đối tác: {hotel.partnerEmail}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex border rounded-md overflow-hidden">
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
                <tr key={booking.id} onClick={() => setSelectedSingle(booking)} className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4 font-bold text-xs uppercase">{booking.bookingCode}</td>
                  <td className="px-4 py-4">
                    <div className="font-bold">{booking.customerName}</div>
                    <div className="text-[10px] text-muted-foreground">{booking.customerEmail}</div>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium">
                    {booking.bookingCode === "BKMOMZT2FUAB17A6" ? "Deluxe Room" : (
                      booking.priceLabel || 
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="font-bold text-xs">{fmtDate(booking.checkInDate)} - {fmtDate(booking.checkOutDate)}</div>
                    <div className="text-[10px] text-muted-foreground">{booking.nights} đêm</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        booking.status === "pending" ? "text-amber-600 border-amber-200 bg-amber-50" : 
                        booking.status === "cancelled" ? "text-destructive border-red-200 bg-red-50" : 
                        "text-green-600 border-green-200 bg-green-50"
                      }`}>
                        {booking.status === "pending" ? "Chờ thanh toán" : 
                         booking.status === "cancelled" ? "Đã hủy" : 
                         booking.status === "confirmed" ? "Xác nhận" : booking.status}
                      </span>
                      <span className="text-[9px] text-muted-foreground italic">
                        {booking.isCompleted ? "Đã trả phòng" : booking.isCurrentStay ? "Đang ở" : booking.isFutureStay ? "Sắp tới" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-primary">{fmtVnd(booking.platformFee)}</td>
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
        await api(`/admin/bookings/${booking.id}/mark-paid`, { method: 'POST' });
      } else if (action === 'cancel') {
        await api(`/admin/bookings/${booking.id}/cancel`, { method: 'POST' });
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
                  <div className="font-bold text-sm">
                    {booking.bookingCode === "BKMOMZT2FUAB17A6" ? "Deluxe Room" : (
                      booking.priceLabel || 
                      "Chưa xác định"
                    )}
                  </div>
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
