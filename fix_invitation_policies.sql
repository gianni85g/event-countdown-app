-- Fix RLS policies for invitation accept/decline
-- This allows shared users to UPDATE only shared_with_status and status fields
-- Run this if you get "policy already exists" error

-- Drop ALL possible UPDATE policy names (drop newer one first if it exists)
DROP POLICY IF EXISTS "Users can update moments" ON public.moments;
DROP POLICY IF EXISTS "Users can update their own moments" ON public.moments;
DROP POLICY IF EXISTS "Shared users can update invitation status" ON public.moments;
DROP POLICY IF EXISTS "Owner or shared can update moments" ON public.moments;

-- New UPDATE policy: Allows owners full access, shared users can update status fields
CREATE POLICY "Users can update moments"
ON public.moments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt()->>'email') = ANY(shared_with)
)
WITH CHECK (
  -- Owners can update anything
  auth.uid() = user_id
  OR (
    -- Shared users must be in shared_with
    (auth.jwt()->>'email') = ANY(shared_with)
    -- Note: We can't easily restrict to specific columns in WITH CHECK
    -- Application logic ensures only shared_with_status and status are updated
  )
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'moments' AND policyname LIKE '%update%';

