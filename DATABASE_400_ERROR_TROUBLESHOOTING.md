# Database 400 Error Troubleshooting Guide

## Current Status
The app is encountering a 400 Bad Request error when trying to sync data to Supabase. This indicates a database schema issue.

## Most Likely Cause
The database tables are missing the `user_id` column that was added for multi-user support. The 400 error occurs because the app is trying to insert data with a `user_id` column that doesn't exist in the database schema.

## Immediate Fix Required

### Step 1: Run Database Schema Fix
You need to run the `COMPREHENSIVE_DATABASE_FIX.sql` script in your Supabase SQL Editor:

1. **Go to your Supabase Dashboard**
2. **Open the SQL Editor**
3. **Copy and paste the contents of `COMPREHENSIVE_DATABASE_FIX.sql`**
4. **Run the script**

This will:
- Add `user_id` columns to all data tables if they don't exist
- Set up proper foreign key constraints
- Enable Row Level Security (RLS)
- Create appropriate policies for multi-user data isolation

### Step 2: Verify the Fix
After running the SQL script, you should see console messages in the browser that show:
- Successful data loading from Supabase
- Successful data insertion without 400 errors
- Debug information about what data is being synced

## Enhanced Debugging
The app now includes enhanced debugging that will show you:
- Exactly what data is being sent to the database
- Detailed error messages if sync fails
- Automatic detection of schema-related errors

## What to Look For

### Success Indicators
```
✅ Loading data from Supabase for user: [user-id]
✅ Loaded and transformed data from Supabase: {products: 0, sales: 0, ...}
✅ Successfully synced products to Supabase
```

### Error Indicators
```
❌ POST https://[your-project].supabase.co/rest/v1/products 400 (Bad Request)
❌ Insert error for products: [error details]
❌ Database schema missing user_id column for products. Skipping sync for now.
```

## Fallback Behavior
If the database schema hasn't been fixed yet, the app will:
- Continue to work with localStorage (offline mode)
- Skip Supabase sync to prevent errors
- Show helpful messages in the console
- Not crash or break the user experience

## Testing After Fix

### 1. Check Console Messages
Open browser Developer Tools → Console and look for:
- "Successfully synced [dataType] to Supabase"
- No 400 error messages
- Successful data loading messages

### 2. Test Cross-Device Sync
- Add a product on one device
- Sign in on another device
- Verify the product appears on the second device

### 3. Test Manual Sync
- Go to Settings
- Click "Sync Data to Cloud"
- Check console for success messages

## Database Schema Verification
After running the fix, your tables should have this structure:

```sql
-- Products table
products (
  id uuid PRIMARY KEY,
  name text,
  sku text,
  category text,
  price decimal(10,2),
  cost decimal(10,2),
  quantity integer,
  min_stock integer,
  description text,
  supplier_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid NOT NULL  -- ← This is the key column
);
```

## Alternative Temporary Fix
If you can't run the SQL script immediately, you can temporarily disable Supabase sync by:

1. Going to Settings in the app
2. Using only localStorage for now
3. Export your data as backup
4. Run the database fix when convenient
5. Import data back or use manual sync

## Prevention for Future
- Always test database operations after schema changes
- Use migrations for schema updates
- Monitor browser console for sync errors
- Keep backup exports of important data

## Getting Help
If the issue persists after running the database fix:

1. **Check the Console**: Look for specific error messages
2. **Verify User ID**: Ensure you're logged in with a valid user
3. **Check Network**: Ensure internet connection is stable
4. **Test with Sample Data**: Try adding one simple product first

## Files Involved
- `COMPREHENSIVE_DATABASE_FIX.sql` - Database schema fix
- `src/hooks/useUserData.ts` - Enhanced with debugging
- `DATABASE_400_ERROR_COMPLETE_FIX.md` - Detailed technical explanation

The app will continue to work with localStorage while the database fix is being applied, so no data will be lost during this process.
