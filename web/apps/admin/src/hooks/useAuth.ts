import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe, logout as logoutApi } from "../api/authApi";
import { fetchUnreadCount } from "../api/notificationsApi";
import { User } from "../shared/types";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const loadUnread = async () => {
    try {
      const result = await fetchUnreadCount();
      setUnreadCount(Number(result.count || 0));
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
    window.addEventListener("nowayhome:user-updated", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("nowayhome:auth-error", handleAuthError);
      window.removeEventListener("nowayhome:user-updated", check);
    };
  }, []);

  return { user, setUser, ready, unreadCount, logout, loadUnread };
};
