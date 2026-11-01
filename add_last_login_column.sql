-- Add last_login column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NULL;

-- Create or replace function to update last_login
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET last_login = NOW() 
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users table
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login();
