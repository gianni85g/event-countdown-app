-- Test queries to verify notifications setup
-- Run these in Supabase SQL Editor to diagnose issues

-- 1. Check if table exists and structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 3. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- 4. Test: Check all notifications (run as authenticated user)
SELECT * FROM public.notifications
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test: Check notifications for a specific email (replace with actual email)
-- SELECT * FROM public.notifications
-- WHERE recipient = 'your-email@example.com'
-- ORDER BY created_at DESC;



