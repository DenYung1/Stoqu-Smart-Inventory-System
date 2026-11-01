/*
  # Comprehensive Signup Database Error Fix
  
  This migration combines all the fixes needed for successful user signup:
  1. Ensures subscription_plans table has trial plan
  2. Fixes all RLS policies to allow signup
  3. Grants proper permissions
  4. Creates a robust create_user_profile function
  5. Sets up proper triggers
  
  Based on existing migrations: 20250702000000_fix_user_profile_creation.sql
*/

-- Step 1: Ensure subscription_plans table exists and has trial plan
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  interval text NOT NULL DEFAULT 'month',
  features jsonb DEFAULT '[]'::jsonb,
  trial_days integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert trial plan
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('trial', '7-Day Free Trial', 0, 'GHS', 'month', 
 '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb, 
 7, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active,
  updated_at = now();

-- Step 2: Ensure tables exist with proper structure
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL DEFAULT 'My Business',
  owner_name text NOT NULL DEFAULT 'Business Owner',
  phone text DEFAULT '',
  address text DEFAULT '',
  currency text DEFAULT 'GHS',
  tax_rate decimal(5,2) DEFAULT 12.5,
  low_stock_threshold integer DEFAULT 5,
  auto_backup boolean DEFAULT true,
  notifications_low_stock boolean DEFAULT true,
  notifications_daily_summary boolean DEFAULT true,
  notifications_weekly_report boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  status text NOT NULL DEFAULT 'trial',
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz DEFAULT (now() + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Clean up orphaned data before adding constraints
-- Remove settings records that reference non-existent users
DELETE FROM settings 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove user_subscriptions records that reference non-existent users
DELETE FROM user_subscriptions 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove user_subscriptions records that reference non-existent plans
DELETE FROM user_subscriptions 
WHERE plan_id NOT IN (SELECT id FROM subscription_plans);

-- Step 4: Add proper constraints (only if they don't exist)
DO $$ 
BEGIN
  -- Settings constraints
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'settings_user_id_fkey') THEN
    ALTER TABLE settings 
    ADD CONSTRAINT settings_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'settings_user_id_unique') THEN
    ALTER TABLE settings 
    ADD CONSTRAINT settings_user_id_unique UNIQUE (user_id);
  END IF;

  -- User subscriptions constraints
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'user_subscriptions_user_id_fkey') THEN
    ALTER TABLE user_subscriptions 
    ADD CONSTRAINT user_subscriptions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'user_subscriptions_plan_id_fkey') THEN
    ALTER TABLE user_subscriptions 
    ADD CONSTRAINT user_subscriptions_plan_id_fkey 
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'user_subscriptions_user_id_unique') THEN
    ALTER TABLE user_subscriptions 
    ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Step 5: Enable RLS on all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create permissive RLS policies for signup
DROP POLICY IF EXISTS "subscription_plans_select_policy" ON subscription_plans;
CREATE POLICY "subscription_plans_select_policy" ON subscription_plans
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "settings_all_policy" ON settings;
CREATE POLICY "settings_all_policy" ON settings
FOR ALL TO anon, authenticated
USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "user_subscriptions_all_policy" ON user_subscriptions;
CREATE POLICY "user_subscriptions_all_policy" ON user_subscriptions
FOR ALL TO anon, authenticated
USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Step 7: Grant comprehensive permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

GRANT ALL ON subscription_plans TO anon, authenticated;
GRANT ALL ON settings TO anon, authenticated;
GRANT ALL ON user_subscriptions TO anon, authenticated;

GRANT SELECT ON auth.users TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Step 8: Drop existing functions to avoid conflicts
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS trigger_create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text) CASCADE;

-- Step 9: Create the most robust create_user_profile function
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
  error_message text;
