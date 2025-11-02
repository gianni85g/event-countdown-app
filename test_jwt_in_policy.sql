-- Test if JWT email claim is accessible in RLS policies
-- Run this to see what auth.jwt() returns

SELECT 
  auth.uid() as user_id,
  auth.email() as auth_email,
  auth.jwt()->>'email' as jwt_email,
  auth.jwt()->>'sub' as jwt_sub,
  auth.jwt()->>'role' as jwt_role,
  auth.jwt() as full_jwt;

-- If jwt_email is NULL, that's the problem!
-- The JWT doesn't have the email claim, so the policy can't verify it



