/*
  # Manual Payment System for Subscription Upgrades

  1. New Tables
    - `payment_requests`
      - Stores manual payment requests from users
      - Includes MTN Mobile Money transaction details
      - Tracks approval/rejection status

  2. Functions
    - `update_updated_at_column()` - Updates timestamp on record changes
    - `is_admin()` - Checks if user has admin privileges
    - `approve_payment_request()` - Approves payment and upgrades subscription
    - `reject_payment_request()` - Rejects payment with reason

  3. Security
    - RLS policies for user and admin access
    - Admin privileges for specific email addresses
*/

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  transaction_id text NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  payment_method text NOT NULL DEFAULT 'mtn_momo',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by text,
  rejection_reason text,
  user_email text NOT NULL,
  user_business_name text NOT NULL,
  plan_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_requests
-- Users can view their own payment requests
CREATE POLICY "Users can view their own payment requests" ON payment_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own payment requests
CREATE POLICY "Users can insert their own payment requests" ON payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all payment requests (we'll use a simple email check for demo)
CREATE POLICY "Admins can view all payment requests" ON payment_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
    )
  );

-- Admins can update payment requests
CREATE POLICY "Admins can update payment requests" ON payment_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('admin@stoqu.com', 'dennisabayateye@gmail.com')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_submitted_at ON payment_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_transaction_id ON payment_requests(transaction_id);

-- Create updated_at trigger for payment_requests
DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON payment_requests;
CREATE TRIGGER update_payment_requests_updated_at 
  BEFORE UPDATE ON payment_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email text DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
  current_user_email text;
BEGIN
  -- If no email provided, check current user
  IF user_email IS NULL THEN
    SELECT email INTO current_user_email FROM auth.users WHERE id = auth.uid();
    user_email := current_user_email;
  END IF;
  
  RETURN user_email IN ('admin@stoqu.com', 'dennisabayateye@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve payment and upgrade subscription
CREATE OR REPLACE FUNCTION approve_payment_request(request_id uuid, admin_id text DEFAULT 'admin')
RETURNS json AS $$
DECLARE
  payment_record payment_requests;
  result json;
BEGIN
  -- Get the payment request
  SELECT * INTO payment_record FROM payment_requests WHERE id = request_id;
  
  IF payment_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payment request not found');
  END IF;
  
  IF payment_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Payment request already processed');
  END IF;
  
  -- Update payment request status
  UPDATE payment_requests 
  SET 
    status = 'approved',
    processed_at = now(),
    processed_by = admin_id,
    updated_at = now()
  WHERE id = request_id;
  
  -- Update user subscription
  UPDATE user_subscriptions 
  SET 
    plan_id = payment_record.plan_id,
    status = 'active',
    current_period_start = now(),
    current_period_end = CASE 
      WHEN payment_record.plan_id LIKE '%yearly%' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    updated_at = now()
  WHERE user_id = payment_record.user_id;
  
  result := json_build_object(
    'success', true, 
    'message', 'Payment approved and subscription updated',
    'user_id', payment_record.user_id,
    'plan_id', payment_record.plan_id
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject payment request
CREATE OR REPLACE FUNCTION reject_payment_request(
  request_id uuid, 
  rejection_reason text,
  admin_id text DEFAULT 'admin'
)
RETURNS json AS $$
DECLARE
  payment_record payment_requests;
  result json;
BEGIN
  -- Get the payment request
  SELECT * INTO payment_record FROM payment_requests WHERE id = request_id;
  
  IF payment_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payment request not found');
  END IF;
  
  IF payment_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Payment request already processed');
  END IF;
  
  -- Update payment request status
  UPDATE payment_requests 
  SET 
    status = 'rejected',
    processed_at = now(),
    processed_by = admin_id,
    rejection_reason = rejection_reason,
    updated_at = now()
  WHERE id = request_id;
  
  result := json_build_object(
    'success', true, 
    'message', 'Payment request rejected',
    'user_id', payment_record.user_id
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_payment_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_payment_request(uuid, text, text) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE payment_requests IS 'Manual payment requests for subscription upgrades via MTN Mobile Money';
COMMENT ON FUNCTION approve_payment_request(uuid, text) IS 'Approves a payment request and upgrades user subscription';
COMMENT ON FUNCTION reject_payment_request(uuid, text, text) IS 'Rejects a payment request with a reason';
COMMENT ON FUNCTION is_admin(text) IS 'Checks if a user email has admin privileges';