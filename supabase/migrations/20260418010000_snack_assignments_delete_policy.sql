-- Allow users to delete their own snack assignment rows.
-- Required for the dev-reset helper (and any future "clear today" UX).
create policy daily_snack_assignments_delete_own
  on daily_snack_assignments for delete
  using (user_id = auth.uid());
