import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizeEmail, validateEmailSecurity, getEmailDisplayVersion } from '../utils/emailSecurity';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import SessionTimeoutModal from '../components/SessionTimeoutModal';
import { isAdminUser } from '../utils/adminAccess';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, businessName: string, ownerName: string, startTrial?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  onSignOut?: () => void;
}

const initializeUserData = async (userId: string) => {
  try {
    const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile', {
      p_user_id: userId,
    });

    if (profileError) throw profileError;
    if (profileResult && typeof profileResult === 'object' && 'success' in profileResult && profileResult.success === false) {
      throw new Error(
        'error' in profileResult && typeof profileResult.error === 'string'
          ? profileResult.error
          : 'Unable to initialize your account.'
      );
    }

    const { data: welcomeResult, error: welcomeError } = await supabase.rpc(
      'ensure_welcome_notification',
      { p_user_id: userId }
    );

    if (welcomeError) {
      console.error('Error ensuring welcome notification:', welcomeError);
    } else if (
      welcomeResult &&
      typeof welcomeResult === 'object' &&
      'success' in welcomeResult &&
      welcomeResult.success === false
    ) {
      console.error('Welcome notification was not created:', welcomeResult);
    }

  } catch (error) {
    console.error('Error initializing user data:', error);
    throw error;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onSignOut }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const skipNextUserInitialization = useRef(false);
  const pendingPaidSignup = useRef(false);

  const clearAuthData = useCallback(() => {
    // First clear local state for immediate UI update
    setSession(null);
    setUser(null);

    // Clear stored data
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth') || key.startsWith('sb-') || key.startsWith('stoqu_')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth') || key.startsWith('sb-') || key.startsWith('stoqu_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error clearing storage:', error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('Signing out user...');
      
      // First clear Supabase session
      const { error } = await supabase.auth.signOut({
        scope: 'global'
      });
      
      if (error) {
        if (!error.message.includes('Auth session missing')) {
          console.warn('Error during sign out:', error);
        }
      }

      // Then clear local state and storage
      clearAuthData();
      
      // Finally, call the onSignOut callback if provided
      onSignOut?.();
      
    } catch (error) {
      console.warn('Exception during sign out:', error);
      clearAuthData();
      onSignOut?.();
    }
  }, [clearAuthData, onSignOut]);

  // Session timeout
  const {
    isWarningVisible,
    timeRemaining,
    extendSession,
    resetTimer,
    isExtending
  } = useSessionTimeout({
    timeoutMinutes: 10,
    warningMinutes: 2,
    onTimeout: signOut,
    onWarning: () => console.log('Session timeout warning displayed'),
    isActive: !!user && !loading
  });

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        await signOut();
        return;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        resetTimer();
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      await signOut();
    }
  }, [signOut, resetTimer]);

  const checkAccountAccess = useCallback(async () => {
    const { data, error } = await supabase.rpc('check_current_user_access');
    if (error) throw error;

    if (
      !data ||
      typeof data !== 'object' ||
      !('allowed' in data) ||
      data.allowed !== true
    ) {
      await signOut();
      throw new Error('Your account has been suspended. Please contact support.');
    }
  }, [signOut]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    businessName: string,
    ownerName: string,
    startTrial = true
  ) => {
    try {
      pendingPaidSignup.current = !startTrial;

      // Validate email
      const emailValidation = validateEmailSecurity(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      const normalizedEmail = normalizeEmail(email);
      const displayEmail = getEmailDisplayVersion(email);

      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: displayEmail,
        password,
        options: {
          data: {
            business_name: businessName,
            owner_name: ownerName,
            normalized_email: normalizedEmail,
            display_email: displayEmail,
          },
        },
      });

      if (error) throw error;

      // Handle successful signup
      if (data.user && data.session) {
        // Create user profile
        const { data: profileResult, error: profileError } = await supabase.rpc(
          startTrial ? 'create_user_profile' : 'create_paid_user_profile',
          {
          p_user_id: data.user.id,
          p_business_name: businessName,
          p_owner_name: ownerName
          }
        );
        if (profileError) throw profileError;
        if (
          profileResult &&
          typeof profileResult === 'object' &&
          'success' in profileResult &&
          profileResult.success === false
        ) {
          throw new Error(
            'error' in profileResult && typeof profileResult.error === 'string'
              ? profileResult.error
              : 'Unable to initialize your account.'
          );
        }

        const { error: loginRecordError } = await supabase.rpc('record_user_login', {
          p_user_id: data.user.id,
          p_last_login_at: data.user.last_sign_in_at ?? new Date().toISOString(),
        });
        if (loginRecordError) {
          console.error('Failed to record user login:', loginRecordError);
        }

        if (!startTrial) {
          skipNextUserInitialization.current = true;
        }
        pendingPaidSignup.current = false;
        if (startTrial) {
          setUser(data.user);
          setSession(data.session);
        }
      } else if (data.user) {
        throw new Error('Please check your email to confirm your account.');
      }
    } catch (error) {
      pendingPaidSignup.current = false;
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);

    try {
      const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;

      if (session && user) {
        await checkAccountAccess();
        setSession(session);
        setUser(user);
        resetTimer();

        if (user.id === 'local-dev-admin') {
          return;
        }

        // Admin accounts use the separate admin dashboard and must not receive
        // regular-user settings, inventory, or trial records.
        if (isAdminUser(user)) {
          return;
        }

        const { error: loginRecordError } = await supabase.rpc('record_user_login', {
          p_user_id: user.id,
          p_last_login_at: user.last_sign_in_at ?? new Date().toISOString(),
        });
        if (loginRecordError) {
          console.error('Failed to record user login:', loginRecordError);
        }

        // Initialize regular-user data if needed
        await initializeUserData(user.id).catch(error => {
          console.error('Failed to initialize user data:', error);
          setInitializationError('Failed to initialize your account. Please contact support.');
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('suspended')) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error('Invalid email or password');
      }
      throw error;
    }
  }, [checkAccountAccess, resetTimer]);

  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = normalizeEmail(email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }, []);

  // Initialize auth state
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        clearAuthData();
      } else {
        try {
          if (session?.user) {
            await checkAccountAccess();
          }
          setSession(session);
          setUser(session?.user ?? null);
        } catch (accessError) {
          console.error('Account access check failed:', accessError);
          setInitializationError(
            accessError instanceof Error
              ? accessError.message
              : 'Your account is not permitted to access this application.'
          );
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          if (pendingPaidSignup.current) {
            break;
          }
          setSession(session);
          setUser(session?.user ?? null);
          resetTimer();
          break;
        case 'SIGNED_OUT':
          clearAuthData();
          break;
        case 'TOKEN_REFRESHED':
          setSession(session);
          setUser(session?.user ?? null);
          resetTimer();
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAccountAccess, clearAuthData, resetTimer]);

  useEffect(() => {
    if (!user || loading) return;

    const verifyAccess = async () => {
      try {
        await checkAccountAccess();
      } catch (error) {
        console.error('Account access verification failed:', error);
        setInitializationError(
          error instanceof Error ? error.message : 'Your account access has been suspended.'
        );
      }
    };

    const intervalId = window.setInterval(verifyAccess, 30000);
    window.addEventListener('focus', verifyAccess);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', verifyAccess);
    };
  }, [checkAccountAccess, loading, user]);

  // Initialize data for existing sessions
  useEffect(() => {
    if (user && !loading) {
      if (isAdminUser(user)) {
        return;
      }

      if (skipNextUserInitialization.current) {
        skipNextUserInitialization.current = false;
        return;
      }

      initializeUserData(user.id).catch(error => {
        console.error('Failed to initialize user data:', error);
        setInitializationError('Failed to initialize your account. Please contact support.');
      });
    }
  }, [user, loading]);

  // Show error message if initialization fails
  if (initializationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initialization Error</h2>
          <p className="text-gray-600 mb-4">{initializationError}</p>
          <button
            onClick={signOut}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshSession
      }}
    >
      {children}
      <SessionTimeoutModal
        isOpen={isWarningVisible}
        timeRemaining={timeRemaining}
        onStayLoggedIn={extendSession}
        onLogout={signOut}
        isExtending={isExtending}
      />
    </AuthContext.Provider>
  );
};