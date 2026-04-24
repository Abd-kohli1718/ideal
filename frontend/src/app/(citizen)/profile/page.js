"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import HelplineSection from "@/components/HelplineSection";
import AudioRecorder from "@/components/AudioRecorder";
import Logo from "@/components/Logo";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Citizen";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleAudioSOS = async (blob) => {
    // For now, send text-based SOS with audio indicator
    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          type: "audio_sos",
          message: "Voice SOS recorded — audio emergency alert",
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });
      toast.success("Voice SOS sent!");
    } catch (err) {
      toast.error(err.message || "Failed to send voice SOS");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "resq_role=; path=/; max-age=0";
    document.cookie = "resq_authed=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <div style={{ padding: "16px 16px 20px", maxWidth: 500, margin: "0 auto" }}>
      {/* Profile header */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: 24, textAlign: "center", marginBottom: 20 }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--accent-gradient)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "#fff",
          margin: "0 auto 12px",
        }}>
          {initials}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{user?.email}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          marginTop: 10, padding: "4px 12px",
          background: "var(--red-soft)", border: "1px solid rgba(255,45,45,0.2)",
          borderRadius: 20, fontSize: 11, fontWeight: 600, color: "var(--red)",
        }}>
          Citizen
        </div>
      </motion.div>

      {/* Voice SOS */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ padding: 24, marginBottom: 20 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>Voice SOS</h3>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, textAlign: "center" }}>
          Record a voice message for emergency responders
        </p>
        <AudioRecorder onRecorded={handleAudioSOS} />
      </motion.div>

      {/* Helplines */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ padding: 20, marginBottom: 20 }}
      >
        <HelplineSection />
      </motion.div>

      {/* Nearby Facilities */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ padding: 20, marginBottom: 20 }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>📍 Nearby Emergency Services</h3>
        {[
          { icon: "🏥", name: "Victoria Hospital", dist: "2.1 km", detail: "24/7 Emergency, Trauma Center" },
          { icon: "🏥", name: "Manipal Hospital", dist: "4.3 km", detail: "Multi-specialty, ICU available" },
          { icon: "🏥", name: "St. John's Medical College", dist: "5.7 km", detail: "Burns unit, Pediatric emergency" },
          { icon: "👮", name: "Ashok Nagar Police Station", dist: "1.8 km", detail: "PCR Van, Women helpdesk" },
          { icon: "👮", name: "Koramangala Police Station", dist: "3.2 km", detail: "24/7, Cybercrime cell" },
          { icon: "🚒", name: "MG Road Fire Station", dist: "2.5 km", detail: "3 fire tenders, Rescue unit" },
          { icon: "🚒", name: "Jayanagar Fire Station", dist: "4.1 km", detail: "2 fire tenders, Hazmat team" },
        ].map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
            borderBottom: i < 6 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ fontSize: 20, width: 30, textAlign: "center" }}>{f.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{f.detail}</div>
            </div>
            <span style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600,
              background: "var(--surface2)", color: "var(--text2)",
            }}>{f.dist}</span>
          </div>
        ))}
      </motion.div>

      {/* About + Logout */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: "center" }}
      >
        <div style={{ marginBottom: 16 }}>
          <Logo size={20} />
          <p style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>Smart Emergency Response v2.0</p>
        </div>
        <button className="btn btn-ghost" onClick={handleLogout} style={{ width: "100%" }}>
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
