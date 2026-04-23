"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Logo from "./Logo";

/**
 * Client-side route guard. Wraps protected pages.
 * Redirects to /login if unauthenticated, and to correct role page if wrong role.
 */
export default function RouteGuard({ requiredRole, children }) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requiredRole && role !== requiredRole) {
      const dest = role === "citizen" ? "/centre" : `/${role || "login"}`;
      router.replace(dest);
    }
  }, [user, role, isLoading, requiredRole, router]);

  if (isLoading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 20,
      }}>
        {/* Animated logo */}
        <div style={{ opacity: 0.8 }}>
          <Logo size={32} />
        </div>
        
        {/* Premium spinner */}
        <div style={{ position: "relative", width: 40, height: 40 }}>
          <div style={{
            position: "absolute",
            inset: 0,
            border: "2px solid var(--surface2)",
            borderTopColor: "var(--red)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <div style={{
            position: "absolute",
            inset: 4,
            border: "2px solid var(--surface2)",
            borderBottomColor: "rgba(255, 45, 45, 0.5)",
            borderRadius: "50%",
            animation: "spin 1.2s linear infinite reverse",
          }} />
        </div>

        <div style={{
          fontSize: 12,
          color: "var(--muted)",
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}>
          Loading...
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole && role !== requiredRole) return null;

  return children;
}
