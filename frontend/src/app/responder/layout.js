"use client";

import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "react-hot-toast";
import Topbar from "@/components/Topbar";
import RouteGuard from "@/components/RouteGuard";
import { useState } from "react";

function ResponderTopbar() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "R";

  return (
    <Topbar
      rightContent={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="on-duty-pill">On duty</div>
          <div className="avatar-circle">{initials}</div>
          <button className="btn btn-resolve" style={{ padding: "4px 8px" }} onClick={() => {
            localStorage.clear();
            document.cookie = "resq_role=; path=/; max-age=0";
            document.cookie = "resq_authed=; path=/; max-age=0";
            window.location.href = "/login";
          }}>
            Logout
          </button>
        </div>
      }
    >
      <div className="topbar-nav">
        {["Overview", "Live map", "Alerts", "History"].map((tab) => {
          const val = tab.toLowerCase().replace(" ", "-");
          return (
            <button
              key={val}
              className={activeTab === val ? "active" : ""}
              onClick={() => setActiveTab(val)}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </Topbar>
  );
}

export default function ResponderLayout({ children }) {
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
      <RouteGuard requiredRole="responder">
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <ResponderTopbar />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </RouteGuard>
    </AuthProvider>
  );
}
