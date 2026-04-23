"use client";

import { motion } from "framer-motion";
import SeverityBadge from "./SeverityBadge";
import StatusPill from "./StatusPill";
import AIChip from "./AIChip";
import DuplicateChip from "./DuplicateChip";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertCard({ alert, onAccept, onResolve, showActions = true }) {
  const triage = alert.triage_result;
  const sev = triage?.severity || alert.severity || "low";

  return (
    <motion.div
      className="alert-card"
      style={{ paddingLeft: 20 }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ x: 3 }}
    >
      <div className={`alert-card-border alert-card-border-${sev}`} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize", fontWeight: 500 }}>
            {(alert.type || "").replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: 10, color: "var(--faint)" }}>·</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(alert.created_at)}</span>
        </div>
        <SeverityBadge severity={sev} />
      </div>

      {/* Message */}
      <div style={{
        fontSize: 12,
        color: "var(--text2)",
        lineHeight: 1.6,
        marginBottom: 10,
      }}>
        {alert.message}
      </div>

      {/* Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {triage?.response_type && <AIChip responseType={triage.response_type} />}
        {triage?.is_duplicate && <DuplicateChip />}
        <StatusPill status={alert.status} />
      </div>

      {/* Actions */}
      {showActions && (alert.status === "active" || alert.status === "accepted") && (
        <div style={{ display: "flex", gap: 8 }}>
          {alert.status === "active" && onAccept && (
            <motion.button
              className="btn btn-accept"
              style={{ fontSize: 11, padding: "7px 14px" }}
              onClick={() => onAccept(alert.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>✓ Accept</span>
            </motion.button>
          )}
          {onResolve && (
            <motion.button
              className="btn btn-resolve"
              style={{ fontSize: 11, padding: "7px 14px" }}
              onClick={() => onResolve(alert.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>Resolve</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Coordinates */}
      {alert.latitude && (
        <div className="tabular-nums" style={{
          fontSize: 9,
          color: "var(--faint)",
          marginTop: 8,
          fontFamily: "monospace",
        }}>
          📍 {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}
        </div>
      )}
    </motion.div>
  );
}
