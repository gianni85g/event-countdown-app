-- Fix notifications RLS policies to ensure they work correctly
-- This ensures notifications can be created and read properly

-- Drop all existing policies
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can insert notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

-- Policy: Users can view their own notifications
-- Match recipient with user's email (normalized)
create policy "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (
  recipient = lower(trim(auth.jwt()->>'email'))
  OR recipient = lower(trim(auth.email()))
);

-- Policy: Users can insert notifications (when sharing)
-- Allow authenticated users to insert notifications (sender must match their email)
-- Use OR condition to handle different email formats
create policy "Users can insert notifications"
on public.notifications
for insert
to authenticated
with check (
  lower(trim(sender)) = lower(trim(auth.jwt()->>'email'))
  OR lower(trim(sender)) = lower(trim((auth.jwt()->'user_metadata'->>'email')::text))
  OR lower(trim(auth.email())) = lower(trim(sender))
);

-- Policy: Users can update their own notifications (mark as read)
create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (
  recipient = lower(trim(auth.jwt()->>'email'))
  OR recipient = lower(trim(auth.email()))
)
with check (
  recipient = lower(trim(auth.jwt()->>'email'))
  OR recipient = lower(trim(auth.email()))
);

-- Policy: Users can delete their own notifications
create policy "Users can delete their own notifications"
on public.notifications
for delete
to authenticated
using (
  recipient = lower(trim(auth.jwt()->>'email'))
  OR recipient = lower(trim(auth.email()))
);

-- Test query to verify notifications table exists and has data
-- Run this manually to check if notifications are being created:
-- SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 10;

