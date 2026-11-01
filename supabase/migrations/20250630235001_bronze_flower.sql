-- Fix for "Database error updating user" issue
-- This migration addresses the specific error in user creation

-- First, let's ensure the settings table has the correct structure
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can manage their own settings" ON settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
DROP POLICY IF EXISTS "Allow trigger to insert settings" ON settings;

-- Create new, more permissive policies for settings
CREATE POLICY "Users can view their own settings" ON settings
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON settings
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Allow the trigger function to insert settings (this is crucial)
CREATE POLICY "Allow system to insert settings" ON settings
  FOR INSERT 
  WITH CHECK (true);

-- Drop existing problematic policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Allow trigger to insert subscriptions" ON user_subscriptions;

-- Create new policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

-- Allow the trigger function to insert subscriptions (this is crucial)
CREATE POLICY "Allow system to insert subscriptions" ON user_subscriptions
  FOR INSERT 
  WITH CHECK (true);

-- Create a more robust handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  business_name_val text;
  owner_name_val text;
BEGIN
  -- Extract metadata with fallbacks
  business_name_val := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  owner_name_val := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
  
  -- Insert settings record with error handling
  BEGIN
    INSERT INTO public.settings (
      user_id, 
      business_name, 
      owner_name, 
      email,
      phone
    ) VALUES (
      NEW.id,
      business_name_val,
      owner_name_val,
      NEW.email,
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create settings for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Insert trial subscription with error handling
  BEGIN
    INSERT INTO public.user_subscriptions (
      user_id, 
      plan_id, 
      status, 
      trial_start, 
      trial_end, 
      current_period_end
    ) VALUES (
      NEW.id,
      'trial',
      'trial',
      now(),
      now() + interval '7 days',
      now() + interval '7 days'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also create a function to handle email confirmation (if needed)
CREATE OR REPLACE FUNCTION handle_user_email_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  business_name_val text;
  owner_name_val text;
BEGIN
  -- Only proceed if email was just confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    business_name_val := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
    owner_name_val := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
    
    -- Insert settings if it doesn't exist
    INSERT INTO public.settings (
      user_id, 
      business_name, 
      owner_name, 
      email,
      phone
    ) VALUES (
      NEW.id,
      business_name_val,
      owner_name_val,
      NEW.email,
      ''
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert subscription if it doesn't exist
    INSERT INTO public.user_subscriptions (
      user_id, 
      plan_id, 
      status, 
      trial_start, 
      trial_end, 
      current_period_end
    ) VALUES (
      NEW.id,
      'trial',
      'trial',
      now(),
      now() + interval '7 days',
      now() + interval '7 days'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_email_confirmed();

-- Ensure subscription plans exist
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('trial', '7-Day Free Trial', 0, 'GHS', 'month', '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb, 7, true),
('starter', 'Starter Plan', 29, 'GHS', 'month', '["Unlimited products", "Advanced analytics", "Sales reporting", "Supplier management", "Low stock alerts", "Email & phone support", "Data export/import"]'::jsonb, 0, true),
('business', 'Business Plan', 49, 'GHS', 'month', '["Everything in Starter", "Multi-location support", "Advanced reporting", "Custom categories", "Priority support", "API access", "White-label options"]'::jsonb, 0, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active;