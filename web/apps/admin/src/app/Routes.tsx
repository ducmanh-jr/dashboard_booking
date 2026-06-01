import { lazy, Suspense } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { AdminLayout } from "../shared/layouts/AdminLayout";
import { Login } from "../features/auth/components/Login";
import { User } from "../shared/types";

const loading = (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    Đang tải...
  </div>
);

const DashboardTab = lazy(() => import("../features/dashboard/components/tabs/DashboardTab").then(m => ({ default: m.DashboardTab })));
const PartnersTab = lazy(() => import("../features/dashboard/components/tabs/PartnersTab").then(m => ({ default: m.PartnersTab })));
const CustomersTab = lazy(() => import("../features/dashboard/components/tabs/CustomersTab").then(m => ({ default: m.CustomersTab })));
const BookingsTab = lazy(() => import("../features/dashboard/components/tabs/BookingsTab").then(m => ({ default: m.BookingsTab })));
const RoomsTab = lazy(() => import("../features/dashboard/components/tabs/RoomsTab").then(m => ({ default: m.RoomsTab })));
const AdminsTab = lazy(() => import("../features/dashboard/components/tabs/AdminsTab").then(m => ({ default: m.AdminsTab })));
const NotificationsTab = lazy(() => import("../features/dashboard/components/tabs/NotificationsTab").then(m => ({ default: m.NotificationsTab })));
const AccountSettingsPage = lazy(() => import("../features/account/components/AccountSettingsPage").then(m => ({ default: m.AccountSettingsPage })));
const TransactionsTab = lazy(() => import("../features/dashboard/components/tabs/TransactionsTab").then(m => ({ default: m.TransactionsTab })));
const PromotionsTab = lazy(() => import("../features/dashboard/components/tabs/PromotionsTab").then(m => ({ default: m.PromotionsTab })));

interface RoutesProps {
  user: User | null;
  unreadCount: number;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loadUnread: () => Promise<void>;
}

export default function AppRoutes({ user, unreadCount, setUser, logout, loadUnread }: RoutesProps) {
  const navigate = useNavigate();
  const updateCurrentUser = (patch: Partial<User>) => {
    if (user) setUser({ ...user, ...patch });
  };

  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={setUser} />} />
        <Route
          path="/"
          element={user ? <AdminLayout user={user} onLogout={logout} notificationCount={unreadCount} /> : <Navigate to="/login" />}
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<DashboardTab />} />
          <Route path="partners" element={<PartnersTab />} />
          <Route path="customers" element={<CustomersTab />} />
          <Route path="bookings" element={<BookingsTab />} />
          <Route path="rooms" element={<RoomsTab />} />
          <Route path="admins" element={<AdminsTab currentUserId={user?.id || 0} isSuperAdmin={Boolean(user?.isSuperAdmin)} />} />
          <Route path="notifications" element={<NotificationsTab onNavigate={(tab, filter, targetId) => navigate(`/${tab}`, { state: { filter, targetId, highlight: true } })} onRefreshCount={loadUnread} />} />
          <Route path="transactions" element={<TransactionsTab user={user} />} />
          <Route path="promotions" element={<PromotionsTab />} />
          <Route path="account" element={<AccountSettingsPage onUserUpdated={updateCurrentUser} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
