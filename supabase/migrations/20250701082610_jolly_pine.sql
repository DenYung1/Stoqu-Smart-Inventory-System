/*
  # Fix Subscription Plans for Upgrade Modal

  1. Updates
    - Add all subscription plans (Starter, Business, Yearly plans)
    - Update existing plans with correct features and pricing
    - Ensure trial plan is properly configured
    - Add popular flag to recommended plans

  2. Data
    - Insert all missing subscription plans
    - Update features to be more comprehensive
    - Set proper trial days (7 days for trial plan)
*/

-- First, let's update the existing free plan to be the trial plan
UPDATE subscription_plans 
SET 
  id = 'trial',
  name = '7-Day Free Trial',
  price = 0,
  currency = 'GHS',
  interval = 'month',
  features = '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb,
  trial_days = 7,
  active = true
WHERE id = 'free';

-- Insert all the subscription plans that should be available
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
-- Monthly Plans
('starter', 'Starter Plan', 29, 'GHS', 'month', '[
  "Unlimited products",
  "Advanced analytics", 
  "Sales reporting",
  "Supplier management",
  "Low stock alerts",
  "Email & phone support",
  "Data export/import",
  "Cloud backup & sync"
]'::jsonb, 0, true),

('business', 'Business Plan', 49, 'GHS', 'month', '[
  "Everything in Starter",
  "Multi-location support", 
  "Advanced reporting",
  "Custom categories",
  "Priority support",
  "API access",
  "White-label options",
  "Advanced integrations"
]'::jsonb, 0, true),

-- Yearly Plans (with discount)
('starter-yearly', 'Starter Plan (Yearly)', 290, 'GHS', 'year', '[
  "Everything in monthly Starter",
  "2 months free (save 17%)",
  "Priority email support", 
  "Quarterly business reviews",
  "Extended data retention"
]'::jsonb, 0, true),

('business-yearly', 'Business Plan (Yearly)', 490, 'GHS', 'year', '[
  "Everything in monthly Business",
  "2 months free (save 17%)",
  "Dedicated account manager",
  "Custom integrations", 
  "Advanced training sessions",
  "Priority feature requests"
]'::jsonb, 0, true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active,
  updated_at = now();

-- Add popular flag to the starter plan (most recommended)
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS popular boolean DEFAULT false;

-- Set the starter plan as popular
UPDATE subscription_plans SET popular = true WHERE id = 'starter';

-- Update the create_user_profile function to use the trial plan
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_business_name text DEFAULT 'My Business',
  p_owner_name text DEFAULT 'Business Owner'
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Insert settings
  INSERT INTO settings (user_id, business_name, owner_name, phone)
  VALUES (p_user_id, p_business_name, p_owner_name, '')
  ON CONFLICT DO NOTHING;
  
  -- Insert subscription with 7-day trial using the trial plan
  INSERT INTO user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    p_user_id, 
    'trial',  -- Use the trial plan instead of free
    'trial', 
    now(), 
    now() + interval '7 days',
    now() + interval '1 month'
  )
  ON CONFLICT DO NOTHING;
  
  result := json_build_object('success', true, 'message', 'Profile created successfully');
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object('success', false, 'error', SQLERRM);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update any existing user subscriptions that are using 'free' to use 'trial'
UPDATE user_subscriptions 
SET plan_id = 'trial' 
WHERE plan_id = 'free';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_popular ON subscription_plans(popular);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_price ON subscription_plans(price);

-- Add helpful comments
COMMENT ON TABLE subscription_plans IS 'Available subscription plans for the inventory management system';
COMMENT ON COLUMN subscription_plans.popular IS 'Indicates if this plan should be highlighted as popular/recommended';
COMMENT ON COLUMN subscription_plans.features IS 'JSON array of features included in this plan';
COMMENT ON COLUMN subscription_plans.trial_days IS 'Number of trial days for this plan (0 for no trial)';