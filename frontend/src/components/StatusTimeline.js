"use client";

export default function StatusTimeline({ status }) {
  const steps = [
    { id: "submitted", label: "Report submitted", icon: "📝" },
    { id: "accepted", label: "Accepted by responder", icon: "✓" },
    { id: "onway", label: "Responder on the way", icon: "🚨" },
    { id: "resolved", label: "Resolved", icon: "✅" },
  ];

  const statusOrder = { active: 0, accepted: 1, onway: 2, resolved: 3 };
  const currentIdx = statusOrder[status] ?? 0;

  return (
    <div style={{ padding: "8px 0" }}>
      {steps.map((step, i) => {
        const isDone = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.id} className="timeline-item">
            <div className={`timeline-dot ${isDone ? "done" : ""} ${isCurrent ? "active" : ""}`}>
              {step.icon}
            </div>
            <div style={{ paddingTop: 2 }}>
              <div style={{ fontSize: 13, fontWeight: isDone ? 600 : 400, color: isDone ? "var(--text)" : "var(--muted)" }}>
                {step.label}
              </div>
              {isCurrent && (
                <div style={{ fontSize: 11, color: "var(--red)", marginTop: 2 }}>Current status</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
