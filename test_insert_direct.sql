-- Test INSERT directly to see if the policy works at all
-- Replace 'test@example.com' with a real recipient email

-- First, check your auth status
SELECT 
  auth.uid() as user_id,
  auth.jwt()->>'email' as jwt_email,
  auth.jwt()->>'role' as jwt_role,
  CASE WHEN auth.uid() IS NOT NULL THEN 'Authenticated' ELSE 'Not authenticated' END as auth_status;

-- Try inserting
INSERT INTO public.notifications (
  recipient,
  sender,
  message,
  link,
  read
)
VALUES (
  'test-recipient@example.com',  -- Change this to test recipient
  COALESCE(auth.jwt()->>'email', 'system@test.com'),  -- Will be null but that's ok
  'Direct SQL test',
  '/test',
  false
)
RETURNING *;

-- If this works, then the policy is correct and the issue is in the app client
-- If this fails, then there's still a policy issue



