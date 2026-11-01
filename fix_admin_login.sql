-- First, clean up our previous changes
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_login();

-- Reset admin metadata properly
UPDATE profiles
SET metadata = jsonb_build_object(
  'role', 'admin',
  'isAdmin', true
)
WHERE email = 'admin@stoqu.com';

-- Make sure we have the right permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Set proper RLS policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING (true)
  ON CONFLICT DO NOTHING;
