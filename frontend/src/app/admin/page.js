"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import StatCard from "@/components/StatCard";
import SeverityBadge from "@/components/SeverityBadge";
import StatusPill from "@/components/StatusPill";
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

export default function AdminPage() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("emergencies");
  const [dispatchId, setDispatchId] = useState(null);
  const [resources, setResources] = useState({ ambulances: 0, fire: 0, police: 0 });

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      setAlerts(res.data?.alerts || []);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Sort by votes (mock) then severity
  const sevOrder = { high: 3, medium: 2, low: 1 };
  const sorted = [...alerts].sort((a, b) => {
    const sa = sevOrder[a.triage_result?.severity || a.severity || "low"] || 0;
    const sb = sevOrder[b.triage_result?.severity || b.severity || "low"] || 0;
    return sb - sa;
  });

  const active = alerts.filter((a) => a.status !== "resolved").length;
  const resolved = alerts.filter((a) => a.status === "resolved").length;
  const critical = alerts.filter((a) => (a.triage_result?.severity || a.severity) === "high").length;

  const handleDispatch = async (alertId) => {
    toast.success(`Dispatched: ${resources.ambulances} ambulances, ${resources.fire} fire trucks, ${resources.police} police vehicles`);
    setDispatchId(null);
    setResources({ ambulances: 0, fire: 0, police: 0 });
  };

  const tabs = [
    { id: "emergencies", label: "🚨 Emergencies" },
    { id: "centre", label: "📡 ResQ Centre" },
    { id: "users", label: "👥 Users" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Command Center</h2>
        <p style={{ fontSize: 12, color: "var(--muted)" }}>Real-time emergency operations overview</p>
      </motion.div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <StatCard number={alerts.length} label="Total alerts" index={0} />
        <StatCard number={active} label="Active" index={1} />
        <StatCard number={critical} label="Critical" index={2} />
        <StatCard number={resolved} label="Resolved" index={3} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {tabs.map((t) => (
          <button key={t.id} className={`filter-pill ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Emergencies Tab */}
      {tab === "emergencies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((a, i) => {
            const sev = a.triage_result?.severity || a.severity || "low";
            const isDispatching = dispatchId === a.id;
            return (
              <motion.div
                key={a.id}
                className="card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{ padding: 16 }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span className={`sev-dot sev-dot-${sev}`} style={{ marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>{a.message}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                      <SeverityBadge severity={sev} />
                      <StatusPill status={a.status} />
                      <span>{timeAgo(a.created_at)}</span>
                      {a.latitude && <span>📍 {Number(a.latitude).toFixed(3)}, {Number(a.longitude).toFixed(3)}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => setDispatchId(isDispatching ? null : a.id)}>
                      {isDispatching ? "Cancel" : "⚡ Dispatch"}
                    </button>
                  </div>
                </div>

                {/* Dispatch panel */}
                {isDispatching && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Assign Resources</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[
                        { key: "ambulances", icon: "🚑", label: "Ambulances" },
                        { key: "fire", icon: "🚒", label: "Fire Trucks" },
                        { key: "police", icon: "🚔", label: "Police" },
                      ].map((r) => (
                        <div key={r.key} style={{ background: "var(--surface2)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{r.label}</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 14 }} onClick={() => setResources((p) => ({ ...p, [r.key]: Math.max(0, p[r.key] - 1) }))}>−</button>
                            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{resources[r.key]}</span>
                            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 14 }} onClick={() => setResources((p) => ({ ...p, [r.key]: p[r.key] + 1 }))}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ width: "100%", padding: "10px 16px" }} onClick={() => handleDispatch(a.id)}>
                      Send to Responders
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📋</div>
              No emergencies
            </div>
          )}
        </div>
      )}

      {/* ResQ Centre Tab */}
      {tab === "centre" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Review and moderate community posts. Accept real emergencies, ignore false alarms.</p>
          {sorted.filter((a) => a.type === "social_post" || a.type === "media_post").length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
              <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📡</div>
              No social posts to moderate
            </div>
          ) : sorted.filter((a) => a.type === "social_post" || a.type === "media_post").map((a, i) => {
            const sev = a.triage_result?.severity || a.severity || "low";
            return (
              <div key={a.id} className="card" style={{ padding: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span className={`sev-dot sev-dot-${sev}`} style={{ marginTop: 6 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(a.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-success" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => toast.success("Post accepted")}>Accept</button>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => toast("Post ignored")}>Ignore</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>👥</div>
          <p>User management coming soon</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>All registered users will appear here</p>
        </div>
      )}
    </div>
  );
}
