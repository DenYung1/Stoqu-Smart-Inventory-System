import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout?: () => void;
  onWarning?: () => void;
  isActive?: boolean;
}

interface UseSessionTimeoutReturn {
  isWarningVisible: boolean;
  timeRemaining: number;
  lastActivity: Date | null;
  extendSession: () => void;
  resetTimer: () => void;
  isExtending: boolean;
}

export const useSessionTimeout = ({
  timeoutMinutes = 10, // Changed to 10 minutes for security
  warningMinutes = 2,  // Show warning 2 minutes before timeout
  onTimeout,
  onWarning,
  isActive = true
}: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn => {
  const [lastActivity, setLastActivity] = useState<Date | null>(new Date());
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMinutes * 60);
  const [isExtending, setIsExtending] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const deadlineRef = useRef<number | null>(null);
  
  const onTimeoutRef = useRef(onTimeout);
  const onWarningRef = useRef(onWarning);
  
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);
  
  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
    countdownRef.current = null;
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    
    if (!isActive) {
      deadlineRef.current = null;
      setIsWarningVisible(false);
      setTimeRemaining(0);
      setIsExtending(false);
      return;
    }

    const now = new Date();
    const deadline = now.getTime() + timeoutMinutes * 60 * 1000;
    deadlineRef.current = deadline;
    setLastActivity(now);
    setIsWarningVisible(false);
    setTimeRemaining(timeoutMinutes * 60);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setIsWarningVisible(true);
      if (onWarningRef.current) onWarningRef.current();
      
      const updateCountdown = () => {
        const remaining = Math.max(
          0,
          Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
      };

      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);
    }, (timeoutMinutes - warningMinutes) * 60 * 1000);

    // Set final timeout
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      deadlineRef.current = null;
      setIsWarningVisible(false);
      setTimeRemaining(0);
      if (onTimeoutRef.current) onTimeoutRef.current();
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, warningMinutes, clearAllTimers, isActive]);

  const extendSession = useCallback(() => {
    setIsExtending(true);
    resetTimer();
    setTimeout(() => setIsExtending(false), 300); // Visual feedback delay
  }, [resetTimer]);

  // Initial setup
  useEffect(() => {
    resetTimer();
    return clearAllTimers;
  }, [resetTimer, clearAllTimers]);

  // Activity monitoring
  useEffect(() => {
    if (!isActive) return;

    const updateActivity = () => {
      if (!isWarningVisible) {
        resetTimer();
      }
    };

    // Monitor user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, [isActive, isWarningVisible, resetTimer]);

  return {
    isWarningVisible,
    timeRemaining,
    lastActivity,
    extendSession,
    resetTimer,
    isExtending
  };
};
