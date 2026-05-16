import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@nowayhome/api-client";
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
  title: "\u0054\u1ed5\u006e\u0067 \u0071\u0075\u0061\u006e \u0068\u1ec7 \u0074\u0068\u1ed1\u006e\u0067",
  subtitle: "\u0054\u0068\u0065\u006f \u0064\u00f5\u0069 \u0068\u0069\u1ec7\u0075 \u0073\u0075\u1ea5\u0074 \u0076\u00e0 \u0071\u0075\u1ea3\u006e \u006c\u00fd \u0070\u0068\u00ea \u0064\u0075\u0079\u1ec7\u0074.",
  week: "\u0054\u0075\u1ea7\u006e",
  month: "\u0054\u0068\u00e1\u006e\u0067",
  year: "\u004e\u0103\u006d",
  revenue: "\u0044\u006f\u0061\u006e\u0068 \u0074\u0068\u0075",
  pendingPartners: "\u0110\u1ed1\u0069 \u0074\u00e1\u0063 \u0063\u0068\u1edd \u0064\u0075\u0079\u1ec7\u0074",
  newBookings: "\u0110\u1eb7\u0074 \u0070\u0068\u00f2\u006e\u0067 \u006d\u1edb\u0069",
  newCustomers: "\u004b\u0068\u00e1\u0063\u0068 \u0068\u00e0\u006e\u0067 \u006d\u1edb\u0069",
  needAction: "\u0043\u1ea7\u006e \u0078\u1eed \u006c\u00fd \u006e\u0067\u0061\u0079",
  done: "\u0110\u00e3 \u0078\u006f\u006e\u0067",
  periodSuffix: "\u006b\u1ef3 \u006e\u00e0\u0079",
  chartTitle: "\u0058\u0075 \u0068\u01b0\u1edb\u006e\u0067 \u0111\u1eb7\u0074 \u0070\u0068\u00f2\u006e\u0067",
  chartHint: "\u004e\u0068\u1ea5\u0070 \u0111\u1ec3 \u0078\u0065\u006d \u0064\u0061\u006e\u0068 \u0073\u00e1\u0063\u0068, \u006e\u0068\u1ea5\u0070 \u0111\u00fa\u0070 \u0111\u1ec3 \u0078\u0065\u006d \u0063\u0068\u0069 \u0074\u0069\u1ebf\u0074.",
  bookings: "\u0110\u1eb7\u0074 \u0070\u0068\u00f2\u006e\u0067",
  date: "\u004e\u0067\u00e0\u0079",
  bookingStatus: "\u0054\u0072\u1ea1\u006e\u0067 \u0074\u0068\u00e1\u0069 \u0111\u1eb7\u0074 \u0070\u0068\u00f2\u006e\u0067",
  success: "\u0054\u0068\u00e0\u006e\u0068 \u0063\u00f4\u006e\u0067",
  canceled: "\u0110\u00e3 \u0068\u1ee7\u0079",
  refunded: "\u0048\u006f\u00e0\u006e \u0074\u0069\u1ec1\u006e",
  recentActivity: "\u0048\u006f\u1ea1\u0074 \u0111\u1ed9\u006e\u0067 \u0067\u1ea7\u006e \u0111\u00e2\u0079",
  noActivity: "\u0043\u0068\u01b0\u0061 \u0063\u00f3 \u0068\u006f\u1ea1\u0074 \u0111\u1ed9\u006e\u0067 \u006e\u00e0\u006f",
  viewAll: "\u0058\u0065\u006d \u0074\u1ea5\u0074 \u0063\u1ea3",
  todayActions: "\u0043\u1ea7\u006e \u0078\u1eed \u006c\u00fd \u0068\u00f4\u006d \u006e\u0061\u0079",
  actionSubtitle: "\u0043\u00e1\u0063 \u0076\u0069\u1ec7\u0063 \u0063\u1ea7\u006e \u0061\u0064\u006d\u0069\u006e \u0072\u0061 \u0071\u0075\u0079\u1ebf\u0074 \u0111\u1ecb\u006e\u0068",
  pendingRooms: "\u004b\u0068\u00e1\u0063\u0068 \u0073\u1ea1\u006e/\u0070\u0068\u00f2\u006e\u0067 \u0063\u0068\u1edd \u0064\u0075\u0079\u1ec7\u0074",
  roomChangeRequests: "\u0059\u00ea\u0075 \u0063\u1ea7\u0075 \u0063\u0068\u1ec9\u006e\u0068 \u0073\u1eeda/\u0078\u00f3\u0061 \u0070\u0068\u00f2\u006e\u0067",
  pendingBookingActions: "\u0042\u006f\u006f\u006b\u0069\u006e\u0067 \u0063\u1ea7\u006e \u0078\u00e1\u0063 \u006e\u0068\u1ead\u006e/\u0068\u1ee7\u0079",
  actionItems: "\u0076\u0069\u1ec7\u0063",
  openAction: "\u0058\u1eed \u006c\u00fd",
  topHotels: "\u0054\u006f\u0070 \u006b\u0068\u00e1\u0063\u0068 \u0073\u1ea1\u006e \u0074\u0068\u0065\u006f \u0064\u006f\u0061\u006e\u0068 \u0074\u0068\u0075",
  topHotelsHint: "\u004e\u0068\u1eef\u006e\u0067 \u0111\u1ed1\u0069 \u0074\u00e1\u0063 \u0111\u0061\u006e\u0067 \u006b\u00e9\u006f \u0064\u006f\u0061\u006e\u0068 \u0074\u0068\u0075 \u0074\u0072\u006f\u006e\u0067 \u006b\u1ef3",
  hotelName: "\u0054\u00ea\u006e \u006b\u0068\u00e1\u0063\u0068 \u0073\u1ea1\u006e",
  city: "\u0054\u0068\u00e0\u006e\u0068 \u0070\u0068\u1ed1",
  orders: "\u0053\u1ed1 \u0111\u01a1\u006e",
  commission: "\u0048\u006f\u0061 \u0068\u1ed3\u006e\u0067",
  noTopHotels: "\u0043\u0068\u01b0\u0061 \u0063\u00f3 \u0064\u1eef \u006c\u0069\u1ec7\u0075 \u0064\u006f\u0061\u006e\u0068 \u0074\u0068\u0075",
  topCities: "\u0054\u0068\u00e0\u006e\u0068 \u0070\u0068\u1ed1 \u0111\u0061\u006e\u0067 \u0063\u00f3 \u006e\u0068\u0075 \u0063\u1ea7\u0075 \u0063\u0061\u006f",
  topCitiesHint: "\u0058\u1ebf\u0070 \u0068\u1ea1\u006e\u0067 \u0074\u0068\u0065\u006f \u0073\u1ed1 \u0062\u006f\u006f\u006b\u0069\u006e\u0067 \u0074\u0072\u006f\u006e\u0067 \u006b\u1ef3",
  noTopCities: "\u0043\u0068\u01b0\u0061 \u0063\u00f3 \u0064\u1eef \u006c\u0069\u1ec7\u0075 \u0074\u0068\u00e0\u006e\u0068 \u0070\u0068\u1ed1",
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
    queryFn: () => api(`/admin/stats?period=${period}`),
  });

  const chartData = stats?.trends || [];
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
          <h2 className="text-2xl font-bold tracking-tight">{TEXT.title}</h2>
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
        <Card className="relative min-h-[128px] cursor-pointer overflow-hidden border-[#eee7ff] bg-[#fbf8ff] transition-all hover:-translate-y-0.5 hover:border-[#d8ccff] hover:shadow-[0_10px_24px_rgba(76,29,149,0.08)] active:scale-[0.98] outline-none" onClick={() => navigate("/bookings", { state: { highlight: true } })}>
          <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-medium text-slate-700">{TEXT.revenue}</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold leading-none text-slate-950">{(stats?.totalRevenue || 0).toLocaleString("vi-VN")} {"\u0111"}</div>
            <p className={cn(
              "inline-flex items-center gap-1 mt-3 rounded-full px-2 py-0.5 text-xs font-medium",
              (stats?.revenueGrowth || 0) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {(stats?.revenueGrowth || 0) >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(stats?.revenueGrowth || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="relative min-h-[128px] cursor-pointer overflow-hidden border-[#eee7ff] bg-[#fbf8ff] transition-all hover:-translate-y-0.5 hover:border-[#d8ccff] hover:shadow-[0_10px_24px_rgba(76,29,149,0.08)] active:scale-[0.98] outline-none" onClick={() => navigate("/partners", { state: { filter: "pending", highlight: true } })}>
          <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-medium text-slate-700">{TEXT.pendingPartners}</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold leading-none text-slate-950">{stats?.pendingPartners || 0}</div>
            <p className={cn(
              "inline-flex items-center mt-3 rounded-full px-2 py-0.5 text-xs font-medium",
              stats?.pendingPartners ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-600"
            )}>
              {stats?.pendingPartners ? TEXT.needAction : TEXT.done}
            </p>
          </CardContent>
        </Card>

        <Card className="relative min-h-[128px] cursor-pointer overflow-hidden border-[#eee7ff] bg-[#fbf8ff] transition-all hover:-translate-y-0.5 hover:border-[#d8ccff] hover:shadow-[0_10px_24px_rgba(76,29,149,0.08)] active:scale-[0.98] outline-none" onClick={() => navigate("/bookings", { state: { highlight: true } })}>
          <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-medium text-slate-700">{TEXT.newBookings}</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold leading-none text-slate-950">+{stats?.activeBookings || 0}</div>
            <p className="inline-flex items-center gap-1 mt-3 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
              <TrendingUp size={10} />
              +{stats?.bookingsInPeriod || 0} {TEXT.periodSuffix}
            </p>
          </CardContent>
        </Card>

        <Card className="relative min-h-[128px] cursor-pointer overflow-hidden border-[#eee7ff] bg-[#fbf8ff] transition-all hover:-translate-y-0.5 hover:border-[#d8ccff] hover:shadow-[0_10px_24px_rgba(76,29,149,0.08)] active:scale-[0.98] outline-none" onClick={() => navigate("/customers", { state: { highlight: true } })}>
          <div className="absolute inset-x-0 top-0 h-0.5 bg-sky-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-5 px-5">
            <CardTitle className="text-sm font-medium text-slate-700">{TEXT.newCustomers}</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-2xl font-bold leading-none text-slate-950">+{stats?.newCustomers || 0}</div>
            <p className={cn(
              "inline-flex items-center gap-1 mt-3 rounded-full px-2 py-0.5 text-xs font-medium",
              (stats?.customerGrowth || 0) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {(stats?.customerGrowth || 0) >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(stats?.customerGrowth || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-5">
          <Card className="overflow-hidden border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
              <div>
                <CardTitle className="text-sm">{TEXT.chartTitle}</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">{TEXT.chartHint}</p>
              </div>
            </CardHeader>
            <CardContent className="h-[340px] pr-4 pt-4 px-4 pb-4">
              <ResponsiveContainer width="100%" height="100%" style={{ outline: "none" }}>
                <BarChart
                  data={chartData}
                  accessibilityLayer={false}
                  style={{ outline: "none", border: "none", boxShadow: "none" }}
                  className="select-none outline-none"
                  barGap={8}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
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
                      if (!val) return "";
                      const d = new Date(val);
                      if (isNaN(d.getTime())) return val;
                      return period === "year" ? `${d.getMonth() + 1}/${d.getFullYear()}` : `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#059669" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: "20px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}
                    formatter={(value) => <span className="text-slate-600">{value === "bookings" ? TEXT.bookings : TEXT.revenue}</span>}
                  />
                  <Tooltip
                    cursor={false}
                    trigger="hover"
                    wrapperStyle={{ outline: "none", border: "none" }}
                    contentStyle={{ backgroundColor: "#fff", border: "none", borderRadius: "12px", fontSize: "11px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", outline: "none" }}
                    itemStyle={{ fontWeight: "bold", padding: "2px 0" }}
                    labelFormatter={(val, items: readonly any[]) => {
                      if (!val) return "";
                      const fullDate = items?.[0]?.payload?.fullDate;
                      if (fullDate) return `${TEXT.date}: ${new Date(fullDate).toLocaleDateString("vi-VN")}`;
                      return `${TEXT.date}: ${val}`;
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === "revenue") return [`${value?.toLocaleString("vi-VN")} \u0111`, TEXT.revenue];
                      return [value, TEXT.bookings];
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    name="bookings"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    barSize={period === "week" ? 25 : period === "month" ? 8 : 20}
                    animationDuration={1000}
                    className="cursor-pointer outline-none"
                    style={{ outline: "none" }}
                    onDoubleClick={(data: any) => {
                      if (data && data.fullDate) {
                        navigate("/bookings", { state: { highlight: true, filter: { from: data.fullDate, to: data.fullDate } } });
                      }
                    }}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    name="revenue"
                    fill="url(#revGradient)"
                    radius={[4, 4, 0, 0]}
                    barSize={period === "week" ? 25 : period === "month" ? 8 : 20}
                    animationDuration={1000}
                    className="cursor-pointer outline-none"
                    style={{ outline: "none" }}
                    onDoubleClick={(data: any) => {
                      if (data && data.fullDate) {
                        navigate("/bookings", { state: { highlight: true, filter: { from: data.fullDate, to: data.fullDate } } });
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
              <CardTitle className="text-sm">{TEXT.topHotels}</CardTitle>
              <p className="mt-1 text-[10px] text-muted-foreground">{TEXT.topHotelsHint}</p>
            </CardHeader>
            <CardContent className="px-5 py-4">
              {topHotels.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{TEXT.noTopHotels}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#eee7ff] text-[10px] uppercase text-slate-500">
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
                          className="cursor-pointer border-b border-[#f2ecff] last:border-0 hover:bg-[#f4f0ff]"
                          onClick={() => navigate("/bookings", { state: { highlight: true, targetPropertyId: hotel.id } })}
                        >
                          <td className="py-2.5 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">
                                {index + 1}
                              </span>
                              <span className="max-w-[260px] truncate font-semibold text-slate-800">{hotel.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-slate-500">{hotel.city || "-"}</td>
                          <td className="py-2.5 pr-3 text-right font-bold text-slate-900">{formatCompactVnd(Number(hotel.revenue || 0))} {"\u0111"}</td>
                          <td className="py-2.5 pr-3 text-right font-semibold text-slate-700">{hotel.orders || 0}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">{formatCompactVnd(Number(hotel.commission || 0))} {"\u0111"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-[#eee7ff] bg-[#fdfbff] shadow-sm transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pb-3 pt-5 px-5">
              <CardTitle className="text-sm">{TEXT.topCities}</CardTitle>
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
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">
                            {index + 1}
                          </span>
                          <span className="truncate text-xs font-semibold text-slate-800">{item.city}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#eee7ff]">
                          <div
                            className="h-full rounded-full bg-[#8b5cf6] transition-all group-hover:bg-[#7c3aed]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">{bookings} {TEXT.bookings}</div>
                          <div className="mt-0.5 text-[10px] font-medium text-emerald-600">{formatCompactVnd(Number(item.revenue || 0))} {"\u0111"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
              <CardTitle className="text-sm">{TEXT.bookingStatus}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between py-4 px-5 h-[168px]">
              <div className="w-[116px] h-[116px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={36}
                      outerRadius={54}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5 pl-4">
                {statusData.map((item, i) => {
                  const percentage = totalStatus > 0 ? Math.round((item.value / totalStatus) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-bold">{item.value} ({percentage}%)</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">{TEXT.todayActions}</CardTitle>
                  <p className="mt-1 text-[10px] text-muted-foreground">{TEXT.actionSubtitle}</p>
                </div>
                <div className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  totalActions > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                )}>
                  {totalActions} {TEXT.actionItems}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4">
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
                      <span className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg", item.iconClass)}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-700">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{TEXT.openAction}</span>
                      </span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        hasCount ? item.countClass : "bg-emerald-50 text-emerald-700"
                      )}>
                        {item.count}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#4f46e5]" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#eee7ff] bg-[#fdfbff] shadow-sm overflow-hidden transition-all hover:border-[#d8ccff] hover:shadow-[0_12px_28px_rgba(76,29,149,0.06)]">
            <CardHeader className="border-b border-[#eee7ff] bg-[#faf7ff] pt-5 px-6 pb-3">
              <CardTitle className="text-sm">{TEXT.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1 custom-scrollbar">
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{TEXT.noActivity}</p>
                ) : (
                  recentActivity.slice(0, 10).map((item: any, i: number) => {
                    const Icon = item.type === "booking" ? CalendarCheck : Users;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 cursor-pointer hover:bg-[#f4f0ff] p-1.5 -mx-1 rounded-md transition-colors"
                        onClick={() => navigate(item.type === "booking" ? "/bookings" : "/partners", { state: { highlight: true, targetId: item.targetId } })}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-accent-foreground flex-shrink-0",
                          item.type === "booking" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                        )}>
                          <Icon size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-none truncate">
                            <span className="font-semibold">{item.user}</span> {item.action}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-2 truncate">{item.target}</p>
                        </div>
                        <div className="text-[9px] text-muted-foreground flex-shrink-0">
                          {new Date(item.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <Button variant="ghost" className="w-full mt-2 h-7 text-[10px] uppercase font-bold" onClick={() => navigate("/notifications")}>{TEXT.viewAll}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
