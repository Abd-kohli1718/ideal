import SeverityBadge from "./SeverityBadge";
import AIChip from "./AIChip";

export default function MapPopup({ alert, onAccept, onResolve }) {
  const triage = alert.triage_result;
  return (
    <div style={{ minWidth: 190 }}>
      <div style={{ fontSize: 12, color: "#ccc8e8", lineHeight: 1.5, marginBottom: 8 }}>
        {alert.message}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <SeverityBadge severity={alert.severity} />
        {triage?.response_type && <AIChip responseType={triage.response_type} />}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {alert.status === "active" && (
          <button className="btn btn-accept" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => onAccept?.(alert.id)}>
            <span>Accept</span>
          </button>
        )}
        {(alert.status === "active" || alert.status === "accepted") && (
          <button className="btn btn-resolve" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => onResolve?.(alert.id)}>
            <span>Resolve</span>
          </button>
        )}
      </div>
    </div>
  );
}
