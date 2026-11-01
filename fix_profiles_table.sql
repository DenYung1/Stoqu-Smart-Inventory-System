-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_login();

-- Create a safer version of the function
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger AS $$
BEGIN
  -- Only update if the profile exists and we have a valid auth.uid()
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    UPDATE profiles 
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with proper permissions
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Ensure the admin user exists in profiles table
INSERT INTO profiles (id, email, role)
SELECT 
  id,
  email,
  'admin'
FROM auth.users 
WHERE email = 'admin@stoqu.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin'
WHERE profiles.email = 'admin@stoqu.com';
