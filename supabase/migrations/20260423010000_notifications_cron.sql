-- Enable extensions required for scheduled HTTP calls.
create extension if not exists pg_net  schema extensions;
create extension if not exists pg_cron schema pg_catalog;

-- Unschedule any previous version of this job before recreating it.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'kinetic-snacks-dispatch-notifications') then
    perform cron.unschedule('kinetic-snacks-dispatch-notifications');
  end if;
end $$;

-- Schedule notifications-dispatch every 5 minutes.
-- Reads project URL and anon key from Vault — no hardcoded secrets.
-- One-time setup required: store secrets in Vault via SQL editor:
--   select vault.create_secret('https://<ref>.supabase.co', 'ks_project_url');
--   select vault.create_secret('<anon-key>', 'ks_anon_key');
select cron.schedule(
  'kinetic-snacks-dispatch-notifications',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url     := (select decrypted_secret from vault.decrypted_secrets where name = 'ks_project_url')
                 || '/functions/v1/notifications-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey',        (select decrypted_secret from vault.decrypted_secrets where name = 'ks_anon_key')
      ),
      body    := '{}'::jsonb
    ) as request_id
  $$
);
