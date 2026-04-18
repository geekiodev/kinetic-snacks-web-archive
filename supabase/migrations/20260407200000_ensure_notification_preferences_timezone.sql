-- Ensure notification_preferences matches app + Edge helpers when an older revision
-- of 20260406110000 was applied before the timezone column existed.
alter table public.notification_preferences add column if not exists timezone text not null default 'UTC';
