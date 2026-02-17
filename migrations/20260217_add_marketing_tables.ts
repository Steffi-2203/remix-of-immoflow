import { runMigrations } from "./runner";

const migration = {
  name: "20260217_add_marketing_tables",

  up: `
    -- Trial columns on organizations
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL,
      ADD COLUMN IF NOT EXISTS converted_at timestamptz NULL;

    -- Broadcast status enum
    DO $$ BEGIN
      CREATE TYPE broadcast_status AS ENUM ('draft', 'sent', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Marketing invitation status enum
    DO $$ BEGIN
      CREATE TYPE marketing_invitation_status AS ENUM ('pending', 'accepted', 'expired');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Promo codes table
    CREATE TABLE IF NOT EXISTS promo_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      discount_percent INTEGER,
      discount_months INTEGER,
      trial_days INTEGER,
      target_tier subscription_tier,
      max_uses INTEGER,
      current_uses INTEGER DEFAULT 0,
      valid_from TIMESTAMPTZ DEFAULT NOW(),
      valid_until TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Broadcast messages table
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

    -- Marketing invitations table
    CREATE TABLE IF NOT EXISTS marketing_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      status marketing_invitation_status DEFAULT 'pending',
      expires_at TIMESTAMPTZ,
      organization_id UUID REFERENCES organizations(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Index for promo code lookups
    CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (UPPER(code));
    CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes (is_active) WHERE is_active = true;

    -- Index for broadcast history
    CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created ON broadcast_messages (created_at DESC);

    -- Index for invitation lookups
    CREATE INDEX IF NOT EXISTS idx_marketing_invitations_token ON marketing_invitations (token);
    CREATE INDEX IF NOT EXISTS idx_marketing_invitations_email ON marketing_invitations (email);
  `,

  down: `
    DROP TABLE IF EXISTS marketing_invitations;
    DROP TABLE IF EXISTS broadcast_messages;
    DROP TABLE IF EXISTS promo_codes;
    DROP TYPE IF EXISTS marketing_invitation_status;
    DROP TYPE IF EXISTS broadcast_status;
    ALTER TABLE organizations
      DROP COLUMN IF EXISTS converted_at,
      DROP COLUMN IF EXISTS trial_ends_at,
      DROP COLUMN IF EXISTS is_trial;
  `,
};

const isMain = process.argv[1]?.includes("20260217_add_marketing_tables");
if (isMain) {
  const direction = process.argv.includes("--down") ? "down" as const : "up" as const;
  runMigrations([migration], direction)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default migration;
