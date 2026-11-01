# JWT Handling Fix for Subscription Logic

## Issue
The subscription logic in `useSubscription.ts` was experiencing JWT expired errors (PGRST301) when fetching subscription data, which could cause the app to fail to load user subscription status properly.

## Root Cause
1. JWT tokens have a limited lifespan and can expire during active sessions
2. When a JWT expires, Supabase returns a PGRST301 error code
3. The original code didn't handle JWT expiration gracefully
4. There was also a TypeScript error where a `const` variable was being reassigned

## Solution
Updated `src/hooks/useSubscription.ts` to:

1. **Fix TypeScript Error**: Changed `const subscriptionData` to `let subscriptionData` to allow reassignment
2. **Handle JWT Expiration**: Added specific handling for PGRST301 errors
3. **Automatic Session Refresh**: When JWT expires, automatically refresh the session
4. **Retry Logic**: After refreshing, retry the failed query
5. **Graceful Degradation**: If session refresh fails, log the error but don't crash

## Key Changes

### 1. Variable Declaration Fix
```typescript
// Before (caused TypeScript error)
const { data: subscriptionData, error: subError } = await supabase...

// After (allows reassignment)
let subscriptionData: any = null;
let subError: any = null;
const { data: initialData, error: initialError } = await supabase...
subscriptionData = initialData;
subError = initialError;
```

### 2. JWT Expiration Handling
```typescript
if (subError && subError.code !== 'PGRST116') {
  // Handle JWT expired error specifically
  if (subError.code === 'PGRST301') {
    console.warn('JWT expired, trying to refresh session...');
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      throw new Error('Session expired. Please sign in again.');
    }
    // Retry the query after refresh
    const { data: retryData, error: retryError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (retryError && retryError.code !== 'PGRST116') {
      throw retryError;
    }
    
    subscriptionData = retryData;
    subError = retryError;
  } else {
    throw subError;
  }
}
```

### 3. Plan Fetching JWT Handling
Applied the same JWT handling logic to plan fetching to ensure consistency.

## Error Codes
- `PGRST116`: No rows returned (expected, not an error)
- `PGRST301`: JWT expired (handled with session refresh)

## Benefits
1. **Robust Session Management**: Automatically handles JWT expiration
2. **Better User Experience**: Users don't see unexpected errors due to expired tokens
3. **Automatic Recovery**: Sessions are refreshed transparently
4. **Consistent Behavior**: Both subscription and plan fetching use the same error handling

## Testing
- Build successful with no TypeScript errors
- Handles JWT expiration gracefully
- Maintains subscription state even after session refresh
- Provides clear error messages when session refresh fails

## Files Modified
- `src/hooks/useSubscription.ts`: Added JWT handling and fixed TypeScript error

This fix ensures that the subscription logic is robust and handles JWT expiration gracefully, providing a better user experience and preventing unexpected errors.
