import React, { useState, useEffect } from 'react';
import { Database, Wifi, WifiOff, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SetupGuide from './SetupGuide';

const DatabaseStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { user, session, refreshSession, signOut } = useAuth();

  const checkConnection = async () => {
    try {
      // Check if environment variables are set
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('your-project-ref') || 
          supabaseKey.includes('your-anon-key')) {
        throw new Error('Supabase credentials not configured properly');
      }

      // If user is not authenticated, skip the database check
      if (!user || !session) {
        setIsConnected(false);
        setError('User not authenticated');
        return;
      }

      // First try a simple health check
      const { data: _data, error } = await supabase
        .from('settings')
        .select('id')
        .limit(1);

      if (error) {
        // Handle JWT expired error specifically
        if (error.message.includes('JWT expired')) {
          console.log('JWT expired, attempting to refresh session...');
          try {
            await refreshSession();
            // Retry the request after refresh
            const { data: _retryData, error: retryError } = await supabase
              .from('settings')
              .select('id')
              .limit(1);
            
            if (retryError) {
              if (retryError.message.includes('JWT expired')) {
                // If still expired after refresh, sign out the user
                throw new Error('Session expired. Please sign in again.');
              }
              throw retryError;
            }
            
            setIsConnected(true);
            setError(null);
            return;
          } catch (refreshError) {
            console.error('Session refresh failed:', refreshError);
            throw new Error('Session expired. Please sign in again.');
          }
        }
        
        // Provide more specific error messages for other errors
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Cannot connect to Supabase. Please check your project URL and ensure the project exists.');
        } else if (error.message.includes('Invalid API key')) {
          throw new Error('Invalid Supabase API key. Please check your anonymous key.');
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          throw new Error('Database tables not found. Please run the database migrations.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      setIsConnected(true);
      setError(null);
    } catch (err) {
      setIsConnected(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
      console.error('Supabase connection error:', err);
      
      // If the error is about session expiry, show a sign out option
      if (errorMessage.includes('Session expired') || errorMessage.includes('JWT expired')) {
        // Auto sign out after a delay to give user time to see the message
        setTimeout(async () => {
          try {
            await signOut();
          } catch (signOutError) {
            console.error('Error during auto sign out:', signOutError);
          }
        }, 3000);
      }
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setIsRetrying(false);
  };

  useEffect(() => {
    // Only check connection if user is authenticated
    if (user && session) {
      checkConnection();
      
      // Check connection every 30 seconds
      const interval = setInterval(checkConnection, 30000);
      return () => clearInterval(interval);
    } else {
      setIsConnected(false);
      setError('User not authenticated');
    }
  }, [user, session]);

  // Don't show anything if user is not authenticated
  if (!user) {
    return null;
  }

  if (isConnected === null) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <Database className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-red-600">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Database Offline</span>
          </div>
          
          {error && (
            <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium mb-1">Connection Error:</div>
                  <div>{error}</div>
                  {error.includes('Session expired') && (
                    <div className="mt-2 text-xs text-red-600">
                      You will be automatically signed out in a few seconds...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleRetry}
              disabled={isRetrying || error?.includes('Session expired')}
              className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Retry'}</span>
            </button>
            
            {!error?.includes('Session expired') && (
              <button
                onClick={() => setShowSetup(true)}
                className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <Settings className="w-4 h-4" />
                <span>Setup</span>
              </button>
            )}
          </div>
        </div>
        {showSetup && <SetupGuide />}
      </>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <Wifi className="w-4 h-4" />
      <span className="text-sm">Database Connected</span>
    </div>
  );
};

export default DatabaseStatus;