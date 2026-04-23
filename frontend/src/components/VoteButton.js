"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * VoteButton with localStorage persistence.
 * Stores voted state per alert ID so votes survive page reloads.
 */
export default function VoteButton({ alertId, votes = 0, onVote }) {
  const storageKey = alertId ? `resq_vote_${alertId}` : null;

  const [isVoted, setIsVoted] = useState(false);
  const [count, setCount] = useState(votes);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "1") {
        setIsVoted(true);
        setCount((c) => c + 1);
      }
    } catch {}
  }, [storageKey]);

  const handleClick = () => {
    const newVoted = !isVoted;
    setIsVoted(newVoted);
    setCount((c) => (newVoted ? c + 1 : c - 1));

    // Persist to localStorage
    if (storageKey) {
      try {
        if (newVoted) {
          localStorage.setItem(storageKey, "1");
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {}
    }

    onVote?.(newVoted);
  };

  return (
    <motion.button
      className={`vote-btn ${isVoted ? "voted" : ""}`}
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
    >
      <span>{isVoted ? "🔴" : "⚪"}</span>
      <span>{count}</span>
    </motion.button>
  );
}
