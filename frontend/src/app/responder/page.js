"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import AnimatedBackground from "@/components/AnimatedBackground";
import ChatPanel from "@/components/ChatPanel";

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

const SEV_CONFIG = {
  high: { color: "#ff6b6b", bg: "rgba(255,45,45,0.12)", border: "rgba(255,45,45,0.25)", label: "Critical", glow: "0 0 20px rgba(255,45,45,0.08)" },
  medium: { color: "#ffaa28", bg: "rgba(255,170,40,0.12)", border: "rgba(255,170,40,0.25)", label: "Medium", glow: "none" },
  low: { color: "#4cd17f", bg: "rgba(76,209,127,0.12)", border: "rgba(76,209,127,0.25)", label: "Low", glow: "none" },
};

const RESP_ICONS = { fire: "🔥", ambulance: "🚑", police: "🚔", rescue: "⛑️", unknown: "📋" };

function parseMedia(message) {
  const mediaRegex = /\[MEDIA:([^\]]+)\]/g;
  const urls = [];
  let match;
  while ((match = mediaRegex.exec(message)) !== null) urls.push(match[1]);
  const cleanMsg = message.replace(mediaRegex, "").trim();
  return { cleanMsg, mediaUrls: urls };
}

export default function ResponderPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("active");
  const [selectedId, setSelectedId] = useState(null);
  const [chatAlertId, setChatAlertId] = useState(null);

  // Get current user ID from localStorage
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("resq_user");
      if (saved) setCurrentUserId(JSON.parse(saved)?.id);
    } catch {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      setAlerts(res.data?.alerts || []);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); const iv = setInterval(fetchAlerts, 15000); return () => clearInterval(iv); }, [fetchAlerts]);

  const handleAccept = async (id) => {
    try {
      await apiFetch(`/api/alerts/${id}/accept`, { method: "PATCH" });
      toast.success("Mission accepted — en route");
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  const handleResolve = async (id) => {
    try {
      await apiFetch(`/api/alerts/${id}/resolve`, { method: "PATCH" });
      toast.success("Incident resolved");
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  const filtered = alerts.filter(a => {
    if (filter === "active") return a.status === "active" || a.status === "accepted";
    return a.status === "resolved";
  });

  const activeCount = alerts.filter(a => a.status === "active" || a.status === "accepted").length;
  const resolvedCount = alerts.filter(a => a.status === "resolved").length;
  const myAccepted = alerts.filter(a => a.status === "accepted").length;

  return (
    <>
    <AnimatedBackground />
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px", position: "relative", zIndex: 1 }}>

      {/* === HEADER === */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(255,45,45,0.2), rgba(255,100,50,0.1))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, border: "1px solid rgba(255,45,45,0.2)",
          }}>⛑️</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              Field Operations
            </h1>
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
              Emergency response & incident management
            </p>
          </div>
        </div>
      </motion.div>

      {/* === QUICK STATS === */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { num: alerts.length, label: "Assigned", icon: "📋", color: "var(--text)" },
          { num: activeCount, label: "In Progress", icon: "🔴", color: "#ff6b6b" },
          { num: resolvedCount, label: "Completed", icon: "✅", color: "#4cd17f" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
              padding: "16px 14px", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.num}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* === NEARBY FACILITIES === */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "14px 16px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>📍 Nearby Facilities</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { icon: "🏥", name: "Victoria Hospital", dist: "2.1 km" },
            { icon: "👮", name: "Ashok Nagar PS", dist: "1.8 km" },
            { icon: "🚒", name: "MG Road Fire Stn", dist: "2.5 km" },
            { icon: "🏥", name: "Manipal Hospital", dist: "4.3 km" },
          ].map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: "var(--surface2)", borderRadius: 10, fontSize: 11,
            }}>
              <span>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text2)" }}>{f.name}</div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 10 }}>{f.dist}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === MY ACTIVE MISSION BANNER === */}
      {myAccepted > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "linear-gradient(135deg, rgba(255,45,45,0.1), rgba(255,100,50,0.05))",
            border: "1px solid rgba(255,45,45,0.2)", borderRadius: 14,
            padding: "14px 18px", marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#ff2d2d",
              animation: "pulse 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#ff6b6b" }}>
              {myAccepted} Active Mission{myAccepted > 1 ? "s" : ""}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Respond promptly</span>
        </motion.div>
      )}

      {/* === FILTER TABS === */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 18,
        background: "var(--surface)", borderRadius: 12, padding: 4,
        border: "1px solid var(--border)",
      }}>
        {[
          { id: "active", label: `Active (${activeCount})`, icon: "🔴" },
          { id: "resolved", label: `Resolved (${resolvedCount})`, icon: "🟢" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 10, border: "none",
              cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              background: filter === t.id ? "var(--surface2)" : "transparent",
              color: filter === t.id ? "var(--text)" : "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.2s",
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* === INCIDENT CARDS === */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AnimatePresence>
          {filtered.map((a, i) => {
            const sev = a.triage_result?.severity || a.severity || "low";
            const respType = a.triage_result?.response_type || a.response_type || "unknown";
            const sevCfg = SEV_CONFIG[sev] || SEV_CONFIG.low;
            const isSelected = selectedId === a.id;
            const { cleanMsg, mediaUrls } = parseMedia(a.message || "");

            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedId(isSelected ? null : a.id)}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isSelected ? sevCfg.border : "var(--border)"}`,
                  borderRadius: 16, overflow: "hidden", cursor: "pointer",
                  boxShadow: isSelected ? sevCfg.glow : "none",
                  transition: "all 0.2s",
                }}
              >
                {/* Top accent */}
                <div style={{
                  height: 3,
                  background: sev === "high" ? "linear-gradient(90deg, #ff2d2d, #ff6b6b)"
                    : sev === "medium" ? "linear-gradient(90deg, #ffaa28, #ffd93d)"
                    : "linear-gradient(90deg, #4cd17f, #86efac)",
                }} />

                <div style={{ padding: "16px 18px" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: sevCfg.bg, border: `1px solid ${sevCfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {RESP_ICONS[respType] || "📋"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6, lineHeight: 1.5 }}>
                        {cleanMsg}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                          background: sevCfg.bg, border: `1px solid ${sevCfg.border}`, color: sevCfg.color,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: sevCfg.color }} />
                          {sevCfg.label}
                        </span>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                          background: a.status === "accepted" ? "rgba(255,170,40,0.1)" : a.status === "resolved" ? "rgba(76,209,127,0.1)" : "rgba(255,45,45,0.1)",
                          color: a.status === "accepted" ? "#ffaa28" : a.status === "resolved" ? "#4cd17f" : "#ff6b6b",
                        }}>
                          {a.status === "accepted" ? "In Progress" : a.status === "resolved" ? "Resolved" : "Pending"}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>

                          {/* Media */}
                          {mediaUrls.length > 0 && (
                            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                              {mediaUrls.map((url, j) => (
                                <img key={j} src={url} alt="incident" style={{
                                  width: 140, height: 95, objectFit: "cover",
                                  borderRadius: 10, border: "1px solid var(--border)",
                                }} />
                              ))}
                            </div>
                          )}

                          {/* Location */}
                          {a.latitude ? (
                            <div style={{
                              background: "var(--surface2)", borderRadius: 10, padding: "10px 14px",
                              marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <span style={{ fontSize: 16 }}>📍</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                                  {Number(a.latitude).toFixed(4)}, {Number(a.longitude).toFixed(4)}
                                </div>
                                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                                  Tap to open in maps
                                </div>
                              </div>
                              <a
                                href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{
                                  marginLeft: "auto", padding: "6px 12px", borderRadius: 8,
                                  background: "var(--surface)", border: "1px solid var(--border)",
                                  color: "var(--text2)", fontSize: 11, fontWeight: 600,
                                  textDecoration: "none",
                                }}
                              >
                                Navigate →
                              </a>
                            </div>
                          ) : (
                            <div style={{
                              background: "rgba(245,158,11,0.06)", borderRadius: 10, padding: "10px 14px",
                              marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
                              border: "1px solid rgba(245,158,11,0.15)",
                            }}>
                              <span style={{ fontSize: 16 }}>⚠️</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--yellow, #f59e0b)" }}>
                                  Location off
                                </div>
                                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                                  GPS was unavailable when this alert was sent
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Response info */}
                          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                            {[
                              { icon: "🚑", label: "Ambulances", count: sev === "high" ? 2 : 1 },
                              { icon: "🚒", label: "Fire Trucks", count: respType === "fire" ? 2 : 0 },
                              { icon: "🚔", label: "Police", count: respType === "police" ? 2 : 0 },
                            ].filter(r => r.count > 0).map(r => (
                              <div key={r.label} style={{
                                flex: 1, background: "var(--surface2)", borderRadius: 10, padding: "10px 12px",
                                display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--border)",
                              }}>
                                <span style={{ fontSize: 18 }}>{r.icon}</span>
                                <div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{r.count}</div>
                                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{r.label}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Chat Button */}
                          <div style={{ marginBottom: 12 }} onClick={e => e.stopPropagation()}>
                            <button
                              className="chat-trigger-btn"
                              style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}
                              onClick={() => setChatAlertId(a.id)}
                            >
                              <span className="chat-trigger-icon">💬</span>
                              {a.status === "resolved" ? "View Chat History" : "Chat with Citizen"}
                            </button>
                          </div>

                          {/* Action buttons */}
                          {a.status !== "resolved" && (
                            <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                              {a.status === "active" && (
                                <button
                                  onClick={() => handleAccept(a.id)}
                                  style={{
                                    flex: 1, padding: "12px 16px", borderRadius: 12,
                                    border: "none", cursor: "pointer", fontFamily: "inherit",
                                    fontSize: 13, fontWeight: 700, color: "#fff",
                                    background: "linear-gradient(135deg, #ff2d2d, #e60000)",
                                    boxShadow: "0 4px 16px rgba(255,45,45,0.3)",
                                  }}
                                >
                                  Accept Mission
                                </button>
                              )}
                              <button
                                onClick={() => handleResolve(a.id)}
                                style={{
                                  flex: 1, padding: "12px 16px", borderRadius: 12,
                                  border: "none", cursor: "pointer", fontFamily: "inherit",
                                  fontSize: 13, fontWeight: 700, color: "#fff",
                                  background: "linear-gradient(135deg, #4cd17f, #2da85d)",
                                  boxShadow: "0 4px 16px rgba(76,209,127,0.2)",
                                }}
                              >
                                {a.status === "accepted" ? "Mark Resolved" : "Resolve"}
                              </button>
                            </div>
                          )}

                          {a.status === "resolved" && (
                            <div style={{
                              textAlign: "center", padding: "10px 0", fontSize: 13,
                              fontWeight: 700, color: "#4cd17f",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4cd17f" }} />
                              Incident Resolved
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
            <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 12 }}>
              {filter === "active" ? "⛑️" : "📋"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {filter === "active" ? "No active missions" : "No resolved incidents"}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {filter === "active" ? "Stand by for incoming assignments" : "Completed incidents will appear here"}
            </div>
          </div>
        )}
      </div>

      {/* Chat Panel Modal */}
      <AnimatePresence>
        {chatAlertId && (
          <ChatPanel
            alertId={chatAlertId}
            currentUserId={currentUserId}
            onClose={() => setChatAlertId(null)}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
    </>
  );
}
