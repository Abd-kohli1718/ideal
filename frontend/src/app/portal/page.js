"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import Logo from "@/components/Logo";

const ACCESS_CODES = {
  admin: "ADMIN2026",
  responder: "FIELD2026",
};

export default function PortalPage() {
  const router = useRouter();
  const [role, setRole] = useState("responder");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");

  // Access code verification step
  const [step, setStep] = useState("credentials"); // "credentials" | "access_code"
  const [accessCode, setAccessCode] = useState("");
  const [pendingSession, setPendingSession] = useState(null);

  // Check for pending Google OAuth session that needs access code
  useEffect(() => {
    try {
      const pending = localStorage.getItem("resq_pending_oauth");
      if (pending) {
        const parsed = JSON.parse(pending);
        localStorage.removeItem("resq_pending_oauth");
        setPendingSession({
          token: parsed.token,
          user: parsed.user,
          role: parsed.role,
          assignedRole: parsed.role,
        });
        setStep("access_code");
      }
    } catch {}
  }, []);

  const handleAccessCodeVerify = () => {
    const expected = ACCESS_CODES[pendingSession.role];
    if (accessCode.trim().toUpperCase() !== expected) {
      setError("Invalid access code. Contact your department administrator.");
      return;
    }

    // Access code verified — store session and redirect
    const { token, user, assignedRole } = pendingSession;
    localStorage.setItem("resq_token", token);
    localStorage.setItem("resq_user", JSON.stringify(user));
    localStorage.setItem("resq_role", assignedRole);
    document.cookie = `resq_role=${assignedRole}; path=/; max-age=${60 * 60 * 24 * 7}`;
    document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;
    router.push(`/${assignedRole}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) { setError("Please select your role"); return; }
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, full_name: fullName, role }),
        });
        const { user: u, session } = res.data;
        if (session?.access_token) {
          // Move to access code step
          setPendingSession({ token: session.access_token, user: u, role, assignedRole: role });
          setStep("access_code");
          setError("");
        } else {
          setMode("login");
          setError(`Account created! Check your email to confirm, then sign in as ${role}.`);
        }
      } else {
        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const { access_token, user: u } = res.data;
        const assignedRole = u?.user_metadata?.role || role;

        // Move to access code step
        setPendingSession({ token: access_token, user: u, role: assignedRole, assignedRole });
        setStep("access_code");
        setError("");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Access code step UI
  if (step === "access_code") {
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
              Access Verification
            </p>
          </div>

          {/* Security animation */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: 48, marginBottom: 8 }}
            >
              🔐
            </motion.div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Enter {pendingSession?.role === "admin" ? "Admin" : "Responder"} Access Code
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              This code is provided by your department administrator
            </p>
          </div>

          {error && (
            <div style={{
              background: "rgba(255,45,45,0.08)", border: "1px solid rgba(255,45,45,0.2)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#ff6b6b",
            }}>
              {error}
            </div>
          )}

          <input
            className="input"
            type="text"
            placeholder="Enter access code…"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAccessCodeVerify(); }}
            style={{ marginBottom: 16, textAlign: "center", fontSize: 18, letterSpacing: "0.15em", fontWeight: 700 }}
            autoFocus
          />

          <button
            className="btn btn-primary"
            onClick={handleAccessCodeVerify}
            style={{ width: "100%", padding: "14px 20px", fontSize: 14, borderRadius: 14 }}
          >
            Verify & Enter →
          </button>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              onClick={() => { setStep("credentials"); setPendingSession(null); setAccessCode(""); setError(""); }}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
            >
              ← Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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

        <h2 style={{ fontSize: 20, textAlign: "center", marginBottom: 6 }}>
          {mode === "login" ? "Welcome back" : "Create portal account"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginBottom: 20 }}>
          {mode === "login" ? "Sign in to access your operations dashboard" : "Register for official access"}
        </p>

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
          {mode === "signup" && (
            <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginBottom: 12 }} />
          )}
          <input className="input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginBottom: 12 }} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginBottom: 20 }} />
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "14px 20px", fontSize: 14, borderRadius: 14 }}>
            {loading ? "Processing…" : mode === "login" ? `Sign in as ${role || "..."}` : `Register as ${role || "..."}`}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            style={{
              background: "none", border: "none", color: "var(--muted)",
              cursor: "pointer", fontFamily: "inherit", fontSize: 12,
              textDecoration: "underline", textUnderlineOffset: 4,
            }}
          >
            {mode === "login" ? "New staff? Create account" : "Already have an account? Sign in"}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Google Sign-In */}
        <motion.button
          type="button"
          onClick={async () => {
            if (!role) { setError("Please select your role first"); return; }
            try {
              const { getSupabaseBrowser } = await import("@/lib/supabase");
              const supabase = getSupabaseBrowser();
              localStorage.setItem("resq_oauth_role", role);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                },
              });
              if (error) setError(error.message);
            } catch (err) {
              setError(err.message || "Google sign-in failed");
            }
          }}
          style={{
            width: "100%", padding: "12px 20px", fontSize: 13, fontWeight: 600,
            borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text)", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google as {role || "..."}
        </motion.button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            ← Back to Citizen Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
