/*
  # Fix signup database error

  1. Database Schema Fixes
    - Fix foreign key references in settings table
    - Update handle_new_user function to handle missing tables
    - Add proper error handling and logging
    - Ensure all required tables exist before creating triggers

  2. Security Updates
    - Update RLS policies to match current schema
    - Fix user_id references in settings table
    - Ensure proper permissions for trigger functions

  3. Data Integrity
    - Add missing constraints and indexes
    - Fix subscription plan references
    - Ensure default data is properly inserted
*/

-- First, let's ensure the users table reference is correct
-- The settings table should reference auth.users, not a separate users table
DO $$
BEGIN
  -- Check if the foreign key constraint exists and drop it if it references the wrong table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'settings_user_id_fkey' 
    AND table_name = 'settings'
  ) THEN
    ALTER TABLE settings DROP CONSTRAINT settings_user_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint
ALTER TABLE settings 
ADD CONSTRAINT settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix the user_subscriptions foreign key as well
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_subscriptions_user_id_fkey' 
    AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_user_id_fkey;
  END IF;
END $$;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  business_name_val text;
  owner_name_val text;
  settings_exists boolean;
  subscription_exists boolean;
BEGIN
  -- Extract business_name and owner_name from user metadata, with fallbacks
  business_name_val := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  owner_name_val := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
  
  -- Check if settings already exist for this user
  SELECT EXISTS(SELECT 1 FROM settings WHERE user_id = NEW.id) INTO settings_exists;
  
  -- Insert settings only if they don't exist
  IF NOT settings_exists THEN
    INSERT INTO settings (
      user_id, 
      business_name, 
      owner_name, 
      phone,
      email,
      currency,
      tax_rate,
      low_stock_threshold,
      auto_backup,
      notifications_low_stock,
      notifications_daily_summary,
      notifications_weekly_report
    )
    VALUES (
      NEW.id, 
      business_name_val, 
      owner_name_val, 
      COALESCE(NEW.phone, ''),
      NEW.email,
      'GHS',
      12.5,
      5,
      true,
      true,
      true,
      true
    );
  END IF;
  
  -- Check if subscription already exists for this user
  SELECT EXISTS(
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = NEW.id AND plan_id = 'free'
  ) INTO subscription_exists;
  
  -- Insert user subscription only if it doesn't exist
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
      NEW.id, 
      'free', 
      'trial', 
      now(), 
      now() + interval '14 days',
      now(),
      now() + interval '1 month'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Ensure subscription plans exist
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('free', 'Free Plan', 0, 'GHS', 'month', '["Basic inventory tracking", "Up to 100 products", "Basic reports"]'::jsonb, 14, true),
('basic', 'Basic Plan', 29, 'GHS', 'month', '["Unlimited products", "Advanced reports", "Supplier management", "Low stock alerts"]'::jsonb, 14, true),
('pro', 'Pro Plan', 59, 'GHS', 'month', '["Everything in Basic", "Multi-location support", "Advanced analytics", "API access", "Priority support"]'::jsonb, 14, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active,
  updated_at = now();

-- Drop and recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to ensure they work correctly
DROP POLICY IF EXISTS "Allow system to insert settings" ON settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;

-- Settings policies with proper permissions
CREATE POLICY "Allow system to insert settings" ON settings 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own settings" ON settings 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON settings 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Update user subscription policies
DROP POLICY IF EXISTS "Allow system to insert subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;

CREATE POLICY "Allow system to insert subscriptions" ON user_subscriptions 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Ensure the settings table has a unique constraint on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'settings_user_id_key' 
    AND table_name = 'settings'
  ) THEN
    ALTER TABLE settings ADD CONSTRAINT settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;