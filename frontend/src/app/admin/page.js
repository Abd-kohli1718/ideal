"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const SEV_COLORS = {
  high: { bg: "rgba(255,45,45,0.12)", border: "rgba(255,45,45,0.3)", text: "#ff6b6b", label: "Critical" },
  medium: { bg: "rgba(255,170,40,0.12)", border: "rgba(255,170,40,0.3)", text: "#ffaa28", label: "Medium" },
  low: { bg: "rgba(76,209,127,0.12)", border: "rgba(76,209,127,0.3)", text: "#4cd17f", label: "Low" },
};

const RESPONSE_ICONS = { fire: "🔥", ambulance: "🚑", police: "🚔", rescue: "⛑️", unknown: "📋" };

function SeverityChip({ severity }) {
  const s = SEV_COLORS[severity] || SEV_COLORS.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.text }} />
      {s.label}
    </span>
  );
}

function StatusChip({ status }) {
  const map = {
    active: { color: "#ff6b6b", bg: "rgba(255,45,45,0.1)", label: "Active" },
    accepted: { color: "#ffaa28", bg: "rgba(255,170,40,0.1)", label: "In Progress" },
    resolved: { color: "#4cd17f", bg: "rgba(76,209,127,0.1)", label: "Resolved" },
  };
  const s = map[status] || map.active;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600,
      background: s.bg, color: s.color, letterSpacing: "0.04em",
    }}>
      {s.label}
    </span>
  );
}

function parseMedia(message) {
  const mediaRegex = /\[MEDIA:(https?:\/\/[^\]]+)\]/g;
  const urls = [];
  let match;
  while ((match = mediaRegex.exec(message)) !== null) urls.push(match[1]);
  const cleanMsg = message.replace(mediaRegex, "").trim();
  return { cleanMsg, mediaUrls: urls };
}

