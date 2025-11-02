-- Fix notifications RLS to work WITHOUT email claim in JWT
-- Uses auth.uid() instead of email-based checks

-- 1. Drop existing policies
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

-- 2. INSERT policy - ANY authenticated user can insert (no email check needed)
CREATE POLICY "Insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);  -- No conditions, just requires authentication

-- 3. SELECT policy - recipient matches JWT email OR can read via user_id lookup
-- This uses a fallback if email is not in JWT
CREATE POLICY "Select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  -- Try JWT email first, fallback to user_id if email is null
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR
  -- Alternative: if we stored user_id, check that instead
  recipient IN (
    SELECT lower(trim(email::text)) 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- 4. UPDATE policy
CREATE POLICY "Update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR
  recipient IN (
    SELECT lower(trim(email::text)) 
    FROM auth.users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR
  recipient IN (
    SELECT lower(trim(email::text)) 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- 5. DELETE policy
CREATE POLICY "Delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
  OR
  recipient IN (
    SELECT lower(trim(email::text)) 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- 6. Verify policies
SELECT 
  policyname,
  cmd,
  with_check,
  qual
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 7. Test INSERT (this should work even without email in JWT)
DO $$
DECLARE
  test_id uuid;
  current_uid uuid;
BEGIN
  current_uid := auth.uid();
  
  RAISE NOTICE 'Current user ID: %', current_uid;
  RAISE NOTICE 'JWT email: %', auth.jwt()->>'email';
  
  IF current_uid IS NULL THEN
    RAISE NOTICE '❌ No authenticated user - cannot test';
    RETURN;
  END IF;
  
  INSERT INTO public.notifications (
    recipient,
    sender,
    message,
    link,
    read
  )
  VALUES (
    'test@example.com',
    COALESCE(auth.jwt()->>'email', (SELECT email::text FROM auth.users WHERE id = current_uid), 'system@example.com'),
    'Test insert without email claim',
    '/test',
    false
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ INSERT TEST PASSED! ID: %', test_id;
  
  DELETE FROM public.notifications WHERE id = test_id;
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ INSERT TEST FAILED: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;



