-- Migration: 0003_marketing_tables.sql
-- Adds marketing infrastructure: trial fields on organizations, promo_codes, marketing_invitations
-- Run BEFORE applying: pg_dump command shown at bottom of file
-- ============================================================================

-- 1. Add trial/conversion tracking fields to organizations (idempotent)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- 2. Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT,
  discount_percent INTEGER CHECK (discount_percent IS NULL OR (discount_percent >= 1 AND discount_percent <= 100)),
  discount_months INTEGER CHECK (discount_months IS NULL OR discount_months >= 1),
  trial_days INTEGER CHECK (trial_days IS NULL OR (trial_days >= 1 AND trial_days <= 365)),
  target_tier subscription_tier,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 1),
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

-- Indexes for promo_codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_code_upper ON promo_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_until ON promo_codes (valid_until) WHERE valid_until IS NOT NULL;

-- 3. Create marketing_invitation_status enum (idempotent)
DO $$ BEGIN
  CREATE TYPE marketing_invitation_status AS ENUM ('pending', 'accepted', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create marketing_invitations table
CREATE TABLE IF NOT EXISTS marketing_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  status marketing_invitation_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT marketing_invitations_token_unique UNIQUE (token)
);

-- Indexes for marketing_invitations
CREATE INDEX IF NOT EXISTS idx_marketing_invitations_email ON marketing_invitations (email);
CREATE INDEX IF NOT EXISTS idx_marketing_invitations_token ON marketing_invitations (token);
CREATE INDEX IF NOT EXISTS idx_marketing_invitations_status ON marketing_invitations (status);
CREATE INDEX IF NOT EXISTS idx_marketing_invitations_expires ON marketing_invitations (expires_at) WHERE status = 'pending';

-- 5. Create broadcast_status enum (idempotent)
DO $$ BEGIN
  CREATE TYPE broadcast_status AS ENUM ('draft', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Create broadcast_messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  target_filter TEXT DEFAULT 'all',
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status broadcast_status DEFAULT 'draft',
  sent_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROLLBACK (down migration)
-- ============================================================================
-- To reverse this migration, run:
--
--   DROP INDEX IF EXISTS idx_promo_codes_code_upper;
--   DROP TABLE IF EXISTS broadcast_messages;
--   DROP TABLE IF EXISTS marketing_invitations;
--   DROP TABLE IF EXISTS promo_codes;
--   DROP TYPE IF EXISTS broadcast_status;
--   DROP TYPE IF EXISTS marketing_invitation_status;
--   ALTER TABLE organizations DROP COLUMN IF EXISTS converted_at;
--   ALTER TABLE organizations DROP COLUMN IF EXISTS trial_ends_at;
--   ALTER TABLE organizations DROP COLUMN IF EXISTS is_trial;
--
-- ============================================================================

-- ============================================================================
-- PRE-MIGRATION BACKUP COMMAND
-- ============================================================================
-- Run this BEFORE applying the migration:
--
--   pg_dump --format=custom --no-owner --no-privileges \
--     --file="immoflow_pre_0003_$(date +%Y%m%d_%H%M%S).dump" \
--     "$DATABASE_URL"
--
-- To restore:
--   pg_restore --no-owner --no-privileges --clean --if-exists \
--     -d "$DATABASE_URL" immoflow_pre_0003_YYYYMMDD_HHMMSS.dump
--
-- ============================================================================

-- ============================================================================
-- RISK NOTE
-- ============================================================================
-- This migration is additive (ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT
-- EXISTS) and should be safe to run on a live production database without
-- downtime. However, adding columns to the `organizations` table acquires a
-- brief ACCESS EXCLUSIVE lock — on a table with thousands of rows and active
-- transactions, this can block reads for a few milliseconds. The CHECK
-- constraints on promo_codes (discount_percent 1-100, current_uses >= 0) are
-- validated only on new/updated rows and impose no locking cost on existing
-- data. The main risk is running this migration concurrently with a deployment
-- that references the new columns before they exist: coordinate by deploying
-- the migration first, then the application code. Always take the pg_dump
-- backup shown above before applying.
-- ============================================================================
