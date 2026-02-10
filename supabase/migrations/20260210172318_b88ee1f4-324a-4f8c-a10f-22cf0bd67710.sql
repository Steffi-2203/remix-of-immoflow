-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly invoice generation on the 1st of each month at 01:00 UTC
SELECT cron.schedule(
  'generate-monthly-invoices',
  '0 1 1 * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.service_url') || '/functions/v1/cron-generate-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'auto', true
    )
  );
  $$
);