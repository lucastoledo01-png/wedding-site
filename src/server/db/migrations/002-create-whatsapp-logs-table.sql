-- =============================================================================
-- Migration: Create WhatsApp Logs Table
-- Version: 2.2.0
-- Date: 2026-07-15
-- =============================================================================
-- This migration creates the whatsapp_logs table to track WhatsApp template
-- message dispatches triggered by guest RSVP confirmations.
--
-- How to run this migration:
--   Copy and paste into your Supabase SQL Editor
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id SERIAL PRIMARY KEY,
    invitation_uid VARCHAR(100) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    attendance VARCHAR(50) NOT NULL, -- 'ATTENDING' or 'NOT_ATTENDING'
    status VARCHAR(50) NOT NULL,      -- 'triggered', 'sent', 'failed'
    response_body TEXT,               -- Details, errors, or webhook responses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries on logs dashboard
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_invitation_uid ON whatsapp_logs(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_logs(created_at DESC);

COMMIT;
