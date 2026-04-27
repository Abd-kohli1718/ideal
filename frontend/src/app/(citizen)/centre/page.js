"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";
import FilterPills from "@/components/FilterPills";
import toast from "react-hot-toast";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "🔴 Critical", value: "high" },
  { label: "🟡 Medium", value: "medium" },
  { label: "🟢 Low", value: "low" },
];

// Deterministic votes from alert ID (only for simulated posts)
function hashVotes(id) {
  if (!id) return 0;
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = ((h << 5) - h + String(id).charCodeAt(i)) | 0;
  return Math.abs(h % 478) + 3;
}
function hashComments(id) {
  if (!id) return 0;
  let h = 7;
  for (let i = 0; i < String(id).length; i++) h = ((h << 3) + h + String(id).charCodeAt(i)) | 0;
  return Math.abs(h % 32);
}

export default function CentrePage() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("resq_user");
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch {}
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      const alerts = res.data?.alerts || [];
      setPosts(alerts.map((a) => {
        let msg = a.message || "";
        let media_url = null;
        let media_type = "image";
        const m = msg.match(/\[MEDIA:(.*?)\]/);
        if (m) { media_url = m[1]; msg = msg.replace(m[0], "").trim(); }
        if (media_url?.includes(".mp4")) media_type = "video";
        else if (media_url?.includes("audio")) media_type = "audio";

        // Check if this is a simulated post (has [MEDIA:] tag with unsplash URL = simulated)
        const isSimulated = a.type === "social_post" && media_url && media_url.includes("unsplash.com");
        // Check if this is user's own post
        const isOwnPost = currentUser && a.user_id === currentUser.id;

        return {
          id: a.id, caption: msg,
          severity: a.triage_result?.severity || a.severity || "low",
          type: a.type,
          // Show location only if available, don't fake it
          location: a.latitude ? `${Number(a.latitude).toFixed(3)}, ${Number(a.longitude).toFixed(3)}` : null,
          locationOff: !a.latitude,
          // Simulated posts get hash votes, user posts start fresh at 0
          votes: isSimulated ? hashVotes(a.id) : 0,
          comments: isSimulated ? hashComments(a.id) : 0,
          created_at: a.created_at, media_url, media_type,
          isSimulated,
          isOwnPost,
          user_id: a.user_id,
          sender_name: a.user_name || null,
        };
      }));
    } catch { setPosts([]); }
  }, [currentUser]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleVote = (id) => {
    setVotedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setPosts(prev => prev.map(p => p.id === id ? { ...p, votes: p.votes + (votedIds.has(id) ? -1 : 1) } : p));
  };

  const handleCreatePost = async ({ caption, type, media, audio }) => {
    try {
      let msg = caption || "";
      const tid = toast.loading("Posting...");

      // Get user's real location
      let latitude = null;
      let longitude = null;

      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Location not available — that's okay, we won't fake it
      }

      if (media || audio) {
        try {
          const { getSupabaseBrowser } = await import("@/lib/supabase");
          const sb = getSupabaseBrowser();
          const f = media || audio;
          const ext = media ? (media.name.split('.').pop() || 'jpg') : 'webm';
          const p = `${media ? 'uploads' : 'audio'}/${Date.now()}_${Math.random().toString(36).substr(2,6)}.${ext}`;
          const { error } = await sb.storage.from("media").upload(p, f);
          if (!error) {
            const { data: { publicUrl } } = sb.storage.from("media").getPublicUrl(p);
            msg += `\n\n[MEDIA:${publicUrl}]`;
          }
        } catch {}
      }

      const body = {
        type: type || "social_post",
        message: msg.trim(),
      };

      // Only include location if we have it
      if (latitude !== null && longitude !== null) {
        body.latitude = latitude;
        body.longitude = longitude;
      }

      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Posted!", { id: tid });
      fetchPosts();
    } catch (e) { toast.error(e.message || "Failed"); }
  };

  const handleSimulate = async () => {
    try {
      await apiFetch("/api/simulate/social", { method: "POST" });
      toast.success("Emergency alert simulated!");
      fetchPosts();
    } catch (e) { toast.error(e.message || "Failed"); }
  };

  const filtered = posts
    .filter(p => filter === "all" || p.severity === filter)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return (
    <div style={{ padding: "16px 16px 20px", maxWidth: 500, margin: "0 auto" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em" }}>
              <span style={{ color: "var(--text)" }}>Res</span>
              <span style={{ background: "var(--accent-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Q</span>
              <span style={{ color: "var(--text)", fontWeight: 400, marginLeft: 6 }}>Centre</span>
            </h2>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Live distress signals from your area</p>
          </div>
          <motion.button onClick={handleSimulate} whileTap={{ scale: 0.93 }}
            style={{
              background: "linear-gradient(135deg, rgba(255,45,45,0.15), rgba(255,45,45,0.05))",
              border: "1px solid rgba(255,45,45,0.25)", borderRadius: 12,
              padding: "8px 14px", fontSize: 11, color: "#ff6b6b",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 5,
            }}>
            ⚡ Simulate
          </motion.button>
        </div>
        <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
      </motion.div>

      {/* Threat Level Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: "linear-gradient(135deg, rgba(255,45,45,0.06), rgba(255,170,40,0.04))",
          border: "1px solid rgba(255,45,45,0.15)", borderRadius: 14,
          padding: "12px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: posts.filter(p => p.severity === "high").length > 3
              ? "linear-gradient(135deg, #ff2d2d, #ff6b6b)"
              : posts.filter(p => p.severity === "high").length > 0
                ? "linear-gradient(135deg, #ffaa28, #ffd93d)"
                : "linear-gradient(135deg, #4cd17f, #86efac)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#fff", fontWeight: 800,
          }}>
            {posts.filter(p => p.severity === "high").length > 3 ? "⚠️" : posts.filter(p => p.severity === "high").length > 0 ? "🟡" : "✅"}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.04em" }}>
              THREAT LEVEL: {posts.filter(p => p.severity === "high").length > 3 ? "HIGH" : posts.filter(p => p.severity === "high").length > 0 ? "ELEVATED" : "NORMAL"}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>
              {posts.filter(p => p.severity === "high").length} critical · {posts.filter(p => p.severity === "medium").length} medium · {posts.filter(p => p.severity === "low").length} low
            </div>
          </div>
        </div>
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: posts.filter(p => p.severity === "high").length > 0 ? "#ff2d2d" : "#4cd17f",
          }}
        />
      </motion.div>

      {/* Live count */}
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4444", animation: "sos-pulse 2s infinite" }} />
        {filtered.length} active distress {filtered.length === 1 ? "signal" : "signals"}
      </div>

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", padding: 50, color: "var(--muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📡</div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No active distress signals</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Use ⚡ Simulate or + to create alerts</p>
            </motion.div>
          )}
        </AnimatePresence>
        {filtered.map((post, i) => (
          <PostCard key={post.id} post={{ ...post, voted: votedIds.has(post.id) }} index={i}
            onVote={() => handleVote(post.id)} />
        ))}
      </div>

      {/* FAB */}
      <motion.button className="btn btn-primary" onClick={() => setShowCreate(true)}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        style={{
          position: "fixed", bottom: 80, right: 20, width: 56, height: 56,
          borderRadius: "50%", padding: 0, fontSize: 24, zIndex: 90,
          boxShadow: "0 4px 30px rgba(255,45,45,0.4), 0 0 60px rgba(255,45,45,0.1)",
        }}>
        +
      </motion.button>

      <CreatePost open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreatePost} />
    </div>
  );
}
