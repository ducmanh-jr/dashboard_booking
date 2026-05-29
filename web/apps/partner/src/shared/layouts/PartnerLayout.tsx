import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { logout as logoutApi } from "../../api/authApi";
import { fetchNotifications } from "../../api/notificationsApi";
import { PartnerNotification, User } from "../types";

type NavItem = {
  label: string;
  description: string;
  path: string;
  count?: number;
  icon: ReactNode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function IconDashboard() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconHotel() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 21V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M8 9h.01M12 9h.01M8 13h.01M12 13h.01M3 21h18M16 11h2a2 2 0 0 1 2 2v8" />
    </svg>
  );
}

function IconBookings() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M5 11h14M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9" />
    </svg>
  );
}

function IconAccount() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4v2m0 0v2m0-2h2m-2 0h-2M4 21a6 6 0 0 1 12 0" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H3m0 0 4-4m-4 4 4 4m5-10h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5" />
    </svg>
  );
}

let cachedNotifications: PartnerNotification[] = [];

export function PartnerLayout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<PartnerNotification[]>(cachedNotifications);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications()
      .then((result) => {
        cachedNotifications = result.notifications || [];
        setNotifications(cachedNotifications);
      })
      .catch(() => {});
  }, [location.pathname]);

  async function logout() {
    try {
      await logoutApi();
    } catch {}
    onLogout();
    navigate("/login");
  }

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const navItems: NavItem[] = [
    { label: "Tổng quan", description: "Hiệu suất kinh doanh", path: "/", icon: <IconDashboard /> },
    { label: "Khách sạn", description: "Hồ sơ & trạng thái", path: "/rooms", icon: <IconHotel /> },
    { label: "Đặt phòng", description: "Doanh thu & lưu trú", path: "/bookings", icon: <IconBookings /> },
    { label: "Thêm khách sạn", description: "Tạo hồ sơ mới", path: "/create", icon: <IconPlus /> },
    { label: "Thông báo", description: "Phản hồi từ admin", path: "/notifications", count: unreadCount, icon: <IconBell /> },
    { label: "Tài khoản", description: "Hồ sơ & bảo mật", path: "/account", icon: <IconAccount /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[240px] border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-black text-primary-foreground">
                N
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black tracking-tight text-slate-950">NWH Partner</div>
                <div className="truncate text-[10px] font-bold uppercase text-slate-500">Cổng đối tác</div>
              </div>
            </Link>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Đóng menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-md border px-3 py-2.5 transition",
                    isActive
                      ? "border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition",
                      isActive ? "bg-white text-indigo-700 shadow-sm" : "bg-slate-100 text-slate-500 group-hover:bg-white"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{item.label}</span>
                    <span className={cn("block truncate text-[10px]", isActive ? "text-indigo-500" : "text-slate-400")}>
                      {item.description}
                    </span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", isActive ? "bg-indigo-600 text-white" : "bg-red-500 text-white")}>
                      {item.count > 9 ? "9+" : item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-primary shadow-sm">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-950">{user.fullName}</p>
                  <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                Tài khoản đối tác
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <IconLogout />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 text-sm font-black text-slate-950">NWH Partner</span>
          {unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1536px] px-4 py-4 sm:px-5 lg:px-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
