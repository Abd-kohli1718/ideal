"use client";

import { useState } from "react";

export default function ReportForm({ onSubmit, onSimulate, loading }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("manual_form");
  const [location, setLocation] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSubmit?.({ message: message.trim(), type, location: location.trim() });
    setMessage("");
    setLocation("");
  };

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, fontWeight: 500 }}>
        Report an incident
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          className="input"
          placeholder="Describe the emergency..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 10 }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="manual_form">Manual report</option>
            <option value="sos_button">SOS</option>
            <option value="social_post">Social post</option>
          </select>
          <input
            className="input"
            placeholder="Location hint"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginBottom: 8 }}>
          <span>{loading ? "Submitting…" : "Submit Report"}</span>
        </button>
      </form>

      <button
        className="btn btn-ghost"
        onClick={onSimulate}
        disabled={loading}
        style={{ width: "100%" }}
      >
        <span>Simulate social post</span>
      </button>
    </div>
  );
}
