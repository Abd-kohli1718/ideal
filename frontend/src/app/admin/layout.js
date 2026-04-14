"use client";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import Topbar from "@/components/Topbar";
import RouteGuard from "@/components/RouteGuard";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Overview", value: "overview" },
  { label: "All alerts", value: "alerts" },
  { label: "Responders", value: "responders" },
  { label: "Users", value: "users" },
  { label: "Settings", value: "settings" },
];

function AdminSidenav({ active, onSelect }) {
  return (
    <nav className="sidenav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.value}
          className={`sidenav-item ${active === item.value ? "active" : ""}`}
          onClick={() => onSelect(item.value)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }) {
  const [activeNav, setActiveNav] = useState("overview");

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
      <RouteGuard requiredRole="admin">
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <Topbar
            rightContent={
              <button className="btn btn-resolve" onClick={() => {
                // Clear local storage and cookies manually to avoid any race conditions
                localStorage.clear();
                document.cookie = "resq_role=; path=/; max-age=0";
                document.cookie = "resq_authed=; path=/; max-age=0";
                window.location.href = "/login";
              }}>
                Logout
              </button>
            }
          >
            <span className="role-tag">Admin</span>
          </Topbar>
          <div className="admin-body-grid">
            <AdminSidenav active={activeNav} onSelect={setActiveNav} />
            <div style={{ overflow: "auto", padding: 20 }}>
              {children}
            </div>
          </div>
        </div>
      </RouteGuard>
    </AuthProvider>
  );
}
