-- =============================================================================
-- Migration: Add Pix copy-and-paste payload per gift
-- Version: 2.5.0
-- Date: 2026-08-05
-- =============================================================================
-- The QR code for each gift encodes a full Pix EMV payload ("copia e cola")
-- that already carries the exact amount. Storing it lets the modal offer a
-- copy button that pre-fills the value, instead of only the bare Pix key
-- (which would force the guest to type the amount by hand).
--
-- How to run this migration:
--   Copy and paste into your Supabase SQL Editor
-- =============================================================================

BEGIN;

ALTER TABLE gift_products
  ADD COLUMN IF NOT EXISTS pix_payload TEXT;

COMMIT;
