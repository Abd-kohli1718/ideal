"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";

function RedDots() {
  const dots = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 4,
      size: 2 + Math.random() * 3,
    }))
  ).current;

  return (
    <div className="emergency-bg">
      {dots.map((d) => (
        <div
          key={d.id}
          className="emergency-dot"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && role) {
      router.replace(role === "citizen" ? "/centre" : `/${role}`);
    }
  }, [user, role, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, full_name: fullName, role: "citizen" }),
        });
        const { user: u, session } = res.data;
        if (session?.access_token) {
          localStorage.setItem("resq_token", session.access_token);
          localStorage.setItem("resq_user", JSON.stringify(u));
          localStorage.setItem("resq_role", "citizen");
          document.cookie = `resq_role=citizen; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;
          router.push("/centre");
        } else {
          setMode("login");
          setError("Account created! Check your email to confirm, then sign in.");
        }
      } else {
        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const { access_token, user: u } = res.data;
        const userRole = u?.user_metadata?.role || "citizen";
        localStorage.setItem("resq_token", access_token);
        localStorage.setItem("resq_user", JSON.stringify(u));
        localStorage.setItem("resq_role", userRole);
        document.cookie = `resq_role=${userRole}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;
        router.push(userRole === "citizen" ? "/centre" : `/${userRole}`);
      }
    } catch (err) {
      if (err.code === "AUTH_EXPIRED") return;
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="login-bg" />
      <RedDots />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 10 }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo size={36} />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Smart Emergency Response
          </p>
        </div>

        <h2 style={{ fontSize: 22, textAlign: "center", marginBottom: 6 }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginBottom: 24 }}>
          {mode === "login" ? "Sign in to your account" : "Join the emergency network"}
        </p>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: "rgba(255,45,45,0.08)",
                border: "1px solid rgba(255,45,45,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: "#ff6b6b",
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginBottom: 12 }}>
              <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </motion.div>
          )}
          <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginBottom: 12 }} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginBottom: 20 }} />

          <motion.button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px 20px", fontSize: 14, borderRadius: 14 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : (
              mode === "login" ? "Sign in" : "Create account"
            )}
          </motion.button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
          {mode === "login" ? "New to ResQ? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit", fontSize: 13 }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => router.push("/portal")}
            style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: 10, padding: "8px 16px",
              color: "var(--muted)", cursor: "pointer",
              fontFamily: "inherit", fontSize: 11, fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            Admin / Responder Portal →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
