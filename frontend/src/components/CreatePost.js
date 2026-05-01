"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AudioRecorder from "./AudioRecorder";

export default function CreatePost({ open, onClose, onSubmit }) {
  const [tab, setTab] = useState("text");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !mediaFile && !audioBlob) return;
    setLoading(true);
    try {
      await onSubmit?.({
        caption: caption.trim(),
        type: "social_post",
        media: mediaFile,
        audio: audioBlob,
      });
      setCaption("");
      setMediaFile(null);
      setMediaPreview(null);
      setAudioBlob(null);
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const tabs = [
    { id: "text", icon: "✍️", label: "Text" },
    { id: "image", icon: "📷", label: "Image" },
    { id: "video", icon: "🎥", label: "Video" },
    { id: "audio", icon: "🎤", label: "Audio" },
  ];

  const hasContent = caption.trim() || mediaFile || audioBlob;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 480, margin: "0 auto",
            background: "var(--card, #1a1a2e)", borderRadius: "20px 20px 0 0",
            border: "1px solid var(--border, #2a2a3e)", borderBottom: "none",
            display: "flex", flexDirection: "column",
            maxHeight: "80vh",
          }}
        >
          {/* Handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, margin: "10px auto 0", background: "rgba(255,255,255,0.15)" }} />

          {/* Header */}
          <div style={{ padding: "10px 20px 12px", textAlign: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Report Emergency</h3>
          </div>

          {/* Tabs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, padding: "0 16px", marginBottom: 12 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setMediaFile(null); setMediaPreview(null); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 10, fontWeight: 600,
                  background: tab === t.id ? "linear-gradient(135deg, #ff6b6b, #e63946)" : "var(--surface2, #252540)",
                  color: tab === t.id ? "#fff" : "var(--muted, #888)",
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 12px", minHeight: 0 }}>

            {/* Text input — compact */}
            <textarea
              placeholder="Describe the emergency…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 12,
                border: "1px solid var(--border, #2a2a3e)", background: "var(--surface2, #252540)",
                color: "var(--text, #fff)", fontSize: 13, fontFamily: "inherit",
                resize: "none", outline: "none", marginBottom: 12, boxSizing: "border-box",
              }}
            />

            {/* Image tab */}
            {tab === "image" && (
              <>
                {/* No capture attribute = browser shows Camera + Gallery choice */}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
                {mediaPreview ? (
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                    <img src={mediaPreview} alt="Preview" style={{ width: "100%", maxHeight: 140, objectFit: "cover", display: "block" }} />
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", borderRadius: "50%",
                        width: 28, height: 28, cursor: "pointer", fontSize: 13,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <button
                      onClick={() => { fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); fileRef.current?.removeAttribute("capture"); }}
                      style={{
                        padding: "20px 8px", borderRadius: 12,
                        border: "2px dashed rgba(255,107,107,0.3)", background: "rgba(255,107,107,0.05)",
                        color: "#ff6b6b", cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>📸</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Camera</span>
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        padding: "20px 8px", borderRadius: 12,
                        border: "2px dashed rgba(91,141,239,0.3)", background: "rgba(91,141,239,0.05)",
                        color: "#5b8def", cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>🖼️</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Gallery</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Video tab */}
            {tab === "video" && (
              <>
                <input ref={fileRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: "none" }} />
                {mediaPreview ? (
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                    <video src={mediaPreview} controls style={{ width: "100%", maxHeight: 140, display: "block" }} />
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", borderRadius: "50%",
                        width: 28, height: 28, cursor: "pointer", fontSize: 13,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <button
                      onClick={() => { fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); fileRef.current?.removeAttribute("capture"); }}
                      style={{
                        padding: "20px 8px", borderRadius: 12,
                        border: "2px dashed rgba(255,170,40,0.3)", background: "rgba(255,170,40,0.05)",
                        color: "#ffaa28", cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>🎬</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Record</span>
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        padding: "20px 8px", borderRadius: 12,
                        border: "2px dashed rgba(91,141,239,0.3)", background: "rgba(91,141,239,0.05)",
                        color: "#5b8def", cursor: "pointer", fontFamily: "inherit",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      }}
                    >
                      <span style={{ fontSize: 26 }}>📁</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Gallery</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Audio tab */}
            {tab === "audio" && (
              <div style={{
                padding: 16, background: "var(--surface2, #252540)", borderRadius: 12,
                border: "1px solid var(--border, #2a2a3e)", textAlign: "center", marginBottom: 8,
              }}>
                <AudioRecorder onRecorded={(blob) => setAudioBlob(blob)} />
              </div>
            )}
          </div>

          {/* FIXED submit — always visible */}
          <div style={{
            padding: "10px 16px",
            paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
            borderTop: "1px solid var(--border, #2a2a3e)",
            background: "var(--card, #1a1a2e)",
          }}>
            <motion.button
              onClick={handleSubmit}
              disabled={loading || !hasContent}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: 14,
                border: "none", cursor: hasContent ? "pointer" : "default",
                fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                background: !hasContent
                  ? "var(--surface2, #252540)"
                  : "linear-gradient(135deg, #ff6b6b, #e63946)",
                color: !hasContent ? "var(--muted, #888)" : "#fff",
                opacity: loading ? 0.7 : 1,
                boxShadow: hasContent ? "0 4px 20px rgba(255,45,45,0.25)" : "none",
              }}
            >
              {loading ? "⏳ Uploading…" : "🚨 Post to ResQ Centre"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
