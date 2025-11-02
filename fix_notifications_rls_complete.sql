-- Complete fix for notifications RLS policies
-- This handles the case where auth.jwt()->>'email' might not match

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Policy 1: Users can view their own notifications
-- Match recipient with user's email (try multiple ways to get email)
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(auth.jwt()->>'email'))
  OR lower(trim(recipient)) = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())::text))
);

-- Policy 2: Users can insert notifications (when sharing)
-- Allow INSERT if sender matches authenticated user's email
-- This is more permissive - we check both sides are normalized
CREATE POLICY "Users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Try multiple ways to get the user's email and match with sender
  lower(trim(sender)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR lower(trim(sender)) = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())::text))
  OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND lower(trim(email)) = lower(trim(sender))
  )
);

-- Policy 3: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR lower(trim(recipient)) = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())::text))
)
WITH CHECK (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR lower(trim(recipient)) = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())::text))
);

-- Policy 4: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR lower(trim(recipient)) = lower(trim((SELECT email FROM auth.users WHERE id = auth.uid())::text))
);

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname, cmd;



