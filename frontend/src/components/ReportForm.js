"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      style={{ padding: 18 }}
    >
      <div style={{
        fontSize: 11,
        color: "var(--muted)",
        marginBottom: 14,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <span style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: "var(--purple)",
          display: "inline-block",
        }} />
        Report an incident
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          className="input"
          placeholder="Describe the emergency..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ marginBottom: 12, minHeight: 80 }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
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

        <motion.button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          style={{ width: "100%", marginBottom: 10, padding: "11px 18px" }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <span>{loading ? "Submitting…" : "Submit Report"}</span>
        </motion.button>
      </form>

      <motion.button
        className="btn btn-ghost"
        onClick={onSimulate}
        disabled={loading}
        style={{ width: "100%" }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>⚡ Simulate social post</span>
      </motion.button>
    </motion.div>
  );
}
