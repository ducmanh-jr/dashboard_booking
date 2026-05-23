import { BrowserRouter } from "react-router-dom";
import { Shell } from "@/shared/layouts/Shell";
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

  return (
    <Shell user={user} onLogout={logout}>
      <AppRoutes user={user} onLogin={setUser} />
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}
