import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../../../../api/adminsApi";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  cn,
} from "../../../../shared/components/ui";

const TEXT = {
  title: "Tổng quan hệ thống",
  subtitle: "Theo dõi hiệu suất và quản lý phê duyệt.",
  week: "Tuần",
  month: "Tháng",
  year: "Năm",
  revenue: "Doanh thu",
  pendingPartners: "Đối tác chờ duyệt",
  newBookings: "Đặt phòng mới",
  newCustomers: "Khách hàng mới",
  needAction: "Cần xử lý ngay",
  done: "Đã xong",
  periodSuffix: "kỳ này",
  chartTitle: "Xu hướng đặt phòng",
  chartHint: "Nhấp để xem danh sách, nhấp đúp để xem chi tiết.",
  bookings: "Đặt phòng",
  date: "Ngày",
  bookingStatus: "Trạng thái đặt phòng",
  success: "Thành công",
  canceled: "Đã hủy",
  refunded: "Hoàn tiền",
  recentActivity: "Hoạt động gần đây",
  noActivity: "Chưa có hoạt động nào",
  viewAll: "Xem tất cả",
  todayActions: "Cần xử lý hôm nay",
  actionSubtitle: "Các việc cần admin ra quyết định",
  pendingRooms: "Khách sạn/phòng chờ duyệt",
  roomChangeRequests: "Yêu cầu chỉnh sửa/xóa phòng",
  pendingBookingActions: "Booking cần xác nhận/hủy",
  actionItems: "việc",
  openAction: "Xử lý",
  topHotels: "Top khách sạn theo doanh thu",
  topHotelsHint: "Những đối tác đang kéo doanh thu trong kỳ",
  hotelName: "Tên khách sạn",
  city: "Thành phố",
  orders: "Số đơn",
  commission: "Hoa hồng",
  noTopHotels: "Chưa có dữ liệu doanh thu",
  topCities: "Thành phố đang có nhu cầu cao",
  topCitiesHint: "Xếp hạng theo số booking trong kỳ",
  noTopCities: "Chưa có dữ liệu thành phố",
};

const formatCompactVnd = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toLocaleString("vi-VN");
};

