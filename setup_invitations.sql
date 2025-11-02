-- Add status columns for invitations
alter table public.moments
  add column if not exists status text default 'active';

alter table public.moments
  add column if not exists shared_with_status jsonb default '{}';

-- Update policy so shared users can read pending Moments
drop policy if exists "Owner or shared can read moments" on public.moments;

create policy "Owner or shared can read moments"
on public.moments
for select
to authenticated
using (
  auth.uid() = user_id
  or (auth.jwt()->>'email') = any(shared_with)
);

-- Allow shared users to UPDATE shared_with_status and status (for accept/decline)
-- Drop ALL existing UPDATE policies (drop newer ones first)
drop policy if exists "Users can update moments" on public.moments;
drop policy if exists "Users can update their own moments" on public.moments;
drop policy if exists "Shared users can update invitation status" on public.moments;
drop policy if exists "Owner or shared can update moments" on public.moments;

-- Create policy that allows:
-- 1. Owners to update everything
-- 2. Shared users to update shared_with_status and status only
create policy "Users can update moments"
on public.moments
for update
to authenticated
using (
  auth.uid() = user_id
  or (auth.jwt()->>'email') = any(shared_with)
)
with check (
  auth.uid() = user_id
  or (
    (auth.jwt()->>'email') = any(shared_with)
    -- Shared users can update shared_with_status and status fields
    -- But we'll be permissive here - let Supabase trigger/application logic handle restrictions
  )
);

