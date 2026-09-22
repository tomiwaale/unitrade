-- Schedules the campaign drain endpoint with pg_cron + pg_net, so Supabase
-- itself drives sending and no external cron service is needed.
--
-- BEFORE running this, store the two values it needs in Supabase Vault (they
-- must not live in a committed migration). Run once in the SQL Editor:
--
--   select vault.create_secret('https://kolejswap.com', 'site_url');
--   select vault.create_secret('<your CRON_SECRET>',    'cron_secret');
--
-- To rotate later:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'cron_secret'),
--     '<new value>'
--   );

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Every 5 minutes: start due scheduled campaigns, resume partly-sent ones, and
-- requeue batches abandoned by a run that died mid-send.
--
-- pg_net fires the request asynchronously — cron doesn't block on the response.
-- Delivery results land in net._http_response, which is where to look if
-- campaigns aren't moving.
SELECT cron.unschedule('send-campaigns')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-campaigns');

SELECT cron.schedule(
  'send-campaigns',
  '*/5 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'site_url')
           || '/api/cron/send-campaigns',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    timeout_milliseconds := 55000
  );
  $$
);

-- Optional: move the existing escrow auto-release job here too, so both crons
-- live in one place. Only enable this if no external cron service is already
-- calling /api/cron/auto-release — two schedulers hitting it is harmless
-- (orders are claimed atomically) but doubles the Paystack calls.
--
-- SELECT cron.schedule(
--   'auto-release',
--   '0 2 * * *',
--   $$
--   SELECT net.http_get(
--     url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'site_url')
--            || '/api/cron/auto-release',
--     headers := jsonb_build_object(
--       'Authorization',
--       'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
--     ),
--     timeout_milliseconds := 55000
--   );
--   $$
-- );
