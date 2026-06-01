import { useState, useEffect } from "react";
import { fetchMe, logout as logoutApi } from "../api/authApi";
import { User } from "../shared/types";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  async function check() {
    try {
      const result = await fetchMe();
      if (result.user?.role === "partner") {
        setUser(result.user);
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
    const handleAuthError = () => {
      setUser(null);
      navigate("/login");
    };
    window.addEventListener("nowayhome:auth-error", handleAuthError);
    window.addEventListener("nowayhome:user-updated", check);
    return () => {
      window.removeEventListener("nowayhome:auth-error", handleAuthError);
      window.removeEventListener("nowayhome:user-updated", check);
    };
  }, [navigate]);

  async function logout() {
    try {
      await logoutApi();
      setUser(null);
    } catch (error: any) {
      alert(error.message);
    }
  }

  return { user, setUser, ready, logout };
}
