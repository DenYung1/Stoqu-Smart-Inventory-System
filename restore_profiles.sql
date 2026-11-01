-- First, clean up all our previous changes
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_login();

-- Remove last_login column if it's causing issues
ALTER TABLE profiles DROP COLUMN IF EXISTS last_login;
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Now recreate profiles table structure safely
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  CONSTRAINT profiles_email_key UNIQUE (email)
);

-- Reset permissions to default
REVOKE ALL ON profiles FROM authenticated;
REVOKE ALL ON profiles FROM anon;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Basic policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile."
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Make sure admin exists in auth.users (this won't affect existing users)
INSERT INTO profiles (id, email)
SELECT id, email
FROM auth.users
WHERE email = 'admin@stoqu.com'
ON CONFLICT (id) DO NOTHING;
