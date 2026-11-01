-- First ensure the metadata column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update metadata for existing profiles if needed
UPDATE profiles 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- Create a secure function to update last login
CREATE OR REPLACE FUNCTION update_last_login(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{last_login}',
    to_jsonb(now()::text)
  )
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_last_login TO authenticated;

-- Create a policy to allow users to update their own metadata
DROP POLICY IF EXISTS "Users can update own metadata" ON profiles;
CREATE POLICY "Users can update own metadata"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
