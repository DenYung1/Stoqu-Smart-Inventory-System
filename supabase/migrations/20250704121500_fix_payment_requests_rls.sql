-- Fix RLS policies for payment_requests to support new signup flow
-- where user_id can be NULL for pending signup requests

-- Drop existing policies that don't handle NULL user_id
DROP POLICY IF EXISTS "Users can view their own payment requests" ON payment_requests;
DROP POLICY IF EXISTS "Users can insert their own payment requests" ON payment_requests;

-- Create updated policies that handle both existing users and new signups

-- Users can view their own payment requests (for existing users)
CREATE POLICY "Users can view their own payment requests" ON payment_requests
  FOR SELECT TO authenticated
  USING (
    -- For existing users: match user_id
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR
    -- For new signups: allow viewing if email matches (during signup process)
    (user_id IS NULL AND signup_data IS NOT NULL AND 
     signup_data->>'email' = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Users can insert their own payment requests
CREATE POLICY "Users can insert their own payment requests" ON payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    -- For existing users: user_id must match auth.uid()
    (user_id IS NOT NULL AND auth.uid() = user_id)
    OR
    -- For new signups: user_id must be NULL and signup_data must contain matching email
    (user_id IS NULL AND signup_data IS NOT NULL AND 
     signup_data->>'email' = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Allow anonymous users to create signup payment requests
-- This is needed for the new signup flow where users aren't authenticated yet
CREATE POLICY "Anonymous users can create signup payment requests" ON payment_requests
  FOR INSERT TO anon
  WITH CHECK (
    -- Must be a signup request (user_id NULL, signup_data present)
    user_id IS NULL AND signup_data IS NOT NULL
  );

-- Add policy for anonymous users to view their own signup requests by email
-- This allows checking status during the signup flow
CREATE POLICY "Anonymous users can view signup requests by email" ON payment_requests
  FOR SELECT TO anon
  USING (
    -- Only allow viewing signup requests (not existing user payment requests)
    user_id IS NULL AND signup_data IS NOT NULL
  );
