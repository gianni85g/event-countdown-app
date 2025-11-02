-- Fix RLS policies for invitation accept/decline (CLEAN VERSION)
-- Run this to fix the Accept/Decline buttons
-- This drops ALL UPDATE policies and creates a fresh one

-- Step 1: Drop ALL possible UPDATE policy names
DROP POLICY IF EXISTS "Users can update moments" ON public.moments;
DROP POLICY IF EXISTS "Users can update their own moments" ON public.moments;
DROP POLICY IF EXISTS "Shared users can update invitation status" ON public.moments;
DROP POLICY IF EXISTS "Owner or shared can update moments" ON public.moments;

-- Step 2: Create the new UPDATE policy that allows:
--   - Owners: full UPDATE access
--   - Shared users: UPDATE access when their email is in shared_with
CREATE POLICY "Users can update moments"
ON public.moments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt()->>'email') = ANY(shared_with)
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    (auth.jwt()->>'email') = ANY(shared_with)
  )
);

-- Verify it was created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'moments' 
AND cmd = 'UPDATE'
ORDER BY policyname;



