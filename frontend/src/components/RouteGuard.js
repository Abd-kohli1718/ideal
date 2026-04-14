"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

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
      router.replace(`/${role || "login"}`);
    }
  }, [user, role, isLoading, requiredRole, router]);

  if (isLoading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        color: "var(--muted)",
        fontSize: 12,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole && role !== requiredRole) return null;

  return children;
}
