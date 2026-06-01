import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  Users, 
  UserCircle, 
  Hotel, 
  CalendarCheck, 
  ShieldCheck, 
  Bell, 
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  CreditCard,
  Tag
} from "lucide-react";
import { useState } from "react";
import { User } from "../types";
import { cn, Button } from "../components/ui";
import { ADMIN_PORTAL_NAME, ADMIN_ROUTE_TITLES } from "../config/pageTitles";
import { useRoutePageTitle } from "../hooks/usePageTitle";
import { PortalBrandHeader } from "../components/PortalBrandHeader";

export function AdminLayout({ user, onLogout, notificationCount }: { user: User; onLogout: () => void, notificationCount: number }) {
  useRoutePageTitle(ADMIN_PORTAL_NAME, ADMIN_ROUTE_TITLES, "Admin");
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const navItems = [
    { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/partners", label: "Đối tác", icon: Users },
    { path: "/customers", label: "Khách hàng", icon: UserCircle },
    { path: "/bookings", label: "Đặt phòng", icon: CalendarCheck },
    { path: "/rooms", label: "Khách sạn", icon: Hotel },
    { path: "/admins", label: "Quản trị viên", icon: ShieldCheck },
    { path: "/transactions", label: "Giao dịch", icon: CreditCard },
    { path: "/promotions", label: "Khuyến mãi", icon: Tag },
    { path: "/notifications", label: "Thông báo", icon: Bell, count: notificationCount },
    { path: "/account", label: "Tài khoản", icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[232px] bg-card border-r transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full lg:hidden"
        )}
      >
        <div className="h-full flex flex-col">
          <PortalBrandHeader onCloseMobile={() => setIsSidebarOpen(false)} />
          
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group relative border border-transparent",
                    isActive 
                      ? "bg-[#f4f0ff] text-[#4338ca] shadow-sm border-[#e4dcff] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#4f46e5]" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon size={18} className={cn(isActive ? "text-[#4f46e5]" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="flex-1">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      isActive ? "bg-[#4f46e5] text-white" : "bg-destructive text-destructive-foreground"
                    )}>
                      {item.count > 9 ? "9+" : item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/50 mb-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
              ) : (
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {user.fullName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.title || (user.isSuperAdmin ? "Admin tổng" : user.role)}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2 justify-start" onClick={onLogout}>
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b bg-card/50 backdrop-blur-md flex items-center px-6 sticky top-0 z-40 lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </Button>
          <span className="ml-4 text-sm font-black tracking-tight text-slate-950">NoWayHome Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1536px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
