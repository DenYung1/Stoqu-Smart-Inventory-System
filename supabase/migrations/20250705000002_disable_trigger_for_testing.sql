/*
  # Disable Automatic Trigger for Testing
  
  Temporarily disable the automatic trigger to see if it's causing
  the "Database error saving new user" issue. We'll rely on the 
  manual profile creation in AuthContext.tsx instead.
*/

-- Disable the automatic trigger that might be causing issues during signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- Keep the function but remove the automatic trigger
-- This allows us to test if the trigger is causing the signup failure

-- Add some debugging to help identify the issue
CREATE OR REPLACE FUNCTION debug_auth_signup()
RETURNS json AS $$
DECLARE
  result json;
  trial_count integer;
  settings_count integer;
  subscriptions_count integer;
  auth_users_count integer;
BEGIN
  -- Count records in each table
  SELECT COUNT(*) FROM subscription_plans WHERE id = 'trial' INTO trial_count;
  SELECT COUNT(*) FROM settings INTO settings_count;
  SELECT COUNT(*) FROM user_subscriptions INTO subscriptions_count;
  SELECT COUNT(*) FROM auth.users INTO auth_users_count;
  
  result := json_build_object(
    'trial_plans', trial_count,
    'settings', settings_count,
    'user_subscriptions', subscriptions_count,
    'auth_users', auth_users_count,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_auth_signup TO anon, authenticated;
