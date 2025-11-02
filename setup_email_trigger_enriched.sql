-- Enriched email trigger setup: sends recipient, owner_email, moment_title
-- Requires: pg_net extension (HTTP requests)

-- Enable pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: extract moment_id from a link like '/event/<uuid>'
-- Uses split_part to get substring after '/event/'

CREATE OR REPLACE FUNCTION public.notify_invite()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
  function_url text;
  moment_id uuid;
  m_title text;
  request_id bigint;
  http_status int;
  http_body text;
BEGIN
  -- Function URL provided by user
  function_url := 'https://esecshglcubhjzzsucsx.supabase.co/functions/v1/clever-handler';

  -- Extract moment_id from NEW.link if present
  -- Expected formats: '/event/<uuid>' or '/moment/<uuid>' or '/event/<uuid>?...'
  -- Try '/event/' first
  IF NEW.link IS NOT NULL THEN
    moment_id := NULLIF(split_part(split_part(NEW.link, '/event/', 2), '?', 1), '')::uuid;
    IF moment_id IS NULL THEN
      moment_id := NULLIF(split_part(split_part(NEW.link, '/moment/', 2), '?', 1), '')::uuid;
    END IF;
  END IF;

  -- Look up moment title if we got an ID
  IF moment_id IS NOT NULL THEN
    SELECT title INTO m_title FROM public.moments WHERE id = moment_id;
  END IF;

  -- Build payload compatible with Edge Function (trigger-style)
  payload := json_build_object(
    'record', json_build_object(
      'recipient', NEW.recipient,
      'owner_email', NEW.sender,
      'moment_title', COALESCE(m_title, 'Untitled Moment'),
      'message', NEW.message,
      'link', NEW.link
    )
  );

  RAISE NOTICE 'notify_invite() sending payload to %', function_url;
  RAISE NOTICE 'notify_invite() payload: %', payload::text;

  -- Post to Edge Function (pg_net returns request_id)
  request_id := net.http_post(
    url := function_url,
    headers := json_build_object('Content-Type', 'application/json'),
    body := payload::text
  );

  RAISE NOTICE 'notify_invite() http_post request_id: %', request_id;

  -- Wait for response and log status/body (synchronous)
  PERFORM net.http_wait(request_id);

  SELECT status, content::text
  INTO http_status, http_body
  FROM net.http_get_result(request_id)
  LIMIT 1;

  RAISE NOTICE 'notify_invite() response status: %, body: %', http_status, COALESCE(SUBSTRING(http_body FOR 200), '');

  RETURN NEW;
EXCEPTION
  WHEN others THEN
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
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'notifications' AND trigger_name = 'on_new_notification';
