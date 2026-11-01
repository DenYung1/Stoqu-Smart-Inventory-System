-- Clean up all triggers and functions
DROP TRIGGER IF EXISTS sync_last_sign_in_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP FUNCTION IF EXISTS public.sync_last_sign_in();
DROP FUNCTION IF EXISTS public.handle_user_login();

-- Make sure profiles table has metadata
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Reset admin metadata properly (this won't affect login)
UPDATE profiles
SET metadata = jsonb_build_object(
  'role', 'admin',
  'isAdmin', true
)
WHERE email = 'admin@stoqu.com';

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Make sure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Basic policies (if they don't exist)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING (true);
