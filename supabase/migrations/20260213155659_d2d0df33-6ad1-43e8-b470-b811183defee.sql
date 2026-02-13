
-- Move pgcrypto from public to dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the extension
ALTER EXTENSION pgcrypto SET SCHEMA extensions;

-- Ensure search_path includes extensions so gen_random_uuid() etc. still resolve
ALTER DATABASE postgres SET search_path TO public, extensions;
