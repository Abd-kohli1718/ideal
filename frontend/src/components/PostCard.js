"use client";

import { motion } from "framer-motion";
import VoteButton from "./VoteButton";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatVotes(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function PostCard({ post, index = 0, onVote }) {
  const sev = post.severity || "low";
  const sevColor = sev === "high" ? "#ff6b6b" : sev === "medium" ? "#ffaa28" : "#4cd17f";

  return (
    <motion.div
      className="post-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      {/* Media */}
      {post.media_url && (
        <div style={{ overflow: "hidden" }}>
          {post.media_type === "video" ? (
            <video className="post-media" src={post.media_url} controls preload="metadata" />
          ) : post.media_type === "audio" ? (
            <div style={{ padding: "10px 16px", background: "var(--surface2)" }}>
              <audio src={post.media_url} controls style={{ width: "100%", height: 36 }} />
            </div>
          ) : (
            <img className="post-media" src={post.media_url} alt={post.caption || "Emergency"} />
          )}
        </div>
      )}

      <div className="post-body">
        {/* Meta */}
        <div className="post-meta">
          <span className={`sev-dot sev-dot-${sev}`} />
          <span style={{ textTransform: "capitalize", color: sevColor, fontWeight: 600 }}>
            {sev === "high" ? "Critical" : sev === "medium" ? "Medium" : "Low"}
          </span>
          <span style={{ color: "var(--faint)" }}>·</span>
          <span>{timeAgo(post.created_at)}</span>
          {post.location && (
            <>
              <span style={{ color: "var(--faint)" }}>·</span>
              <span>📍 {post.location}</span>
            </>
          )}
        </div>

        {/* Caption */}
        <p className="post-caption">{post.caption || post.message}</p>

        {/* Type tag */}
        {post.type && (
          <div style={{
            display: "inline-flex", padding: "3px 10px", borderRadius: 20,
            background: "var(--surface2)", fontSize: 10, color: "var(--muted)",
            fontWeight: 500, textTransform: "capitalize", marginBottom: 10,
          }}>
            {post.type.replace(/_/g, " ")}
          </div>
        )}

        {/* Actions */}
        <div className="post-actions">
          <button
            onClick={(e) => { e.stopPropagation(); onVote?.(); }}
            className={`vote-btn ${post.voted ? "voted" : ""}`}
          >
            <span style={{ fontSize: 14 }}>{post.voted ? "▲" : "△"}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {formatVotes(post.votes || 0)}
            </span>
          </button>
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            💬 {post.comments || 0} updates
          </span>
        </div>
      </div>
    </motion.div>
  );
}
