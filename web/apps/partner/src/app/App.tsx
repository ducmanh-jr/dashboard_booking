import { BrowserRouter } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AppRoutes } from "./Routes";

function Root() {
  const { user, setUser, ready, logout } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  function handleLogout() {
    logout();
  }

  return (
    <AppRoutes user={user} onLogin={setUser} onLogout={handleLogout} />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
