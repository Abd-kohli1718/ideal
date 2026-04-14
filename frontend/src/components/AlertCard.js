"use client";

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
    <div className="alert-card" style={{ paddingLeft: 18 }}>
      <div className={`alert-card-border alert-card-border-${sev}`} />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "capitalize" }}>
            {(alert.type || "").replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: 10, color: "var(--faint)" }}>·</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{timeAgo(alert.created_at)}</span>
        </div>
        <SeverityBadge severity={sev} />
      </div>

      {/* Message */}
      <div style={{ fontSize: 12, color: "#ccc8e8", lineHeight: 1.5, marginBottom: 8 }}>
        {alert.message}
      </div>

      {/* Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {triage?.response_type && <AIChip responseType={triage.response_type} />}
        {triage?.is_duplicate && <DuplicateChip />}
        <StatusPill status={alert.status} />
      </div>

      {/* Actions */}
      {showActions && (alert.status === "active" || alert.status === "accepted") && (
        <div style={{ display: "flex", gap: 6 }}>
          {alert.status === "active" && onAccept && (
            <button className="btn btn-accept" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => onAccept(alert.id)}>
              <span>Accept</span>
            </button>
          )}
          {onResolve && (
            <button className="btn btn-resolve" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => onResolve(alert.id)}>
              <span>Resolve</span>
            </button>
          )}
        </div>
      )}

      {/* Coordinates */}
      {alert.latitude && (
        <div className="tabular-nums" style={{ fontSize: 9, color: "var(--faint)", marginTop: 6 }}>
          {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}
        </div>
      )}
    </div>
  );
}
