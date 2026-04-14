"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Logo from "@/components/Logo";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const CanvasRevealEffect = dynamic(() => import("@/components/CanvasRevealEffect"), {
  ssr: false,
});

const ROLES = [
  { value: "citizen", label: "Citizen", icon: "👤", desc: "Report emergencies" },
  { value: "responder", label: "Responder", icon: "🚒", desc: "Respond to alerts" },
  { value: "admin", label: "Admin", icon: "⚙️", desc: "Monitor & manage" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("citizen");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      localStorage.setItem("resq_oauth_role", role); // Save selected role for callback
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message || "Google login failed");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    setLoading(true);
    try {
      let userRole;
      if (mode === "login") {
        userRole = await login(email, password);
      } else {
        userRole = await signup(email, password, fullName, role);
      }
      toast.success(mode === "login" ? "Signed in!" : "Account created!");
      router.push(`/${userRole}`);
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrap">
      {/* Animated Background */}
      <div className="login-canvas-bg">
        <CanvasRevealEffect
          animationSpeed={3}
          colors={[
            [124, 109, 240],
            [92, 79, 214],
          ]}
          dotSize={5}
          reverse={false}
        />
        <div className="login-radial-overlay" />
        <div className="login-top-fade" />
      </div>

      {/* Content */}
      <div className="login-content-layer">
        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="login-form-container"
            >
              {/* Logo */}
              <div className="login-logo-section">
                <Logo size={36} />
                <div className="login-tagline">Centralised Emergency Response</div>
              </div>

              {/* Heading */}
              <div className="login-heading-section">
                <h1 className="login-title">Welcome back</h1>
                <p className="login-subtitle">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                {/* Email */}
                <div className={`login-input-wrap ${focusedField === "email" ? "focused" : ""}`}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className={`login-input-wrap ${focusedField === "password" ? "focused" : ""}`}>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="current-password"
                  />
                </div>

                {/* Role Selector */}
                <div className="login-role-section">
                  <div className="login-role-label">Sign in as</div>
                  <div className="login-role-grid">
                    {ROLES.map((r) => (
                      <motion.div
                        key={r.value}
                        className={`login-role-card ${role === r.value ? "selected" : ""}`}
                        onClick={() => setRole(r.value)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="login-role-icon">{r.icon}</div>
                        <div className="login-role-name">{r.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{loading ? "Please wait…" : "Sign in"}</span>
                  {!loading && (
                    <span className="login-btn-arrow">
                      <span className="login-btn-arrow-inner">→</span>
                    </span>
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <div className="login-divider-line" />
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn btn-resolve"
                style={{ width: "100%", marginBottom: 20, padding: "10px 0", fontSize: 13 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Toggle */}
              <div className="login-toggle">
                <span className="login-toggle-muted">New to ResQ? </span>
                <motion.button
                  onClick={() => setMode("signup")}
                  className="login-toggle-btn"
                  whileHover={{ scale: 1.05 }}
                >
                  Create an account
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="login-form-container"
            >
              {/* Logo */}
              <div className="login-logo-section">
                <Logo size={36} />
                <div className="login-tagline">Centralised Emergency Response</div>
              </div>

              {/* Heading */}
              <div className="login-heading-section">
                <h1 className="login-title">Join ResQ</h1>
                <p className="login-subtitle">Create your account</p>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                {/* Full name */}
                <div className={`login-input-wrap ${focusedField === "name" ? "focused" : ""}`}>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                {/* Email */}
                <div className={`login-input-wrap ${focusedField === "email" ? "focused" : ""}`}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className={`login-input-wrap ${focusedField === "password" ? "focused" : ""}`}>
                  <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="new-password"
                  />
                </div>

                {/* Role Selector */}
                <div className="login-role-section">
                  <div className="login-role-label">I am a</div>
                  <div className="login-role-grid">
                    {ROLES.map((r) => (
                      <motion.div
                        key={r.value}
                        className={`login-role-card ${role === r.value ? "selected" : ""}`}
                        onClick={() => setRole(r.value)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="login-role-icon">{r.icon}</div>
                        <div className="login-role-name">{r.label}</div>
                        <div className="login-role-desc">{r.desc}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="login-submit-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{loading ? "Please wait…" : "Create account"}</span>
                  {!loading && (
                    <span className="login-btn-arrow">
                      <span className="login-btn-arrow-inner">→</span>
                    </span>
                  )}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="login-divider">
                <div className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <div className="login-divider-line" />
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="btn btn-resolve"
                style={{ width: "100%", marginBottom: 20, padding: "10px 0", fontSize: 13 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Toggle */}
              <div className="login-toggle">
                <span className="login-toggle-muted">Already have an account? </span>
                <motion.button
                  onClick={() => setMode("login")}
                  className="login-toggle-btn"
                  whileHover={{ scale: 1.05 }}
                >
                  Sign in
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
