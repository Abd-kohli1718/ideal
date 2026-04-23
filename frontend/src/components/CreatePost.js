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
        type: tab === "text" ? "social_post" : tab === "audio" ? "audio_sos" : "media_post",
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
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-handle" />

          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
            Report Emergency
          </h3>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`filter-pill ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 8px" }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Text input (always shown) */}
          <textarea
            className="input"
            placeholder={tab === "audio" ? "Optional: add a text description…" : "Describe the emergency situation…"}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ marginBottom: 16, minHeight: 100 }}
          />

          {/* Image tab */}
          {tab === "image" && (
            <div style={{ marginBottom: 16 }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
              {mediaPreview ? (
                <div style={{ position: "relative" }}>
                  <img src={mediaPreview} alt="Preview" style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }} />
                  <button
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "rgba(0,0,0,0.6)", border: "none",
                      color: "#fff", borderRadius: "50%",
                      width: 28, height: 28, cursor: "pointer", fontSize: 14,
                    }}
                  >✕</button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  style={{ width: "100%", padding: 24, flexDirection: "column", gap: 8 }}
                >
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span>Upload photo</span>
                </button>
              )}
            </div>
          )}

          {/* Video tab */}
          {tab === "video" && (
            <div style={{ marginBottom: 16 }}>
              <input ref={fileRef} type="file" accept="video/*" onChange={handleFileSelect} style={{ display: "none" }} />
              {mediaPreview ? (
                <div style={{ position: "relative" }}>
                  <video src={mediaPreview} controls style={{ width: "100%", borderRadius: 12, maxHeight: 200 }} />
                  <button
                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                    style={{
                      position: "absolute", top: 8, right: 8,
                      background: "rgba(0,0,0,0.6)", border: "none",
                      color: "#fff", borderRadius: "50%",
                      width: 28, height: 28, cursor: "pointer", fontSize: 14,
                    }}
                  >✕</button>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  style={{ width: "100%", padding: 24, flexDirection: "column", gap: 8 }}
                >
                  <span style={{ fontSize: 28 }}>🎥</span>
                  <span>Upload video</span>
                </button>
              )}
            </div>
          )}

          {/* Audio tab */}
          {tab === "audio" && (
            <div style={{ marginBottom: 16, padding: 20, background: "var(--surface2)", borderRadius: 14, textAlign: "center" }}>
              <AudioRecorder onRecorded={(blob) => setAudioBlob(blob)} />
            </div>
          )}

          {/* Submit */}
          <motion.button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || (!caption.trim() && !mediaFile && !audioBlob)}
            style={{ width: "100%", padding: "14px 20px", fontSize: 14, borderRadius: 14 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? "Posting…" : "Post to ResQ Centre"}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
