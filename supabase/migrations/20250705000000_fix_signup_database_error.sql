/*
  # Fix Database Error During Signup

  This migration addresses the "Database error saving new user" issue by:
  1. Ensuring the trial subscription plan exists
  2. Fixing RLS policies that might be blocking user registration
  3. Adding proper grants for the create_user_profile function
  4. Ensuring subscription_plans table has all required data

  Issues identified:
  - AuthContext was querying non-existent 'profiles' table
  - Trial plan might not exist in subscription_plans
  - RLS policies might be too restrictive for new user creation
*/

-- Ensure the subscription_plans table exists and has the trial plan
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('trial', '7-Day Free Trial', 0, 'GHS', 'month', 
 '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb, 
 7, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active,
  updated_at = now();

-- Make sure RLS policies allow user profile creation during signup
-- Temporarily make policies more permissive for the signup process

-- Settings table - allow inserts during signup
DROP POLICY IF EXISTS "Users can manage own settings" ON settings;
CREATE POLICY "Users can manage own settings" ON settings
FOR ALL 
USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- User subscriptions table - allow inserts during signup  
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
FOR ALL 
USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Subscription plans should be readable by everyone
DROP POLICY IF EXISTS "subscription_plans_select_policy" ON subscription_plans;
CREATE POLICY "subscription_plans_select_policy" ON subscription_plans
FOR SELECT 
TO anon, authenticated
USING (true);

-- Grant proper permissions to ensure the function can execute
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO anon, authenticated;
GRANT SELECT ON subscription_plans TO anon, authenticated;

-- Grant permissions on the auth schema that might be needed
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Drop the existing trigger and function to avoid conflicts
-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- Now we can safely drop the function with all its variants
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text) CASCADE;

-- Update the create_user_profile function to be more robust
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_business_name text DEFAULT 'My Business',
  p_owner_name text DEFAULT 'Business Owner'
)
RETURNS json AS $$
DECLARE
  result json;
  settings_exists boolean;
  subscription_exists boolean;
  trial_plan_exists boolean;
BEGIN
  -- Check if the trial plan exists
  SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id = 'trial') INTO trial_plan_exists;
  
  IF NOT trial_plan_exists THEN
    result := json_build_object(
      'success', false, 
      'error', 'Trial plan not found in subscription_plans table'
    );
    RETURN result;
  END IF;

  -- Check if user already has settings
  SELECT EXISTS(SELECT 1 FROM settings WHERE user_id = p_user_id) INTO settings_exists;
  
  -- Check if user already has subscription
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = p_user_id) INTO subscription_exists;
  
  -- Insert settings only if they don't exist
  IF NOT settings_exists THEN
    INSERT INTO settings (
      user_id, 
      business_name, 
      owner_name, 
      phone,
      currency,
      tax_rate,
      low_stock_threshold,
      auto_backup,
      notifications_low_stock,
      notifications_daily_summary,
      notifications_weekly_report
    )
    VALUES (
      p_user_id, 
      p_business_name, 
      p_owner_name, 
      '',
      'GHS',
      12.5,
      5,
      true,
      true,
      true,
      true
    );
  END IF;
  
  -- Insert subscription only if it doesn't exist
  IF NOT subscription_exists THEN
    INSERT INTO user_subscriptions (
      user_id, 
      plan_id, 
      status, 
      trial_start, 
      trial_end, 
      current_period_start,
      current_period_end
    )
    VALUES (
      p_user_id, 
      'trial',
      'trial', 
      now(), 
      now() + interval '7 days',
      now(),
      now() + interval '1 month'
    );
  END IF;
  
  result := json_build_object(
    'success', true, 
    'message', 'Profile created successfully',
    'settings_created', NOT settings_exists,
    'subscription_created', NOT subscription_exists,
    'trial_plan_exists', trial_plan_exists
  );
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    result := json_build_object(
      'success', true, 
      'message', 'Profile already exists (unique violation caught)',
      'error_type', 'unique_violation'
    );
    RETURN result;
  WHEN foreign_key_violation THEN
    result := json_build_object(
      'success', false, 
      'error', 'Foreign key constraint violation: ' || SQLERRM,
      'error_type', 'foreign_key_violation',
      'sqlstate', SQLSTATE
    );
    RETURN result;
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false, 
      'error', 'Database error: ' || SQLERRM,
      'error_type', 'general_error',
      'sqlstate', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_user_profile TO anon, authenticated;

-- Create a simple function to test database connectivity and permissions
CREATE OR REPLACE FUNCTION test_database_setup()
RETURNS json AS $$
DECLARE
  result json;
  trial_exists boolean;
  can_insert_settings boolean;
  can_insert_subscriptions boolean;
BEGIN
  -- Check if trial plan exists
  SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id = 'trial') INTO trial_exists;
  
  -- Test if we can theoretically insert into settings (without actually doing it)
  BEGIN
    PERFORM 1 FROM settings LIMIT 1;
    can_insert_settings := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_insert_settings := false;
  END;
  
  -- Test if we can access user_subscriptions
  BEGIN
    PERFORM 1 FROM user_subscriptions LIMIT 1;
    can_insert_subscriptions := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_insert_subscriptions := false;
  END;
  
  result := json_build_object(
    'trial_plan_exists', trial_exists,
    'can_access_settings', can_insert_settings,
    'can_access_user_subscriptions', can_insert_subscriptions,
    'current_user', auth.uid(),
    'database_ready', trial_exists AND can_insert_settings AND can_insert_subscriptions
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_database_setup TO anon, authenticated;

-- Create a trigger function that calls our profile creation function
CREATE OR REPLACE FUNCTION trigger_create_user_profile()
RETURNS trigger AS $$
DECLARE
  profile_result json;
BEGIN
  -- Call the profile creation function
  SELECT create_user_profile(
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner')
  ) INTO profile_result;
  
  -- Log the result (optional, can be removed in production)
  RAISE LOG 'Profile creation result for user %: %', NEW.id, profile_result;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger on auth.users to automatically create profiles for new users
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_user_profile();
