-- Setup email trigger for notifications
-- This triggers a Supabase Edge Function when a notification is inserted

-- First, create a function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.notify_invite()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
  function_url text;
BEGIN
  -- Get the function URL from environment or use a placeholder
  -- Replace <PROJECT_REF> with your actual Supabase project reference
  -- You can find this in: Supabase Dashboard → Settings → API → Project URL
  function_url := COALESCE(
    current_setting('app.settings.invite_function_url', true),
    'https://<PROJECT_REF>.functions.supabase.co/send-invite'
  );

  -- Build the payload with the new notification record
  payload := json_build_object(
    'record',
    json_build_object(
      'id', NEW.id,
      'recipient', NEW.recipient,
      'sender', NEW.sender,
      'message', NEW.message,
      'link', NEW.link,
      'read', NEW.read,
      'created_at', NEW.created_at
    )
  );

  -- Call the Edge Function via HTTP
  -- Note: This requires the http extension to be enabled
  PERFORM net.http_post(
    url := function_url,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload::text
  );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the insert
    RAISE WARNING 'Failed to trigger email notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_new_notification ON public.notifications;

-- Create the trigger
CREATE TRIGGER on_new_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_invite();

-- Test: Insert a notification and see if trigger fires
-- (This will call the function, but might fail if function URL is not set correctly)
DO $$
DECLARE
  test_id uuid;
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
    COALESCE(auth.jwt()->>'email', 'system@test.com'),
    'Test notification trigger',
    '/test',
    false
  )
  RETURNING id INTO test_id;

  RAISE NOTICE '✅ Test notification created: %', test_id;
  RAISE NOTICE '⚠️ Check Edge Function logs in Supabase Dashboard to see if trigger fired';

  -- Clean up
  DELETE FROM public.notifications WHERE id = test_id;
END $$;



