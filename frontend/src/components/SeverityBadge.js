export default function SeverityBadge({ severity }) {
  const sev = severity || "low";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span className={`sev-dot sev-dot-${sev}`} />
      <span className={`sev-text-${sev}`} style={{ fontSize: 11, fontWeight: 500, textTransform: "capitalize" }}>
        {sev}
      </span>
    </span>
  );
}
