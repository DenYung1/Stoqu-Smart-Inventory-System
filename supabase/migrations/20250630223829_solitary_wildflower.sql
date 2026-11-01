/*
  # Add subscription system

  1. New Tables
    - `subscription_plans`
      - `id` (text, primary key)
      - `name` (text)
      - `price` (decimal)
      - `currency` (text)
      - `interval` (text)
      - `features` (jsonb)
      - `trial_days` (integer)
      - `active` (boolean)
    
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `plan_id` (text, foreign key)
      - `status` (text)
      - `trial_start` (timestamptz)
      - `trial_end` (timestamptz)
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for user access
*/

-- Create subscription_plans table
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

-- Create user_subscriptions table
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

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription_plans (public read access)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
  FOR SELECT USING (active = true);

-- Create policies for user_subscriptions (user-specific access)
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days) VALUES
  ('trial', '7-Day Free Trial', 0, 'GHS', 'month', '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb, 7),
  ('starter', 'Starter Plan', 29, 'GHS', 'month', '["Unlimited products", "Advanced analytics", "Sales reporting", "Supplier management", "Low stock alerts", "Email & phone support", "Data export/import"]'::jsonb, 0),
  ('business', 'Business Plan', 49, 'GHS', 'month', '["Everything in Starter", "Multi-location support", "Advanced reporting", "Custom categories", "Priority support", "API access", "White-label options"]'::jsonb, 0),
  ('starter-yearly', 'Starter Plan (Yearly)', 290, 'GHS', 'year', '["Everything in monthly Starter", "2 months free (save 17%)", "Priority email support", "Quarterly business reviews"]'::jsonb, 0),
  ('business-yearly', 'Business Plan (Yearly)', 490, 'GHS', 'year', '["Everything in monthly Business", "2 months free (save 17%)", "Dedicated account manager", "Custom integrations", "Advanced training sessions"]'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period ON user_subscriptions(current_period_start, current_period_end);

-- Create updated_at trigger for subscription tables
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update the handle_new_user function to create a trial subscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert settings record
  INSERT INTO public.settings (user_id, business_name, owner_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner'),
    NEW.email
  );
  
  -- Insert trial subscription
  INSERT INTO public.user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    NEW.id,
    'trial',
    'trial',
    now(),
    now() + interval '7 days',
    now() + interval '7 days'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;