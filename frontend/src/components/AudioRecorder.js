"use client";

import { useState, useRef } from "react";

export default function AudioRecorder({ onRecorded }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      setDuration(0);

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecorded?.(blob, url);
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
      };

      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
    }
    setRecording(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <button
        className={`audio-btn ${recording ? "recording" : ""}`}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "⏹" : "🎤"}
      </button>
      <span style={{ fontSize: 12, color: recording ? "var(--red)" : "var(--muted)", fontWeight: 500 }}>
        {recording ? `Recording… ${formatTime(duration)}` : audioUrl ? "Recording saved" : "Tap to record voice SOS"}
      </span>
      {audioUrl && (
        <audio controls src={audioUrl} style={{ width: "100%", maxWidth: 280, marginTop: 4 }} />
      )}
    </div>
  );
}
