-- Simplified email trigger setup
-- Use this if the function URL setup is too complex

-- Create a simpler function that uses pg_net extension
CREATE OR REPLACE FUNCTION public.notify_invite()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
  function_url text;
BEGIN
  -- Replace this URL with your actual Edge Function URL
  -- Find it in: Supabase Dashboard → Functions → send-invite → URL
  function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-invite';

  -- Build payload
  payload := json_build_object('record', row_to_json(NEW));

  -- Call the Edge Function
  PERFORM
    net.http_post(
      url := function_url,
      headers := json_build_object('Content-Type', 'application/json'),
      body := payload::text
    );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Don't fail the insert if email trigger fails
    RAISE WARNING 'Email trigger failed (notification still created): %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_new_notification ON public.notifications;

CREATE TRIGGER on_new_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_invite();

-- Verify trigger exists
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'notifications'
  AND trigger_name = 'on_new_notification';



