-- Diagnostic: Check current RLS setup for notifications table

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- 2. List ALL existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 3. Test: Try to manually insert a notification (replace with your email)
-- This will show the exact error
/*
INSERT INTO public.notifications (recipient, sender, message, link, read)
VALUES ('test@example.com', 'your-email@example.com', 'Test notification', '/test', false);
*/



