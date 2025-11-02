-- Test notification insert directly in Supabase SQL Editor
-- This will show you if the issue is RLS or something else

-- 1. Check if you're authenticated
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email,
  auth.jwt()->>'email' as jwt_email;

-- 2. Try inserting a test notification
-- Replace 'test@example.com' with the actual recipient email you're trying to share with
INSERT INTO public.notifications (
  recipient,
  sender,
  message,
  link,
  read
)
VALUES (
  'gia.guzzo@gmail.com',  -- Replace with actual recipient
  COALESCE(
    (SELECT email::text FROM auth.users WHERE id = auth.uid()),
    auth.jwt()->>'email',
    auth.email()
  ),  -- Use current user's email as sender
  'Test notification from SQL',
  '/test',
  false
)
RETURNING *;

-- 3. Check what got inserted
SELECT * FROM public.notifications 
WHERE recipient = 'gia.guzzo@gmail.com'  -- Replace with actual recipient
ORDER BY created_at DESC
LIMIT 5;

-- If the INSERT works here, then RLS is fine and the issue is in the app code
-- If the INSERT fails here, then there's still an RLS issue



