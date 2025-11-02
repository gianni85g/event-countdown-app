-- Create a database function to insert notifications
-- This bypasses RLS by using SECURITY DEFINER
-- Only the function owner (postgres) executes it, not the caller

CREATE OR REPLACE FUNCTION public.create_notification(
  p_recipient text,
  p_sender text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Insert the notification
  INSERT INTO public.notifications (
    recipient,
    sender,
    message,
    link,
    read,
    created_at
  )
  VALUES (
    p_recipient,
    p_sender,
    p_message,
    p_link,
    false,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- Test the function
DO $$
DECLARE
  test_id uuid;
BEGIN
  test_id := public.create_notification(
    'test@example.com',
    COALESCE(auth.jwt()->>'email', 'system@test.com'),
    'Function test',
    '/test'
  );
  
  RAISE NOTICE '✅ Function test passed! ID: %', test_id;
  
  -- Clean up
  DELETE FROM public.notifications WHERE id = test_id;
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ Function test failed: %', SQLERRM;
END $$;