export function DashboardTab() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats", period],
    queryFn: () => fetchStats(period),
  });

  const chartData = useMemo(() => {
    const trends = stats?.trends || [];
    const anchorDate = new Date();
    
    if (period === "week") {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        return {
          date: dateStr,
          name: dateStr,
          bookings: 0,
          revenue: 0,
          fullDate: dateStr,
        };
      }).reverse();

      trends.forEach((t: any) => {
        const dayObj = days.find((d) => d.date === t.name);
        if (dayObj) {
          dayObj.bookings += Number(t.bookings || 0);
          dayObj.revenue += Number(t.revenue || 0);
        }
      });
      return days;
    }

    if (period === "month") {
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        return {
          date: dateStr,
          name: dateStr,
          bookings: 0,
          revenue: 0,
          fullDate: dateStr,
        };
      }).reverse();

      trends.forEach((t: any) => {
        const dayObj = days.find((d) => d.date === t.name);
        if (dayObj) {
          dayObj.bookings += Number(t.bookings || 0);
          dayObj.revenue += Number(t.revenue || 0);
        }
      });
      return days;
    }

    // year
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      return {
        date: monthStr,
        name: monthStr,
        bookings: 0,
        revenue: 0,
        fullDate: monthStr,
      };
    }).reverse();

    trends.forEach((t: any) => {
      const monthObj = months.find((m) => m.date === t.name);
      if (monthObj) {
        monthObj.bookings += Number(t.bookings || 0);
        monthObj.revenue += Number(t.revenue || 0);
      }
    });
    return months;
  }, [stats?.trends, period]);
  const recentActivity = stats?.recentActivity || [];
  const topHotels = stats?.topHotels || [];
  const topCities = stats?.topCities || [];
  const maxCityBookings = Math.max(...topCities.map((item: any) => Number(item.bookings || 0)), 1);

  const statusData = [
    { name: TEXT.success, value: stats?.bookingStats?.confirmed ?? 0 },
    { name: TEXT.canceled, value: stats?.bookingStats?.canceled ?? 0 },
    { name: TEXT.refunded, value: stats?.bookingStats?.refunded ?? 0 },
  ];

  const totalStatus = statusData.reduce((sum, item) => sum + item.value, 0);
  const COLORS = ["#059669", "#dc2626", "#0284c7"];
  const actionItems = [
    {
      label: TEXT.pendingPartners,
      count: stats?.pendingPartners ?? 0,
      icon: Users,
      iconClass: "bg-amber-50 text-amber-600",
      countClass: "bg-amber-50 text-amber-700",
      onClick: () => navigate("/partners", { state: { filter: "pending", highlight: true } }),
    },
    {
      label: TEXT.pendingRooms,
      count: stats?.pendingRooms ?? 0,
      icon: Hotel,
      iconClass: "bg-blue-50 text-blue-600",
      countClass: "bg-blue-50 text-blue-700",
      onClick: () => navigate("/rooms?filter=pending", { state: { highlight: true } }),
    },
    {
      label: TEXT.roomChangeRequests,
      count: stats?.pendingRoomChangeRequests ?? 0,
      icon: FilePenLine,
      iconClass: "bg-violet-50 text-violet-600",
      countClass: "bg-violet-50 text-violet-700",
      onClick: () => navigate("/rooms?filter=pending", { state: { highlight: true } }),
    },
    {
      label: TEXT.pendingBookingActions,
      count: stats?.pendingBookingActions ?? 0,
      icon: ClipboardCheck,
      iconClass: "bg-rose-50 text-rose-600",
      countClass: "bg-rose-50 text-rose-700",
      onClick: () => navigate("/bookings", { state: { highlight: true, filter: { status: "pending" } } }),
    },
  ];
  const totalActions = actionItems.reduce((sum, item) => sum + Number(item.count || 0), 0);

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
      </div>
      <div className="h-80 bg-muted rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-semibold tracking-tight">{TEXT.title}</h2>
          <p className="text-xs text-muted-foreground">{TEXT.subtitle}</p>
        </div>
        <div className="flex bg-muted p-0.5 rounded-lg">
          {[["week", TEXT.week], ["month", TEXT.month], ["year", TEXT.year]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key as any)}
              className={cn(
                "px-3 py-1 rounded-md text-[13px] font-medium transition-all outline-none focus:outline-none select-none",
                period === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title={TEXT.revenue}
          value={`${(stats?.totalRevenue || 0).toLocaleString("vi-VN")} đ`}
          growth={stats?.revenueGrowth || 0}
          icon={TrendingUp}
          color="emerald"
          onClick={() => navigate("/bookings", { state: { highlight: true } })}
        />
        <StatCard
          title={TEXT.pendingPartners}
          value={stats?.pendingPartners || 0}
          status={stats?.pendingPartners ? TEXT.needAction : TEXT.done}
          icon={Users}
          color="amber"
          onClick={() => navigate("/partners", { state: { filter: "pending", highlight: true } })}
        />
        <StatCard
          title={TEXT.newBookings}
          value={`+${stats?.activeBookings || 0}`}
          detail={`+${stats?.bookingsInPeriod || 0} ${TEXT.periodSuffix}`}
          icon={CalendarCheck}
          color="blue"
          onClick={() => navigate("/bookings", { state: { highlight: true } })}
        />
        <StatCard
          title={TEXT.newCustomers}
          value={`+${stats?.newCustomers || 0}`}
          growth={stats?.customerGrowth || 0}
          icon={Users}
          color="sky"
          onClick={() => navigate("/customers", { state: { highlight: true } })}
        />
      </div>
      

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-5">
          <TrendChartSection chartData={chartData} period={period} navigate={navigate} />
          <TopHotelsSection topHotels={topHotels} navigate={navigate} />
          <TopCitiesSection topCities={topCities} maxCityBookings={maxCityBookings} navigate={navigate} />
        </div>

        <div className="space-y-5">
          <StatusChartSection data={statusData} total={totalStatus} colors={COLORS} />
          <ActionItemsSection items={actionItems} totalCount={totalActions} />
          <ActivitySection activities={recentActivity} navigate={navigate} />
        </div>
      </div>
    </div>
  );
}

