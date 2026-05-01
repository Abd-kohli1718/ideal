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
    accepted: { color: "#ffaa28", bg: "rgba(255,170,40,0.1)", label: "Dispatched" },
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
  const mediaRegex = /\[MEDIA:([^\]]+)\]/g;
  const urls = [];
  let match;
  while ((match = mediaRegex.exec(message)) !== null) urls.push(match[1]);
  const cleanMsg = message.replace(mediaRegex, "").trim();
  return { cleanMsg, mediaUrls: urls };
}

// Deterministic votes from ID
function hashVotes(id) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = ((h << 5) - h + String(id).charCodeAt(i)) | 0;
  return Math.abs(h % 478) + 3;
}

export default function AdminPage() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("emergencies");
  const [expandedId, setExpandedId] = useState(null);
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const [dispatchRes, setDispatchRes] = useState({ ambulances: 0, fire: 0, police: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [chatAlertId, setChatAlertId] = useState(null);
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

  const handleDispatch = async (alertId) => {
    try {
      await apiFetch(`/api/alerts/${alertId}/accept`, { method: "PATCH" });
      const total = dispatchRes.ambulances + dispatchRes.fire + dispatchRes.police;
      if (total === 0) {
        toast.success("Alert dispatched to responders");
      } else {
        toast.success(`Dispatched ${total} unit(s) to responders`);
      }
      setExpandedId(null);
      setDispatchRes({ ambulances: 0, fire: 0, police: 0 });
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || "Failed to dispatch");
    }
  };

  // Most upvoted alerts
  const topUpvoted = [...alerts]
    .map(a => ({ ...a, votes: hashVotes(a.id) }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  const tabs = [
    { id: "emergencies", label: "Emergencies", icon: "🚨", count: active },
    { id: "resources", label: "Resources", icon: "🚑" },
    { id: "analytics", label: "Analytics", icon: "📊" },
  ];

  return (
    <>
    <AnimatedBackground />
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px", position: "relative", zIndex: 1 }}>

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ---- SOS REPORTS SECTION ---- */}
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
              padding: "10px 16px", borderRadius: 12,
              background: "linear-gradient(135deg, rgba(255,45,45,0.1), rgba(255,45,45,0.03))",
              border: "1px solid rgba(255,45,45,0.2)",
            }}>
              <span style={{ fontSize: 18 }}>🚨</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ff6b6b" }}>SOS Emergency Reports</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Direct emergency button activations — highest priority</div>
              </div>
              <span style={{
                background: "rgba(255,45,45,0.2)", padding: "3px 10px", borderRadius: 20,
                fontSize: 11, fontWeight: 800, color: "#ff6b6b",
              }}>
                {filtered.filter(a => a.type === 'sos_button' || a.type === 'audio_sos').length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <AnimatePresence>
                {filtered.filter(a => a.type === 'sos_button' || a.type === 'audio_sos').map((a, i) => {
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
                          {a.latitude ? (
                            <span style={{ fontSize: 10, color: "var(--muted)" }}>
                              📍 {Number(a.latitude).toFixed(3)}, {Number(a.longitude).toFixed(3)}
                            </span>
                          ) : (
                            <span style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>
                              📍 Location off
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!verifiedIds.has(a.id) ? (
                          <button
                            onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                            style={{
                              background: expandedId === a.id ? "rgba(91,141,239,0.1)" : "var(--surface2)",
                              border: "1px solid var(--border)", borderRadius: 10,
                              padding: "8px 14px", fontSize: 11, fontWeight: 600,
                              color: expandedId === a.id ? "#5b8def" : "var(--text2)",
                              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                            }}
                          >
                            {expandedId === a.id ? "Close" : "🔍 Verify"}
                          </button>
                        ) : (
                          <button
                            onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                            style={{
                              background: expandedId === a.id ? "rgba(255,45,45,0.1)" : "rgba(76,209,127,0.08)",
                              border: `1px solid ${expandedId === a.id ? "rgba(255,45,45,0.2)" : "rgba(76,209,127,0.2)"}`,
                              borderRadius: 10, padding: "8px 14px", fontSize: 11, fontWeight: 600,
                              color: expandedId === a.id ? "#ff6b6b" : "#4cd17f",
                              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                            }}
                          >
                            {expandedId === a.id ? "Cancel" : "⚡ Deploy"}
                          </button>
                        )}
                        {/* Chat always available for admin */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setChatAlertId(a.id); }}
                          style={{
                            background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                            borderRadius: 10, padding: "8px 10px", fontSize: 11,
                            cursor: "pointer", fontFamily: "inherit", color: "#5b8def",
                          }}
                        >
                          💬
                        </button>
                      </div>
                    </div>

                    {/* Media preview — always shown prominently */}
                    {mediaUrls.length > 0 && (
                      <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                        {mediaUrls.map((url, j) => (
                          <img key={j} src={url} alt="incident" style={{
                            width: "100%", maxHeight: 220, objectFit: "cover",
                            display: "block",
                          }} />
                        ))}
                      </div>
                    )}

                    {/* Expanded panel — Verify step or Deploy step */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                            {!verifiedIds.has(a.id) ? (
                              /* === VERIFY STEP: Show full report === */
                              <>
                                <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "#5b8def", display: "flex", alignItems: "center", gap: 6 }}>
                                  🔍 Incident Verification Report
                                </p>
                                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 12, lineHeight: 1.6 }}>
                                  <div style={{ marginBottom: 8 }}><strong>Type:</strong> {a.type?.replace(/_/g, " ") || "Unknown"}</div>
                                  <div style={{ marginBottom: 8 }}><strong>Severity:</strong> <span style={{ color: SEV_COLORS[sev]?.text }}>{SEV_COLORS[sev]?.label}</span></div>
                                  <div style={{ marginBottom: 8 }}><strong>Response:</strong> {RESPONSE_ICONS[respType]} {respType}</div>
                                  <div style={{ marginBottom: 8 }}><strong>Location:</strong> {a.latitude ? `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}` : "Location off"}</div>
                                  <div><strong>AI Confidence:</strong> {a.triage_result ? "High (AI Triaged)" : "Pending review"}</div>
                                </div>

                                {/* Embedded Map in Verify Step */}
                                {a.latitude && (
                                  <div style={{
                                    borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)",
                                    marginBottom: 12, height: 160,
                                  }}>
                                    <iframe
                                      title="Incident Location"
                                      width="100%"
                                      height="160"
                                      frameBorder="0"
                                      scrolling="no"
                                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(a.longitude)-0.008}%2C${Number(a.latitude)-0.005}%2C${Number(a.longitude)+0.008}%2C${Number(a.latitude)+0.005}&layer=mapnik&marker=${a.latitude}%2C${a.longitude}`}
                                      style={{ display: "block" }}
                                    />
                                  </div>
                                )}

                                <button
                                  onClick={() => { setVerifiedIds(prev => new Set([...prev, a.id])); toast.success("Incident verified ✓"); }}
                                  style={{
                                    width: "100%", padding: "12px 20px", borderRadius: 12,
                                    border: "none", cursor: "pointer", fontFamily: "inherit",
                                    fontSize: 13, fontWeight: 700, color: "#fff",
                                    background: "linear-gradient(135deg, #5b8def, #3b5ec9)",
                                    boxShadow: "0 4px 16px rgba(91,141,239,0.3)",
                                  }}
                                >
                                  ✓ Verify Incident
                                </button>
                              </>
                            ) : (
                              /* === DEPLOY STEP: Resource assignment === */
                              <>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#4cd17f", background: "rgba(76,209,127,0.1)", padding: "3px 10px", borderRadius: 20 }}>✓ VERIFIED</span>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0 }}>Assign Resources</p>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                                  {[
                                    { key: "ambulances", icon: "🚑", label: "Ambulances" },
                                    { key: "fire", icon: "🚒", label: "Fire Trucks" },
                                    { key: "police", icon: "🚔", label: "Police" },
                                  ].map(r => (
                                    <div key={r.key} style={{ background: "var(--surface2)", borderRadius: 12, padding: 12, textAlign: "center", border: "1px solid var(--border)" }}>
                                      <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                                      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, fontWeight: 500 }}>{r.label}</div>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                        <button onClick={() => setDispatchRes(p => ({ ...p, [r.key]: Math.max(0, p[r.key] - 1) }))} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                                        <span style={{ fontSize: 18, fontWeight: 800, minWidth: 24, textAlign: "center", color: "var(--text)" }}>{dispatchRes[r.key]}</span>
                                        <button onClick={() => setDispatchRes(p => ({ ...p, [r.key]: p[r.key] + 1 }))} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
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
                                  🚀 Deploy to Responders
                                </button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.filter(a => a.type === 'sos_button' || a.type === 'audio_sos').length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>No SOS emergencies</div>
            </div>
          )}
            </div>
          </div>

          {/* ---- COMMUNITY REPORTS SECTION ---- */}
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
              padding: "10px 16px", borderRadius: 12,
              background: "linear-gradient(135deg, rgba(91,141,239,0.1), rgba(91,141,239,0.03))",
              border: "1px solid rgba(91,141,239,0.2)",
            }}>
              <span style={{ fontSize: 18 }}>📢</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#5b8def" }}>ResQ Centre Posts</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Community-reported incidents & social alerts</div>
              </div>
              <span style={{
                background: "rgba(91,141,239,0.2)", padding: "3px 10px", borderRadius: 20,
                fontSize: 11, fontWeight: 800, color: "#5b8def",
              }}>
                {filtered.filter(a => a.type !== 'sos_button' && a.type !== 'audio_sos').length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <AnimatePresence>
                {filtered.filter(a => a.type !== 'sos_button' && a.type !== 'audio_sos').map((a, i) => {
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
                      <div style={{
                        height: 3,
                        background: sev === "high" ? "linear-gradient(90deg, #ff2d2d, #ff6b6b)" :
                          sev === "medium" ? "linear-gradient(90deg, #ffaa28, #ffd93d)" :
                          "linear-gradient(90deg, #4cd17f, #86efac)",
                      }} />
                      <div style={{ padding: "16px 20px" }}>
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
                              {a.latitude ? (
                                <span style={{ fontSize: 10, color: "var(--muted)" }}>
                                  📍 {Number(a.latitude).toFixed(3)}, {Number(a.longitude).toFixed(3)}
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>📍 Location off</span>
                              )}
                              {a.user_name && (
                                <span style={{ fontSize: 10, color: "var(--muted)" }}>👤 {a.user_name}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                              style={{
                                background: isExpanded ? "rgba(91,141,239,0.1)" : "var(--surface2)",
                                border: "1px solid var(--border)", borderRadius: 10,
                                padding: "8px 14px", fontSize: 11, fontWeight: 600,
                                color: isExpanded ? "#5b8def" : "var(--text2)",
                                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                              }}
                            >
                              {isExpanded ? "Close" : "🔍 Review"}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setChatAlertId(a.id); }}
                              style={{
                                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                                borderRadius: 10, padding: "8px 10px", fontSize: 11,
                                cursor: "pointer", fontFamily: "inherit", color: "#5b8def",
                              }}
                            >
                              💬
                            </button>
                          </div>
                        </div>

                        {/* Media preview */}
                        {mediaUrls.length > 0 && (
                          <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                            {mediaUrls.map((url, j) => (
                              <img key={j} src={url} alt="incident" style={{
                                width: "100%", maxHeight: 220, objectFit: "cover", display: "block",
                              }} />
                            ))}
                          </div>
                        )}

                        {/* Expanded: quick dispatch */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                                <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 12, lineHeight: 1.6 }}>
                                  <div style={{ marginBottom: 8 }}><strong>Type:</strong> {a.type?.replace(/_/g, " ") || "Unknown"}</div>
                                  <div style={{ marginBottom: 8 }}><strong>Severity:</strong> <span style={{ color: SEV_COLORS[sev]?.text }}>{SEV_COLORS[sev]?.label}</span></div>
                                  <div style={{ marginBottom: 8 }}><strong>Response:</strong> {RESPONSE_ICONS[respType]} {respType}</div>
                                  <div><strong>Location:</strong> {a.latitude ? `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}` : "Location off"}</div>
                                </div>
                                {a.latitude && (
                                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 12, height: 140 }}>
                                    <iframe
                                      title="Incident Location"
                                      width="100%" height="140" frameBorder="0" scrolling="no"
                                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(a.longitude)-0.008}%2C${Number(a.latitude)-0.005}%2C${Number(a.longitude)+0.008}%2C${Number(a.latitude)+0.005}&layer=mapnik&marker=${a.latitude}%2C${a.longitude}`}
                                      style={{ display: "block" }}
                                    />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDispatch(a.id)}
                                  style={{
                                    width: "100%", padding: "12px 20px", borderRadius: 12,
                                    border: "none", cursor: "pointer", fontFamily: "inherit",
                                    fontSize: 13, fontWeight: 700, color: "#fff",
                                    background: "linear-gradient(135deg, #5b8def, #3b5ec9)",
                                    boxShadow: "0 4px 16px rgba(91,141,239,0.3)",
                                  }}
                                >
                                  🚀 Send to Responders
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
              {filtered.filter(a => a.type !== 'sos_button' && a.type !== 'audio_sos').length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 8 }}>📡</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>No community reports</div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* === RESOURCES TAB === */}
      {tab === "resources" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Available Units */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Available Response Units</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              {[
                { icon: "🚑", name: "Ambulances", available: 12, total: 18, color: "#ff6b6b" },
                { icon: "🚒", name: "Fire Trucks", available: 8, total: 12, color: "#ffaa28" },
                { icon: "🚔", name: "PCR Vehicles", available: 24, total: 30, color: "#5b8def" },
                { icon: "🚁", name: "Helicopters", available: 2, total: 3, color: "#a78bfa" },
                { icon: "⛑️", name: "NDRF Teams", available: 4, total: 6, color: "#4cd17f" },
                { icon: "🚐", name: "Rescue Vans", available: 6, total: 10, color: "#f59e0b" },
              ].map(u => (
                <div key={u.name} style={{
                  background: "var(--surface2)", borderRadius: 12, padding: 14, textAlign: "center",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{u.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: u.color }}>{u.available}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 2 }}>of {u.total} total</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text2)" }}>{u.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nearby Facilities */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Key Facilities</h3>
            {[
              { icon: "🏥", name: "Victoria Hospital", dist: "2.1 km", beds: "45 beds free", type: "hospital" },
              { icon: "🏥", name: "Manipal Hospital", dist: "4.3 km", beds: "28 beds free", type: "hospital" },
              { icon: "🏥", name: "St. John's Medical", dist: "5.7 km", beds: "12 beds free", type: "hospital" },
              { icon: "👮", name: "Ashok Nagar PS", dist: "1.8 km", beds: "PCR available", type: "police" },
              { icon: "👮", name: "Koramangala PS", dist: "3.2 km", beds: "PCR available", type: "police" },
              { icon: "🚒", name: "MG Road Fire Station", dist: "2.5 km", beds: "3 trucks", type: "fire" },
              { icon: "🚒", name: "Jayanagar Fire Station", dist: "4.1 km", beds: "2 trucks", type: "fire" },
            ].map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: i < 6 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontSize: 20, width: 36, textAlign: "center" }}>{f.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{f.beds}</div>
                </div>
                <span style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
                  background: "var(--surface2)", color: "var(--text2)",
                }}>{f.dist}</span>
              </div>
            ))}
          </div>

          {/* Most Upvoted Reports */}
          {topUpvoted.length > 0 && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🔥 Most Upvoted Reports</h3>
              {topUpvoted.map((a, i) => {
                const sev = a.triage_result?.severity || a.severity || "low";
                const sevCfg = SEV_COLORS[sev] || SEV_COLORS.low;
                const { cleanMsg } = parseMedia(a.message || "");
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                    borderBottom: i < topUpvoted.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <div style={{
                      width: 32, minWidth: 32, height: 32, borderRadius: 8,
                      background: sevCfg.bg, border: `1px solid ${sevCfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: sevCfg.text,
                    }}>#{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cleanMsg}
                      </div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: "rgba(255,45,45,0.08)", color: "#ff6b6b",
                    }}>
                      ▲ {a.votes}
                    </div>
                  </div>
                );
              })}
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

      {/* Chat Panel Modal for Admin */}
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
