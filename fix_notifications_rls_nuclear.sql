-- NUCLEAR OPTION: Drop ALL policies and recreate with simplest possible setup
-- This should definitely work

-- Disable RLS temporarily to drop all policies
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (comprehensive list)
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
  END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible INSERT policy
CREATE POLICY "Allow insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create SELECT policy
CREATE POLICY "Allow select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient = COALESCE(auth.jwt()->>'email', (SELECT email::text FROM auth.users WHERE id = auth.uid()))
);

-- Create UPDATE policy
CREATE POLICY "Allow update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  recipient = COALESCE(auth.jwt()->>'email', (SELECT email::text FROM auth.users WHERE id = auth.uid()))
)
WITH CHECK (
  recipient = COALESCE(auth.jwt()->>'email', (SELECT email::text FROM auth.users WHERE id = auth.uid()))
);

-- Create DELETE policy
CREATE POLICY "Allow delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  recipient = COALESCE(auth.jwt()->>'email', (SELECT email::text FROM auth.users WHERE id = auth.uid()))
);

-- Verify
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd;



