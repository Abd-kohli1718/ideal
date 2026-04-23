"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PostCard from "@/components/PostCard";
import CreatePost from "@/components/CreatePost";
import FilterPills from "@/components/FilterPills";
import toast from "react-hot-toast";

// Mock posts for initial display (until backend media support is added)
const MOCK_POSTS = [
  {
    id: "mock-1",
    caption: "Building collapsed near MG Road metro station. Multiple people trapped. Emergency services needed immediately!",
    severity: "high",
    type: "social_post",
    location: "MG Road, Bengaluru",
    votes: 47,
    comments: 12,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    media_url: null,
  },
  {
    id: "mock-2",
    caption: "Severe waterlogging on NH-48 near Electronic City flyover. Vehicles stranded, water level rising fast.",
    severity: "high",
    type: "social_post",
    location: "Electronic City, Bengaluru",
    votes: 32,
    comments: 8,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    media_url: null,
  },
  {
    id: "mock-3",
    caption: "Gas leak reported in residential area, Sector 15. Strong smell, residents evacuating. Fire department alerted.",
    severity: "medium",
    type: "social_post",
    location: "Sector 15, Noida",
    votes: 18,
    comments: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    media_url: null,
  },
  {
    id: "mock-4",
    caption: "Minor road accident near Huda City Centre. Two vehicles involved, no major injuries reported. Traffic diverted.",
    severity: "low",
    type: "social_post",
    location: "Huda City Centre, Gurugram",
    votes: 6,
    comments: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    media_url: null,
  },
];

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "🔴 Critical", value: "high" },
  { label: "🟡 Medium", value: "medium" },
  { label: "🟢 Low", value: "low" },
];

export default function CentrePage() {
  const isDev = process.env.NODE_ENV === "development";
  const [posts, setPosts] = useState(isDev ? MOCK_POSTS : []);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  // Load real alerts from backend and merge with mocks
  const fetchPosts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/alerts");
      const alerts = res.data?.alerts || [];
      const realPosts = alerts.map((a) => {
        let msg = a.message || "";
        let media_url = null;
        let media_type = "image";
        
        // Extract embedded media tag
        const mediaMatch = msg.match(/\[MEDIA:(.*?)\]/);
        if (mediaMatch) {
          media_url = mediaMatch[1];
          msg = msg.replace(mediaMatch[0], "").trim();
          if (media_url.includes(".mp4") || media_url.includes(".webm")) {
            media_type = "video";
          } else if (media_url.includes("audio")) {
            media_type = "audio";
          }
        }

        return {
          id: a.id,
          caption: msg,
          severity: a.triage_result?.severity || a.severity || "low",
          type: a.type,
          location: a.latitude ? `${Number(a.latitude).toFixed(3)}, ${Number(a.longitude).toFixed(3)}` : null,
          votes: 0,
          comments: 0,
          created_at: a.created_at,
          media_url,
          media_type,
        };
      });
      setPosts(isDev ? [...realPosts, ...MOCK_POSTS] : realPosts);
    } catch {
      // keep mock data on error
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCreatePost = async ({ caption, type, media, audio }) => {
    try {
      let finalCaption = caption || "";
      let toastId = null;

      // Helper to upload to the "media" bucket
      const uploadFile = async (file, path) => {
        const { getSupabaseBrowser } = await import("@/lib/supabase");
        const supabase = getSupabaseBrowser();
        const { error } = await supabase.storage.from("media").upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
        return publicUrl;
      };

      if (media) {
        toastId = toast.loading("Uploading photo...");
        const ext = media.name.split('.').pop() || 'jpg';
        const path = `uploads/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const mediaUrl = await uploadFile(media, path);
        finalCaption += `\n\n[MEDIA:${mediaUrl}]`;
      } else if (audio) {
        toastId = toast.loading("Uploading voice note...");
        const path = `audio/sos_${Date.now()}.webm`;
        const mediaUrl = await uploadFile(audio, path);
        finalCaption += `\n\n[MEDIA:${mediaUrl}]`;
      }

      if (!toastId) toastId = toast.loading("Posting...");

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

  // Simulate social post
  const handleSimulate = async () => {
    try {
      await apiFetch("/api/simulate/social", { method: "POST" });
      toast.success("Simulated emergency post added!");
      fetchPosts();
    } catch (err) {
      toast.error(err.message || "Simulation failed");
    }
  };

  // Filter and sort by votes
  const filteredPosts = posts
    .filter((p) => filter === "all" || p.severity === filter)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));

  return (
    <div style={{ padding: "16px 16px 20px", maxWidth: 500, margin: "0 auto" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>ResQ Centre</h2>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Community emergency feed</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button
              className="btn btn-secondary"
              onClick={handleSimulate}
              style={{ fontSize: 11, padding: "8px 12px" }}
              whileTap={{ scale: 0.95 }}
            >
              ⚡ Simulate
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
      </motion.div>

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filteredPosts.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📡</div>
            <p style={{ fontSize: 13 }}>No posts match your filter</p>
          </div>
        )}
        {filteredPosts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </div>

      {/* Floating create button */}
      <motion.button
        className="btn btn-primary"
        onClick={() => setShowCreate(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          padding: 0,
          fontSize: 24,
          zIndex: 90,
          boxShadow: "0 4px 30px rgba(255,45,45,0.4)",
        }}
      >
        +
      </motion.button>

      {/* Create post modal */}
      <CreatePost open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreatePost} />
    </div>
  );
}
