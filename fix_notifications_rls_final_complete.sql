-- Complete fix for notifications RLS
-- This drops ALL policies and recreates them with the simplest possible checks

-- 1. Show current policies (for reference)
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 2. Drop ALL existing policies using a DO block
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'notifications' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- 3. Create the simplest possible INSERT policy
-- This should work for ANY authenticated user
CREATE POLICY "Allow authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Create SELECT policy (only recipient can read)
CREATE POLICY "Allow select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- 5. Create UPDATE policy (only recipient can update)
CREATE POLICY "Allow update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
)
WITH CHECK (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- 6. Create DELETE policy (only recipient can delete)
CREATE POLICY "Allow delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- 7. Verify the new policies
SELECT 
  policyname,
  cmd,
  with_check,
  qual
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 8. Test INSERT directly (this should work if you're logged in as any user)
-- Replace 'test@example.com' with a test email
DO $$
DECLARE
  test_id uuid;
  current_user_email text;
BEGIN
  -- Get current user's email from JWT
  current_user_email := COALESCE(
    auth.jwt()->>'email',
    (SELECT email::text FROM auth.users WHERE id = auth.uid())
  );
  
  RAISE NOTICE 'Current user email: %', current_user_email;
  RAISE NOTICE 'Current user ID: %', auth.uid();
  
  -- Try to insert
  INSERT INTO public.notifications (
    recipient,
    sender,
    message,
    link,
    read
  )
  VALUES (
    'test@example.com',  -- Replace with test recipient
    current_user_email,
    'Test notification',
    '/test',
    false
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ INSERT SUCCESSFUL! Notification ID: %', test_id;
  
  -- Clean up
  DELETE FROM public.notifications WHERE id = test_id;
  RAISE NOTICE '✅ Test notification cleaned up';
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;



