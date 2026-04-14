export default function StatCard({ number, label, delta, deltaType }) {
  return (
    <div className="stat-card">
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
      {delta !== undefined && (
        <div className={`stat-delta ${deltaType === "positive" ? "stat-delta-positive" : "stat-delta-negative"}`}>
          {deltaType === "positive" ? "↑" : "↓"} {delta}
        </div>
      )}
    </div>
  );
}
