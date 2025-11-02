-- Complete fix for collaboration - RLS policies for tasks and comments
-- This ensures tasks and comments are only visible to the moment owner or collaborators

-- Enable RLS on preparations table
ALTER TABLE public.preparations ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Owner or shared can view preparations" ON public.preparations;
DROP POLICY IF EXISTS "Owner or shared can modify preparations" ON public.preparations;
DROP POLICY IF EXISTS "Users can view their own preparations" ON public.preparations;
DROP POLICY IF EXISTS "Users can insert their own preparations" ON public.preparations;
DROP POLICY IF EXISTS "Users can update their own preparations" ON public.preparations;
DROP POLICY IF EXISTS "Users can delete their own preparations" ON public.preparations;

-- Create single comprehensive policy for preparations (SELECT)
CREATE POLICY "Owner or shared can view preparations"
ON public.preparations
FOR SELECT
TO authenticated
USING (
  auth.uid() = (SELECT user_id FROM public.moments WHERE id = moment_id)
  OR EXISTS (
    SELECT 1 FROM public.moments 
    WHERE id = moment_id 
    AND (auth.jwt()->>'email') = ANY(shared_with)
  )
);

-- Create single comprehensive policy for preparations (INSERT, UPDATE, DELETE)
CREATE POLICY "Owner or shared can modify preparations"
ON public.preparations
FOR ALL
TO authenticated
USING (
  auth.uid() = (SELECT user_id FROM public.moments WHERE id = moment_id)
  OR EXISTS (
    SELECT 1 FROM public.moments 
    WHERE id = moment_id 
    AND (auth.jwt()->>'email') = ANY(shared_with)
  )
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.moments WHERE id = moment_id)
  OR EXISTS (
    SELECT 1 FROM public.moments 
    WHERE id = moment_id 
    AND (auth.jwt()->>'email') = ANY(shared_with)
  )
);

-- Enable RLS on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Owner or shared can view comments" ON public.comments;
DROP POLICY IF EXISTS "Owner or shared can modify comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create single comprehensive policy for comments (SELECT)
CREATE POLICY "Owner or shared can view comments"
ON public.comments
FOR SELECT
TO authenticated
USING (
  auth.uid() = (SELECT user_id FROM public.moments WHERE id = moment_id)
  OR EXISTS (
    SELECT 1 FROM public.moments 
    WHERE id = moment_id 
    AND (auth.jwt()->>'email') = ANY(shared_with)
  )
);

-- Create single comprehensive policy for comments (INSERT, UPDATE, DELETE)
CREATE POLICY "Owner or shared can modify comments"
ON public.comments
FOR ALL
TO authenticated
USING (
  auth.uid() = (SELECT user_id FROM public.moments WHERE id = moment_id)
  OR EXISTS (
    SELECT 1 FROM public.moments 
    WHERE id = moment_id 
    AND (auth.jwt()->>'email') = ANY(shared_with)
  )
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.moments WHERE id = moment_id)
  OR EXISTS (
    SELECT 1 FROM public.moments 
    WHERE id = moment_id 
    AND (auth.jwt()->>'email') = ANY(shared_with)
  )
);

-- Done! Now tasks and comments are properly isolated per moment and sharing rules.
