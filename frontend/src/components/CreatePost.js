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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 480, maxHeight: "85vh",
            background: "var(--card, #1a1a2e)", borderRadius: "20px 20px 0 0",
            display: "flex", flexDirection: "column", overflow: "hidden",
            border: "1px solid var(--border, #2a2a3e)", borderBottom: "none",
          }}
        >
          {/* Handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2, margin: "10px auto 6px",
            background: "rgba(255,255,255,0.15)",
          }} />

          {/* Header */}
          <div style={{
            padding: "6px 20px 14px", textAlign: "center",
            borderBottom: "1px solid var(--border, #2a2a3e)",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Report Emergency</h3>
            <p style={{ fontSize: 10, color: "var(--muted, #888)", margin: "4px 0 0" }}>
              Share incidents with the ResQ network
            </p>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", WebkitOverflowScrolling: "touch" }}>

            {/* Tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setMediaFile(null); setMediaPreview(null); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 6px", borderRadius: 12, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 10, fontWeight: 600,
                    background: tab === t.id ? "var(--accent-gradient, linear-gradient(135deg, #ff6b6b, #e63946))" : "var(--surface2, #252540)",
                    color: tab === t.id ? "#fff" : "var(--muted, #888)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Text input */}
            <textarea
              placeholder={tab === "audio" ? "Optional description…" : "Describe the emergency…"}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{
                width: "100%", minHeight: 80, padding: "12px 14px", borderRadius: 12,
                border: "1px solid var(--border, #2a2a3e)", background: "var(--surface2, #252540)",
                color: "var(--text, #fff)", fontSize: 13, fontFamily: "inherit",
                resize: "vertical", outline: "none", marginBottom: 14,
                boxSizing: "border-box",
              }}
            />

            {/* Image tab */}
            {tab === "image" && (
              <div style={{ marginBottom: 14 }}>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: "none" }} />
                {mediaPreview ? (
                  <div style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
                    <img src={mediaPreview} alt="Preview" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", borderRadius: "50%",
                        width: 30, height: 30, cursor: "pointer", fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: "100%", padding: "28px 16px", borderRadius: 14,
                      border: "2px dashed var(--border, #2a2a3e)", background: "var(--surface2, #252540)",
                      color: "var(--text2, #aaa)", cursor: "pointer", fontFamily: "inherit",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>📷</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Tap to capture or upload photo</span>
                    <span style={{ fontSize: 10, color: "var(--muted, #888)" }}>JPG, PNG up to 10MB</span>
                  </button>
                )}
              </div>
            )}

            {/* Video tab */}
            {tab === "video" && (
              <div style={{ marginBottom: 14 }}>
                <input ref={fileRef} type="file" accept="video/*" capture="environment" onChange={handleFileSelect} style={{ display: "none" }} />
                {mediaPreview ? (
                  <div style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
                    <video src={mediaPreview} controls style={{ width: "100%", maxHeight: 180, display: "block" }} />
                    <button
                      onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                      style={{
                        position: "absolute", top: 8, right: 8,
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", borderRadius: "50%",
                        width: 30, height: 30, cursor: "pointer", fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: "100%", padding: "28px 16px", borderRadius: 14,
                      border: "2px dashed var(--border, #2a2a3e)", background: "var(--surface2, #252540)",
                      color: "var(--text2, #aaa)", cursor: "pointer", fontFamily: "inherit",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 32 }}>🎥</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Tap to record or upload video</span>
                    <span style={{ fontSize: 10, color: "var(--muted, #888)" }}>MP4, MOV up to 10MB</span>
                  </button>
                )}
              </div>
            )}

            {/* Audio tab */}
            {tab === "audio" && (
              <div style={{
                marginBottom: 14, padding: 20,
                background: "var(--surface2, #252540)", borderRadius: 14,
                border: "1px solid var(--border, #2a2a3e)", textAlign: "center",
              }}>
                <AudioRecorder onRecorded={(blob) => setAudioBlob(blob)} />
              </div>
            )}
          </div>

          {/* Fixed submit button — always visible above bottom nav */}
          <div style={{
            padding: "12px 20px", paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
            borderTop: "1px solid var(--border, #2a2a3e)",
            background: "var(--card, #1a1a2e)",
          }}>
            <motion.button
              onClick={handleSubmit}
              disabled={loading || (!caption.trim() && !mediaFile && !audioBlob)}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: 14,
                border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 14, fontWeight: 700,
                background: loading || (!caption.trim() && !mediaFile && !audioBlob)
                  ? "var(--surface2, #252540)"
                  : "var(--accent-gradient, linear-gradient(135deg, #ff6b6b, #e63946))",
                color: loading || (!caption.trim() && !mediaFile && !audioBlob)
                  ? "var(--muted, #888)" : "#fff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "⏳ Uploading & Posting…" : "🚨 Post to ResQ Centre"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
