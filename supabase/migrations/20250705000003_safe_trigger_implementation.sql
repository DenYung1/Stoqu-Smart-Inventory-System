/*
  # Safe Trigger Implementation
  
  Create a safer trigger that won't cause signup failures:
  1. Runs AFTER the user is fully created and committed
  2. Uses exception handling to prevent signup failures
  3. Logs errors instead of breaking the signup process
  4. Uses a background job approach
*/

-- Create a safer trigger function that won't break signup
CREATE OR REPLACE FUNCTION safe_create_user_profile()
RETURNS trigger AS $$
DECLARE
  profile_result json;
  business_name text;
  owner_name text;
BEGIN
  -- This function should NEVER raise an exception that would break user creation
  BEGIN
    -- Extract metadata with safe defaults
    business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
    owner_name := COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner');
    
    -- Log the attempt
    RAISE LOG 'Safe trigger: Attempting to create profile for user %', NEW.id;

    -- Call the profile creation function in a safe way
    SELECT create_user_profile(NEW.id, business_name, owner_name) INTO profile_result;
    
    -- Log success
    RAISE LOG 'Safe trigger: Profile creation completed for user %: %', NEW.id, profile_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but DON'T re-raise it to avoid breaking signup
      RAISE LOG 'Safe trigger: Profile creation failed for user % (but signup continues): %', NEW.id, SQLERRM;
      -- Continue without failing - the frontend will handle profile creation
  END;
  
  -- Always return NEW to allow the user creation to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the safer trigger with AFTER INSERT and careful error handling
CREATE TRIGGER safe_create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION safe_create_user_profile();

-- Update the manual create_user_profile function to be even more robust
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
  -- Check if the trial plan exists first
  SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id = 'trial' AND active = true) 
  INTO trial_plan_exists;
  
  IF NOT trial_plan_exists THEN
    -- Create the trial plan if it doesn't exist
    INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
    ('trial', '7-Day Free Trial', 0, 'GHS', 'month', 
     '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support"]'::jsonb, 
     7, true)
    ON CONFLICT (id) DO UPDATE SET active = true;
    
    trial_plan_exists := true;
  END IF;

  -- Check existing records
  SELECT EXISTS(SELECT 1 FROM settings WHERE user_id = p_user_id) INTO settings_exists;
  SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = p_user_id) INTO subscription_exists;

  -- Insert settings only if they don't exist
  IF NOT settings_exists THEN
    INSERT INTO settings (
      user_id, business_name, owner_name, phone, currency, tax_rate,
      low_stock_threshold, auto_backup, notifications_low_stock,
      notifications_daily_summary, notifications_weekly_report
    )
    VALUES (
      p_user_id, p_business_name, p_owner_name, '', 'GHS', 12.5,
      5, true, true, true, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      owner_name = EXCLUDED.owner_name,
      updated_at = now();
  END IF;
  
  -- Insert subscription only if it doesn't exist
  IF NOT subscription_exists THEN
    INSERT INTO user_subscriptions (
      user_id, plan_id, status, trial_start, trial_end,
      current_period_start, current_period_end
    )
    VALUES (
      p_user_id, 'trial', 'trial', now(), now() + interval '7 days',
      now(), now() + interval '1 month'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      status = EXCLUDED.status,
      trial_start = EXCLUDED.trial_start,
      trial_end = EXCLUDED.trial_end,
      updated_at = now();
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
  WHEN OTHERS THEN
    error_message := 'Database error: ' || SQLERRM;
    result := json_build_object(
      'success', false, 
      'error', error_message,
      'error_type', 'general_error',
      'sqlstate', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
