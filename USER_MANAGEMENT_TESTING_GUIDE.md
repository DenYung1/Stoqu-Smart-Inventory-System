# User Management Testing Guide

## Overview
Now that the user management migration has been successfully applied, here's a comprehensive guide to test the new admin user management functionality.

## Prerequisites
✅ Migration `20250704000001_add_user_management.sql` has been applied
✅ Application builds successfully
✅ Admin dashboard is accessible at `/admin`

## Testing Checklist

### 1. Database Verification
First, verify the migration created everything correctly:

#### Check Profiles Table
```sql
-- Verify profiles table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid, PRIMARY KEY)
- `email` (text, NOT NULL)
- `business_name` (text, nullable)
- `phone` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `is_banned` (boolean, default false)
- `banned_at` (timestamptz, nullable)
- `banned_by` (text, nullable)
- `ban_reason` (text, nullable)
- `last_login_at` (timestamptz, nullable)

#### Check Functions
```sql
-- Verify ban/unban functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('ban_user', 'unban_user', 'is_user_banned', 'create_user_profile');
```

#### Check Policies
```sql
-- Verify RLS policies
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'profiles';
```

### 2. Admin Dashboard Access

#### Test Admin Login
1. **Navigate to `/admin`**
2. **Login with admin credentials**:
   - Email: `admin@stoqu.com` or `dennisabayateye@gmail.com`
   - Password: Your admin password
3. **Verify admin dashboard loads** with both tabs visible
4. **Check tab navigation**:
   - "Payment Requests" tab (existing)
   - "User Management" tab (new)

#### Test Tab Switching
1. **Click "User Management" tab**
2. **Verify user stats display**:
   - Total Users
   - Active Users  
   - Banned Users
   - New This Week
3. **Verify user list loads** (may be empty initially)

### 3. User Registration Flow

#### Create Test Users
1. **Open main app** (not admin) in new browser/incognito
2. **Register new test accounts**:
   - Email: `testuser1@example.com`
   - Business: `Test Business 1`
   - Password: `testpass123`
3. **Register second account**:
   - Email: `testuser2@example.com`
   - Business: `Test Business 2`
   - Password: `testpass123`
4. **Verify automatic profile creation**

#### Check Profile Creation
1. **Go back to admin dashboard**
2. **Refresh User Management tab**
3. **Verify new users appear** in the list
4. **Check user information**:
   - Email addresses are correct
   - Business names are populated
   - Status shows "Active"
   - Join dates are recent
   - Last login times are recent

### 4. User Search and Filtering

#### Test Search Functionality
1. **In User Management tab**
2. **Type in search box**: `testuser1`
3. **Verify filtering** shows only matching user
4. **Clear search** and verify all users return
5. **Search by business name**: `Test Business`
6. **Verify both test users appear**

#### Test Status Filtering
1. **Select "Active Only"** from status filter
2. **Verify only active users** are shown
3. **Select "Banned Only"** from status filter
4. **Verify "No users found"** message (no banned users yet)
5. **Select "All Users"** to return to full list

### 5. Ban User Functionality

#### Test Banning Process
1. **Find a test user** in the list
2. **Click the ban button** (red ban icon)
3. **Verify ban modal opens** with:
   - User email displayed
   - Reason text area
   - Cancel and Ban buttons
4. **Test validation**:
   - Try clicking "Ban User" without reason
   - Verify button is disabled
5. **Enter ban reason**: `Testing ban functionality`
6. **Click "Ban User"**
7. **Verify success message** appears
8. **Check user status** changes to "Banned"

#### Verify Ban in Database
```sql
-- Check banned user in database
SELECT email, is_banned, ban_reason, banned_at, banned_by 
FROM profiles 
WHERE email = 'testuser1@example.com';
```

### 6. Login Protection Testing

#### Test Banned User Login
1. **Open new browser/incognito window**
2. **Try to login** as banned user:
   - Email: `testuser1@example.com`
   - Password: `testpass123`
3. **Verify login is blocked** with error message
4. **Check error message** mentions account suspension
5. **Verify no session is created**

#### Test Active User Login
1. **Try to login** as non-banned user:
   - Email: `testuser2@example.com`
   - Password: `testpass123`
2. **Verify login succeeds**
3. **Verify app functions normally**
4. **Logout successfully**

### 7. Unban User Functionality

#### Test Unbanning Process
1. **Return to admin dashboard**
2. **Go to User Management tab**
3. **Find the banned user**
4. **Verify banned status** shows in list
5. **Click unban button** (green checkmark)
6. **Verify unban modal** shows:
   - User email
   - Original ban reason displayed
   - Cancel and Unban buttons
7. **Click "Unban User"**
8. **Verify success message**
9. **Check status** changes to "Active"

#### Test Restored Access
1. **Try to login** as previously banned user
2. **Verify login now succeeds**
3. **Verify app functions normally**

### 8. Mobile Responsiveness

#### Test Mobile Interface
1. **Use browser dev tools** to simulate mobile
2. **Test admin dashboard** on mobile:
   - Header is responsive
   - Tabs work on mobile
   - User stats display properly
3. **Test user management** on mobile:
   - Search and filters work
   - User cards display properly (not table)
   - Ban/unban buttons are touch-friendly
4. **Test modals** on mobile:
   - Ban modal is full-screen friendly
   - Text input works with mobile keyboard
   - Buttons are properly sized

### 9. Real-time Updates

#### Test Live Updates
1. **Open admin dashboard** in two browser windows
2. **Ban a user** in window 1
3. **Verify status updates** automatically in window 2
4. **Unban the user** in window 2
5. **Verify status updates** in window 1
6. **Test user statistics** update in real-time

### 10. Error Handling

#### Test Non-Admin Access
1. **Login as regular user** (not admin)
2. **Try to access** `/admin`
3. **Verify redirection** or access denied
4. **Ensure no user management** features are accessible

#### Test Network Issues
1. **Disconnect internet** temporarily
2. **Try to ban/unban** users
3. **Verify error handling** with appropriate messages
4. **Reconnect internet**
5. **Verify functionality** returns to normal

### 11. Performance Testing

#### Test with Multiple Users
1. **Register several test users** (5-10)
2. **Verify list performance** remains good
3. **Test search performance** with multiple users
4. **Test ban/unban operations** don't slow down

#### Test Database Queries
1. **Check for any slow queries** in Supabase logs
2. **Verify indexes are working** properly
3. **Monitor real-time subscriptions** for performance

## Expected Results

### ✅ Success Criteria
- [ ] All database objects created successfully
- [ ] Admin can access User Management tab
- [ ] User registration creates profiles automatically
- [ ] Search and filtering work correctly
- [ ] Ban functionality works with reason requirement
- [ ] Banned users cannot login with clear error message
- [ ] Unban functionality restores access
- [ ] Mobile interface is fully functional
- [ ] Real-time updates work across sessions
- [ ] No TypeScript or console errors
- [ ] Performance is acceptable

### 🚨 Issues to Watch For
- **Profile creation fails** for new signups
- **Ban status not enforced** during login
- **Real-time updates not working**
- **Mobile interface issues**
- **Performance problems** with user lists
- **Admin access control** not working
- **Database permission errors**

## Troubleshooting

### Common Issues

#### "Permission denied for table users" Error
- Check if `is_admin_email()` function exists
- Verify admin email is in whitelist
- Check RLS policies are correctly applied

#### Ban Not Enforced During Login
- Verify `AuthContext.tsx` includes ban check
- Check `is_user_banned()` function works
- Ensure profile exists for user

#### Real-time Updates Not Working
- Check Supabase real-time is enabled
- Verify subscription setup in `AdminDashboard.tsx`
- Check browser console for WebSocket errors

#### Mobile Interface Issues
- Test on actual mobile devices
- Check CSS media queries are working
- Verify touch targets are adequate size

## Next Steps After Testing

### If All Tests Pass ✅
1. **Document any discovered edge cases**
2. **Create user training materials** for admins
3. **Set up monitoring** for banned user login attempts
4. **Consider additional features** like user analytics

### If Issues Found 🔧
1. **Document specific problems**
2. **Check database logs** for errors
3. **Review migration** for missing elements
4. **Test fixes** in development environment
5. **Apply fixes** to production carefully

## Security Verification

### Final Security Checks
- [ ] **Non-admin users cannot access** user management
- [ ] **Banned users cannot login** under any circumstances
- [ ] **Admin actions are logged** properly
- [ ] **Input validation** prevents malicious ban reasons
- [ ] **RLS policies** enforce proper access control
- [ ] **Database functions** have proper security

This comprehensive testing ensures the user management system works correctly and securely in all scenarios.
