import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@nowayhome/api-client";
import { User } from "../shared/types";
import { Login } from "../features/auth/components/Login";
import { AdminLayout } from "../pages/layouts/AdminLayout";

const DashboardTab = lazy(() => import("../features/dashboard/components/tabs/DashboardTab").then((module) => ({ default: module.DashboardTab })));
const PartnersTab = lazy(() => import("../features/dashboard/components/tabs/PartnersTab").then((module) => ({ default: module.PartnersTab })));
const CustomersTab = lazy(() => import("../features/dashboard/components/tabs/CustomersTab").then((module) => ({ default: module.CustomersTab })));
const BookingsTab = lazy(() => import("../features/dashboard/components/tabs/BookingsTab").then((module) => ({ default: module.BookingsTab })));
const RoomsTab = lazy(() => import("../features/dashboard/components/tabs/RoomsTab").then((module) => ({ default: module.RoomsTab })));
const AdminsTab = lazy(() => import("../features/dashboard/components/tabs/AdminsTab").then((module) => ({ default: module.AdminsTab })));
const NotificationsTab = lazy(() => import("../features/dashboard/components/tabs/NotificationsTab").then((module) => ({ default: module.NotificationsTab })));

const loading = (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    Dang tai...
  </div>
);

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  async function loadUnread() {
    try {
      const result = await api("/notifications/unread-count");
      setUnreadCount(result.count || 0);
    } catch { }
  }

  async function check() {
    try {
      const result = await api("/auth/me");
      if (result.user?.role === "admin") {
        setUser(result.user);
        loadUnread();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    check();
    const timer = setInterval(loadUnread, 30000);
    const handleAuthError = () => {
      setUser(null);
      navigate("/login");
    };
    window.addEventListener("nowayhome:auth-error", handleAuthError);
    return () => {
      clearInterval(timer);
      window.removeEventListener("nowayhome:auth-error", handleAuthError);
    };
  }, []);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/login");
    } catch (error: any) {
      alert(error.message);
    }
  }

  if (!ready) return loading;

  const handleNavigate = (path: string, filter: string) => {
    navigate(`${path}?filter=${filter}`);
  };

  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={(u) => { setUser(u); navigate("/dashboard"); }} />} />
        <Route path="/" element={user ? <AdminLayout user={user} onLogout={logout} notificationCount={unreadCount} /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<DashboardTab />} />
          <Route path="partners" element={<PartnersTab initialFilter={searchParams.get("filter") || "pending"} />} />
          <Route path="customers" element={<CustomersTab />} />
          <Route path="bookings" element={<BookingsTab />} />
          <Route path="rooms" element={<RoomsTab initialFilter={searchParams.get("filter") || "pending"} />} />
          <Route path="admins" element={<AdminsTab currentUserId={user?.id || 0} />} />
          <Route path="notifications" element={<NotificationsTab onNavigate={(tab, filter) => handleNavigate(`/${tab}`, filter)} onRefreshCount={loadUnread} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