// Sub-components

function StatCard({ title, value, growth, status, detail, icon: Icon, color, onClick }: any) {
  const colorMap: any = {
    emerald: { bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600", growth: "bg-emerald-50 text-emerald-600" },
    amber: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600", status: "bg-amber-50 text-amber-700" },
    blue: { bar: "bg-blue-500", icon: "bg-blue-50 text-blue-600", detail: "bg-blue-50 text-blue-600" },
    sky: { bar: "bg-sky-500", icon: "bg-sky-50 text-sky-600", growth: "bg-emerald-50 text-emerald-600" },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <Card
      role="button"
      tabIndex={0}
      className="relative min-h-[128px] cursor-pointer overflow-hidden border-[#eee7ff] bg-[#fbf8ff] transition-all hover:-translate-y-0.5 hover:border-[#d8ccff] hover:shadow-[0_10px_24px_rgba(76,29,149,0.08)] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", c.bar)} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
        <CardTitle className="text-sm font-semibold text-zinc-700">{title}</CardTitle>
        <div className={cn("size-9 rounded-lg flex items-center justify-center", c.icon)}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="text-2xl font-bold leading-none text-zinc-950">{value}</div>
        {growth !== undefined && (
          <p className={cn("inline-flex items-center gap-1 mt-3 rounded-full px-2 py-0.5 text-xs font-semibold", growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
            {growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(growth).toFixed(1)}%
          </p>
        )}
        {status && (
          <p className={cn("inline-flex items-center mt-3 rounded-full px-2 py-0.5 text-xs font-semibold", status === TEXT.done ? "bg-emerald-50 text-emerald-600" : c.status)}>
            {status}
          </p>
        )}
        {detail && (
          <p className={cn("inline-flex items-center gap-1 mt-3 rounded-full px-2 py-0.5 text-xs font-semibold", c.detail)}>
            <TrendingUp size={10} />
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TrendChartSection({ chartData, period, navigate }: any) {
  return (
    <Card className="overflow-hidden border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
        <div>
          <CardTitle className="text-sm font-semibold">{TEXT.chartTitle}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-0.5 italic">{TEXT.chartHint}</p>
        </div>
      </CardHeader>
      <CardContent className="h-[340px] pr-4 pt-4 px-4 pb-4">
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
              tickFormatter={(val) => {
                const d = new Date(val);
                if (isNaN(d.getTime())) return val;
                return period === "year" ? `${d.getMonth() + 1}/${d.getFullYear()}` : `${d.getDate()}/${d.getMonth() + 1}`;
              }}
            />
            <YAxis yAxisId="left" stroke="#4f46e5" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#059669" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: "20px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}
              formatter={(value) => <span className="text-zinc-600">{value === "bookings" ? TEXT.bookings : TEXT.revenue}</span>}
            />
            <Tooltip
              cursor={false}
              contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "12px", fontSize: "11px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
              labelFormatter={(val: any, items: any) => {
                const fullDate = items?.[0]?.payload?.fullDate;
                return fullDate ? `${TEXT.date}: ${new Date(fullDate).toLocaleDateString("vi-VN")}` : `${TEXT.date}: ${val}`;
              }}
              formatter={(value: any, name: any) => [name === "revenue" ? `${value?.toLocaleString("vi-VN")} đ` : value, name === "revenue" ? TEXT.revenue : TEXT.bookings]}
            />
            <Bar
              yAxisId="left"
              dataKey="bookings"
              fill="url(#barGradient)"
              radius={[3, 3, 0, 0]}
              barSize={period === "week" ? 12 : period === "month" ? 4 : 15}
              className="cursor-pointer"
              onClick={(data: any) => {
                const item = data?.payload || data || {};
                if (item?.fullDate) {
                  const d = new Date(item.fullDate);
                  const fromDate = d.toISOString().slice(0, 10);
                  let toDate = fromDate;
                  if (period === "year") {
                    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    toDate = endOfMonth.toISOString().slice(0, 10);
                  }
                  navigate("/bookings", { state: { highlight: true, filter: { from: fromDate, to: toDate } } });
                }
              }}
              onDoubleClick={(data: any) => {
                const item = data?.payload || data || {};
                if (item?.fullDate) {
                  const d = new Date(item.fullDate);
                  const fromDate = d.toISOString().slice(0, 10);
                  let toDate = fromDate;
                  if (period === "year") {
                    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    toDate = endOfMonth.toISOString().slice(0, 10);
                  }
                  navigate("/bookings", { state: { highlight: true, filter: { from: fromDate, to: toDate } } });
                }
              }}
            />
            <Bar
              yAxisId="right"
              dataKey="revenue"
              fill="url(#revGradient)"
              radius={[3, 3, 0, 0]}
              barSize={period === "week" ? 12 : period === "month" ? 4 : 15}
              className="cursor-pointer"
              onClick={(data: any) => {
                const item = data?.payload || data || {};
                if (item?.fullDate) {
                  const d = new Date(item.fullDate);
                  const fromDate = d.toISOString().slice(0, 10);
                  let toDate = fromDate;
                  if (period === "year") {
                    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    toDate = endOfMonth.toISOString().slice(0, 10);
                  }
                  navigate("/bookings", { state: { highlight: true, filter: { from: fromDate, to: toDate } } });
                }
              }}
              onDoubleClick={(data: any) => {
                const item = data?.payload || data || {};
                if (item?.fullDate) {
                  const d = new Date(item.fullDate);
                  const fromDate = d.toISOString().slice(0, 10);
                  let toDate = fromDate;
                  if (period === "year") {
                    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    toDate = endOfMonth.toISOString().slice(0, 10);
                  }
                  navigate("/bookings", { state: { highlight: true, filter: { from: fromDate, to: toDate } } });
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TopHotelsSection({ topHotels, navigate }: any) {
  return (
    <Card className="overflow-hidden border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
      <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
        <CardTitle className="text-sm font-semibold">{TEXT.topHotels}</CardTitle>
        <p className="mt-1 text-[10px] text-muted-foreground">{TEXT.topHotelsHint}</p>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {topHotels.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{TEXT.noTopHotels}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#eee7ff] text-[10px] uppercase text-zinc-500">
                  <th className="pb-2 pr-3 font-bold">{TEXT.hotelName}</th>
                  <th className="pb-2 pr-3 font-bold">{TEXT.city}</th>
                  <th className="pb-2 pr-3 text-right font-bold">{TEXT.revenue}</th>
                  <th className="pb-2 pr-3 text-right font-bold">{TEXT.orders}</th>
                  <th className="pb-2 text-right font-bold">{TEXT.commission}</th>
                </tr>
              </thead>
              <tbody>
                {topHotels.slice(0, 5).map((hotel: any, index: number) => (
                  <tr
                    key={hotel.id || index}
                    className="cursor-pointer border-b border-[#f2ecff] last:border-0 hover:bg-[#f4f0ff] transition-colors"
                    onClick={() => navigate("/bookings", { state: { highlight: true, targetPropertyId: hotel.id } })}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">
                          {index + 1}
                        </span>
                        <span className="max-w-[260px] truncate font-semibold text-zinc-800">{hotel.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-500 font-medium">{hotel.city || "-"}</td>
                    <td className="py-2.5 pr-3 text-right font-bold text-zinc-950">{formatCompactVnd(Number(hotel.revenue || 0))} {"đ"}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-zinc-700">{hotel.orders || 0}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{formatCompactVnd(Number(hotel.commission || 0))} {"đ"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopCitiesSection({ topCities, maxCityBookings, navigate }: any) {
  return (
    <Card className="overflow-hidden border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
      <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
        <CardTitle className="text-sm font-semibold">{TEXT.topCities}</CardTitle>
        <p className="mt-1 text-[10px] text-muted-foreground">{TEXT.topCitiesHint}</p>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {topCities.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{TEXT.noTopCities}</p>
        ) : (
          <div className="space-y-3">
            {topCities.slice(0, 5).map((item: any, index: number) => {
              const bookings = Number(item.bookings || 0);
              const percent = Math.max(6, Math.round((bookings / maxCityBookings) * 100));
              return (
                <button
                  key={item.city || index}
                  type="button"
                  onClick={() => navigate("/bookings", { state: { highlight: true, filter: { city: item.city } } })}
                  className="group grid w-full grid-cols-[120px_minmax(0,1fr)_120px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#f4f0ff]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">
                      {index + 1}
                    </span>
                    <span className="truncate text-xs font-semibold text-zinc-800">{item.city}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eee7ff]">
                    <div className="h-full rounded-full bg-[#8b5cf6] transition-all group-hover:bg-[#7c3aed]" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-900">{bookings} {TEXT.bookings}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-emerald-600">{formatCompactVnd(Number(item.revenue || 0))} {"đ"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusChartSection({ data, total, colors }: any) {
  return (
    <Card className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
      <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
        <CardTitle className="text-sm font-semibold">{TEXT.bookingStatus}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between py-4 px-5 h-[168px]">
        <div className="size-[116px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={36} outerRadius={54} paddingAngle={5} dataKey="value">
                {data.map((_: any, index: number) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5 pl-4">
          {data.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                <span className="text-muted-foreground font-medium">{item.name}</span>
              </div>
              <span className="font-bold text-zinc-900">{item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionItemsSection({ items, totalCount }: any) {
  return (
    <Card className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
      <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{TEXT.todayActions}</CardTitle>
            <p className="mt-1 text-[10px] text-muted-foreground">{TEXT.actionSubtitle}</p>
          </div>
          <div className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", totalCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
            {totalCount} {TEXT.actionItems}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <div className="space-y-2">
          {items.map((item: any) => {
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
                  <span className="mt-0.5 block text-[10px] text-muted-foreground font-medium">{TEXT.openAction}</span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", hasCount ? item.countClass : "bg-emerald-50 text-emerald-700")}>
                  {item.count}
                </span>
                <ChevronRight size={14} className="text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#4f46e5]" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySection({ activities, navigate }: any) {
  return (
    <Card className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
      <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
        <CardTitle className="text-sm font-semibold">{TEXT.recentActivity}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1 custom-scrollbar">
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{TEXT.noActivity}</p>
          ) : (
            activities.slice(0, 10).map((item: any, i: number) => {
              const Icon = item.type === "booking" ? CalendarCheck : Users;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 cursor-pointer hover:bg-[#f4f0ff] p-1.5 -mx-1 rounded-md transition-colors outline-none focus-visible:ring-1 focus-visible:ring-primary/20"
                  onClick={() => navigate(item.type === "booking" ? "/bookings" : "/partners", { state: { highlight: true, targetId: item.targetId } })}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(item.type === "booking" ? "/bookings" : "/partners", { state: { highlight: true, targetId: item.targetId } })}
                >
                  <div className={cn("size-7 rounded-full flex items-center justify-center flex-shrink-0", item.type === "booking" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600")}>
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-none truncate">
                      <span className="font-bold text-zinc-800">{item.user}</span> <span className="text-zinc-600">{item.action}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-2 truncate font-medium">{item.target}</p>
                  </div>
                  <div className="text-[9px] text-muted-foreground font-bold flex-shrink-0">
                    {new Date(item.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <Button variant="ghost" className="w-full mt-2 h-7 text-[10px] uppercase font-bold text-primary hover:text-primary hover:bg-primary/5" onClick={() => navigate("/notifications")}>{TEXT.viewAll}</Button>
      </CardContent>
    </Card>
  );
}
