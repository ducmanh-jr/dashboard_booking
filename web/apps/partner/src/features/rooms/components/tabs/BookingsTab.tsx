import { useEffect, useMemo, useState } from "react";
import { fetchBookingReport, runBookingAction } from "../../../../api/bookingsApi";


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
};

type HotelReport = {
  propertyId: number;
  propertyName: string;
  city: string | null;
  address: string;
  isActiveHotel: boolean;
  currentStayCount: number;
  totalBookings: number;
  grossRevenue: number;
  earnedRevenue: number;
  grossPartnerPayout: number;
  earnedPartnerPayout: number;
  grossCommission: number;
  paidCommission: number;
  bookings: BookingItem[];
  pendingRevenue?: number;
  pendingPartnerPayout?: number;
};

type StatusFilter = "all" | "pending" | "current" | "upcoming" | "completed" | "cancelled";

let cachedBookingHotels: HotelReport[] | null = null;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

function bookingStatusKey(booking: BookingItem): StatusFilter | "unfinished" {
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

function statusText(booking: BookingItem) {
  if (booking.isCompleted) return "Đã xong";
  if (booking.status === "pending") return "Chờ thanh toán";
  if (booking.status === "cancelled") return "Đã hủy";
  if (booking.status === "confirmed") return "Đã xác nhận";
  if (booking.status === "checked_in") return "Đang ở";
  if (booking.status === "checked_out") return "Đã trả phòng";
  return booking.status;
}

function statusClass(booking: BookingItem) {
  const key = bookingStatusKey(booking);
  if (key === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (key === "cancelled") return "border-red-200 bg-red-50 text-red-700";
  if (key === "current") return "border-blue-200 bg-blue-50 text-blue-700";
  if (key === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-indigo-200 bg-indigo-50 text-indigo-700";
}

function statusFilterLabel(status: StatusFilter) {
  if (status === "pending") return "Chờ thanh toán";
  if (status === "current") return "Đang lưu trú";
  if (status === "upcoming") return "Sắp tới";
  if (status === "completed") return "Hoàn thành";
  if (status === "cancelled") return "Đã hủy";
  return "Tất cả";
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

export function BookingsTab() {
  const [hotels, setHotels] = useState<HotelReport[]>(cachedBookingHotels || []);
  const [loading, setLoading] = useState(!cachedBookingHotels);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [timePreset, setTimePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detail, setDetail] = useState<HotelReport | null>(null);

  async function load() {
    setLoading(hotels.length === 0);
    setErr("");
    try {
      const result = await fetchBookingReport();
      const nextHotels = result.hotels || [];
      cachedBookingHotels = nextHotels;
      setHotels(nextHotels);
      setDetail((current) =>
        current
          ? nextHotels.find((hotel: HotelReport) => hotel.propertyId === current.propertyId) || current
          : current
      );
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const range = timePreset === "custom" ? { from: dateFrom, to: dateTo } : getPresetRange(timePreset);

    return hotels
      .map((hotel) => {
        const bookings = hotel.bookings.filter((booking) => {
          const matchStatus = statusFilter === "all" || bookingStatusKey(booking) === statusFilter;
          return matchStatus && bookingInRange(booking, range.from, range.to);
        });
        const activeBookings = bookings.filter((booking) => booking.status !== "cancelled");
        const sum = (rows: BookingItem[], key: "total" | "partnerPayout") => rows.reduce((total, item) => total + Number(item[key] || 0), 0);
        const completed = activeBookings.filter((item) => item.isCompleted);
        const earnedPartnerPayout = sum(completed, "partnerPayout");
        const grossPartnerPayout = sum(activeBookings, "partnerPayout");
        const earnedRevenue = sum(completed, "total");
        const grossRevenue = sum(activeBookings, "total");

        return {
          ...hotel,
          bookings,
          currentStayCount: activeBookings.filter((booking) => booking.isCurrentStay).length,
          totalBookings: activeBookings.length,
          completedBookingsCount: completed.length,
          pendingBookingsCount: activeBookings.length - completed.length,
          earnedRevenue,
          pendingRevenue: grossRevenue - earnedRevenue,
          earnedPartnerPayout,
          pendingPartnerPayout: grossPartnerPayout - earnedPartnerPayout,
        };
      })
      .filter((hotel) => {
        const matchSearch = !q || [hotel.propertyName, hotel.city || "", hotel.address].some((value) => value.toLowerCase().includes(q));
        return matchSearch && (statusFilter === "all" || hotel.bookings.length > 0);
      })
      .sort((a, b) => {
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

  const totals = useMemo(
    () => ({
      activeHotels: filtered.filter((hotel) => hotel.isActiveHotel).length,
      currentStay: filtered.reduce((sum, hotel) => sum + hotel.currentStayCount, 0),
      completedBookings: filtered.reduce((sum, hotel) => sum + hotel.completedBookingsCount, 0),
      pendingBookings: filtered.reduce((sum, hotel) => sum + hotel.pendingBookingsCount, 0),
      earnedPartnerPayout: filtered.reduce((sum, hotel) => sum + hotel.earnedPartnerPayout, 0),
      pendingPartnerPayout: filtered.reduce((sum, hotel) => sum + Number(hotel.pendingPartnerPayout || 0), 0),
    }),
    [filtered]
  );

  if (loading && hotels.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-24 rounded-lg bg-muted" />)}
        </div>
        <div className="h-16 rounded-lg bg-muted" />
        <div className="h-72 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-950">Đặt phòng & doanh thu</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Theo dõi lưu trú, đơn đặt phòng và khoản tiền đối tác nhận được.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Khách sạn hoạt động" value={String(totals.activeHotels)} tone="slate" />
        <StatCard label="Đang lưu trú" value={String(totals.currentStay)} tone="blue" />
        <StatCard label="Số đơn" value={splitCount(totals.completedBookings, totals.pendingBookings)} tone="indigo" />
        <StatCard label="Thu nhập" value={splitMoney(totals.earnedPartnerPayout, totals.pendingPartnerPayout)} tone="emerald" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[1fr_160px_160px_140px_140px]">
          <div className="relative">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
            <input
              placeholder="Tìm khách sạn, thành phố, địa chỉ..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <Select value={timePreset} onChange={setTimePreset} options={[
            ["all", "Tất cả thời gian"],
            ["today", "Hôm nay"],
            ["week", "Tuần này"],
            ["month", "Tháng này"],
            ["custom", "Tùy chọn ngày"],
          ]} />
          <Select value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={[
            ["all", "Tất cả trạng thái"],
            ["pending", "Chờ thanh toán"],
            ["current", "Đang lưu trú"],
            ["upcoming", "Sắp tới"],
            ["completed", "Hoàn thành"],
            ["cancelled", "Đã hủy"],
          ]} />
          <DateInput
            value={dateFrom}
            disabled={false}
            title="Từ ngày nhận phòng"
            onChange={(val) => {
              setDateFrom(val);
              setTimePreset("custom");
            }}
          />
          <DateInput
            value={dateTo}
            disabled={false}
            title="Đến ngày nhận phòng"
            onChange={(val) => {
              setDateTo(val);
              setTimePreset("custom");
            }}
          />
        </div>
      </div>

      {err && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{err}</div>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="text-sm font-bold text-slate-950">Báo cáo theo khách sạn</div>
          <div className="mt-0.5 text-xs text-slate-500">Bấm vào một khách sạn để xem danh sách đơn đặt phòng.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-white text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Khách sạn</th>
                <th className="w-32 px-4 py-3 text-center font-bold">Lưu trú</th>
                <th className="w-28 px-4 py-3 text-center font-bold">Số đơn</th>
                <th className="px-4 py-3 font-bold">Doanh thu</th>
                <th className="px-4 py-3 font-bold">Thu nhập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm font-medium text-slate-500">Không có dữ liệu phù hợp.</td>
                </tr>
              )}
              {filtered.map((hotel) => (
                <tr
                  key={hotel.propertyId}
                  onClick={() => setDetail(hotel)}
                  className={cn("cursor-pointer transition hover:bg-indigo-50/50", !hotel.isActiveHotel && "bg-slate-50 opacity-75")}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-bold text-slate-950">{hotel.propertyName}</div>
                      {!hotel.isActiveHotel && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Chờ duyệt</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{hotel.city || hotel.address}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hotel.currentStayCount > 0 ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{hotel.currentStayCount} đang ở</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">{splitCount(hotel.completedBookingsCount, hotel.pendingBookingsCount)}</td>
                  <td className="px-4 py-3 text-sm">{splitMoney(hotel.earnedRevenue, Number(hotel.pendingRevenue || 0))}</td>
                  <td className="px-4 py-3 text-sm">{splitMoney(hotel.earnedPartnerPayout, Number(hotel.pendingPartnerPayout || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <BookingDetailModal hotel={detail} onClose={() => setDetail(null)} onChanged={() => load()} />}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone: "slate" | "blue" | "indigo" | "emerald" }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:shadow-md">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("mt-2 inline-flex rounded border px-2 py-0.5 text-xs font-bold leading-none sm:text-sm", toneClass)}>{value}</div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  );
}

function DateInput({ value, disabled, onChange, title }: { value: string; disabled: boolean; onChange: (value: string) => void; title?: string }) {
  return (
    <input
      type="date"
      disabled={disabled}
      value={value}
      title={title}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border bg-white px-2.5 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-slate-300"
    />
  );
}

function BookingDetailModal({ hotel, onClose, onChanged }: { hotel: HotelReport; onClose: () => void; onChanged: () => void }) {
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [activeTab, setActiveTab] = useState<StatusFilter>("upcoming");

  const bookings = useMemo(() => {
    if (activeTab === "all") return hotel.bookings;
    if (activeTab === "upcoming") return hotel.bookings.filter((booking) => !booking.isCompleted && booking.status !== "cancelled");
    if (activeTab === "completed") return hotel.bookings.filter((booking) => booking.isCompleted && booking.status !== "cancelled");
    if (activeTab === "cancelled") return hotel.bookings.filter((booking) => booking.status === "cancelled");
    return hotel.bookings.filter((booking) => bookingStatusKey(booking) === activeTab);
  }, [hotel.bookings, activeTab]);

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex flex-col gap-3 border-b bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase text-slate-500">Chi tiết đặt phòng</div>
              <h3 className="mt-1 text-lg font-bold text-slate-950">{hotel.propertyName}</h3>
              <p className="mt-1 text-xs text-slate-500">{hotel.address}</p>
            </div>
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50" aria-label="Đóng">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-b bg-slate-50 px-5 py-3">
            <div className="flex gap-1 overflow-x-auto rounded-md border bg-white p-1">
              {(["upcoming", "current", "pending", "completed", "cancelled"] as StatusFilter[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn("whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition", activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:bg-slate-50")}
                >
                  {statusFilterLabel(tab)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Mã đặt</th>
                  <th className="px-4 py-3 font-bold">Khách hàng</th>
                  <th className="px-4 py-3 font-bold">Loại phòng</th>
                  <th className="px-4 py-3 text-center font-bold">Thời gian</th>
                  <th className="px-4 py-3 text-center font-bold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-bold">Tiền nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm font-medium text-slate-500">Không có đơn trong mục này.</td>
                  </tr>
                )}
                {bookings.map((booking) => (
                  <tr key={booking.id} onClick={() => setSelectedBooking(booking)} className="cursor-pointer transition hover:bg-indigo-50/50">
                    <td className="px-4 py-3 text-xs font-bold uppercase text-slate-800">{booking.bookingCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950">{booking.customerName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{booking.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{booking.priceLabel || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs font-bold text-slate-800">{fmtDate(booking.checkInDate)} - {fmtDate(booking.checkOutDate)}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{booking.nights} đêm</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", statusClass(booking))}>{statusText(booking)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{booking.status === "cancelled" ? fmtVnd(0) : fmtVnd(booking.partnerPayout)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedBooking && (
        <SingleBookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onChanged={() => {
            setSelectedBooking(null);
            onChanged();
            onClose();
          }}
        />
      )}
    </>
  );
}

function SingleBookingDetailModal({ booking, onClose, onChanged }: { booking: BookingItem; onClose: () => void; onChanged: () => void }) {
  const isCancelled = booking.status === "cancelled";
  const paymentStatus = isCancelled ? "Đã hủy" : booking.paymentStatus === "paid" || booking.isCompleted ? "Đã thanh toán" : "Chờ thanh toán";
  const [busyAction, setBusyAction] = useState("");
  const [err, setErr] = useState("");

  async function runAction(action: "check-in" | "check-out" | "no-show") {
    const labels = {
      "check-in": "check-in",
      "check-out": "check-out",
      "no-show": "báo no-show",
    };
    if (!confirm(`Xác nhận ${labels[action]} đơn ${booking.bookingCode}?`)) return;
    setBusyAction(action);
    setErr("");
    try {
      await runBookingAction(booking.id, action);
      onChanged();
    } catch (error: any) {
      setErr(error.message || "Không cập nhật được trạng thái booking");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-lg border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Đơn hàng</div>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{booking.bookingCode}</h3>
            <span className={cn("mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", statusClass(booking))}>{paymentStatus}</span>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50" aria-label="Đóng">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
          {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          <InfoBlock title="Khách hàng">
            <div className="font-bold text-slate-950">{booking.customerName}</div>
            <div className="mt-1 text-sm text-slate-500">{booking.customerEmail}</div>
            <div className="text-sm text-slate-500">{booking.customerPhone || "Chưa có số điện thoại"}</div>
          </InfoBlock>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile label="Loại phòng" value={booking.priceLabel || "-"} />
            <InfoTile label="Số khách" value={`${booking.adults} người lớn, ${booking.children} trẻ em`} />
            <InfoTile label="Nhận phòng" value={fmtDate(booking.checkInDate)} />
            <InfoTile label="Trả phòng" value={`${fmtDate(booking.checkOutDate)} • ${booking.nights} đêm`} />
          </div>

          {booking.specialRequests && (
            <InfoBlock title="Yêu cầu đặc biệt">
              <p className="text-sm leading-6 text-amber-900">{booking.specialRequests}</p>
            </InfoBlock>
          )}

          <InfoBlock title="Thanh toán & doanh thu">
            <MoneyRow label="Tổng tiền khách trả" value={fmtVnd(booking.total)} muted={isCancelled} />
            <MoneyRow label="Phí nền tảng" value={`-${fmtVnd(booking.platformFee)}`} danger muted={isCancelled} />
            <div className="mt-3 flex items-center justify-between rounded-md bg-indigo-50 p-3">
              <span className="text-sm font-bold uppercase text-indigo-700">Tiền đối tác nhận</span>
              <span className={cn("text-xl font-black", isCancelled ? "text-slate-400 line-through" : "text-primary")}>{fmtVnd(isCancelled ? 0 : booking.partnerPayout)}</span>
            </div>
          </InfoBlock>

          <InfoBlock title="Thao tác lưu trú">
            <div className="flex flex-wrap gap-2">
              {booking.status === "confirmed" && (
                <button
                  type="button"
                  onClick={() => runAction("check-in")}
                  disabled={!!busyAction}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busyAction === "check-in" ? "Đang xử lý..." : "Check-in"}
                </button>
              )}
              {booking.status === "checked_in" && (
                <button
                  type="button"
                  onClick={() => runAction("check-out")}
                  disabled={!!busyAction}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyAction === "check-out" ? "Đang xử lý..." : "Check-out"}
                </button>
              )}
              {["pending", "confirmed"].includes(booking.status) && (
                <button
                  type="button"
                  onClick={() => runAction("no-show")}
                  disabled={!!busyAction}
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                >
                  {busyAction === "no-show" ? "Đang xử lý..." : "No-show"}
                </button>
              )}
              {!["pending", "confirmed", "checked_in"].includes(booking.status) && (
                <div className="text-sm text-slate-500">Không có thao tác khả dụng cho trạng thái hiện tại.</div>
              )}
            </div>
          </InfoBlock>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 text-[11px] font-bold uppercase text-slate-500">{title}</div>
      {children}
    </section>
  );
}

function MoneyRow({ label, value, danger, muted }: { label: string; value: string; danger?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-200 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-bold", danger && "text-red-600", muted && "text-slate-400 line-through")}>{value}</span>
    </div>
  );
}
