-- Alten fehlerhaften Cron-Job entfernen (falls vorhanden)
SELECT cron.unschedule('generate-monthly-invoices-1st');

-- Neuen Cron-Job mit Service Role Key erstellen
-- Läuft am 1. jeden Monats um 00:05 Uhr
SELECT cron.schedule(
  'generate-monthly-invoices-1st',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://wvkhszullkdkokblrmud.supabase.co/functions/v1/cron-generate-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret 
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);