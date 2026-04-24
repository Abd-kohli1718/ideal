"use client";

import { motion } from "framer-motion";

const SHAPES = [
  { w: 500, h: 120, rotate: 12, x: "-8%", y: "18%", color: "rgba(255,45,45,0.07)", delay: 0.3 },
  { w: 400, h: 100, rotate: -15, x: "75%", y: "72%", color: "rgba(255,80,80,0.06)", delay: 0.5 },
  { w: 280, h: 70, rotate: -8, x: "8%", y: "82%", color: "rgba(255,120,60,0.05)", delay: 0.4 },
  { w: 180, h: 50, rotate: 20, x: "78%", y: "12%", color: "rgba(255,45,45,0.06)", delay: 0.6 },
  { w: 140, h: 35, rotate: -25, x: "22%", y: "8%", color: "rgba(255,100,100,0.04)", delay: 0.7 },
  { w: 220, h: 55, rotate: 8, x: "55%", y: "45%", color: "rgba(255,60,60,0.03)", delay: 0.8 },
];

function FloatingShape({ w, h, rotate, x, y, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 2.4, delay, ease: [0.23, 0.86, 0.39, 0.96], opacity: { duration: 1.2 } }}
      style={{ position: "absolute", left: x, top: y }}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: w, height: h, position: "relative" }}
      >
        <div style={{
          position: "absolute", inset: 0, borderRadius: 9999,
          background: `linear-gradient(135deg, ${color}, transparent)`,
          backdropFilter: "blur(2px)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: `0 8px 32px 0 ${color}`,
        }} />
        {/* Inner glow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 9999,
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 70%)",
        }} />
      </motion.div>
    </motion.div>
  );
}

export default function AnimatedBackground() {
  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      pointerEvents: "none", zIndex: 0,
    }}>
      {/* Base gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,30,30,0.06) 0%, transparent 60%)",
      }} />
      
      {/* Floating shapes */}
      {SHAPES.map((s, i) => (
        <FloatingShape key={i} {...s} />
      ))}

      {/* Top/bottom fade */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(5,5,5,0.8) 0%, transparent 15%, transparent 85%, rgba(5,5,5,0.9) 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
