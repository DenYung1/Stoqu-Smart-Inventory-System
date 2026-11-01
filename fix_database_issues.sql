-- =====================================================
-- FIX USER PROFILE CREATION ISSUES
-- Run this script in your Supabase SQL Editor
-- =====================================================

-- Step 1: Check current settings table structure and fix it properly
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE settings ADD COLUMN user_id uuid;
    END IF;
    
    -- Drop existing constraints to recreate them properly
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'settings_user_id_fkey') THEN
        ALTER TABLE settings DROP CONSTRAINT settings_user_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'settings_user_id_unique') THEN
        ALTER TABLE settings DROP CONSTRAINT settings_user_id_unique;
    END IF;
END
$$;

-- Delete any orphaned settings records that don't have a user_id
DELETE FROM settings WHERE user_id IS NULL;

-- Now safely add the NOT NULL constraint and foreign key
DO $$
BEGIN
    -- Only add NOT NULL if the column allows it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'user_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    -- Add foreign key constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'settings_user_id_fkey') THEN
        ALTER TABLE settings ADD CONSTRAINT settings_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add unique constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'settings_user_id_unique') THEN
        ALTER TABLE settings ADD CONSTRAINT settings_user_id_unique UNIQUE (user_id);
    END IF;
END
$$;

-- Step 2: Fix user_subscriptions table foreign keys
DO $$
BEGIN
    -- Drop existing constraints to recreate them properly
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_subscriptions_user_id_fkey') THEN
        ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_user_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_subscriptions_plan_id_fkey') THEN
        ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_plan_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_subscriptions_user_id_unique') THEN
        ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_user_id_unique;
    END IF;
END
$$;

ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for plan_id (only if subscription_plans table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        ALTER TABLE user_subscriptions 
        ADD CONSTRAINT user_subscriptions_plan_id_fkey 
          FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);
    END IF;
END
$$;

-- Ensure unique constraint on user_id (one active subscription per user)
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);

-- Step 3: Ensure trial plan exists
INSERT INTO subscription_plans (id, name, price, currency, interval, features, trial_days, active) VALUES
('trial', '7-Day Free Trial', 0, 'GHS', 'month', '["Full access to all features", "Up to 100 products", "Basic analytics", "Email support", "No credit card required"]'::jsonb, 7, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  features = EXCLUDED.features,
  trial_days = EXCLUDED.trial_days,
  active = EXCLUDED.active;

-- Step 4: Create a simpler, more robust create_user_profile function
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_business_name text DEFAULT 'My Business',
  p_owner_name text DEFAULT 'Business Owner'
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Use INSERT ... ON CONFLICT to handle duplicates gracefully
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
    COALESCE(p_business_name, 'My Business'), 
    COALESCE(p_owner_name, 'Business Owner'), 
    '',
    'GHS',
    12.5,
    5,
    true,
    true,
    true,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    owner_name = EXCLUDED.owner_name,
    updated_at = now();
  
  -- Use INSERT ... ON CONFLICT for subscriptions too
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
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = now();
  
  result := json_build_object(
    'success', true, 
    'message', 'Profile created successfully'
  );
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false, 
      'error', 'Database error: ' || SQLERRM,
      'detail', SQLSTATE,
      'user_id', p_user_id::text
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update RLS policies to be more permissive for user profile creation
DROP POLICY IF EXISTS "allow_all_settings" ON settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON settings;
CREATE POLICY "Users can manage own settings" ON settings
FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "allow_all_user_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON settings TO anon, authenticated;
GRANT ALL ON user_subscriptions TO anon, authenticated;
GRANT SELECT ON subscription_plans TO anon, authenticated;

-- Step 7: Add helpful function to check if a user profile is complete
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

-- Step 8: Test the function (optional - you can run this to test)
-- SELECT create_user_profile('00000000-0000-0000-0000-000000000000'::uuid, 'Test Business', 'Test Owner');

COMMIT;
