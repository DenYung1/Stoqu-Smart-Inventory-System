/*
  # Disable Email Verification

  This migration updates the authentication settings to disable email verification
  so users can sign in immediately after signup without confirming their email.
*/

-- Note: Email confirmation settings are typically managed in the Supabase dashboard
-- under Authentication > Settings > Email confirmation
-- However, we can ensure our trigger function works properly for immediate access

-- Update the handle_new_user function to ensure proper user setup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if the user is confirmed (or confirmation is disabled)
  IF NEW.email_confirmed_at IS NOT NULL OR NEW.confirmation_token IS NULL THEN
    -- Insert settings record
    INSERT INTO public.settings (user_id, business_name, owner_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
      COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner'),
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert trial subscription
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
    VALUES (
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

-- Also create a trigger for when email is confirmed (in case confirmation is re-enabled later)
CREATE OR REPLACE FUNCTION handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email was just confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Insert settings record if it doesn't exist
    INSERT INTO public.settings (user_id, business_name, owner_name, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
      COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner'),
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert trial subscription if it doesn't exist
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_end)
    VALUES (
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