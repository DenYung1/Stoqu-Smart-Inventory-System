import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserSubscription, SubscriptionPlan } from '../types/subscription';
import { v4 as uuidv4 } from 'uuid';

export interface SubscriptionStatus {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
  subscriptionType: 'trial' | 'monthly' | 'yearly' | 'none';
  nextBillingDate: string | null;
  renewalAmount: number;
}

export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const channelId = useRef(`subscription_${uuidv4()}`);
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscription: null,
    plan: null,
    isTrialActive: false,
    isSubscriptionActive: false,
    daysRemaining: 0,
    hoursRemaining: 0,
    minutesRemaining: 0,
    hasAccess: false,
    loading: true, // Start with loading true
    error: null,
    subscriptionType: 'none',
    nextBillingDate: null,
    renewalAmount: 0,
  });

  // Get current time in Ghana (UTC+0)
  const getGhanaTime = () => {
    const now = new Date();
    // Convert local time to UTC time (Ghana time is UTC+0)
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  };

  const calculateTimeRemaining = (endDate: string) => {
    const now = getGhanaTime();
    const end = new Date(endDate); // endDate from DB is already in UTC
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  };

  const getSubscriptionType = (plan: SubscriptionPlan | null, subscription: UserSubscription | null): 'trial' | 'monthly' | 'yearly' | 'none' => {
    if (!plan || !subscription) return 'none';
    
    if (subscription.status === 'trial') return 'trial';
    if (plan.interval === 'month') return 'monthly';
    if (plan.interval === 'year') return 'yearly';
    
    return 'none';
  };

  // Cache subscription data locally for offline support
  const getSubscriptionCacheKey = (userId: string) => `stoqu_subscription_${userId}`;
  
  const cacheSubscriptionData = (userId: string, data: SubscriptionStatus) => {
    try {
      const cacheData = {
        ...data,
        cachedAt: getGhanaTime().toISOString(),
      };
      localStorage.setItem(getSubscriptionCacheKey(userId), JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache subscription data:', error);
    }
  };

  // Clear subscription cache when data might be stale
  const clearSubscriptionCache = (userId: string) => {
    try {
      localStorage.removeItem(getSubscriptionCacheKey(userId));
      console.log('Cleared subscription cache for user:', userId);
    } catch (error) {
      console.warn('Failed to clear subscription cache:', error);
    }
  };
  
  const getCachedSubscriptionData = (userId: string): SubscriptionStatus | null => {
    try {
      const cached = localStorage.getItem(getSubscriptionCacheKey(userId));
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const cachedAt = new Date(data.cachedAt);
      const now = getGhanaTime();
      
      // Reduce cache duration to 5 minutes for more timely updates
      const cacheValidDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
      if (now.getTime() - cachedAt.getTime() > cacheValidDuration) {
        localStorage.removeItem(getSubscriptionCacheKey(userId));
        return null;
      }
      
      // Remove the cache metadata before returning
      const { cachedAt: _, ...subscriptionData } = data;
      return subscriptionData;
    } catch (error) {
      console.warn('Failed to load cached subscription data:', error);
      return null;
    }
  };

  const fetchSubscriptionStatus = async (currentRetry = 0) => {
    // Prevent infinite retry loops
    if (currentRetry > 2) {
      console.warn('Max retries reached for subscription status fetch');
      setStatus(prev => ({ 
        ...prev, 
        loading: false, 
        hasAccess: false,
        error: 'Unable to load subscription status. Please refresh the page.'
      }));
      return;
    }

    // Keep loading true while auth is loading
    if (authLoading) {
      setStatus(prev => ({ 
        ...prev, 
        loading: true,
        hasAccess: false 
      }));
      return;
    }

    // If no user, set loading to false and no access
    if (!user) {
      setStatus(prev => ({ 
        ...prev, 
        loading: false, 
        hasAccess: false 
      }));
      return;
    }

    // Load cached data first for immediate display, then fetch fresh data
    const cachedData = getCachedSubscriptionData(user.id);
    if (cachedData && currentRetry === 0) {
      console.log('Loading cached subscription data for immediate display');
      setStatus({
        ...cachedData,
        loading: true, // Keep loading true while we fetch fresh data
        error: null,
      });
    }

    // Clear cache on manual refresh to ensure fresh data
    if (currentRetry === 0) {
      clearSubscriptionCache(user.id);
      console.log('Cleared subscription cache for fresh data fetch');
    }

    try {
      // Check if we have a valid session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('No valid session found, attempting to refresh...');
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Failed to refresh session:', refreshError);
          // If we can't refresh, sign out the user
          await supabase.auth.signOut();
          setStatus(prev => ({ 
            ...prev, 
            loading: false, 
            hasAccess: false,
            error: 'Session expired. Please sign in again.'
          }));
          return;
        }
      }

      // Fetch user subscription
      const { data: subscriptionData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        // Check if it's a JWT expired error
        if (subError.code === 'PGRST301' || subError.message?.includes('JWT expired')) {
          console.warn(`JWT expired during subscription fetch (retry ${currentRetry + 1}), refreshing session...`);
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            await supabase.auth.signOut();
            setStatus(prev => ({ 
              ...prev, 
              loading: false, 
              hasAccess: false,
              error: 'Session expired. Please sign in again.'
            }));
            return;
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (currentRetry + 1)));
          // Retry the request after refresh
          return fetchSubscriptionStatus(currentRetry + 1);
        }
        throw subError;
      }

      let planData = null;
      if (subscriptionData) {
        // Fetch plan details
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subscriptionData.plan_id)
          .single();

        if (planError) {
          // Check if it's a JWT expired error
          if (planError.code === 'PGRST301' || planError.message?.includes('JWT expired')) {
            console.warn(`JWT expired during plan fetch (retry ${currentRetry + 1}), refreshing session...`);
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              await supabase.auth.signOut();
              setStatus(prev => ({ 
                ...prev, 
                loading: false, 
                hasAccess: false,
                error: 'Session expired. Please sign in again.'
              }));
              return;
            }
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (currentRetry + 1)));
            // Retry the request after refresh
            return fetchSubscriptionStatus(currentRetry + 1);
          }
          console.warn('Could not fetch plan details:', planError);
        } else {
          planData = plan;
        }
      }

      const now = getGhanaTime();
      let isTrialActive = false;
      let isSubscriptionActive = false;
      let hasAccess = false;
      let timeRemaining = { days: 0, hours: 0, minutes: 0 };
      let nextBillingDate: string | null = null;
      let renewalAmount = 0;

      if (subscriptionData && planData) {
        const currentPeriodEnd = new Date(subscriptionData.current_period_end);
        const trialEnd = subscriptionData.trial_end ? new Date(subscriptionData.trial_end) : null;

        // Check trial expiration and update status if needed
        if (subscriptionData.status === 'trial' && trialEnd && now >= trialEnd) {
          // Trial has expired, update the subscription status
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'expired',
              updated_at: now.toISOString()
            })
            .eq('id', subscriptionData.id);
          
          // Set no access for expired trial
          isTrialActive = false;
          hasAccess = false;
          timeRemaining = { days: 0, hours: 0, minutes: 0 };
        }
        // Check if trial is still active
        else if (subscriptionData.status === 'trial' && trialEnd && now < trialEnd) {
          isTrialActive = true;
          hasAccess = true;
          timeRemaining = calculateTimeRemaining(subscriptionData.trial_end!);
        }
        // Check if paid subscription has expired
        else if (subscriptionData.status === 'active' && now >= currentPeriodEnd) {
          // Subscription has expired, update the status
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'expired',
              updated_at: now.toISOString()
            })
            .eq('id', subscriptionData.id);
          
          // Set no access for expired subscription
          isSubscriptionActive = false;
          hasAccess = false;
          timeRemaining = { days: 0, hours: 0, minutes: 0 };
          nextBillingDate = null;
          renewalAmount = 0;
        }
        // Check if paid subscription is still active
        else if (subscriptionData.status === 'active' && now < currentPeriodEnd) {
          isSubscriptionActive = true;
          hasAccess = true;
          timeRemaining = calculateTimeRemaining(subscriptionData.current_period_end);
          nextBillingDate = subscriptionData.current_period_end;
          renewalAmount = planData.price;
        }
        // All other cases: no access
        else {
          hasAccess = false;
          isTrialActive = false;
          isSubscriptionActive = false;
          timeRemaining = { days: 0, hours: 0, minutes: 0 };
          nextBillingDate = null;
          renewalAmount = 0;
        }
      }

      const subscriptionType = getSubscriptionType(planData, subscriptionData);

      const newStatus = {
        subscription: subscriptionData,
        plan: planData,
        isTrialActive,
        isSubscriptionActive,
        daysRemaining: timeRemaining.days,
        hoursRemaining: timeRemaining.hours,
        minutesRemaining: timeRemaining.minutes,
        hasAccess,
        loading: false, // Set loading to false after we have data
        error: null,
        subscriptionType,
        nextBillingDate,
        renewalAmount,
      };

      setStatus(newStatus);
      
      // Cache the successful subscription data
      cacheSubscriptionData(user.id, newStatus);

    } catch (error: unknown) {
      console.error('Error fetching subscription status:', error);
      const errorCode = error instanceof Error && 'code' in error
        ? (error as Error & { code?: string }).code
        : undefined;
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Handle JWT expired errors specifically
      if (errorCode === 'PGRST301' || errorMessage.includes('JWT expired')) {
        console.warn(`JWT expired in catch block (retry ${currentRetry + 1}), attempting session refresh...`);
        try {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            await supabase.auth.signOut();
            setStatus(prev => ({
              ...prev,
              loading: false,
              hasAccess: false,
              error: 'Session expired. Please sign in again.',
            }));
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (currentRetry + 1)));
            // Successfully refreshed, retry
            return fetchSubscriptionStatus(currentRetry + 1);
          }
        } catch (refreshError) {
          console.error('Failed to refresh session:', refreshError);
          await supabase.auth.signOut();
          setStatus(prev => ({
            ...prev,
            loading: false,
            hasAccess: false,
            error: 'Session expired. Please sign in again.',
          }));
        }
      } else {
        // Check for network errors and use cached data if available
        const isNetworkError = errorMessage.includes('fetch') ||
                              errorMessage.includes('network') ||
                              errorCode === 'ENOTFOUND' ||
                              !navigator.onLine;
        
        if (isNetworkError) {
          console.warn('Network error detected, attempting to use cached subscription data...');
          const cachedData = getCachedSubscriptionData(user.id);
          
          if (cachedData) {
            console.log('Using cached subscription data due to network error');
            setStatus({
              ...cachedData,
              loading: false,
              error: 'Using offline data - some features may be limited',
            });
            return;
          } else {
            console.warn('No cached subscription data available');
          }
        }
        
        setStatus(prev => ({
          ...prev,
          loading: false, // Set loading to false even on error
          error: error instanceof Error ? error.message : 'Failed to load subscription status',
        }));
      }
    }
  };

  const upgradeSubscription = async (planId: string) => {
    if (!user || !status.subscription) {
      throw new Error('User or subscription not found');
    }

    try {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('price')
        .eq('id', planId)
        .eq('active', true)
        .single();

      if (!plan || plan.price <= 0) {
        throw new Error('A paid plan is required');
      }

      await fetchSubscriptionStatus();
      return { success: true };
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    if (!user || !status.subscription) {
      throw new Error('User or subscription not found');
    }

    try {
      const { data, error } = await supabase.rpc('cancel_my_subscription');

      if (error) throw error;
      if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        throw new Error('error' in data && typeof data.error === 'string' ? data.error : 'Unable to cancel subscription');
      }

      // Refresh subscription status
      await fetchSubscriptionStatus();
      
      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();

    if (authLoading || !user?.id) {
      return;
    }

    // Set up real-time updates for subscription changes
    const subscription = supabase
      .channel(`${channelId.current}_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Real-time subscription change detected:', payload);
          // Clear cache and fetch fresh data when subscription changes
          if (user?.id) {
            clearSubscriptionCache(user.id);
          }
          // Add a small delay to ensure database consistency
          setTimeout(() => {
            fetchSubscriptionStatus();
          }, 1000);
        }
      )
      .subscribe();

    // Update countdown every minute
    const interval = setInterval(() => {
      if (status.subscription && (status.isTrialActive || status.isSubscriptionActive)) {
        const endDate = status.isTrialActive 
          ? status.subscription.trial_end! 
          : status.subscription.current_period_end;
        
        const timeRemaining = calculateTimeRemaining(endDate);
        
        setStatus(prev => ({
          ...prev,
          daysRemaining: timeRemaining.days,
          hoursRemaining: timeRemaining.hours,
          minutesRemaining: timeRemaining.minutes,
          hasAccess: (timeRemaining.days > 0 || timeRemaining.hours > 0 || timeRemaining.minutes > 0) && (prev.isTrialActive || prev.isSubscriptionActive),
        }));
      }
    }, 60000); // Update every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, authLoading]);

  return {
    ...status,
    refreshStatus: fetchSubscriptionStatus,
    clearCache: () => user?.id && clearSubscriptionCache(user.id),
    upgradeSubscription,
    cancelSubscription,
  };
};