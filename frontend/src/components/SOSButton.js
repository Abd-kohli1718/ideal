"use client";

import { useRef, useState, useCallback } from "react";

export default function SOSButton({ onTrigger }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  const animate = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / 2000, 1);
    setProgress(pct);
    if (pct >= 1) {
      setHolding(false);
      setProgress(0);
      onTrigger?.();
      return;
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [onTrigger]);

  const handleDown = () => {
    setHolding(true);
    startRef.current = Date.now();
    frameRef.current = requestAnimationFrame(animate);
  };

  const handleUp = () => {
    setHolding(false);
    setProgress(0);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", color: "var(--muted)", fontWeight: 500, letterSpacing: "0.06em" }}>
        Emergency SOS
      </span>

      <div className="sos-ring sos-ring-outer" style={{
        boxShadow: holding ? `0 0 ${30 * progress}px rgba(239,68,68,${0.2 * progress})` : "none",
        transition: "box-shadow 0.3s",
      }}>
        <div className="sos-ring sos-ring-mid">
          <div className="sos-ring sos-ring-inner">
            <button
              className="sos-btn"
              onMouseDown={handleDown}
              onMouseUp={handleUp}
              onMouseLeave={handleUp}
              onTouchStart={handleDown}
              onTouchEnd={handleUp}
            >
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>

      {holding && (
        <div style={{ width: 80, height: 3, background: "var(--surface2)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${progress * 100}%`, height: "100%", background: "#ef4444", borderRadius: 2, transition: "width 0.05s linear" }} />
        </div>
      )}

      <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
        Hold 2 seconds · shares your location with nearest responder
      </span>
    </div>
  );
}
