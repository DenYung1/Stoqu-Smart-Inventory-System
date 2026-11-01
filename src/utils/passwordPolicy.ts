export const validatePasswordStrength = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 12) {
    return { isValid: false, error: 'Password must be at least 12 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must include at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must include at least one lowercase letter' };
  }

  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must include at least one number' };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { isValid: false, error: 'Password must include at least one special character' };
  }

  return { isValid: true };
};
