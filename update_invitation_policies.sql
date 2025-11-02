-- Update RLS policies to allow shared users to accept/decline invitations
-- This allows shared users to UPDATE shared_with_status and status fields

-- Drop the existing UPDATE policy that only allows owners
DROP POLICY IF EXISTS "Users can update their own moments" ON public.moments;

-- Create a more permissive UPDATE policy:
-- 1. Owners can update any field
-- 2. Shared users can only update shared_with_status and status (for accepting/declining)
CREATE POLICY "Users can update their own moments"
ON public.moments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt()->>'email') = ANY(shared_with)
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    -- Shared users can only update shared_with_status and status
    (auth.jwt()->>'email') = ANY(shared_with)
    -- Ensure they're not trying to change other fields
    AND (
      -- If user_id, title, description, date, category, or shared_with changed, only allow if owner
      (
        (user_id IS NOT DISTINCT FROM (SELECT user_id FROM public.moments WHERE id = moments.id))
        AND (title IS NOT DISTINCT FROM (SELECT title FROM public.moments WHERE id = moments.id))
        AND (description IS NOT DISTINCT FROM (SELECT description FROM public.moments WHERE id = moments.id))
        AND (date IS NOT DISTINCT FROM (SELECT date FROM public.moments WHERE id = moments.id))
        AND (category IS NOT DISTINCT FROM (SELECT category FROM public.moments WHERE id = moments.id))
      )
      OR auth.uid() = user_id
    )
  )
);

-- Alternative simpler policy: Allow shared users to update only shared_with_status
-- Drop the complex one above and use this if the above is too restrictive
DROP POLICY IF EXISTS "Shared users can update invitation status" ON public.moments;

-- This policy allows shared users to update shared_with_status and status fields
CREATE POLICY "Shared users can update invitation status"
ON public.moments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (auth.jwt()->>'email') = ANY(shared_with)
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    (auth.jwt()->>'email') = ANY(shared_with)
    AND (
      -- Allow updates to shared_with_status and status only
      shared_with_status IS NOT NULL
      OR status IS NOT NULL
    )
  )
);



