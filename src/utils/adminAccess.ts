/**
 * Admin Access Utility
 * 
 * Centralized logic for determining if a user has admin privileges.
 * This allows for easy migration from email-based checks to role-based checks
 * using Supabase metadata or database functions.
 */

import type { User } from '@supabase/supabase-js';

function isAdminFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'admin' || value.toLowerCase() === 'true';
  }

  return false;
}

/**
 * Checks if a user has admin privileges.
 *
 * Admin access should be granted by trusted auth metadata (for example,
 * app_metadata.role = 'admin') issued by a secure backend or Supabase
 * admin workflow. The frontend should not rely on email allowlists.
 */
export function isAdminUser(user: User | null): boolean {
  if (!user) {
    return false;
  }

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;

  return isAdminFlag(appMetadata.role) || isAdminFlag(appMetadata.is_admin);
}

/**
 * Returns an empty list because admin roles should be managed server-side.
 */
export function getAdminEmails(): string[] {
  return [];
}

/**
 * No-op kept for compatibility with older imports.
 */
export function addAdminEmail(_email: string): void {
  // Admin roles should be managed server-side.
}

/**
 * No-op kept for compatibility with older imports.
 */
export function removeAdminEmail(_email: string): void {
  // Admin roles should be managed server-side.
}
