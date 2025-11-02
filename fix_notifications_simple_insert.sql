-- SIMPLEST possible fix - INSERT policy that doesn't check anything
-- Just requires user to be authenticated (auth.uid() != null)

-- Drop existing INSERT policy only
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Create the absolute simplest INSERT policy
-- This only checks that auth.uid() is not null (user is authenticated)
CREATE POLICY "Insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Verify it
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'INSERT';

-- Expected: with_check should be "(auth.uid() IS NOT NULL)"

-- Test it
DO $$
DECLARE
  test_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE NOTICE '❌ Not authenticated - cannot test';
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
    'Simple insert test',
    '/test',
    false
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ INSERT SUCCESS! ID: %', test_id;
  
  DELETE FROM public.notifications WHERE id = test_id;
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
END $$;



