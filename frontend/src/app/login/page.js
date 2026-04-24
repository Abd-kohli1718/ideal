"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";
import AnimatedBackground from "@/components/AnimatedBackground";


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
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();

      if (mode === "signup") {
        // Sign up via Supabase client
        const { data, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || null, role: "citizen" },
          },
        });

        if (signupErr) {
          if (signupErr.message?.includes("already registered")) {
            setError("An account with this email already exists. Please sign in.");
            setMode("login");
          } else {
            setError(signupErr.message);
          }
          return;
        }

        const session = data?.session;
        const user = data?.user;

        if (session?.access_token) {
          localStorage.setItem("resq_token", session.access_token);
          localStorage.setItem("resq_refresh_token", session.refresh_token || "");
          localStorage.setItem("resq_user", JSON.stringify(user));
          localStorage.setItem("resq_role", "citizen");
          document.cookie = `resq_role=citizen; path=/; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;

          // Sync user to backend
          try {
            await apiFetch("/api/auth/oauth-sync", {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ role: "citizen" }),
            });
          } catch {}

          router.push("/centre");
        } else {
          setMode("login");
          setError("Account created! Check your email to confirm, then sign in.");
        }
      } else {
        // Login via Supabase client
        const { data, error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginErr) {
          if (loginErr.message?.includes("Invalid login")) {
            setError("Invalid email or password. If you signed up with Google, use the Google button below.");
          } else {
            setError(loginErr.message);
          }
          return;
        }

        const session = data?.session;
        const user = data?.user;
        const userRole = user?.user_metadata?.role || "citizen";

        localStorage.setItem("resq_token", session.access_token);
        localStorage.setItem("resq_refresh_token", session.refresh_token || "");
        localStorage.setItem("resq_user", JSON.stringify(user));
        localStorage.setItem("resq_role", userRole);
        document.cookie = `resq_role=${userRole}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `resq_authed=1; path=/; max-age=${60 * 60 * 24 * 7}`;

        // Sync user to backend
        try {
          await apiFetch("/api/auth/oauth-sync", {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ role: userRole }),
          });
        } catch {}

        router.push(userRole === "citizen" ? "/centre" : `/${userRole}`);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="login-bg" />
      <AnimatedBackground />

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
            try {
              const { getSupabaseBrowser } = await import("@/lib/supabase");
              const supabase = getSupabaseBrowser();
              localStorage.setItem("resq_oauth_role", "citizen");
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
            width: "100%",
            padding: "12px 20px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.2s",
          }}
          whileHover={{ scale: 1.01, borderColor: "var(--text2)" }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </motion.button>

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
