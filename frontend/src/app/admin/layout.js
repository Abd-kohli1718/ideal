"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import Topbar from "@/components/Topbar";
import RouteGuard from "@/components/RouteGuard";

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", fontSize: 12, fontFamily: "Inter, sans-serif", borderRadius: 12 } }} />
      <RouteGuard requiredRole="admin">
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <Topbar rightContent={
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => {
              localStorage.clear();
              document.cookie = "resq_role=; path=/; max-age=0";
              document.cookie = "resq_authed=; path=/; max-age=0";
              window.location.href = "/portal";
            }}><span>Logout</span></button>
          }>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", background: "var(--red-soft)", padding: "3px 12px", borderRadius: 20, border: "1px solid rgba(255,45,45,0.2)" }}>Admin</span>
          </Topbar>
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {children}
          </div>
        </div>
      </RouteGuard>
    </AuthProvider>
  );
}
