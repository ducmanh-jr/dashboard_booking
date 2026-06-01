import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRooms } from "../../../../api/roomsApi";
import { fetchBookingReport } from "../../../../api/bookingsApi";
import { Room } from "../../../../shared/types";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Hotel,
  FilePenLine,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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
  bookings: BookingItem[];
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtVnd(value: number) {
  return `${Math.round(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatCompactVnd(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M đ`;
  if (value >= 1000) return `${Math.round(value / 1000)}K đ`;
  return `${value} đ`;
}

export function DashboardTab() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reports, setReports] = useState<HotelReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [roomsRes, reportsRes] = await Promise.all([
        fetchRooms(),
        fetchBookingReport(),
      ]);
      setRooms(roomsRes.hotels || []);
      setReports(reportsRes.hotels || []);
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu tổng quan đối tác.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Map and calculate stats client-side to ensure zero NaN or undefined values
  const calculatedReports = useMemo(() => {
    return reports
      .map((hotel) => {
        const bookings = hotel.bookings || [];
        const activeBookings = bookings.filter((b) => b.status !== "cancelled");
        const completedBookings = activeBookings.filter((b) => b.isCompleted);
        
        const sum = (rows: any[], key: string) => rows.reduce((acc, item) => acc + Number(item[key] || 0), 0);
        
        const grossRevenue = sum(activeBookings, "total");
        const earnedRevenue = sum(completedBookings, "total");
        const pendingRevenue = grossRevenue - earnedRevenue;

        const grossPartnerPayout = sum(activeBookings, "partnerPayout");
        const earnedPartnerPayout = sum(completedBookings, "partnerPayout");
        const pendingPartnerPayout = grossPartnerPayout - earnedPartnerPayout;

        const currentStayCount = activeBookings.filter((b) => b.isCurrentStay).length;

        return {
          ...hotel,
          bookings,
          currentStayCount,
          totalBookings: activeBookings.length,
          grossRevenue,
          earnedRevenue,
          pendingRevenue,
          grossPartnerPayout,
          earnedPartnerPayout,
          pendingPartnerPayout,
        };
      })
      .sort((a, b) => {
        if (b.totalBookings !== a.totalBookings) {
          return b.totalBookings - a.totalBookings;
        }
        return b.earnedPartnerPayout - a.earnedPartnerPayout;
      });
  }, [reports]);

  // Flatten all bookings and sort desc
  const allBookings = useMemo(() => {
    const list: (BookingItem & { hotelName: string })[] = [];
    calculatedReports.forEach((h) => {
      h.bookings.forEach((b) => {
        list.push({ ...b, hotelName: h.propertyName });
      });
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [calculatedReports]);

  // Always use current date for dashboard stats to reflect real-time week/month
  const anchorDate = useMemo(() => new Date(), []);

  // Filter bookings based on selected period relative to anchorDate
  const filteredBookingsForStats = useMemo(() => {
    return allBookings.filter((b) => {
      const bDate = new Date(b.createdAt);
      const diffTime = anchorDate.getTime() - bDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (period === "week") return diffDays <= 7;
      if (period === "month") return diffDays <= 30;
      return true; // year = toàn bộ lịch sử
    });
  }, [allBookings, period, anchorDate]);

  // Aggregated Stats derived from filtered period bookings
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const approvedRooms = rooms.filter((r) => r.status === "approved").length;
    const pendingRooms = rooms.filter((r) => r.status !== "approved").length;
    const pendingRequestsCount = rooms.filter((r) => r.pendingRequest).length;

    const activeBookings = filteredBookingsForStats.filter((b) => b.status !== "cancelled");
    const completedBookings = activeBookings.filter((b) => b.isCompleted);

    const totalBookings = activeBookings.length;
    const currentStays = activeBookings.filter((b) => b.isCurrentStay).length;
    
    const sum = (rows: any[], key: string) => rows.reduce((acc, item) => acc + Number(item[key] || 0), 0);
    const earnedPayout = sum(completedBookings, "partnerPayout");
    const grossPayout = sum(activeBookings, "partnerPayout");
    const pendingPayout = grossPayout - earnedPayout;

    return {
      totalRooms,
      approvedRooms,
      pendingRooms,
      pendingRequestsCount,
      totalBookings,
      currentStays,
      earnedPayout,
      pendingPayout,
      grossPayout,
    };
  }, [rooms, filteredBookingsForStats]);

  // Chart data matching dynamic period interval (Week, Month, Year)
  const chartData = useMemo(() => {
    if (period === "week") {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
        return {
          date: dateStr,
          name: dayLabel,
          bookings: 0,
          pendingBookings: 0,
          revenue: 0,
          pendingRevenue: 0,
          fullDate: dateStr,
        };
      }).reverse();

      allBookings.forEach((b) => {
        if (b.status === "cancelled") return;
        const bDate = b.createdAt.slice(0, 10);
        const dayObj = days.find((d) => d.date === bDate);
        if (dayObj) {
          dayObj.bookings += 1;
          dayObj.revenue += b.partnerPayout;
        }
      });
      return days;
    }

    if (period === "month") {
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        return {
          date: dateStr,
          name: dayLabel,
          bookings: 0,
          pendingBookings: 0,
          revenue: 0,
          pendingRevenue: 0,
          fullDate: dateStr,
        };
      }).reverse();

      allBookings.forEach((b) => {
        if (b.status === "cancelled") return;
        const bDate = b.createdAt.slice(0, 10);
        const dayObj = days.find((d) => d.date === bDate);
        if (dayObj) {
          dayObj.bookings += 1;
          dayObj.revenue += b.partnerPayout;
        }
      });
      return days;
    }

    // period === "year"
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      const monthLabel = `Thg ${month}`;
      return {
        date: monthStr,
        name: monthLabel,
        bookings: 0,
        pendingBookings: 0,
        revenue: 0,
        pendingRevenue: 0,
        fullDate: monthStr,
      };
    }).reverse();

    allBookings.forEach((b) => {
      if (b.status === "cancelled") return;
      const d = new Date(b.createdAt);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthObj = months.find((m) => m.date === monthStr);
      if (monthObj) {
        monthObj.bookings += 1;
        monthObj.revenue += b.partnerPayout;
      }
    });
    return months;
  }, [allBookings, period, anchorDate]);

  const COLORS = ["#059669", "#3b82f6", "#dc2626"];
  const statusData = [
    { name: "Thành công", value: allBookings.filter(b => b.isCompleted && b.status !== "cancelled").length },
    { name: "Đang lưu trú", value: allBookings.filter(b => b.isCurrentStay).length },
    { name: "Đã hủy", value: allBookings.filter(b => b.status === "cancelled").length },
  ];
  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);

  // Replicating admin today actions section
  const actionItems = [
    {
      label: "Khách sạn chờ Admin duyệt",
      count: stats.pendingRooms,
      icon: Hotel,
      iconClass: "bg-blue-50 text-blue-600",
      countClass: "bg-blue-50 text-blue-700",
      onClick: () => navigate("/rooms"),
    },
    {
      label: "Yêu cầu thay đổi đang chờ",
      count: stats.pendingRequestsCount,
      icon: FilePenLine,
      iconClass: "bg-violet-50 text-violet-600",
      countClass: "bg-violet-50 text-violet-700",
      onClick: () => navigate("/rooms"),
    },
    {
      label: "Đơn cần check-in / check-out",
      count: allBookings.filter((b) => ["confirmed", "checked_in"].includes(b.status) && !b.isCompleted).length,
      icon: ClipboardCheck,
      iconClass: "bg-rose-50 text-rose-600",
      countClass: "bg-rose-50 text-rose-700",
      onClick: () => navigate("/bookings"),
    },
  ];
  const totalActions = actionItems.reduce((sum, item) => sum + Number(item.count || 0), 0);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex h-8 w-48 rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-slate-200" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="h-96 rounded-lg bg-slate-200" />
          <div className="h-96 rounded-lg bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center max-w-xl mx-auto mt-12 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">Lỗi tải dữ liệu</h3>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <button
          onClick={loadData}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Recharts Coordinate Reset Style */}
      <style>{`
        .recharts-wrapper, .recharts-surface, .recharts-rectangle, .recharts-bar-rectangle, .recharts-cursor, .recharts-bar-cursor {
          outline: none !important;
          border: none !important;
          -webkit-tap-highlight-color: transparent !important;
          -webkit-focus-ring-color: transparent !important;
        }
        .recharts-cursor, .recharts-rectangle.recharts-cursor, .recharts-bar-cursor, .recharts-active-dot {
          display: none !important;
          stroke: none !important;
          stroke-width: 0 !important;
          fill: none !important;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Tổng quan đối tác</h2>
          <p className="text-[11px] text-muted-foreground">Theo dõi hiệu suất kinh doanh, số lượng đặt phòng và cơ sở lưu trú của đối tác.</p>
        </div>
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 shadow-inner">
            {[["week", "Tuần"], ["month", "Tháng"], ["year", "Năm"]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key as any)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all outline-none focus:outline-none select-none",
                  period === key 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards - Matching Admin dashboard's border & backgrounds exactly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Doanh thu đối tác"
          value={fmtVnd(stats.earnedPayout)}
          secondaryValue={stats.pendingPayout > 0 ? `+ ${fmtVnd(stats.pendingPayout)} chờ nhận` : "Đã hoàn tất đối soát"}
          icon={TrendingUp}
          color="emerald"
          onClick={() => navigate("/bookings")}
        />
        <StatCard
          title="Tổng đặt phòng"
          value={`${stats.totalBookings} đơn`}
          secondaryValue="Thống kê tất cả các kỳ lưu trú"
          icon={CalendarCheck}
          color="blue"
          onClick={() => navigate("/bookings")}
        />
        <StatCard
          title="Khách đang ở"
          value={`${stats.currentStays} khách`}
          secondaryValue="Số khách hiện tại đang lưu trú"
          icon={Users}
          color="sky"
          onClick={() => navigate("/bookings")}
        />
        <StatCard
          title="Khách sạn hoạt động"
          value={`${stats.approvedRooms}/${stats.totalRooms}`}
          secondaryValue={stats.pendingRooms > 0 ? `${stats.pendingRooms} đang chờ duyệt` : "Tất cả đã hoạt động"}
          icon={Hotel}
          color="amber"
          onClick={() => navigate("/rooms")}
        />
      </div>

      {/* Main Grid Columns - Matching Admin dashboard double-column exactly */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        
        {/* Left Column (Chart and Hotels list) */}
        <div className="space-y-5">
          {/* Recharts Bar Chart Card */}
          <div className="overflow-hidden rounded-xl border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <div className="flex flex-row items-center justify-between border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">Xu hướng đặt phòng</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">Nhấp để xem danh sách chi tiết các đơn.</p>
              </div>
            </div>
            <div className="h-[340px] pr-4 pt-4 px-4 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={1} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis yAxisId="left" stroke="#4f46e5" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#059669" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: "20px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}
                    formatter={(value) => (
                      <span className="text-zinc-600 font-bold text-[9px]">
                        {value === "bookings" ? "Đã xác nhận" : "Doanh thu"}
                      </span>
                    )}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "12px", fontSize: "11px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
                    labelFormatter={(val: any) => `Ngày: ${val}`}
                    formatter={(value: any, name: any) => {
                      if (name === "revenue") return [`${value?.toLocaleString("vi-VN")} đ`, "Doanh thu"];
                      return [`${value} đơn`, "Đã xác nhận"];
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    fill="url(#barGradient)"
                    radius={[3, 3, 0, 0]}
                    barSize={period === "week" ? 12 : period === "month" ? 4 : 15}
                    className="cursor-pointer"
                    onClick={() => navigate("/bookings")}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    fill="url(#revGradient)"
                    radius={[3, 3, 0, 0]}
                    barSize={period === "week" ? 12 : period === "month" ? 4 : 15}
                    className="cursor-pointer"
                    onClick={() => navigate("/bookings")}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top performing properties - Table replicates Admin's style precisely */}
          <div className="overflow-hidden rounded-xl border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <div className="border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
              <h3 className="text-sm font-semibold text-zinc-950">Khách sạn của tôi</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">Những cơ sở đang kéo doanh thu trong kỳ của đối tác.</p>
            </div>
            <div className="px-5 py-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#eee7ff] text-[10px] uppercase text-zinc-500">
                      <th className="pb-2 pr-3 font-bold">Tên khách sạn</th>
                      <th className="pb-2 pr-3 font-bold">Thành phố</th>
                      <th className="pb-2 pr-3 text-right font-bold">Khách đang ở</th>
                      <th className="pb-2 pr-3 text-right font-bold">Số đơn</th>
                      <th className="pb-2 text-right font-bold">Doanh thu đối tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedReports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground italic">Chưa có cơ sở dữ liệu doanh thu nào.</td>
                      </tr>
                    ) : (
                      calculatedReports.slice(0, 5).map((hotel, index) => (
                        <tr
                          key={hotel.propertyId || index}
                          onClick={() => navigate("/bookings")}
                          className="border-b border-[#faf5ff] hover:bg-[#f8f5ff] transition-colors cursor-pointer group"
                        >
                          <td className="py-3 pr-3 font-bold text-zinc-800 group-hover:text-primary transition-colors">{hotel.propertyName}</td>
                          <td className="py-3 pr-3 font-medium text-zinc-500">{hotel.city || "Chưa cập nhật"}</td>
                          <td className="py-3 pr-3 text-right font-bold text-zinc-800">
                            {hotel.currentStayCount > 0 ? (
                              <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {hotel.currentStayCount} khách
                              </span>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right font-bold text-zinc-600">{hotel.totalBookings} đơn</td>
                          <td className="py-3 text-right font-extrabold text-emerald-600">{fmtVnd(hotel.earnedPartnerPayout)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Status Chart, Actions, Activities) */}
        <div className="space-y-5">
          {/* Recharts Pie (Doughnut) Chart Section */}
          <div className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <div className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
              <h3 className="text-sm font-semibold text-zinc-950">Trạng thái đặt phòng</h3>
            </div>
            <div className="flex items-center justify-between py-4 px-5 h-[168px]">
              <div className="size-[116px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} innerRadius={36} outerRadius={54} paddingAngle={5} dataKey="value">
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5 pl-4">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-zinc-900">{item.value} ({totalStatus > 0 ? Math.round((item.value / totalStatus) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action items section - replicates Admin style exactly */}
          <div className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <div className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">Cần xử lý hôm nay</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">Các công việc cần đối tác theo dõi và xử lý</p>
                </div>
                <div className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", totalActions > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                  {totalActions} việc
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="space-y-2">
                {actionItems.map((item) => {
                  const Icon = item.icon;
                  const hasCount = Number(item.count || 0) > 0;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className="group flex w-full items-center gap-3 rounded-lg border border-transparent bg-white/55 px-3 py-2.5 text-left transition-all hover:border-[#e4dcff] hover:bg-[#f4f0ff] hover:shadow-sm active:scale-[0.99]"
                    >
                      <span className={cn("flex size-8 flex-shrink-0 items-center justify-center rounded-lg", item.iconClass)}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-zinc-700">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground font-medium">Xử lý ngay</span>
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", hasCount ? item.countClass : "bg-emerald-50 text-emerald-700")}>
                        {item.count}
                      </span>
                      <ChevronRight size={14} className="text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#4f46e5]" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent transactions section */}
          <div className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <div className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
              <h3 className="text-sm font-semibold text-zinc-950">Giao dịch gần đây</h3>
            </div>
            <div className="px-6 pb-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {allBookings.filter((b) => !["cancelled", "pending"].includes(b.status)).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center">Chưa có giao dịch đặt phòng nào.</p>
                ) : (
                  allBookings
                    .filter((b) => !["cancelled", "pending"].includes(b.status))
                    .slice(0, 5)
                    .map((booking, i) => (
                    <div
                      key={booking.id || i}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate("/bookings")}
                      className="flex items-center gap-3 cursor-pointer hover:bg-[#f4f0ff] p-1.5 -mx-1 rounded-md transition-colors outline-none focus-visible:ring-1 focus-visible:ring-primary/20 group"
                    >
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-extrabold text-[11px] bg-gradient-to-br",
                        booking.status === "cancelled" 
                          ? "from-red-500 to-rose-400" 
                          : booking.isCompleted 
                            ? "from-emerald-500 to-teal-400" 
                            : "from-indigo-500 to-blue-400"
                      )}>
                        {booking.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-none truncate font-bold text-zinc-800 group-hover:text-primary transition-colors">
                          {booking.customerName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2 truncate font-medium">{booking.hotelName} • {booking.priceLabel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-extrabold text-zinc-900 block">{fmtVnd(booking.partnerPayout)}</span>
                        <span className="text-[9px] text-muted-foreground font-bold">{new Date(booking.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Reusable StatCard Component
interface StatCardProps {
  title: string;
  value: string;
  secondaryValue?: string;
  icon: React.ComponentType<any>;
  color: "emerald" | "amber" | "blue" | "sky";
  onClick?: () => void;
}

function StatCard({ title, value, secondaryValue, icon: Icon, color, onClick }: StatCardProps) {
  const colorMap = {
    emerald: { bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600" },
    amber: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
    blue: { bar: "bg-blue-500", icon: "bg-blue-50 text-blue-600" },
    sky: { bar: "bg-sky-500", icon: "bg-sky-50 text-sky-600" },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative min-h-[128px] cursor-pointer overflow-hidden rounded-xl border border-[#eee7ff] bg-[#fbf8ff] transition-all hover:-translate-y-0.5 hover:border-[#d8ccff] hover:shadow-[0_10px_24px_rgba(76,29,149,0.08)] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      onClick={onClick}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", c.bar)} />
      <div className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
        <span className="text-[12px] font-semibold text-zinc-500">{title}</span>
        <div className={cn("size-9 rounded-lg flex items-center justify-center", c.icon)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="text-xl font-bold leading-none text-zinc-950">{value}</div>
        {secondaryValue && (
          <p className="inline-flex items-center gap-1 mt-3 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600">
            <TrendingUp size={9} />
            {secondaryValue}
          </p>
        )}
      </div>
    </div>
  );
}
