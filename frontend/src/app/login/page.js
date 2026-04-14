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
