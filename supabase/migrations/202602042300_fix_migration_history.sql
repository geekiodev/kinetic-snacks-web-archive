-- Fix migration history name mismatch for 20260204

update supabase_migrations.schema_migrations
set name = 'initial_schema'
where version = '20260204';
