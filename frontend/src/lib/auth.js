"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("resq_token");
    const savedUser = localStorage.getItem("resq_user");
    const savedRole = localStorage.getItem("resq_role");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setRole(savedRole || "citizen");
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((accessToken, userData, userRole) => {
    localStorage.setItem("resq_token", accessToken);
    localStorage.setItem("resq_user", JSON.stringify(userData));
    localStorage.setItem("resq_role", userRole);
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
    const { access_token, user: u } = res.data;
    const r = u?.user_metadata?.role || "citizen";
    persist(access_token, u, r);
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
      // Supabase returned a session directly (email confirmation disabled)
      persist(session.access_token, u, r);
    } else {
      // No session returned (email confirmation enabled) — auto-login
      const loginRes = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const { access_token, user: loginUser } = loginRes.data;
      const loginRole = loginUser?.user_metadata?.role || signupRole || "citizen";
      persist(access_token, loginUser, loginRole);
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
