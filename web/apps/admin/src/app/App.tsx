import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./Routes";
import { useAuth } from "../hooks/useAuth";

const loading = (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    Đang tải...
  </div>
);

function Root() {
  const { user, setUser, ready, unreadCount, logout, loadUnread } = useAuth();
  if (!ready) return loading;
  return <AppRoutes user={user} setUser={setUser} unreadCount={unreadCount} logout={logout} loadUnread={loadUnread} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
