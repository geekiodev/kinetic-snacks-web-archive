-- Enable extensions required for scheduled HTTP calls.
create extension if not exists pg_net  schema extensions;
create extension if not exists pg_cron schema pg_catalog;

-- Store the Supabase project URL and anon key in Vault so they can be
-- referenced from cron jobs without hardcoding secrets in SQL.
--
-- ACTION REQUIRED: Before applying this migration, run these two queries
-- in the Supabase SQL editor with your actual values:
--
--   select vault.create_secret('ks_project_url',  'https://<project-ref>.supabase.co');
--   select vault.create_secret('ks_anon_key',     '<your-anon-key>');
--
-- The notifications-dispatch function uses its own service-role key
-- internally and does not validate the caller's JWT (verify_jwt = false),
-- so the anon key is sufficient for authentication here.

select cron.schedule(
  'kinetic-snacks-dispatch-notifications',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url     := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'ks_project_url'
      ) || '/functions/v1/notifications-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'ks_anon_key'
        )
      ),
      body    := '{}'::jsonb
    ) as request_id
  $$
);
