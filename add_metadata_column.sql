-- Add metadata JSONB column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update existing profiles to have metadata
UPDATE profiles 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Update admin profile with proper metadata
UPDATE profiles 
SET metadata = jsonb_build_object(
  'role', 'admin',
  'isAdmin', true
)
WHERE email = 'admin@stoqu.com';
