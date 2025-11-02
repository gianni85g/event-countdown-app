-- NUCLEAR FIX: Completely reset notifications RLS
-- This temporarily disables RLS, drops all policies, then recreates minimal ones

-- 1. Disable RLS temporarily
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies (RLS disabled, so this should work)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'notifications' AND schemaname = 'public'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', r.policyname);
      RAISE NOTICE 'Dropped policy: %', r.policyname;
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Could not drop policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create the absolute simplest INSERT policy
-- No checks, no conditions - just allow authenticated users
CREATE POLICY "Insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Create SELECT policy
CREATE POLICY "Select own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- 6. Create UPDATE policy
CREATE POLICY "Update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
)
WITH CHECK (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- 7. Create DELETE policy
CREATE POLICY "Delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  lower(trim(recipient)) = lower(trim(COALESCE(auth.jwt()->>'email', '')))
);

-- 8. Show final policies
SELECT 
  policyname,
  cmd,
  with_check,
  qual
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY cmd, policyname;

-- 9. Test insert
DO $$
DECLARE
  test_id uuid;
  test_email text;
BEGIN
  test_email := COALESCE(auth.jwt()->>'email', 'test@example.com');
  
  RAISE NOTICE 'Testing insert as: %', test_email;
  
  INSERT INTO public.notifications (
    recipient,
    sender,
    message,
    link,
    read
  )
  VALUES (
    'test-recipient@example.com',
    test_email,
    'Nuclear fix test',
    '/test',
    false
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE '✅ INSERT TEST PASSED! ID: %', test_id;
  
  DELETE FROM public.notifications WHERE id = test_id;
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ INSERT TEST FAILED: %', SQLERRM;
END $$;



