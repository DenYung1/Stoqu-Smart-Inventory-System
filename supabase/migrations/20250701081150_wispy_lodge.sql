/*
  # Fix Trial Duration to 7 Days

  This migration updates the trial duration from 14 days to 7 days across all relevant tables and functions.

  1. Updates
    - Update subscription plans to have 7-day trial
    - Update existing user subscriptions with incorrect trial periods
    - Update the create_user_profile function to use 7 days
*/

-- Update subscription plans to have 7-day trial
UPDATE subscription_plans 
SET trial_days = 7 
WHERE id = 'free' AND trial_days != 7;

-- Update the create_user_profile function to use 7 days instead of 14
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
  
  -- Insert subscription with 7-day trial
  INSERT INTO user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
  VALUES (
    p_user_id, 
    'free', 
    'trial', 
    now(), 
    now() + interval '7 days',  -- Changed from 14 days to 7 days
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

-- Update any existing trial subscriptions that have incorrect trial periods
-- Only update trials that are still active and have more than 7 days
UPDATE user_subscriptions 
SET 
  trial_end = trial_start + interval '7 days',
  updated_at = now()
WHERE 
  status = 'trial' 
  AND trial_start IS NOT NULL 
  AND trial_end IS NOT NULL
  AND trial_end > now()  -- Only update active trials
  AND (trial_end - trial_start) > interval '7 days';  -- Only update if trial period is longer than 7 days

-- Add a comment to document the change
COMMENT ON FUNCTION create_user_profile(uuid, text, text) IS 'Creates user profile with 7-day trial subscription';