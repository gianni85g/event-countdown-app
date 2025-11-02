-- FINAL FIX: Drop ALL policies and recreate with working INSERT policy
-- This ensures no conflicts and proper permissions

-- Step 1: Drop ALL existing policies (order matters)
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Step 2: Verify RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple permissive INSERT policy (any authenticated user can insert)
CREATE POLICY "Allow authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 4: Create SELECT policy (users can view their own)
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR recipient = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Step 5: Create UPDATE policy
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR recipient = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR recipient = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Step 6: Create DELETE policy
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR recipient = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Step 7: Verify all policies exist
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- Step 8: Test query (should show policies)
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
WHERE tablename = 'notifications';



