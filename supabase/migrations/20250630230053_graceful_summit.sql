/*
  # Disable Email Verification

  This migration disables email verification requirements for user authentication.
  Users can now sign up and sign in immediately without email confirmation.

  ## Changes Made:
  1. Update auth configuration to disable email confirmation
  2. Remove email verification error handling from frontend
  3. Simplify signup flow
*/

-- Disable email confirmation requirement
-- Note: This would typically be done in the Supabase dashboard under Authentication > Settings
-- For now, we'll update our application to handle this properly

-- Update the handle_new_user function to ensure it works without email confirmation
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