-- Create notifications table for sharing invitations
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  sender text not null,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can insert notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

-- Policy: Users can view their own notifications
create policy "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (recipient = lower(trim(auth.jwt()->>'email')));

-- Policy: Users can insert notifications (when sharing)
-- Allow authenticated users to insert notifications (sender must match their email)
-- Normalize both sides for comparison
create policy "Users can insert notifications"
on public.notifications
for insert
to authenticated
with check (
  lower(trim(sender)) = lower(trim(auth.jwt()->>'email'))
  OR lower(trim(sender)) = lower(trim(auth.email()))
  OR lower(trim(auth.jwt()->>'email')) = lower(trim(sender))
);

-- Policy: Users can update their own notifications (mark as read)
create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (recipient = lower(trim(auth.jwt()->>'email')))
with check (recipient = lower(trim(auth.jwt()->>'email')));

-- Policy: Users can delete their own notifications
create policy "Users can delete their own notifications"
on public.notifications
for delete
to authenticated
using (recipient = lower(trim(auth.jwt()->>'email')));

-- Create index for faster queries
create index if not exists idx_notifications_recipient_read 
on public.notifications(recipient, read);

create index if not exists idx_notifications_recipient_created 
on public.notifications(recipient, created_at desc);

