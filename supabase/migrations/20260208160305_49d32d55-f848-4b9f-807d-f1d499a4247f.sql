
-- Move extensions from public schema to a dedicated 'extensions' schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move commonly used extensions to extensions schema
-- Note: We cannot ALTER EXTENSION SET SCHEMA if it doesn't exist, so use IF EXISTS
DO $$
BEGIN
  -- Move uuid-ossp if it exists in public
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
  END IF;
  
  -- Move pgcrypto if it exists in public
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto' AND extnamespace = 'public'::regnamespace) THEN
    ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
  END IF;
END $$;