export default function AdminPage() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("emergencies");
  const [expandedId, setExpandedId] = useState(null);
  const [resources, setResources] = useState({ ambulances: 0, fire: 0, police: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      setAlerts(res.data?.alerts || []);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); const iv = setInterval(fetchAlerts, 15000); return () => clearInterval(iv); }, [fetchAlerts]);

  const sevOrder = { high: 3, medium: 2, low: 1 };
  const sorted = [...alerts].sort((a, b) => {
    const sa = sevOrder[a.triage_result?.severity || a.severity || "low"] || 0;
    const sb = sevOrder[b.triage_result?.severity || b.severity || "low"] || 0;
    return sb - sa;
  });

  const filtered = sorted.filter(a => {
    if (!searchQuery) return true;
    return a.message?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const total = alerts.length;
  const active = alerts.filter(a => a.status !== "resolved").length;
  const resolved = alerts.filter(a => a.status === "resolved").length;
  const critical = alerts.filter(a => (a.triage_result?.severity || a.severity) === "high").length;

  const handleDispatch = (alertId) => {
    const total = resources.ambulances + resources.fire + resources.police;
    if (total === 0) { toast.error("Assign at least one resource"); return; }
    toast.success(`Dispatched ${total} unit(s) to incident`);
    setExpandedId(null);
    setResources({ ambulances: 0, fire: 0, police: 0 });
  };

  const handleSimulate = async () => {
    try {
      await apiFetch("/api/simulate/social", { method: "POST" });
      toast.success("Simulated emergency alert generated!");
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || "Simulation failed");
    }
  };

  const tabs = [
    { id: "emergencies", label: "Emergencies", icon: "🚨", count: active },
    { id: "centre", label: "Community Feed", icon: "📡", count: sorted.filter(a => a.type === "social_post").length },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>

      {/* === HEADER === */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: active > 0 ? "#ff2d2d" : "#4cd17f",
              boxShadow: active > 0 ? "0 0 12px rgba(255,45,45,0.6)" : "0 0 8px rgba(76,209,127,0.5)",
              animation: active > 0 ? "pulse 2s ease-in-out infinite" : "none",
            }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              Command Center
            </h1>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, letterSpacing: "0.02em" }}>
            Real-time emergency operations & incident management
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleSimulate}
            style={{
              background: "linear-gradient(135deg, rgba(255,45,45,0.15), rgba(255,45,45,0.05))",
              border: "1px solid rgba(255,45,45,0.3)", borderRadius: 12,
              padding: "8px 14px", fontSize: 11, color: "#ff6b6b",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s",
            }}
          >
            ⚡ Simulate Alert
          </button>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
            padding: "8px 14px", fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4cd17f" }} />
            System Online
          </div>
        </div>
      </motion.div>

      {/* === STAT CARDS === */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { num: total, label: "Total Incidents", gradient: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", icon: "📋" },
          { num: active, label: "Active Now", gradient: "linear-gradient(135deg, rgba(255,45,45,0.15), rgba(255,45,45,0.03))", icon: "🔴", highlight: true },
          { num: critical, label: "Critical", gradient: "linear-gradient(135deg, rgba(255,100,50,0.12), rgba(255,100,50,0.02))", icon: "⚠️" },
          { num: resolved, label: "Resolved", gradient: "linear-gradient(135deg, rgba(76,209,127,0.12), rgba(76,209,127,0.02))", icon: "✅" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{
              background: s.gradient, border: "1px solid var(--border)",
              borderRadius: 16, padding: "18px 16px",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 500 }}>{s.icon} {s.label}</div>
            <div style={{
              fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em",
              background: s.highlight ? "linear-gradient(135deg, #ff6b6b, #ff2d2d)" : "linear-gradient(135deg, var(--text), var(--text2))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {s.num}
            </div>
          </motion.div>
        ))}
      </div>

      {/* === TABS === */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        background: "var(--surface)", borderRadius: 14, padding: 4,
        border: "1px solid var(--border)",
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 12, fontWeight: 600, transition: "all 0.2s",
              background: tab === t.id ? "var(--surface2)" : "transparent",
              color: tab === t.id ? "var(--text)" : "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.count != null && (
              <span style={{
                background: tab === t.id ? "rgba(255,45,45,0.2)" : "var(--surface2)",
                padding: "2px 7px", borderRadius: 8, fontSize: 10,
                fontWeight: 700, color: tab === t.id ? "#ff6b6b" : "var(--muted)",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* === SEARCH BAR === */}
      {tab !== "analytics" && (
        <div style={{ marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 16px", fontSize: 12, width: "100%" }}
          />
        </div>
      )}

      {/* === EMERGENCIES TAB === */}
      {tab === "emergencies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {filtered.map((a, i) => {
              const sev = a.triage_result?.severity || a.severity || "low";
              const respType = a.triage_result?.response_type || a.response_type || "unknown";
              const isExpanded = expandedId === a.id;
              const { cleanMsg, mediaUrls } = parseMedia(a.message || "");

              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    background: "var(--surface)", border: `1px solid ${sev === "high" ? "rgba(255,45,45,0.2)" : "var(--border)"}`,
                    borderRadius: 16, padding: 0, overflow: "hidden",
                    boxShadow: sev === "high" ? "0 0 20px rgba(255,45,45,0.06)" : "none",
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{
                    height: 3,
                    background: sev === "high" ? "linear-gradient(90deg, #ff2d2d, #ff6b6b)" :
                      sev === "medium" ? "linear-gradient(90deg, #ffaa28, #ffd93d)" :
                      "linear-gradient(90deg, #4cd17f, #86efac)",
                  }} />

                  <div style={{ padding: "16px 20px" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: SEV_COLORS[sev]?.bg || "var(--surface2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, flexShrink: 0,
                      }}>
                        {RESPONSE_ICONS[respType] || "📋"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>
                          {cleanMsg}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <SeverityChip severity={sev} />
                          <StatusChip status={a.status} />
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(a.created_at)}</span>
                          {a.latitude && (
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>
                              📍 {Number(a.latitude).toFixed(3)}, {Number(a.longitude).toFixed(3)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                        style={{
                          background: isExpanded ? "rgba(255,45,45,0.1)" : "var(--surface2)",
                          border: "1px solid var(--border)", borderRadius: 10,
                          padding: "8px 14px", fontSize: 11, fontWeight: 600,
                          color: isExpanded ? "#ff6b6b" : "var(--text2)",
                          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        }}
                      >
                        {isExpanded ? "Cancel" : "⚡ Dispatch"}
                      </button>
                    </div>

                    {/* Media preview */}
                    {mediaUrls.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto" }}>
                        {mediaUrls.map((url, j) => (
                          <img key={j} src={url} alt="incident" style={{
                            width: 120, height: 80, objectFit: "cover",
                            borderRadius: 10, border: "1px solid var(--border)",
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Dispatch panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>
                              Assign Resources
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                              {[
                                { key: "ambulances", icon: "🚑", label: "Ambulances" },
                                { key: "fire", icon: "🚒", label: "Fire Trucks" },
                                { key: "police", icon: "🚔", label: "Police" },
                              ].map(r => (
                                <div key={r.key} style={{
                                  background: "var(--surface2)", borderRadius: 12, padding: 12, textAlign: "center",
                                  border: "1px solid var(--border)",
                                }}>
                                  <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, fontWeight: 500 }}>{r.label}</div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                    <button onClick={() => setResources(p => ({ ...p, [r.key]: Math.max(0, p[r.key] - 1) }))} style={{
                                      width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)",
                                      background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 700,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>-</button>
                                    <span style={{ fontSize: 18, fontWeight: 800, minWidth: 24, textAlign: "center", color: "var(--text)" }}>{resources[r.key]}</span>
                                    <button onClick={() => setResources(p => ({ ...p, [r.key]: p[r.key] + 1 }))} style={{
                                      width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)",
                                      background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 700,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>+</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => handleDispatch(a.id)}
                              style={{
                                width: "100%", padding: "12px 20px", borderRadius: 12,
                                border: "none", cursor: "pointer", fontFamily: "inherit",
                                fontSize: 13, fontWeight: 700, color: "#fff",
                                background: "linear-gradient(135deg, #ff2d2d, #e60000)",
                                boxShadow: "0 4px 16px rgba(255,45,45,0.3)",
                              }}
                            >
                              Deploy to Responders
                            </button>
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
              <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 12 }}>🛡️</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>All clear</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>No active incidents to display</div>
            </div>
          )}
        </div>
      )}

      {/* === COMMUNITY FEED TAB === */}
      {tab === "centre" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
            padding: "12px 16px", fontSize: 12, color: "var(--muted)", marginBottom: 4,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>💡</span>
            Review community-submitted posts. Verify real emergencies and escalate them to active incidents.
          </div>
          {filtered.filter(a => a.type === "social_post").map((a, i) => {
            const sev = a.triage_result?.severity || a.severity || "low";
            const { cleanMsg, mediaUrls } = parseMedia(a.message || "");
            return (
              <motion.div key={a.id} className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }} style={{ padding: 16, borderRadius: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: "var(--surface2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                  }}>📡</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>{cleanMsg}</div>
                    {mediaUrls.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        {mediaUrls.map((url, j) => (
                          <img key={j} src={url} alt="media" style={{
                            width: 100, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)",
                          }} />
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <SeverityChip severity={sev} />
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={() => toast.success("Escalated to active incidents")} style={{
                      padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "rgba(76,209,127,0.15)", color: "#4cd17f", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                    }}>Verify</button>
                    <button onClick={() => toast("Post dismissed")} style={{
                      padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer",
                      background: "transparent", color: "var(--muted)", fontSize: 11, fontWeight: 500, fontFamily: "inherit",
                    }}>Dismiss</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filtered.filter(a => a.type === "social_post").length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
              <div style={{ fontSize: 40, opacity: 0.2, marginBottom: 12 }}>📡</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No community posts</div>
            </div>
          )}
        </div>
      )}

      {/* === ANALYTICS TAB === */}
      {tab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Severity breakdown */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Severity Breakdown</h3>
            {["high", "medium", "low"].map(s => {
              const count = alerts.filter(a => (a.triage_result?.severity || a.severity) === s).length;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={s} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: SEV_COLORS[s].text, fontWeight: 600 }}>{SEV_COLORS[s].label}</span>
                    <span style={{ color: "var(--muted)" }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--surface2)", overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                      style={{ height: "100%", borderRadius: 3, background: SEV_COLORS[s].text }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Response type breakdown */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Response Types</h3>
            {["fire", "ambulance", "police", "rescue", "unknown"].map(rt => {
              const count = alerts.filter(a => (a.triage_result?.response_type || a.response_type) === rt).length;
              if (count === 0) return null;
              return (
                <div key={rt} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{RESPONSE_ICONS[rt]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{rt}</div>
                  </div>
                  <span style={{
                    background: "var(--surface2)", padding: "4px 10px", borderRadius: 8,
                    fontSize: 12, fontWeight: 700, color: "var(--text)",
                  }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Status breakdown */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Operations Status</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Active", count: active, color: "#ff6b6b", icon: "🔴" },
                { label: "In Progress", count: alerts.filter(a => a.status === "accepted").length, color: "#ffaa28", icon: "🟡" },
                { label: "Resolved", count: resolved, color: "#4cd17f", icon: "🟢" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "var(--surface2)", borderRadius: 12, padding: 16, textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
