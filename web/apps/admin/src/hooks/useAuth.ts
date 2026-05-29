import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe, logout as logoutApi } from "../api/authApi";
import { fetchNotifications } from "../api/notificationsApi";
import { API_PATHS } from "../constants/apiPaths";
import { User } from "../shared/types";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const loadUnread = async () => {
    try {
      const result = await fetchNotifications();
      // In admin result.count might not be there directly, but we can check if we want to add a specific count API
      // For now let's assume result has count or we just use length if it returns a list
      // Wait, admin notificationsApi has fetchNotifications which returns { notifications: [...] }
      setUnreadCount(result.notifications?.filter((n: any) => !n.isRead).length || 0);
    } catch {}
  };

  const check = async () => {
    try {
      const result = await fetchMe();
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
  };

  const logout = async () => {
    try {
      await logoutApi();
      setUser(null);
      navigate("/login");
    } catch (e: any) {
      alert(e.message);
    }
  };

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

  return { user, setUser, ready, unreadCount, logout, loadUnread };
};
