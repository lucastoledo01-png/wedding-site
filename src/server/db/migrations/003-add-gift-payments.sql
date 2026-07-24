-- =============================================================================
-- Migration: Add Mercado Pago Checkout for Gifts
-- Version: 2.3.0
-- Date: 2026-07-19
-- =============================================================================
-- Adds price_cents to gift_products (exact amount to charge via Mercado Pago)
-- and a new gift_payments table to track each payment attempt. A gift is
-- marked as received (is_received = true) only after a payment reaches
-- status = 'approved', confirmed server-side against the Mercado Pago API.
--
-- How to run this migration:
--   Copy and paste into your Supabase SQL Editor
-- =============================================================================

BEGIN;

ALTER TABLE gift_products
  ADD COLUMN IF NOT EXISTS price_cents INTEGER;

CREATE TABLE IF NOT EXISTS gift_payments (
    id SERIAL PRIMARY KEY,
    invitation_uid VARCHAR(100) NOT NULL,
    gift_product_id INTEGER NOT NULL REFERENCES gift_products(id) ON DELETE CASCADE,
    external_reference VARCHAR(100) NOT NULL UNIQUE,
    mp_payment_id VARCHAR(100) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled, in_process
    amount_cents INTEGER NOT NULL,
    payer_name VARCHAR(255),
    payer_email VARCHAR(255),
    payment_method VARCHAR(50), -- 'credit_card', 'pix'
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gift_payments_invitation_uid ON gift_payments(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_gift_payments_gift_product_id ON gift_payments(gift_product_id);
CREATE INDEX IF NOT EXISTS idx_gift_payments_mp_payment_id ON gift_payments(mp_payment_id);

COMMIT;
