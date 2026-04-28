"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";
import ChatPanel from "@/components/ChatPanel";
import toast from "react-hot-toast";

function RedDots() {
  const dots = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 4,
      size: 2 + Math.random() * 2,
    }))
  ).current;

  return (
    <div className="emergency-bg">
      {dots.map((d) => (
        <div key={d.id} className="emergency-dot" style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, animationDelay: `${d.delay}s` }} />
      ))}
    </div>
  );
}

const SOS_COOLDOWN_MS = 30000;
const ADMIN_PHONE = "7400136507";

export default function SOSHomePage() {
  const { user } = useAuth();
  const [userPos, setUserPos] = useState(null);
  const [locStatus, setLocStatus] = useState("Detecting location…");
  const [locAvailable, setLocAvailable] = useState(false);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);
  const cooldownRef = useRef(null);

  // New state: modal + chat
  const [showActionModal, setShowActionModal] = useState(false);
  const [chatAlertId, setChatAlertId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [locRefreshing, setLocRefreshing] = useState(false);
  const isManualRef = useRef(false);

  // Get location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus("Geolocation not supported");
      setLocAvailable(false);
      return;
    }
    setLocRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocAvailable(true);
        setLocRefreshing(false);
        if (isManualRef.current) toast.success("Location updated!", { duration: 2000 });
      },
      () => {
        if (!userPos) {
          setLocStatus("Location unavailable — enable GPS for SOS");
          setLocAvailable(false);
        } else {
          if (isManualRef.current) toast("Using last known location", { icon: "📍", duration: 2000 });
        }
        setLocRefreshing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [userPos]);

  useEffect(() => { requestLocation(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshLocation = useCallback(() => {
    isManualRef.current = true;
    requestLocation();
  }, [requestLocation]);

  // Cooldown timer cleanup
  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(SOS_COOLDOWN_MS / 1000);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  // Instead of directly sending, show the action modal
  const triggerSOS = useCallback(async () => {
    if (!locAvailable || !userPos) {
      toast.error("Location required for SOS. Please enable GPS.", { duration: 4000 });
      return;
    }
    setShowActionModal(true);
  }, [locAvailable, userPos]);

  // Helper: create the SOS alert and return the alert data
  const createSOSAlert = useCallback(async () => {
    const res = await apiFetch("/api/alerts", {
      method: "POST",
      body: JSON.stringify({
        type: "sos_button",
        message: "🚨 SOS Emergency — Immediate help needed",
        latitude: userPos.latitude,
        longitude: userPos.longitude,
      }),
    });
    return res.data;
  }, [userPos]);

  // Handle CALL admin
  const handleCallAdmin = useCallback(async () => {
    setActionLoading(true);
    try {
      await createSOSAlert();
      setShowActionModal(false);
      setTriggered(true);
      startCooldown();
      toast.success("SOS alert sent! Connecting call…", { duration: 3000 });
      setTimeout(() => setTriggered(false), 5000);
      // Open phone dialer — use both methods for reliability
      const telLink = document.createElement("a");
      telLink.href = `tel:${ADMIN_PHONE}`;
      telLink.click();
    } catch (err) {
      if (err.code === "AUTH_EXPIRED") { window.location.href = "/login"; return; }
      toast.error(err.message || "Failed to send SOS");
    } finally {
      setActionLoading(false);
    }
  }, [createSOSAlert, startCooldown]);

  // Handle CHAT with admin
  const handleChatAdmin = useCallback(async () => {
    setActionLoading(true);
    try {
      const alertData = await createSOSAlert();
      const alertId = alertData?.id;

      if (!alertId) {
        toast.error("Failed to create alert");
        setActionLoading(false);
        return;
      }

      // Auto-send an emergency message
      await apiFetch(`/api/alerts/${alertId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: "🚨 EMERGENCY SOS — I need immediate help! Please respond urgently. My location has been shared automatically.",
        }),
      });

      setShowActionModal(false);
      setTriggered(true);
      startCooldown();
      toast.success("Emergency chat started!", { duration: 3000 });
      setTimeout(() => setTriggered(false), 5000);

      // Open chat panel
      setChatAlertId(alertId);
    } catch (err) {
      if (err.code === "AUTH_EXPIRED") { window.location.href = "/login"; return; }
      toast.error(err.message || "Failed to send SOS");
    } finally {
      setActionLoading(false);
    }
  }, [createSOSAlert, startCooldown]);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / 2000, 1);
    setProgress(pct);
    if (pct >= 1) {
      setHolding(false);
      setProgress(0);
      triggerSOS();
      return;
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [triggerSOS]);

  const handleDown = () => {
    if (triggered || sending || cooldown > 0) return;
    if (!locAvailable) {
      toast.error("Enable location to use SOS", { duration: 3000 });
      return;
    }
    setHolding(true);
    startRef.current = Date.now();
    frameRef.current = requestAnimationFrame(animate);
  };

  const handleUp = () => {
    setHolding(false);
    setProgress(0);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  };

  // SVG progress ring
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference * (1 - progress);
  const isDisabled = sending || cooldown > 0;

  return (
    <>
      <RedDots />
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: "40px 20px",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 8 }}
        >
          <Logo size={28} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 48 }}
        >
          Emergency Response System
        </motion.p>

        {/* SOS Button */}
        <motion.div
          className="sos-btn-wrap"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          style={{ marginBottom: 32 }}
        >
          {/* Pulse rings */}
          {!holding && !triggered && cooldown === 0 && (
            <>
              <div className="sos-btn-ring" />
              <div className="sos-btn-ring" />
              <div className="sos-btn-ring" />
            </>
          )}

          {/* Progress ring overlay */}
          {holding && (
            <svg
              width="200" height="200"
              style={{ position: "absolute", top: -20, left: -20, zIndex: 3, transform: "rotate(-90deg)" }}
            >
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,45,45,0.15)" strokeWidth="3" />
              <circle
                cx="100" cy="100" r="90"
                fill="none" stroke="#ff2d2d" strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
          )}

          <button
            className={`sos-btn ${holding ? "holding" : ""}`}
            onMouseDown={handleDown}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchStart={handleDown}
            onTouchEnd={handleUp}
            disabled={isDisabled}
            aria-label="Hold for 2 seconds to send emergency SOS"
            style={{
              background: triggered
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : cooldown > 0
                  ? "linear-gradient(135deg, #404040, #333)"
                  : !locAvailable
                    ? "linear-gradient(135deg, #555, #444)"
                    : undefined,
              animation: triggered || cooldown > 0 || !locAvailable ? "none" : undefined,
              boxShadow: triggered
                ? "0 0 60px rgba(34, 197, 94, 0.3)"
                : holding
                  ? `0 0 ${60 + progress * 80}px rgba(255,45,45,${0.3 + progress * 0.3})`
                  : cooldown > 0
                    ? "none"
                    : undefined,
              cursor: isDisabled || !locAvailable ? "not-allowed" : "pointer",
              opacity: !locAvailable ? 0.5 : 1,
            }}
          >
            {sending ? (
              <div style={{ width: 28, height: 28, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : triggered ? (
              "✓"
            ) : cooldown > 0 ? (
              <span style={{ fontSize: 18 }}>{cooldown}s</span>
            ) : (
              "SOS"
            )}
          </button>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ textAlign: "center" }}
        >
          <p style={{
            fontSize: 14,
            fontWeight: 600,
            color: triggered ? "var(--green)" : cooldown > 0 ? "var(--muted)" : holding ? "var(--red)" : !locAvailable ? "var(--yellow)" : "var(--text2)",
            marginBottom: 8,
            transition: "color 0.3s",
          }}>
            {triggered
              ? "Emergency sent! Help is coming."
              : cooldown > 0
                ? `Cooldown… ${cooldown}s`
                : holding
                  ? `Hold… ${Math.round(progress * 100)}%`
                  : !locAvailable
                    ? "Enable location to activate SOS"
                    : "Hold to activate SOS"}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Choose to call or chat with admin after activation
          </p>
        </motion.div>

        {/* Location Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
        >
          <button
            className="loc-status-btn"
            onClick={handleRefreshLocation}
            disabled={locRefreshing}
            style={{
              background: locAvailable ? "var(--surface)" : "rgba(245,158,11,0.08)",
              borderColor: locAvailable ? "var(--border2)" : "rgba(245,158,11,0.25)",
              color: locAvailable ? "var(--text2)" : "var(--yellow)",
            }}
          >
            <span className={`loc-status-icon ${locRefreshing ? "loc-spinning" : ""}`}>
              {locRefreshing ? "↻" : locAvailable ? "📍" : "⚠️"}
            </span>
            <span className="loc-status-text">{locStatus}</span>
            <span className="loc-status-action">
              {locRefreshing ? "Refreshing…" : locAvailable ? "Tap to refresh" : "Tap to enable"}
            </span>
          </button>
        </motion.div>
      </div>

      {/* ===== ACTION MODAL ===== */}
      <AnimatePresence>
        {showActionModal && (
          <motion.div
            className="sos-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !actionLoading && setShowActionModal(false)}
          >
            <motion.div
              className="sos-modal-sheet"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="modal-handle" />

              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(255,45,45,0.15), rgba(255,100,50,0.08))",
                  border: "2px solid rgba(255,45,45,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", fontSize: 28,
                  boxShadow: "0 0 40px rgba(255,45,45,0.15)",
                }}>
                  🚨
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>
                  How do you want to reach Admin?
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  Your location will be shared automatically with the emergency response team
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* CALL Button */}
                <button
                  className="sos-action-btn sos-action-call"
                  onClick={handleCallAdmin}
                  disabled={actionLoading}
                >
                  <div className="sos-action-icon-wrap sos-action-icon-call">
                    <span style={{ fontSize: 22 }}>📞</span>
                  </div>
                  <div className="sos-action-content">
                    <div className="sos-action-title">Call Admin</div>
                    <div className="sos-action-desc">Direct phone call for urgent voice communication</div>
                  </div>
                  <div className="sos-action-arrow">→</div>
                </button>

                {/* CHAT Button */}
                <button
                  className="sos-action-btn sos-action-chat"
                  onClick={handleChatAdmin}
                  disabled={actionLoading}
                >
                  <div className="sos-action-icon-wrap sos-action-icon-chat">
                    <span style={{ fontSize: 22 }}>💬</span>
                  </div>
                  <div className="sos-action-content">
                    <div className="sos-action-title">Chat with Admin</div>
                    <div className="sos-action-desc">Send emergency message &amp; start live chat</div>
                  </div>
                  <div className="sos-action-arrow">→</div>
                </button>
              </div>

              {/* Loading overlay */}
              {actionLoading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(4px)",
                  borderRadius: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 12,
                  zIndex: 10,
                }}>
                  <div style={{
                    width: 36, height: 36,
                    border: "3px solid rgba(255,255,255,0.15)",
                    borderTopColor: "var(--red)",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>
                    Sending emergency alert…
                  </span>
                </div>
              )}

              {/* Cancel */}
              <button
                className="sos-action-cancel"
                onClick={() => setShowActionModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CHAT PANEL ===== */}
      <AnimatePresence>
        {chatAlertId && (
          <ChatPanel
            alertId={chatAlertId}
            currentUserId={user?.id}
            onClose={() => setChatAlertId(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
