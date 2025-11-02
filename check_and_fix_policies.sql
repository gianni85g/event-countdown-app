-- Check current policies and fix any issues
-- This shows you what policies exist and fixes them

-- 1. Show ALL current policies
SELECT 
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 2. Drop ALL policies (including any with typos like "insrt")
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- 3. Create clean, simple INSERT policy
CREATE POLICY "Allow authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Create SELECT policy
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient = lower(trim(COALESCE(auth.jwt()->>'email', (SELECT email::text FROM auth.users WHERE id = auth.uid()))))
);

-- 5. Verify the new policies
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;



