import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// NOTE: Service role keys must never be used in frontend code.
// Admin operations must be performed through a secure backend API.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Storage keys with different prefixes to prevent conflicts
const REGULAR_PREFIX = 'stoqu_user_';
// Client instance
let regularClient: SupabaseClient<Database> | null = null;

// Regular storage implementation
const regularStorage = {
  getItem: (key: string) => {
    const prefixedKey = `${REGULAR_PREFIX}${key}`;
    return localStorage.getItem(prefixedKey);
  },
  setItem: (key: string, value: string) => {
    const prefixedKey = `${REGULAR_PREFIX}${key}`;
    localStorage.setItem(prefixedKey, value);
  },
  removeItem: (key: string) => {
    const prefixedKey = `${REGULAR_PREFIX}${key}`;
    localStorage.removeItem(prefixedKey);
  }
};

// Clear all stored data for a client
const clearClientStorage = () => {
  const storage = localStorage;
  const prefix = REGULAR_PREFIX;
  
  Object.keys(storage).forEach(key => {
    if (key.startsWith(prefix)) {
      storage.removeItem(key);
    }
  });
};

// Get regular client with lazy initialization
export const getSupabaseClient = () => {
  if (!regularClient) {
    regularClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: regularStorage,
        storageKey: 'stoqu-user-auth'
      },
      global: {
        headers: {
          'X-Client-Info': 'stoqu-inventory-app',
        },
      },
    });

    // Set up auth state change handler
    regularClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearClientStorage();
        regularClient = null; // Reset the instance
      }
    });
  }
  return regularClient;
};

// Admin operations must be authorized by database policies and RPCs.
export const getAdminClient = () => {
  return null;
};

// Export a proxy to maintain the same interface
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    const client = getSupabaseClient();
    return client[prop as keyof SupabaseClient<Database>];
  }
});

export const adminSupabase: SupabaseClient<Database> | null = null;