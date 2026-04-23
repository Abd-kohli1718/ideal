"use client";

const HELPLINES = [
  { name: "National Emergency", number: "112", icon: "🚨", desc: "All emergencies" },
  { name: "Police", number: "100", icon: "👮", desc: "Crime, law & order" },
  { name: "Fire Brigade", number: "101", icon: "🚒", desc: "Fire emergencies" },
  { name: "Ambulance", number: "102 / 108", icon: "🚑", desc: "Medical emergencies" },
  { name: "Women Helpline", number: "1091 / 181", icon: "🛡️", desc: "Women safety" },
  { name: "Child Helpline", number: "1098", icon: "👶", desc: "Child in distress" },
  { name: "Disaster (NDMA)", number: "1078", icon: "🌊", desc: "Natural disasters" },
  { name: "Road Accident", number: "1073", icon: "🚗", desc: "Road accidents" },
  { name: "Mental Health", number: "9999 666 555", icon: "🧠", desc: "Vandrevala Foundation" },
  { name: "Anti-Poison", number: "1066", icon: "☠️", desc: "Poisoning emergencies" },
];

export default function HelplineSection() {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Emergency Helplines</h3>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>India — tap to call</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {HELPLINES.map((h) => (
          <a
            key={h.number}
            href={`tel:${h.number.replace(/\s*\/\s*/g, "").replace(/\s/g, "")}`}
            className="helpline-card"
            style={{ textDecoration: "none" }}
          >
            <span style={{ fontSize: 24 }}>{h.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{h.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{h.desc}</div>
            </div>
            <span className="helpline-number">{h.number}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