BEGIN
  -- Log the function call for debugging
  RAISE LOG 'create_user_profile called for user: %, business: %, owner: %', 
    p_user_id, p_business_name, p_owner_name;

  -- Check if the trial plan exists
  SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id = 'trial' AND active = true) 
  INTO trial_plan_exists;
  
  IF NOT trial_plan_exists THEN
    error_message := 'Trial plan not found or inactive in subscription_plans table';
    RAISE LOG 'ERROR: %', error_message;
    result := json_build_object(
      'success', false, 
      'error', error_message
    );
    RETURN result;
  END IF;

  -- Check existing records
  SELECT EXISTS(SELECT 1 FROM settings WHERE user_id = p_user_id) INTO settings_exists;
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = p_user_id) INTO subscription_exists;
  
  RAISE LOG 'User % - settings_exists: %, subscription_exists: %', 
    p_user_id, settings_exists, subscription_exists;

  -- Insert settings only if they don't exist
  IF NOT settings_exists THEN
    RAISE LOG 'Inserting settings for user: %', p_user_id;
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
    RAISE LOG 'Settings inserted successfully for user: %', p_user_id;
  ELSE
    RAISE LOG 'Settings already exist for user: %', p_user_id;
  END IF;
  
  -- Insert subscription only if it doesn't exist
  IF NOT subscription_exists THEN
    RAISE LOG 'Inserting subscription for user: %', p_user_id;
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
    RAISE LOG 'Subscription inserted successfully for user: %', p_user_id;
  ELSE
    RAISE LOG 'Subscription already exists for user: %', p_user_id;
  END IF;
  
  result := json_build_object(
    'success', true, 
    'message', 'Profile created successfully',
    'settings_created', NOT settings_exists,
    'subscription_created', NOT subscription_exists,
    'trial_plan_exists', trial_plan_exists
  );
  
  RAISE LOG 'create_user_profile completed successfully for user: %', p_user_id;
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    error_message := 'Profile already exists (unique constraint)';
    RAISE LOG 'EXCEPTION unique_violation for user %: %', p_user_id, SQLERRM;
    result := json_build_object(
      'success', true, 
      'message', error_message,
      'error_type', 'unique_violation'
    );
    RETURN result;
  WHEN foreign_key_violation THEN
    error_message := 'Foreign key constraint violation: ' || SQLERRM;
    RAISE LOG 'EXCEPTION foreign_key_violation for user %: %', p_user_id, SQLERRM;
    result := json_build_object(
      'success', false, 
      'error', error_message,
      'error_type', 'foreign_key_violation',
      'sqlstate', SQLSTATE
    );
    RETURN result;
  WHEN OTHERS THEN
    error_message := 'Database error: ' || SQLERRM;
    RAISE LOG 'EXCEPTION OTHERS for user %: %, SQLSTATE: %', p_user_id, SQLERRM, SQLSTATE;
    result := json_build_object(
      'success', false, 
      'error', error_message,
      'error_type', 'general_error',
      'sqlstate', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_user_profile TO anon, authenticated;

-- Step 11: Create trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION trigger_create_user_profile()
RETURNS trigger AS $$
DECLARE
  profile_result json;
  business_name text;
  owner_name text;
BEGIN
  -- Extract business name and owner name from user metadata
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  owner_name := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
  
  RAISE LOG 'Trigger: Creating profile for user % with business: %, owner: %', 
    NEW.id, business_name, owner_name;

  -- Call the profile creation function
  SELECT create_user_profile(NEW.id, business_name, owner_name) INTO profile_result;
  
  -- Log the result
  RAISE LOG 'Trigger: Profile creation result for user %: %', NEW.id, profile_result;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_user_profile();

-- Step 13: Create test function
CREATE OR REPLACE FUNCTION test_database_setup()
RETURNS json AS $$
DECLARE
  result json;
  trial_exists boolean;
  can_access_settings boolean;
  can_access_subscriptions boolean;
  settings_count integer;
  subscriptions_count integer;
BEGIN
  -- Check if trial plan exists
  SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id = 'trial' AND active = true) 
  INTO trial_exists;
  
  -- Test access to tables
  BEGIN
    SELECT COUNT(*) FROM settings INTO settings_count;
    can_access_settings := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_access_settings := false;
      settings_count := -1;
  END;
  
  BEGIN
    SELECT COUNT(*) FROM user_subscriptions INTO subscriptions_count;
    can_access_subscriptions := true;
  EXCEPTION
    WHEN OTHERS THEN
      can_access_subscriptions := false;
      subscriptions_count := -1;
  END;
  
  result := json_build_object(
    'trial_plan_exists', trial_exists,
    'can_access_settings', can_access_settings,
    'can_access_user_subscriptions', can_access_subscriptions,
    'settings_count', settings_count,
    'subscriptions_count', subscriptions_count,
    'current_user', auth.uid(),
    'database_ready', trial_exists AND can_access_settings AND can_access_subscriptions
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_database_setup TO anon, authenticated;
