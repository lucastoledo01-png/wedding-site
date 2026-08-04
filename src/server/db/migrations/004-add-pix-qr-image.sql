-- =============================================================================
-- Migration: Add per-gift Pix QR code image
-- Version: 2.4.0
-- Date: 2026-07-26
-- =============================================================================
-- Each gift can now have its own dedicated Pix key (stored as url = 'pix://<key>')
-- and its own QR code image, separate from the product photo (image_url).
--
-- How to run this migration:
--   Copy and paste into your Supabase SQL Editor
-- =============================================================================

BEGIN;

ALTER TABLE gift_products
  ADD COLUMN IF NOT EXISTS pix_qr_image_url TEXT;

COMMIT;
