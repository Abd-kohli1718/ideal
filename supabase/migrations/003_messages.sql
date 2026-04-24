-- =============================================================
-- ResQ: Messages table for per-alert chat between citizen/responder
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- 1. Create the messages table
CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id    UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES users(id),
    sender_role TEXT NOT NULL DEFAULT 'citizen',   -- citizen | responder | admin
    sender_name TEXT,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookup by alert_id (chat threads)
CREATE INDEX IF NOT EXISTS idx_messages_alert_id ON messages(alert_id);

-- 3. Index for ordering within a thread
CREATE INDEX IF NOT EXISTS idx_messages_alert_created ON messages(alert_id, created_at ASC);

-- 4. Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Anyone authenticated can read messages on alerts they are involved in
-- (for simplicity, we allow all authenticated users to read — 
--  the backend already enforces access control)
CREATE POLICY "Authenticated users can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own messages
CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Service role (backend) can do everything
CREATE POLICY "Service role full access"
  ON messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Enable Realtime for the messages table
-- This allows the frontend to subscribe to INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
