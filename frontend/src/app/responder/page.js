"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

function timeAgo(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusDot({ status }) {
  const color = status === "resolved" ? "var(--green)" : status === "accepted" ? "var(--yellow)" : "var(--red)";
  return (
    <span style={{
      width: 10, height: 10, borderRadius: "50%",
      background: color,
      boxShadow: `0 0 8px ${color}`,
      display: "inline-block",
    }} />
  );
}

// Mock resource requirements (would come from admin dispatch in production)
const MOCK_RESOURCES = [
  { icon: "🚑", label: "Ambulances", count: 2 },
  { icon: "🚒", label: "Fire Trucks", count: 1 },
  { icon: "🚔", label: "Police", count: 1 },
];

export default function ResponderPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("active");

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      setAlerts(res.data?.alerts || []);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAccept = async (id) => {
    try {
      await apiFetch(`/api/alerts/${id}/accept`, { method: "PATCH" });
      toast.success("Alert accepted — you're assigned");
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  const handleResolve = async (id) => {
    try {
      await apiFetch(`/api/alerts/${id}/resolve`, { method: "PATCH" });
      toast.success("Alert resolved ✓");
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === "active") return a.status === "active" || a.status === "accepted";
    return a.status === "resolved";
  });

  const activeCount = alerts.filter((a) => a.status === "active" || a.status === "accepted").length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Response Panel</h2>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>Assigned emergencies & field operations</p>
      </motion.div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-number">{alerts.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ background: "linear-gradient(135deg, #fff, #ff6b6b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ background: "linear-gradient(135deg, #fff, #86efac)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{resolvedCount}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button className={`filter-pill ${filter === "active" ? "active" : ""}`} onClick={() => setFilter("active")}>
          🔴 Active ({activeCount})
        </button>
        <button className={`filter-pill ${filter === "resolved" ? "active" : ""}`} onClick={() => setFilter("resolved")}>
          🟢 Resolved ({resolvedCount})
        </button>
      </div>

      {/* Alert list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((a, i) => {
          const sev = a.triage_result?.severity || a.severity || "low";
          return (
            <motion.div
              key={a.id}
              className="card card-glow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ padding: 16 }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <StatusDot status={a.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    {timeAgo(a.created_at)} · {(a.type || "").replace(/_/g, " ")}
                  </div>
                </div>
              </div>

              {/* Location */}
              {a.latitude && (
                <div style={{
                  background: "var(--surface2)", borderRadius: 10, padding: "8px 12px",
                  fontSize: 12, color: "var(--text2)", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  📍 {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}
                </div>
              )}

              {/* Resources needed (mock) */}
              {a.status !== "resolved" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  {MOCK_RESOURCES.map((r) => (
                    <div key={r.label} style={{
                      background: "var(--surface2)", borderRadius: 8, padding: "6px 10px",
                      fontSize: 11, color: "var(--text2)",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <span>{r.icon}</span>
                      <span>{r.count} {r.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {a.status !== "resolved" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {a.status === "active" && (
                    <motion.button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => handleAccept(a.id)} whileTap={{ scale: 0.97 }}>
                      ✓ Accept
                    </motion.button>
                  )}
                  <motion.button className="btn btn-success" style={{ flex: 1, fontSize: 12 }} onClick={() => handleResolve(a.id)} whileTap={{ scale: 0.97 }}>
                    ✅ Mark Resolved
                  </motion.button>
                </div>
              )}

              {a.status === "resolved" && (
                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>
                  ✅ Resolved
                </div>
              )}
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>{filter === "active" ? "✓" : "📋"}</div>
            {filter === "active" ? "No active emergencies" : "No resolved emergencies"}
          </div>
        )}
      </div>
    </div>
  );
}
