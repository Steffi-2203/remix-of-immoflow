
-- Step 1: Add enum values only (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ops';
