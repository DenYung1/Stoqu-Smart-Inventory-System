/*
  # Fix User Signup Database Error

  This migration fixes the "Database error saving new user" issue by:
  1. Ensuring the handle_new_user function has proper error handling
  2. Making sure all required tables exist
  3. Fixing any permission issues with the trigger function
  4. Adding proper fallbacks for user metadata
*/

-- First, let's make sure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'My Business',
  owner_name text NOT NULL DEFAULT 'Business Owner',
  phone text NOT NULL DEFAULT '',
  email text,
  address text,
  currency text NOT NULL DEFAULT 'GHS',
  tax_rate decimal(5,2) NOT NULL DEFAULT 12.5,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  auto_backup boolean DEFAULT true,
  notifications_low_stock boolean DEFAULT true,
  notifications_daily_summary boolean DEFAULT true,
  notifications_weekly_report boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  trial_days integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
DROP POLICY IF EXISTS "Allow system to insert settings" ON settings;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Allow system to insert subscriptions" ON user_subscriptions;

-- Create RLS policies
CREATE POLICY "Users can view their own settings" ON settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow system to insert settings" ON settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans FOR SELECT USING (active = true);

CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow system to insert subscriptions" ON user_subscriptions FOR INSERT WITH CHECK (true);

-- Insert default subscription plans if they don't exist
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('free', 'Free Plan', 0, 'GHS', 'month', '["Basic inventory tracking", "Up to 100 products", "Basic reports"]'::jsonb, 0, true),
('basic', 'Basic Plan', 29, 'GHS', 'month', '["Unlimited products", "Advanced reports", "Supplier management", "Low stock alerts"]'::jsonb, 14, true),
('pro', 'Pro Plan', 59, 'GHS', 'month', '["Everything in Basic", "Multi-location support", "Advanced analytics", "API access", "Priority support"]'::jsonb, 14, true)
ON CONFLICT (id) DO NOTHING;

-- Create or replace the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  business_name_val text;
  owner_name_val text;
  settings_id uuid;
  subscription_id uuid;
BEGIN
  -- Extract business_name and owner_name from user metadata, with fallbacks
  business_name_val := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  owner_name_val := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
  
  -- Insert settings record
  INSERT INTO public.settings (user_id, business_name, owner_name, phone)
  VALUES (NEW.id, business_name_val, owner_name_val, '')
  RETURNING id INTO settings_id;
  
  -- Insert user subscription record
  INSERT INTO public.user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    NEW.id, 
    'free', 
    'trial', 
    now(), 
    now() + interval '14 days',
    now() + interval '1 month'
  )
  RETURNING id INTO subscription_id;
  
  -- Log successful creation (optional, for debugging)
  RAISE NOTICE 'Successfully created user settings (%) and subscription (%) for user %', settings_id, subscription_id, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE NOTICE 'Error in handle_new_user for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Re-raise the error to prevent user creation if setup fails
    RAISE;
END;
$$ language 'plpgsql' security definer;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();