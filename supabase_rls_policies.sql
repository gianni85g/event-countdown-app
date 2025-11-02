-- Supabase RLS Policies for Moments App
-- Run these SQL commands in your Supabase SQL Editor

-- Enable RLS on moments table
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own moments" ON moments;
DROP POLICY IF EXISTS "Users can insert their own moments" ON moments;
DROP POLICY IF EXISTS "Users can update their own moments" ON moments;
DROP POLICY IF EXISTS "Users can delete their own moments" ON moments;

-- Policy: Users can view their own moments OR shared moments
CREATE POLICY "Users can view their own moments"
ON public.moments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR (auth.jwt()->>'email') = ANY (shared_with)
);

-- Policy: Users can insert their own moments
CREATE POLICY "Users can insert their own moments"
ON public.moments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own moments
CREATE POLICY "Users can update their own moments"
ON public.moments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own moments
CREATE POLICY "Users can delete their own moments"
ON public.moments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on preparations table
ALTER TABLE preparations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can insert their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can update their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can delete their own preparations" ON preparations;

-- Policy: Users can view preparations for their own moments OR shared moments
CREATE POLICY "Users can view their own preparations"
ON public.preparations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = preparations.moment_id
    AND (
      moments.user_id = auth.uid()
      OR (auth.jwt()->>'email') = ANY (moments.shared_with)
    )
  )
);

-- Policy: Users can insert preparations for their own moments
CREATE POLICY "Users can insert their own preparations"
ON public.preparations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = preparations.moment_id
    AND (
      moments.user_id = auth.uid()
      OR (auth.jwt()->>'email') = ANY (moments.shared_with)
    )
  )
);

-- Policy: Users can update preparations for their own moments
CREATE POLICY "Users can update their own preparations"
ON public.preparations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = preparations.moment_id
    AND moments.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = preparations.moment_id
    AND moments.user_id = auth.uid()
  )
);

-- Policy: Users can delete preparations for their own moments
CREATE POLICY "Users can delete their own preparations"
ON public.preparations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = preparations.moment_id
    AND moments.user_id = auth.uid()
  )
);

-- Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own comments" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Policy: Users can view comments for their own moments
CREATE POLICY "Users can view their own comments"
ON public.comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = comments.moment_id
    AND moments.user_id = auth.uid()
  )
);

-- Policy: Users can insert comments for their own moments
CREATE POLICY "Users can insert their own comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = comments.moment_id
    AND moments.user_id = auth.uid()
  )
);

-- Policy: Users can delete comments for their own moments
CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM moments
    WHERE moments.id = comments.moment_id
    AND moments.user_id = auth.uid()
  )
);

