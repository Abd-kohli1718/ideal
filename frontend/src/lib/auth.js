"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // C10: Wrap JSON.parse in try/catch to prevent crash on corrupted localStorage
    try {
      const savedToken = localStorage.getItem("resq_token");
      const savedUser = localStorage.getItem("resq_user");
      const savedRole = localStorage.getItem("resq_role");
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        setRole(savedRole || "citizen");
      }
    } catch {
      // Corrupted localStorage — clear everything
      localStorage.removeItem("resq_token");
      localStorage.removeItem("resq_user");
      localStorage.removeItem("resq_role");
      localStorage.removeItem("resq_refresh_token");
    }
    setIsLoading(false);
  }, []);

  // Listen for auth expiry errors from apiFetch (C9)
  useEffect(() => {
    const handleAuthExpiry = (event) => {
      if (event.detail?.code === "AUTH_EXPIRED") {
        setToken(null);
        setUser(null);
        setRole(null);
        router.push("/login");
      }
    };
    window.addEventListener("auth-expired", handleAuthExpiry);
    return () => window.removeEventListener("auth-expired", handleAuthExpiry);
  }, [router]);

  const persist = useCallback((accessToken, userData, userRole, refreshToken) => {
    localStorage.setItem("resq_token", accessToken);
    localStorage.setItem("resq_user", JSON.stringify(userData));
    localStorage.setItem("resq_role", userRole);
    if (refreshToken) {
      localStorage.setItem("resq_refresh_token", refreshToken);
    }
    document.cookie = `resq_role=${userRole}; path=/; max-age=${60 * 60 * 24 * 7}`;
    document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;
    setToken(accessToken);
    setUser(userData);
    setRole(userRole);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const { access_token, refresh_token, user: u } = res.data;
    const r = u?.user_metadata?.role || "citizen";
    persist(access_token, u, r, refresh_token);
    return r;
  }, [persist]);

  const signup = useCallback(async (email, password, full_name, signupRole) => {
    const res = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role: signupRole }),
    });
    const { session, user: u } = res.data;
    const r = u?.user_metadata?.role || signupRole || "citizen";

    if (session?.access_token) {
      persist(session.access_token, u, r, session.refresh_token);
    } else {
      const loginRes = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const { access_token, refresh_token, user: loginUser } = loginRes.data;
      const loginRole = loginUser?.user_metadata?.role || signupRole || "citizen";
      persist(access_token, loginUser, loginRole, refresh_token);
      return loginRole;
    }
    return r;
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("resq_token");
    localStorage.removeItem("resq_user");
    localStorage.removeItem("resq_role");
    localStorage.removeItem("resq_refresh_token");
    document.cookie = "resq_role=; path=/; max-age=0";
    document.cookie = "resq_authed=; path=/; max-age=0";
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, token, isLoading, login, signup, logout, persist }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
