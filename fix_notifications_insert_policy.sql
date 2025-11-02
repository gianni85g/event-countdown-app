-- Fix the INSERT policy for notifications
-- The issue: RLS policy is too strict and blocking inserts
-- Error: "new row violates row-level security policy"

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Create a more permissive policy that matches normalized emails
CREATE POLICY "Users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Match normalized sender with normalized auth email
  lower(trim(sender)) = lower(trim(COALESCE(auth.jwt()->>'email', auth.email())))
);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
AND cmd = 'INSERT';



