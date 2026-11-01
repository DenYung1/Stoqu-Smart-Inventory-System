# Settings Table Structure Fix

## Issue Description
The settings upsert operation was failing with error `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification` because the settings table lacked proper constraints for upsert operations.

## Root Cause
1. Settings table was missing `user_id` column with unique constraint
2. Upsert operation required a unique constraint to resolve conflicts
3. Migration check was referencing non-existent `id` column after table restructure

## Solution Applied

### 1. Database Migration (`20250703000001_fix_settings_table.sql`)
- ✅ Added `user_id` column as foreign key to `auth.users`
- ✅ Created unique constraint on `user_id` for proper upsert operations
- ✅ Made `user_id` the primary key (replacing old `id` column)
- ✅ Set up RLS policies for user data isolation
- ✅ Removed problematic admin policy referencing non-existent `profiles.role`

### 2. Code Fix (`useUserData.ts`)
- ✅ Updated migration check to select `user_id` instead of `id`
- ✅ Fixed settings sync to handle insert/update properly
- ✅ Maintained backward compatibility with existing data

## Migration SQL Summary
```sql
-- Add user_id column and constraints
ALTER TABLE settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE settings ADD CONSTRAINT settings_user_id_unique UNIQUE (user_id);

-- Make user_id the primary key
ALTER TABLE settings ADD CONSTRAINT settings_pkey_user_id PRIMARY KEY (user_id);

-- Clean up old id column
ALTER TABLE settings DROP COLUMN id;

-- Set up RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);
```

## Result
- ✅ Settings upsert operations now work correctly
- ✅ Cross-device settings sync functions properly
- ✅ Users can save and load their settings without errors
- ✅ No more 400 Bad Request errors for settings operations

## Files Modified
1. `supabase/migrations/20250703000001_fix_settings_table.sql` - Database schema fix
2. `src/hooks/useUserData.ts` - Updated migration check and sync logic

## Testing
- ✅ Build completes without TypeScript errors
- ✅ Migration applies successfully in Supabase
- ✅ Settings sync operations work correctly
