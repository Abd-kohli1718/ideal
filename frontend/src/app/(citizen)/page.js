"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import Logo from "@/components/Logo";
import toast from "react-hot-toast";

const SOS_COOLDOWN_MS = 30000;

export default function SOSHomePage() {
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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLocStatus(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setLocAvailable(true);
        },
        () => { setLocStatus("Location unavailable — enable GPS for SOS"); setLocAvailable(false); }
      );
    } else { setLocStatus("Geolocation not supported"); setLocAvailable(false); }
  }, []);

  useEffect(() => { return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }; }, []);

  const startCooldown = useCallback(() => {
    setCooldown(SOS_COOLDOWN_MS / 1000);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => { if (c <= 1) { clearInterval(cooldownRef.current); return 0; } return c - 1; });
    }, 1000);
  }, []);

  const triggerSOS = useCallback(async () => {
    if (!locAvailable || !userPos) { toast.error("Location required for SOS.", { duration: 4000 }); return; }
    setSending(true);
    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({ type: "sos_button", message: "SOS Emergency — Immediate help needed",
          latitude: userPos.latitude, longitude: userPos.longitude }),
      });
      setTriggered(true);
      toast.success("Emergency SOS sent! Help is on the way.", { duration: 4000 });
      startCooldown();
      setTimeout(() => setTriggered(false), 5000);
    } catch (err) {
      if (err.code === "AUTH_EXPIRED") { window.location.href = "/login"; return; }
      toast.error(err.message || "Failed to send SOS");
    } finally { setSending(false); }
  }, [userPos, locAvailable, startCooldown]);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / 2000, 1);
    setProgress(pct);
    if (pct >= 1) { setHolding(false); setProgress(0); triggerSOS(); return; }
    frameRef.current = requestAnimationFrame(animate);
  }, [triggerSOS]);

  const handleDown = () => {
    if (triggered || sending || cooldown > 0) return;
    if (!locAvailable) { toast.error("Enable location to use SOS", { duration: 3000 }); return; }
    setHolding(true); startRef.current = Date.now(); frameRef.current = requestAnimationFrame(animate);
  };
  const handleUp = () => { setHolding(false); setProgress(0); if (frameRef.current) cancelAnimationFrame(frameRef.current); };

  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference * (1 - progress);
  const isDisabled = sending || cooldown > 0;

  return (
    <>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        flex: 1, padding: "40px 20px", position: "relative", zIndex: 1,
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
            Shares your location with nearest emergency responder
          </p>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: locAvailable ? "var(--surface)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${locAvailable ? "var(--border)" : "rgba(245,158,11,0.2)"}`,
            borderRadius: 20,
            fontSize: 11,
            color: locAvailable ? "var(--muted)" : "var(--yellow)",
          }}
        >
          <span>{locAvailable ? "📍" : "⚠️"}</span>
          <span>{locStatus}</span>
        </motion.div>
      </div>
    </>
  );
}
