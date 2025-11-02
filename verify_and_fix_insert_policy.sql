-- Verify and fix the INSERT policy for notifications
-- This ensures the policy is correctly configured

-- 1. Drop the existing INSERT policy (if it exists)
DROP POLICY IF EXISTS "Allow insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;

-- 2. Create a fresh INSERT policy with the simplest possible check
-- This allows ANY authenticated user to insert
CREATE POLICY "Allow authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Verify it was created
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'INSERT';

-- Expected output should show:
-- | Allow authenticated insert notifications | INSERT | PERMISSIVE | {authenticated} | null | true |

-- 4. Test insert (replace with your actual email)
-- This should work if you're logged into Supabase
DO $$
DECLARE
  test_result text;
BEGIN
  INSERT INTO public.notifications (
    recipient,
    sender,
    message,
    link,
    read
  )
  VALUES (
    'test@example.com',
    COALESCE(
      (SELECT email::text FROM auth.users WHERE id = auth.uid()),
      auth.jwt()->>'email'
    ),
    'Test from policy verification',
    '/test',
    false
  )
  RETURNING id::text INTO test_result;
  
  RAISE NOTICE '✅ Insert successful! Notification ID: %', test_result;
  
  -- Clean up test
  DELETE FROM public.notifications WHERE id::text = test_result;
  RAISE NOTICE '✅ Test notification cleaned up';
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ Insert failed: %', SQLERRM;
END $$;



