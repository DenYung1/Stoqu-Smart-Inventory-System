# Fix for Cross-Device Data Sync Issue

## Problem
Users lose their data when switching devices because the app stores data in localStorage, which is device-specific.

## Solution
Migrate from localStorage to Supabase database storage so data persists across all devices.

## Steps to Fix

### 1. Run Database Migration
First, add user_id columns to all data tables:

```sql
-- Run this in Supabase SQL Editor
-- Add user_id columns to all data tables for proper multi-user support

-- Add user_id to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to products table  
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to stock_movements table
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing RLS policies to use user_id

-- Suppliers policies
DROP POLICY IF EXISTS "Users can manage their own suppliers" ON suppliers;
CREATE POLICY "Users can manage their own suppliers" ON suppliers
  FOR ALL USING (auth.uid() = user_id);

-- Products policies  
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage their own products" ON products
  FOR ALL USING (auth.uid() = user_id);

-- Sales policies
DROP POLICY IF EXISTS "Users can manage their own sales" ON sales;
CREATE POLICY "Users can manage their own sales" ON sales
  FOR ALL USING (auth.uid() = user_id);

-- Stock movements policies
DROP POLICY IF EXISTS "Users can manage their own stock_movements" ON stock_movements;
CREATE POLICY "Users can manage their own stock_movements" ON stock_movements
  FOR ALL USING (auth.uid() = user_id);

-- Notifications policies  
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Settings policies (update existing one)
DROP POLICY IF EXISTS "allow_all_settings" ON settings;
DROP POLICY IF EXISTS "Users can manage their own settings" ON settings;
CREATE POLICY "Users can manage their own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
```

### 2. Code Changes Already Applied
✅ Updated `useUserData.ts` hook to:
- Load data from Supabase instead of localStorage
- Automatically migrate existing localStorage data to database
- Filter all data by user_id for proper multi-user separation
- Sync changes back to database

### 3. What This Fixes
- **Cross-device sync**: Users can now access their data from any device
- **Data persistence**: Data is stored in the cloud, not locally
- **Multi-user support**: Each user only sees their own data
- **Automatic migration**: Existing localStorage data is automatically moved to database

### 4. Testing the Fix
1. Build and run the app: `npm run build`
2. Log in as a user and add some test data (products, sales, etc.)
3. Log out and log in from a different browser/device
4. Verify that the data appears correctly

### 5. Benefits
- ✅ Data persists across devices
- ✅ Real-time sync between devices (with real-time subscriptions)
- ✅ Backup and recovery capability
- ✅ Better scalability
- ✅ Proper multi-user separation

### 6. Migration Process
The app now includes automatic migration logic that:
1. Checks if user has data in Supabase
2. If not, migrates any existing localStorage data
3. Cleans up localStorage after successful migration
4. Falls back gracefully if migration fails

This ensures users don't lose any existing data during the transition.
