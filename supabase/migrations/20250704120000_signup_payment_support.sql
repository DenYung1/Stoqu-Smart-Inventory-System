-- Add signup_data column and make user_id nullable for new signups
-- This allows storing payment requests before user account creation

-- First, make user_id nullable to support signup payment requests
ALTER TABLE payment_requests 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add signup_data column to store user registration info for new signups
ALTER TABLE payment_requests 
  ADD COLUMN signup_data jsonb;

-- Update the existing constraint to allow NULL user_id for signup requests
-- Remove the existing foreign key constraint
ALTER TABLE payment_requests 
  DROP CONSTRAINT payment_requests_user_id_fkey;

-- Add a new foreign key constraint that allows NULL
ALTER TABLE payment_requests 
  ADD CONSTRAINT payment_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index on signup_data for better performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_signup_data 
  ON payment_requests USING GIN (signup_data);

-- Add comment to explain the new column
COMMENT ON COLUMN payment_requests.signup_data IS 'Stores user registration data for new signups waiting for payment approval. Contains email, password, business_name, and owner_name.';
COMMENT ON COLUMN payment_requests.user_id IS 'User ID for existing users, NULL for new signup requests pending account creation.';
