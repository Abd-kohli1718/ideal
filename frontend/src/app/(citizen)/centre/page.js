"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";
import toast from "react-hot-toast";

// Generate a deterministic "random" vote count from an alert ID
function hashVotes(id) {
  if (!id) return 0;
  let hash = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  // Map to range 3–480
  return Math.abs(hash % 478) + 3;
}

// Deterministic comment count from ID
function hashComments(id) {
  if (!id) return 0;
  let hash = 7;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 3) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 32);
}

const SEVERITY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "🔴 Critical", value: "high" },
  { label: "🟡 Medium", value: "medium" },
  { label: "🟢 Low", value: "low" },
];

const TIME_OPTIONS = [
  { label: "1h", value: 1 },
  { label: "3h", value: 3 },
  { label: "6h", value: 6 },
  { label: "12h", value: 12 },
  { label: "1d", value: 24 },
  { label: "1w", value: 168 },
  { label: "1m", value: 720 },
  { label: "1y", value: 8760 },
  { label: "All", value: null },
];

const SORT_OPTIONS = [
  { label: "🔥 Trending", value: "trending" },
  { label: "🕐 Latest", value: "latest" },
  { label: "⬆ Most Upvoted", value: "votes" },
];

export default function CentrePage() {
  const [posts, setPosts] = useState([]);
  const [sevFilter, setSevFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState(null); // hours or null=all
  const [sortBy, setSortBy] = useState("trending");
  const [showCreate, setShowCreate] = useState(false);
  const [votedIds, setVotedIds] = useState(new Set());

  // Load real alerts from backend
  const fetchPosts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      const alerts = res.data?.alerts || [];
      const realPosts = alerts.map((a) => {
        let msg = a.message || "";
        let media_url = null;
        let media_type = "image";

        const mediaMatch = msg.match(/\[MEDIA:(.*?)\]/);
        if (mediaMatch) {
          media_url = mediaMatch[1];
          msg = msg.replace(mediaMatch[0], "").trim();
          if (media_url.includes(".mp4") || media_url.includes(".webm")) media_type = "video";
          else if (media_url.includes("audio")) media_type = "audio";
        }

        return {
          id: a.id,
          caption: msg,
          severity: a.triage_result?.severity || a.severity || "low",
          type: a.type,
          location: a.latitude ? `${Number(a.latitude).toFixed(3)}, ${Number(a.longitude).toFixed(3)}` : null,
          votes: hashVotes(a.id),
          comments: hashComments(a.id),
          created_at: a.created_at,
          media_url,
          media_type,
        };
      });
      setPosts(realPosts);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleVote = (postId) => {
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, votes: p.votes + (votedIds.has(postId) ? -1 : 1) }
          : p
      )
    );
  };

  const handleCreatePost = async ({ caption, type, media, audio }) => {
    try {
      let finalCaption = caption || "";
      let toastId = toast.loading("Posting...");

      if (media || audio) {
        try {
          const { getSupabaseBrowser } = await import("@/lib/supabase");
          const supabase = getSupabaseBrowser();
          const file = media || audio;
          const ext = media ? (media.name.split('.').pop() || 'jpg') : 'webm';
          const folder = media ? 'uploads' : 'audio';
          const path = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from("media").upload(path, file);
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
            finalCaption += `\n\n[MEDIA:${publicUrl}]`;
          }
        } catch {}
      }

      await apiFetch("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          type: type || "social_post",
          message: finalCaption.trim(),
          latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
          longitude: 77.5946 + (Math.random() - 0.5) * 0.1,
        }),
      });
      toast.success("Posted to ResQ Centre!", { id: toastId });
      fetchPosts();
    } catch (err) {
      toast.error(err.message || "Failed to post");
    }
  };

  const handleSimulate = async () => {
    try {
      await apiFetch("/api/simulate/social", { method: "POST" });
      toast.success("Simulated emergency post added!");
      fetchPosts();
    } catch (err) {
      toast.error(err.message || "Simulation failed");
    }
  };

  // Apply filters + sort
  const now = Date.now();
  const filteredPosts = posts
    .filter((p) => {
      if (sevFilter !== "all" && p.severity !== sevFilter) return false;
      if (timeFilter !== null) {
        const age = now - new Date(p.created_at || 0).getTime();
        if (age > timeFilter * 3600 * 1000) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "votes") return (b.votes || 0) - (a.votes || 0);
      if (sortBy === "latest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      // trending = votes weighted by recency
      const ageA = Math.max(1, (now - new Date(a.created_at || 0).getTime()) / 3600000);
      const ageB = Math.max(1, (now - new Date(b.created_at || 0).getTime()) / 3600000);
      const scoreA = (a.votes || 0) / Math.pow(ageA, 0.8);
      const scoreB = (b.votes || 0) / Math.pow(ageB, 0.8);
      return scoreB - scoreA;
    });

  const pillStyle = (active) => ({
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: active ? 600 : 500,
    background: active ? "rgba(255,45,45,0.12)" : "var(--surface2)",
    color: active ? "#ff6b6b" : "var(--muted)",
    border: `1px solid ${active ? "rgba(255,45,45,0.25)" : "var(--border)"}`,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "16px 16px 20px", maxWidth: 500, margin: "0 auto" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>ResQ Centre</h2>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Community emergency feed</p>
          </div>
          <motion.button className="btn btn-secondary" onClick={handleSimulate}
            style={{ fontSize: 11, padding: "8px 12px" }} whileTap={{ scale: 0.95 }}>
            ⚡ Simulate
          </motion.button>
        </div>

        {/* Sort tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "var(--surface)", borderRadius: 12, padding: 3, border: "1px solid var(--border)" }}>
          {SORT_OPTIONS.map((s) => (
            <button key={s.value} onClick={() => setSortBy(s.value)} style={{
              flex: 1, padding: "7px 8px", borderRadius: 9, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 11, fontWeight: 600, transition: "all 0.2s",
              background: sortBy === s.value ? "var(--surface2)" : "transparent",
              color: sortBy === s.value ? "var(--text)" : "var(--muted)",
            }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Time filter pills */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, marginBottom: 10 }}>
          {TIME_OPTIONS.map((t) => (
            <button key={String(t.value)} onClick={() => setTimeFilter(t.value)} style={pillStyle(timeFilter === t.value)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Severity filter pills */}
        <div style={{ display: "flex", gap: 5 }}>
          {SEVERITY_OPTIONS.map((f) => (
            <button key={f.value} onClick={() => setSevFilter(f.value)} style={pillStyle(sevFilter === f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results count */}
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
        <span>{filteredPosts.length} {filteredPosts.length === 1 ? "report" : "reports"}</span>
        <span style={{ fontSize: 10 }}>
          {sortBy === "trending" && "Sorted by trending score"}
          {sortBy === "votes" && "Sorted by most upvoted"}
          {sortBy === "latest" && "Sorted by most recent"}
        </span>
      </div>

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filteredPosts.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📡</div>
            <p style={{ fontSize: 13, marginBottom: 6 }}>
              {sevFilter !== "all" || timeFilter !== null ? "No posts match your filters" : "No emergency reports yet"}
            </p>
            <p style={{ fontSize: 11, opacity: 0.7 }}>
              Hit ⚡ Simulate to generate demo alerts or use + to report
            </p>
          </div>
        )}
        {filteredPosts.map((post, i) => (
          <PostCard
            key={post.id}
            post={{ ...post, voted: votedIds.has(post.id) }}
            index={i}
            onVote={() => handleVote(post.id)}
          />
        ))}
      </div>

      {/* Floating create button */}
      <motion.button className="btn btn-primary" onClick={() => setShowCreate(true)}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed", bottom: 80, right: 20, width: 56, height: 56,
          borderRadius: "50%", padding: 0, fontSize: 24, zIndex: 90,
          boxShadow: "0 4px 30px rgba(255,45,45,0.4)",
        }}>
        +
      </motion.button>

      <CreatePost open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreatePost} />
    </div>
  );
}
