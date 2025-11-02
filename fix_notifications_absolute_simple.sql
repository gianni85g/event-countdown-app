-- ABSOLUTE SIMPLEST POSSIBLE INSERT POLICY
-- Just 'true' - no function calls, no checks

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;

-- Literally just allow any authenticated user to insert
-- No checks at all
CREATE POLICY "Insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'INSERT';

-- Also verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'notifications';

-- Test directly
DO $$
DECLARE
  test_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE NOTICE '❌ Not authenticated';
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
    'test@example.com',
    'Absolute simple test',
    '/test',
    false
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ INSERT WORKED! ID: %', test_id;
  DELETE FROM public.notifications WHERE id = test_id;
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ FAILED: %', SQLERRM;
    RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;



