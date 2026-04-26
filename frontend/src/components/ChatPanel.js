"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getSupabaseBrowser } from "@/lib/supabase";
import toast from "react-hot-toast";

function timeLabel(d) {
  if (!d) return "";
  const dt = new Date(d);
  const now = new Date();
  const diff = now - dt;
  if (diff < 60000) return "just now";
  const h = dt.getHours().toString().padStart(2, "0");
  const m = dt.getMinutes().toString().padStart(2, "0");
  const timeStr = `${h}:${m}`;
  if (diff < 86400000) return timeStr;
  return `${dt.getDate()}/${dt.getMonth() + 1} ${timeStr}`;
}

export default function ChatPanel({ alertId, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/messages`);
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages, scrollToBottom]);

  // Subscribe to Supabase Realtime for new messages
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`chat-${alertId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `alert_id=eq.${alertId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await apiFetch(`/api/alerts/${alertId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      // Optimistically add if realtime hasn't caught it
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data?.id)) return prev;
        return [...prev, res.data];
      });
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Send failed:", err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      className="chat-panel-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="chat-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-header-icon">💬</div>
            <div>
              <div className="chat-header-title">Live Chat</div>
              <div className="chat-header-sub">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <button className="chat-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Messages Area */}
        <div className="chat-messages" ref={scrollRef}>
          {loading && (
            <div className="chat-loading">
              <div className="chat-spinner" />
              <span>Loading messages...</span>
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <div className="chat-empty-title">No messages yet</div>
              <div className="chat-empty-sub">
                Start the conversation with the response team
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              const isResponder =
                msg.sender_role === "responder" || msg.sender_role === "admin";

              return (
                <motion.div
                  key={msg.id}
                  className={`chat-bubble-wrap ${isMine ? "mine" : "theirs"}`}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Sender label for incoming messages */}
                  {!isMine && (
                    <div className="chat-sender">
                      <span
                        className={`chat-role-dot ${
                          isResponder ? "responder" : "citizen"
                        }`}
                      />
                      <span className="chat-sender-name">
                        {msg.sender_name || "User"}
                      </span>
                      <span className="chat-role-label">
                        {isResponder ? "Responder" : "Citizen"}
                      </span>
                    </div>
                  )}
                  <div
                    className={`chat-bubble ${isMine ? "mine" : "theirs"} ${
                      isResponder && !isMine ? "responder-bubble" : ""
                    }`}
                  >
                    <div className="chat-bubble-text">{msg.content}</div>
                    <div className="chat-bubble-time">
                      {timeLabel(msg.created_at)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              autoFocus
            />
            <button
              className={`chat-send-btn ${
                input.trim() && !sending ? "active" : ""
              }`}
              onClick={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <div className="chat-send-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M22 2L15 22L11 13L2 9L22 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="chat-input-hint">
            Press Enter to send · {500 - input.length} chars left
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
