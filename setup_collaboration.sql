-- Step 1: Add shared_with column to moments table
ALTER TABLE public.moments
ADD COLUMN IF NOT EXISTS shared_with text[] DEFAULT '{}';

-- Step 2: Drop old policies that don't support collaboration
DROP POLICY IF EXISTS "Users can view their own moments" ON moments;
DROP POLICY IF EXISTS "Users can view their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can insert their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can update their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can delete their own preparations" ON preparations;
DROP POLICY IF EXISTS "Users can view their own comments" ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- Step 3: Create new policy for viewing moments (includes shared)
CREATE POLICY "Users can view their own moments"
ON public.moments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR (auth.jwt()->>'email') = ANY (shared_with));

-- Step 4: Create new policy for viewing preparations (includes shared moments)
CREATE POLICY "Users can view their own preparations"
ON public.preparations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = preparations.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Step 5: Create new policy for inserting preparations (includes shared moments)
CREATE POLICY "Users can insert their own preparations"
ON public.preparations FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = preparations.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Step 6: Create new policy for updating preparations (includes shared moments)
CREATE POLICY "Users can update their own preparations"
ON public.preparations FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = preparations.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = preparations.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Step 7: Create new policy for deleting preparations (includes shared moments)
CREATE POLICY "Users can delete their own preparations"
ON public.preparations FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = preparations.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Step 8: Create new policy for viewing comments (includes shared moments)
CREATE POLICY "Users can view their own comments"
ON public.comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = comments.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Step 9: Create new policy for inserting comments (includes shared moments)
CREATE POLICY "Users can insert their own comments"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = comments.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Step 10: Create new policy for deleting comments (includes shared moments)
CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM moments 
  WHERE moments.id = comments.moment_id 
  AND (moments.user_id = auth.uid() OR (auth.jwt()->>'email') = ANY (moments.shared_with))
));

-- Done! You can now share moments with collaborators by adding their email to the shared_with array.



