import { Link, useLocation } from "react-router-dom";
import { User } from "@/shared/types";

export function Shell({ user, onLogout, children }: { user: User | null; onLogout: () => void; children: React.ReactNode }) {
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
