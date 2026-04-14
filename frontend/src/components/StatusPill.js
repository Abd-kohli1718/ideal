export default function StatusPill({ status }) {
  const s = status || "active";
  return (
    <span className={`status-pill status-pill-${s}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}
