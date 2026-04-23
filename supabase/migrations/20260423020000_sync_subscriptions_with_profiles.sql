-- Sync the subscriptions table with profiles.subscription_plan.
--
-- The subscriptions table takes precedence over profiles.subscription_plan
-- in getEntitlements(). If a user was manually downgraded in profiles but
-- still has a premium row in subscriptions, they'll incorrectly see premium
-- features. This migration aligns them.
--
-- Also ensures every profile has a subscriptions row (prevents the fallback
-- to profiles.subscription_plan from being the first-resort).

-- Step 1: Update any subscriptions rows where the plan_id doesn't match
-- the profile's subscription_plan field.
update public.subscriptions s
set
  plan_id    = (select id from public.plans where name = p.subscription_plan),
  updated_at = now()
from public.profiles p
where s.user_id = p.id
  and p.subscription_plan in ('free', 'premium')
  and s.plan_id != (select id from public.plans where name = p.subscription_plan);

-- Step 2: Insert a free subscriptions row for any profile that has no row yet.
insert into public.subscriptions (user_id, plan_id, status)
select
  p.id,
  (select id from public.plans where name = 'free'),
  'active'
from public.profiles p
where not exists (
  select 1 from public.subscriptions s where s.user_id = p.id
)
on conflict (user_id) do nothing;
