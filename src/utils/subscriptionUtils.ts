/**
 * Utility functions for subscription troubleshooting
 */

/**
 * Clear all subscription-related cache data for the current user
 */
export const clearSubscriptionCache = (userId?: string) => {
  try {
    if (!userId) {
      console.warn('No user ID provided for cache clearing');
      return false;
    }
    
    const cacheKey = `stoqu_subscription_${userId}`;
    localStorage.removeItem(cacheKey);
    console.log(`Cleared subscription cache for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Error clearing subscription cache:', error);
    return false;
  }
};

/**
 * Clear all application cache data (nuclear option)
 */
export const clearAllCache = () => {
  try {
    // Clear localStorage items related to the app
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('stoqu_') || 
      key.startsWith('supabase.') ||
      key.startsWith('sb-')
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${keysToRemove.length} cache items`);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Get current subscription cache data for debugging
 */
export const getSubscriptionCacheData = (userId?: string) => {
  try {
    if (!userId) {
      console.warn('No user ID provided for cache retrieval');
      return null;
    }
    
    const cacheKey = `stoqu_subscription_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      console.log('No cached subscription data found');
      return null;
    }
    
    const data = JSON.parse(cached);
    console.log('Cached subscription data:', data);
    return data;
  } catch (error) {
    console.error('Error retrieving subscription cache:', error);
    return null;
  }
};

/**
 * Force page reload with cache clearing
 */
export const forceRefreshWithCacheClearing = (userId?: string) => {
  if (userId) {
    clearSubscriptionCache(userId);
  }
  
  // Add a timestamp to prevent browser caching
  const url = new URL(window.location.href);
  url.searchParams.set('_refresh', Date.now().toString());
  window.location.href = url.toString();
};

/**
 * Check if user is currently experiencing subscription issues
 */
interface SubscriptionDiagnosticData {
  hasAccess?: boolean;
  subscription?: { status?: string } | null;
  loading?: boolean;
  error?: string | null;
}

export const diagnoseSubscriptionIssue = (subscriptionData: SubscriptionDiagnosticData | null) => {
  const issues: string[] = [];
  
  if (!subscriptionData) {
    issues.push('No subscription data available');
  } else {
    if (!subscriptionData.hasAccess && subscriptionData.subscription?.status === 'active') {
      issues.push('User has active subscription but no access - possible cache issue');
    }
    
    if (subscriptionData.subscription?.status === 'expired' && subscriptionData.hasAccess) {
      issues.push('User has access but subscription is expired - data inconsistency');
    }
    
    if (subscriptionData.loading) {
      issues.push('Subscription data is still loading');
    }
    
    if (subscriptionData.error) {
      issues.push(`Subscription error: ${subscriptionData.error}`);
    }
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    recommendations: issues.length > 0 ? [
      'Try clicking "Refresh Status" in the billing management modal',
      'Clear browser cache and reload the page',
      'Contact support if issues persist'
    ] : []
  };
};
