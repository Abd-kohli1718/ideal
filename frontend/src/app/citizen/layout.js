"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import Topbar from "@/components/Topbar";
import RouteGuard from "@/components/RouteGuard";

export default function CitizenLayout({ children }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          },
        }}
      />
      <RouteGuard requiredRole="citizen">
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <Topbar
            rightContent={
              <button className="btn btn-resolve" onClick={() => {
                localStorage.clear();
                document.cookie = "resq_role=; path=/; max-age=0";
                document.cookie = "resq_authed=; path=/; max-age=0";
                window.location.href = "/login";
              }}>
                Logout
              </button>
            }
          >
            <span className="role-tag">Citizen</span>
          </Topbar>
          <div style={{ flex: 1, overflow: "auto" }}>
            {children}
          </div>
        </div>
      </RouteGuard>
    </AuthProvider>
  );
}
