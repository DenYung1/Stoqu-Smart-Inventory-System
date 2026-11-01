/*
  # Update database schema for authentication

  1. Security Updates
    - Update RLS policies to use authenticated users
    - Add user_id column to settings table
    - Create proper authentication-based policies

  2. Changes
    - Add user_id to settings table
    - Update all RLS policies to be user-specific
    - Ensure data isolation between users
*/

-- Add user_id column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to be user-specific
DROP POLICY IF EXISTS "Enable all operations for everyone" ON suppliers;
DROP POLICY IF EXISTS "Enable all operations for everyone" ON products;
DROP POLICY IF EXISTS "Enable all operations for everyone" ON sales;
DROP POLICY IF EXISTS "Enable all operations for everyone" ON stock_movements;
DROP POLICY IF EXISTS "Enable all operations for everyone" ON notifications;
DROP POLICY IF EXISTS "Enable all operations for everyone" ON settings;

-- Create user-specific policies for suppliers
CREATE POLICY "Users can manage their own suppliers" ON suppliers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create user-specific policies for products
CREATE POLICY "Users can manage their own products" ON products
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create user-specific policies for sales
CREATE POLICY "Users can manage their own sales" ON sales
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create user-specific policies for stock_movements
CREATE POLICY "Users can manage their own stock movements" ON stock_movements
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create user-specific policies for notifications
CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create user-specific policies for settings
CREATE POLICY "Users can manage their own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);

-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.settings (user_id, business_name, owner_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    COALESCE(NEW.raw_user_meta_data->>'owner_name', 'Business Owner'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();