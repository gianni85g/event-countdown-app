-- Fix SELECT policy for notifications
-- The RPC function creates notifications successfully, but they can't be read back
-- This is because the SELECT policy is too restrictive

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow select own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- Create a simple SELECT policy that allows reading notifications where:
-- The recipient matches the JWT email (normalized)
-- OR the sender matches (useful for verification)
CREATE POLICY "Select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR
  lower(trim(sender)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- Verify the policy
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'SELECT';

