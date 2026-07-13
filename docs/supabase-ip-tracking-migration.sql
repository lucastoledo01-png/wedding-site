-- Incremental migration for IP/device tracking and IP blocking.
-- Run this in Supabase SQL Editor if the original migration was already applied.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS confirmed_ip TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_device TEXT;

ALTER TABLE wishes
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS device TEXT;

CREATE TABLE IF NOT EXISTS blocked_ips (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_blocked_ip_per_invitation UNIQUE (invitation_uid, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_invitation_uid ON blocked_ips(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(invitation_uid, ip_address);
