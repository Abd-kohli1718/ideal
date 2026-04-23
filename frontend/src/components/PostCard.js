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
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PostCard({ post, index = 0 }) {
  const sev = post.severity || "low";

  return (
    <motion.div
      className="post-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      {/* Media */}
      {post.media_url && (
        post.media_type === "video" ? (
          <video className="post-media" src={post.media_url} controls preload="metadata" />
        ) : post.media_type === "audio" ? (
          <div style={{ padding: "10px 16px", background: "var(--surface2)", borderRadius: 12, marginBottom: 12 }}>
            <audio src={post.media_url} controls style={{ width: "100%", height: 36 }} />
          </div>
        ) : (
          <img className="post-media" src={post.media_url} alt={post.caption || "Emergency"} />
        )
      )}

      <div className="post-body">
        {/* Meta */}
        <div className="post-meta">
          <span className={`sev-dot sev-dot-${sev}`} />
          <span style={{ textTransform: "capitalize" }}>{sev} priority</span>
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
            display: "inline-flex",
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--surface2)",
            fontSize: 10,
            color: "var(--muted)",
            fontWeight: 500,
            textTransform: "capitalize",
            marginBottom: 10,
          }}>
            {post.type.replace(/_/g, " ")}
          </div>
        )}

        {/* Actions */}
        <div className="post-actions">
          <VoteButton alertId={post.id} votes={post.votes || 0} />
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
            {post.comments || 0} updates
          </span>
        </div>
      </div>
    </motion.div>
  );
}
