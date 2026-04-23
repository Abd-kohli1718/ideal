"use client";

import { motion } from "framer-motion";

export default function StatCard({ number, label, delta, deltaType, index = 0 }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
    >
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
      {delta !== undefined && (
        <div className={`stat-delta ${deltaType === "positive" ? "stat-delta-positive" : "stat-delta-negative"}`}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            background: deltaType === "positive"
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            padding: "2px 6px",
            borderRadius: 6,
            fontSize: 10,
          }}>
            {deltaType === "positive" ? "↑" : "↓"} {delta}
          </span>
        </div>
      )}
    </motion.div>
  );
}
