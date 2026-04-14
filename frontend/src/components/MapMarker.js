export default function MapMarker({ severity }) {
  const sev = severity || "low";
  return (
    <div className={`map-marker-ring map-marker-ring-${sev}`}>
      <div className={`map-marker-dot map-marker-dot-${sev}`} />
    </div>
  );
}
