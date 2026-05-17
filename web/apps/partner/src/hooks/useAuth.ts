import { useState, useEffect } from "react";
import { fetchMe, logout as logoutApi } from "../api/authApi";
import { User } from "../shared/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

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
  }, []);

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
