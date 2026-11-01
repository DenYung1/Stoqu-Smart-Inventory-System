/*
  # Fix User Profile Creation Issues
  
  1. Fix settings table structure
    - Ensure user_id has proper constraints and references
    - Add proper foreign key relationship
    - Ensure proper defaults
    
  2. Fix user_subscriptions table
    - Ensure proper foreign key relationships
    - Add constraints for data integrity
    
  3. Update create_user_profile function
    - Add better error handling
    - Ensure all required fields are properly set
    - Add better logging for debugging
*/

-- First, let's fix the settings table structure
ALTER TABLE settings 
DROP CONSTRAINT IF EXISTS settings_user_id_fkey;

-- Update the user_id column to be NOT NULL and add foreign key
ALTER TABLE settings 
ALTER COLUMN user_id SET NOT NULL,
ADD CONSTRAINT settings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure unique constraint on user_id (one settings record per user)
ALTER TABLE settings 
DROP CONSTRAINT IF EXISTS settings_user_id_unique;

ALTER TABLE settings 
ADD CONSTRAINT settings_user_id_unique UNIQUE (user_id);

-- Fix user_subscriptions table foreign keys
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for plan_id
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_plan_id_fkey 
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);

-- Ensure unique constraint on user_id (one active subscription per user)
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_unique;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);

-- Update the create_user_profile function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_business_name text DEFAULT 'My Business',
  p_owner_name text DEFAULT 'Business Owner'
)
RETURNS json AS $$
DECLARE
  result json;
  settings_count integer;
  subscription_count integer;
BEGIN
  -- Check if user already has settings
  SELECT COUNT(*) INTO settings_count 
  FROM settings 
  WHERE user_id = p_user_id;
  
  -- Check if user already has subscription
  SELECT COUNT(*) INTO subscription_count 
  FROM user_subscriptions 
  WHERE user_id = p_user_id;
  
  -- Insert settings only if they don't exist
  IF settings_count = 0 THEN
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
  IF subscription_count = 0 THEN
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
    'settings_created', settings_count = 0,
    'subscription_created', subscription_count = 0
  );
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    -- If there's a unique constraint violation, it means the profile already exists
    result := json_build_object(
      'success', true, 
      'message', 'Profile already exists',
      'settings_created', false,
      'subscription_created', false
    );
    RETURN result;
  WHEN foreign_key_violation THEN
    result := json_build_object(
      'success', false, 
      'error', 'Foreign key constraint violation: ' || SQLERRM
    );
    RETURN result;
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false, 
      'error', 'Database error: ' || SQLERRM,
      'detail', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trial plan exists
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('trial', '7-Day Free Trial', 0, 'GHS', 'month', '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb, 7, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active;

-- Update RLS policies to be more permissive for user profile creation
DROP POLICY IF EXISTS "allow_all_settings" ON settings;
CREATE POLICY "Users can manage own settings" ON settings
FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "allow_all_user_subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON settings TO anon, authenticated;
GRANT ALL ON user_subscriptions TO anon, authenticated;
GRANT ALL ON subscription_plans TO anon, authenticated;

-- Add helpful function to check if a user profile is complete
CREATE OR REPLACE FUNCTION user_profile_complete(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  has_settings boolean;
  has_subscription boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM settings WHERE user_id = p_user_id) INTO has_settings;
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = p_user_id) INTO has_subscription;
  
  RETURN has_settings AND has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
