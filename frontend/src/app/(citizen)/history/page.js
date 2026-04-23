"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import StatusTimeline from "@/components/StatusTimeline";

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

export default function HistoryPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      const mine = (res.data?.alerts || []).filter((a) => a.user_id === user?.id);
      setAlerts(mine);
    } catch {}
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const selected = alerts.find((a) => a.id === selectedId);

  return (
    <div style={{ padding: "16px 16px 20px", maxWidth: 500, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>My History</h2>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>Your SOS reports & posts</p>
      </motion.div>

      {alerts.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>📋</div>
          <p style={{ fontSize: 13 }}>No reports yet</p>
          <p style={{ fontSize: 11, marginTop: 4 }}>Your SOS alerts and posts will appear here</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {alerts.map((a, i) => {
          const sev = a.triage_result?.severity || a.severity || "low";
          const isOpen = selectedId === a.id;
          return (
            <motion.div
              key={a.id}
              className="card card-glow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ padding: 16, cursor: "pointer" }}
              onClick={() => setSelectedId(isOpen ? null : a.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`sev-dot sev-dot-${sev}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.message}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
                    <span style={{ textTransform: "capitalize" }}>{(a.type || "").replace(/_/g, " ")}</span>
                    <span>·</span>
                    <span>{timeAgo(a.created_at)}</span>
                  </div>
                </div>
                <div className={`status-pill status-${a.status}`}>{a.status}</div>
              </div>

              {/* Expanded timeline */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}
                  >
                    <StatusTimeline status={a.status} />
                    {a.latitude && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                        📍 {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
