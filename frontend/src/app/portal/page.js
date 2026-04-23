"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import Logo from "@/components/Logo";

export default function PortalPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) { setError("Please select your role"); return; }
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const { access_token, refresh_token, user: u } = res.data;
      // M3: Use actual role from JWT, not the UI selection
      const actualRole = u?.user_metadata?.role || "citizen";
      if (actualRole !== role) {
        setError(`Your account role is "${actualRole}", not "${role}". Please select the correct role.`);
        setLoading(false);
        return;
      }
      localStorage.setItem("resq_token", access_token);
      localStorage.setItem("resq_user", JSON.stringify(u));
      localStorage.setItem("resq_role", actualRole);
      if (refresh_token) localStorage.setItem("resq_refresh_token", refresh_token);
      document.cookie = `resq_role=${actualRole}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;
      router.push(actualRole === "citizen" ? "/centre" : `/${actualRole}`);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg)" }}>
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: 420 }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo size={32} />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Command Portal
          </p>
        </div>

        <h2 style={{ fontSize: 20, textAlign: "center", marginBottom: 20 }}>Select your role</h2>

        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { value: "admin", icon: "🛡️", label: "Admin", desc: "Command Center" },
            { value: "responder", icon: "🚒", label: "Responder", desc: "Field Operations" },
          ].map((r) => (
            <motion.div
              key={r.value}
              className={`portal-role-card ${role === r.value ? "selected" : ""}`}
              onClick={() => setRole(r.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{r.desc}</div>
            </motion.div>
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(255,45,45,0.08)", border: "1px solid rgba(255,45,45,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#ff6b6b" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginBottom: 12 }} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginBottom: 20 }} />
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "14px 20px", fontSize: 14, borderRadius: 14 }}>
            {loading ? "Signing in…" : `Sign in as ${role || "..."}`}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            ← Back to Citizen Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
