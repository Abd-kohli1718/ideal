"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

export default function SOSButton({ onTrigger }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const startRef = useRef(null);
  const frameRef = useRef(null);
  const holdingRef = useRef(false);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / 2000, 1);
    setProgress(pct);
    if (pct >= 1) {
      holdingRef.current = false;
      setHolding(false);
      setProgress(0);
      setTriggered(true);
      onTrigger?.();
      setTimeout(() => setTriggered(false), 2000);
      return;
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [onTrigger]);

  const handleDown = (e) => {
    // If holding already started, ignore
    if (holdingRef.current) return;
    holdingRef.current = true;
    setHolding(true);
    startRef.current = Date.now();
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);
  };

  const handleUp = () => {
    holdingRef.current = false;
    setHolding(false);
    setProgress(0);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  };

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        padding: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow when holding */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(circle at center, rgba(239, 68, 68, ${0.08 * progress}) 0%, transparent 70%)`,
        transition: "background 0.1s",
        pointerEvents: "none",
      }} />

      <span style={{
        fontSize: 10,
        textTransform: "uppercase",
        color: "var(--muted)",
        fontWeight: 600,
        letterSpacing: "0.08em",
        position: "relative",
      }}>
        Emergency SOS
      </span>

      {/* Pulsing rings */}
      <div style={{ position: "relative" }}>
        {/* Outer pulse ring (animated) */}
        {!holding && (
          <div style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            border: "1px solid rgba(239, 68, 68, 0.08)",
            animation: "pulse-ring 3s ease-out infinite",
          }} />
        )}

        <div className="sos-ring sos-ring-outer" style={{
          boxShadow: holding
            ? `0 0 ${40 * progress}px rgba(239,68,68,${0.25 * progress}), 0 0 ${80 * progress}px rgba(239,68,68,${0.1 * progress})`
            : "none",
          transition: "box-shadow 0.15s",
        }}>
          <div className="sos-ring sos-ring-mid">
            <div className="sos-ring sos-ring-inner">
              <button
                className="sos-btn"
                onMouseDown={handleDown}
                onMouseUp={handleUp}
                onMouseLeave={handleUp}
                onTouchStart={(e) => {
                  // Prevent touch scroll / context menu
                  if (e.cancelable) e.preventDefault();
                  handleDown(e);
                }}
                onTouchEnd={handleUp}
                onContextMenu={(e) => { e.preventDefault(); return false; }}
                style={{
                  animation: holding ? "none" : undefined,
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  touchAction: "none"
                }}
              >
                <span>{triggered ? "✓" : "SOS"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 100,
        height: 3,
        background: "var(--surface2)",
        borderRadius: 2,
        overflow: "hidden",
        opacity: holding ? 1 : 0.3,
        transition: "opacity 0.3s",
      }}>
        <motion.div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg, #ef4444, #dc2626)",
            borderRadius: 2,
          }}
          transition={{ duration: 0.05 }}
        />
      </div>

      <span style={{
        fontSize: 10,
        color: "var(--muted)",
        textAlign: "center",
        lineHeight: 1.6,
        position: "relative",
      }}>
        Hold 2 seconds · shares your location with nearest responder
      </span>
    </motion.div>
  );
}
