const ICONS = {
  ambulance: "🚑",
  fire: "🔥",
  police: "🚔",
  rescue: "🛟",
  unknown: "❓",
};

export default function AIChip({ responseType }) {
  const type = responseType || "unknown";
  return (
    <span className="ai-chip">
      {ICONS[type] || "❓"} {type}
    </span>
  );
}
