/**
 * Email Security Utilities
 * Prevents duplicate accounts using the same email or Gmail dot tricks
 */

/**
 * Normalizes an email address to prevent duplicate accounts
 * - Converts to lowercase
 * - For Gmail addresses, removes dots from the local part
 * - Removes everything after + in the local part (Gmail aliases)
 */
export const normalizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Convert to lowercase
  const lowercaseEmail = email.toLowerCase().trim();
  
  // Split email into local and domain parts
  const [localPart, domain] = lowercaseEmail.split('@');
  
  if (!localPart || !domain) {
    return lowercaseEmail;
  }

  // Check if it's a Gmail address (including googlemail.com)
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
  
  if (isGmail) {
    // Remove dots from Gmail local part
    let normalizedLocal = localPart.replace(/\./g, '');
    
    // Remove everything after + (Gmail aliases)
    const plusIndex = normalizedLocal.indexOf('+');
    if (plusIndex !== -1) {
      normalizedLocal = normalizedLocal.substring(0, plusIndex);
    }
    
    // Always use gmail.com as the domain (normalize googlemail.com)
    return `${normalizedLocal}@gmail.com`;
  }
  
  // For non-Gmail addresses, just remove aliases (everything after +)
  let normalizedLocal = localPart;
  const plusIndex = normalizedLocal.indexOf('+');
  if (plusIndex !== -1) {
    normalizedLocal = normalizedLocal.substring(0, plusIndex);
  }
  
  return `${normalizedLocal}@${domain}`;
};

/**
 * Validates if an email is properly formatted
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Checks if two emails are the same after normalization
 */
export const areEmailsEquivalent = (email1: string, email2: string): boolean => {
  return normalizeEmail(email1) === normalizeEmail(email2);
};

/**
 * Gets the display version of an email (original format)
 * while storing the normalized version in the database
 */
export const getEmailDisplayVersion = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Validates email against common security patterns
 */
export const validateEmailSecurity = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!isValidEmail(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check for suspicious patterns
  const normalizedEmail = normalizeEmail(email);
  
  // Prevent obviously fake emails
  const suspiciousPatterns = [
    /test@test\./,
    /fake@fake\./,
    /example@example\./,
    /admin@admin\./,
    /user@user\./
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(normalizedEmail)) {
      return { isValid: false, error: 'Please use a valid business email address' };
    }
  }

  // Check for excessive dots in Gmail (potential abuse)
  if (normalizedEmail.includes('@gmail.com')) {
    const originalLocal = email.split('@')[0];
    const dotCount = (originalLocal.match(/\./g) || []).length;
    
    if (dotCount > 5) {
      return { isValid: false, error: 'Please use a standard email format' };
    }
  }

  return { isValid: true };
};

/**
 * Example usage and test cases
 */
export const emailSecurityExamples = {
  // These should all normalize to the same email
  gmailVariations: [
    'john.doe@gmail.com',
    'johndoe@gmail.com',
    'j.o.h.n.d.o.e@gmail.com',
    'john.doe+business@gmail.com',
    'johndoe+shop@gmail.com',
    'john.doe@googlemail.com'
  ],
  
  // These should normalize to: 'johndoe@gmail.com'
  expectedNormalized: 'johndoe@gmail.com',
  
  // Non-Gmail examples
  nonGmailVariations: [
    'john.doe@yahoo.com', // Should stay as is (dots preserved for non-Gmail)
    'john.doe+business@outlook.com', // Should become 'john.doe@outlook.com'
  ]
};