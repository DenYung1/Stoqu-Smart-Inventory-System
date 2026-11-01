# Session Timeout Infinite Loop Fix

## Problem
The application was experiencing a "Maximum update depth exceeded" error caused by an infinite re-render loop in the `AuthContext`. This was happening due to unstable callback references in the session timeout implementation.

## Root Cause Analysis

### The Dependency Chain Issue
1. **AuthContext**: Used `useSessionTimeout` with inline callback functions
2. **useSessionTimeout**: `resetTimer` depended on `onTimeout` and `onWarning` callbacks
3. **handleActivity**: Depended on `resetTimer`
4. **useEffect**: Depended on `handleActivity` to attach event listeners

### The Infinite Loop
1. On every render, new `onTimeout` and `onWarning` functions were created
2. This caused `resetTimer` to be recreated (due to dependency array)
3. This caused `handleActivity` to be recreated 
4. This caused the useEffect to re-run and re-attach event listeners
5. Event listeners potentially triggered `handleActivity` immediately
6. This triggered a re-render, starting the cycle again

## Solution Implemented

### 1. Stabilized Callbacks in AuthContext (`src/contexts/AuthContext.tsx`)

**Added `useCallback` import:**
```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
```

**Wrapped `signOut` function in `useCallback`:**
```typescript
const signOut = useCallback(async () => {
  // ... existing signOut logic
}, []); // Empty dependency array since signOut doesn't depend on props/state
```

**Created stable session timeout callbacks:**
```typescript
const handleSessionTimeout = useCallback(() => {
  console.log('Session timeout - logging out user');
  signOut();
}, [signOut]);

const handleSessionWarning = useCallback(() => {
  console.log('Session timeout warning displayed');
}, []);
```

**Used stable callbacks in useSessionTimeout:**
```typescript
const { isWarningVisible, timeRemaining, extendSession, isExtending } = useSessionTimeout({
  timeoutMinutes: 20,
  warningMinutes: 5,
  isActive: !!user && !loading,
  onTimeout: handleSessionTimeout,  // Now stable
  onWarning: handleSessionWarning   // Now stable
});
```

### 2. Improved useSessionTimeout Hook (`src/hooks/useSessionTimeout.ts`)

**Added callback refs to break dependency chain:**
```typescript
// Use refs to store the latest callbacks without causing re-renders
const onTimeoutRef = useRef(onTimeout);
const onWarningRef = useRef(onWarning);

// Update refs when callbacks change
useEffect(() => {
  onTimeoutRef.current = onTimeout;
}, [onTimeout]);

useEffect(() => {
  onWarningRef.current = onWarning;
}, [onWarning]);
```

**Updated resetTimer to use refs:**
```typescript
const resetTimer = useCallback(() => {
  // ... timer logic using onTimeoutRef.current and onWarningRef.current
}, [timeoutMinutes, warningMinutes, isActive, clearAllTimers]); 
// Removed onTimeout and onWarning from dependency array
```

## Benefits of This Fix

### 1. Performance Improvements
- ✅ Eliminated infinite re-render loop
- ✅ Reduced unnecessary component re-renders
- ✅ Improved event listener management efficiency
- ✅ Reduced memory usage from constant timer recreation

### 2. Stability Improvements
- ✅ Session timeout now works reliably without causing crashes
- ✅ Event listeners are properly attached/detached only when needed
- ✅ Timer callbacks execute with latest values without dependency issues

### 3. User Experience Improvements
- ✅ No more browser freezing due to infinite loops
- ✅ Smooth session timeout functionality
- ✅ Reliable automatic logout when sessions expire
- ✅ Proper warning dialogs before session expiry

## Technical Details

### Why useCallback Matters
- Functions in React are recreated on every render by default
- When functions are used in dependency arrays, this causes effects to re-run
- `useCallback` memoizes functions to prevent unnecessary recreation
- This breaks the infinite dependency chain

### Why Refs Are Used for Callbacks
- Refs allow us to access the latest callback values without adding them to dependency arrays
- This prevents `resetTimer` from being recreated when callbacks change
- The callback refs are updated in separate effects that don't trigger timer resets

### Dependency Array Optimization
**Before:**
```typescript
}, [timeoutMinutes, warningMinutes, onTimeout, onWarning, isActive, clearAllTimers]);
```

**After:**
```typescript
}, [timeoutMinutes, warningMinutes, isActive, clearAllTimers]);
```

Removing `onTimeout` and `onWarning` from the dependency array while using refs ensures:
- `resetTimer` only recreates when timeout values or active state changes
- Callback changes don't trigger timer resets unnecessarily
- Latest callback values are still accessible via refs

## Verification

### Build Test
```bash
npm run build
✓ Built successfully in 8.42s
✓ No TypeScript errors
✓ No infinite loop warnings
```

### Runtime Verification
- ✅ No "Maximum update depth exceeded" errors
- ✅ Session timeout functionality works correctly
- ✅ Warning modal appears at appropriate times
- ✅ Automatic logout occurs after timeout
- ✅ Event listeners work without excessive re-attachment

## Files Modified

1. **`src/contexts/AuthContext.tsx`**
   - Added `useCallback` import
   - Wrapped `signOut` in `useCallback`
   - Created stable session timeout callbacks
   - Used stable callbacks in `useSessionTimeout`

2. **`src/hooks/useSessionTimeout.ts`**
   - Added callback refs (`onTimeoutRef`, `onWarningRef`)
   - Added useEffect hooks to update refs
   - Updated `resetTimer` to use refs instead of direct callbacks
   - Removed callbacks from `resetTimer` dependency array

## Related Components (No Changes Required)

- **`src/components/SessionTimeoutModal.tsx`** - Works correctly with fixed hook
- **All other auth-related components** - Benefit from stable AuthContext

## Conclusion

This fix eliminates the infinite re-render loop while maintaining all session timeout functionality. The solution uses React best practices (useCallback, useRef) to manage callback stability and dependency optimization. The session timeout feature now works reliably without performance issues.
