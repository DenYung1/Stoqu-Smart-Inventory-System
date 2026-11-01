/*
  # Email Security and Duplicate Prevention

  This migration implements comprehensive email security to prevent users from creating
  multiple accounts using the same email or Gmail dot tricks.

  ## Features:
  1. Email normalization (removes dots from Gmail, handles aliases)
  2. Duplicate email detection
  3. Email format validation
  4. Suspicious email pattern detection
  5. RPC functions for frontend validation

  ## Security Benefits:
  - Prevents Gmail dot tricks (john.doe@gmail.com = johndoe@gmail.com)
  - Blocks email aliases (user+1@gmail.com = user@gmail.com)
  - Detects fake/test emails
  - Case insensitive email handling
*/

-- Create email normalization function
CREATE OR REPLACE FUNCTION normalize_email(email_input text)
RETURNS text AS $$
DECLARE
  local_part text;
  domain_part text;
  normalized_local text;
  plus_index integer;
BEGIN
  -- Return empty string for null or empty input
  IF email_input IS NULL OR trim(email_input) = '' THEN
    RETURN '';
  END IF;

  -- Convert to lowercase and trim
  email_input := lower(trim(email_input));
  
  -- Split email into local and domain parts
  local_part := split_part(email_input, '@', 1);
  domain_part := split_part(email_input, '@', 2);
  
  -- Return original if not a valid email format
  IF local_part = '' OR domain_part = '' OR position('@' in email_input) = 0 THEN
    RETURN email_input;
  END IF;
  
  -- Handle Gmail addresses (including googlemail.com)
  IF domain_part = 'gmail.com' OR domain_part = 'googlemail.com' THEN
    -- Remove dots from Gmail local part
    normalized_local := replace(local_part, '.', '');
    
    -- Remove everything after + (Gmail aliases)
    plus_index := position('+' in normalized_local);
    IF plus_index > 0 THEN
      normalized_local := substring(normalized_local from 1 for plus_index - 1);
    END IF;
    
    -- Always use gmail.com as domain
    RETURN normalized_local || '@gmail.com';
  END IF;
  
  -- For non-Gmail addresses, just remove aliases (everything after +)
  normalized_local := local_part;
  plus_index := position('+' in normalized_local);
  IF plus_index > 0 THEN
    normalized_local := substring(normalized_local from 1 for plus_index - 1);
  END IF;
  
  RETURN normalized_local || '@' || domain_part;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Create function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email_input text)
RETURNS boolean AS $$
BEGIN
  -- Basic email validation regex
  RETURN email_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Create function to detect suspicious email patterns
CREATE OR REPLACE FUNCTION is_suspicious_email(email_input text)
RETURNS boolean AS $$
DECLARE
  normalized_email text;
  local_part text;
  dot_count integer;
BEGIN
  normalized_email := normalize_email(email_input);
  
  -- Check for obviously fake emails
  IF normalized_email ~* '(test@test\.|fake@fake\.|example@example\.|admin@admin\.|user@user\.|temp@temp\.|demo@demo\.)' THEN
    RETURN true;
  END IF;
  
  -- Check for excessive dots in Gmail (potential abuse)
  IF normalized_email LIKE '%@gmail.com' THEN
    local_part := split_part(email_input, '@', 1);
    dot_count := array_length(string_to_array(local_part, '.'), 1) - 1;
    
    IF dot_count > 5 THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Create function to check if normalized email already exists
CREATE OR REPLACE FUNCTION check_email_exists(email_input text)
RETURNS json AS $$
DECLARE
  normalized_email text;
  existing_user_count integer;
  result json;
BEGIN
  -- Normalize the input email
  normalized_email := normalize_email(email_input);
  
  -- Count existing users with the same normalized email
  SELECT COUNT(*) INTO existing_user_count
  FROM auth.users 
  WHERE normalize_email(email) = normalized_email;
  
  -- Build result object
  result := json_build_object(
    'exists', existing_user_count > 0,
    'normalized_email', normalized_email,
    'original_email', email_input,
    'count', existing_user_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comprehensive email validation function for signup
CREATE OR REPLACE FUNCTION validate_email_for_signup(email_input text)
RETURNS json AS $$
DECLARE
  normalized_email text;
  existing_count integer;
  result json;
  is_valid boolean;
  is_suspicious boolean;
  error_message text;
BEGIN
  -- Initialize result
  result := json_build_object('valid', false, 'error', null, 'normalized_email', null);
  
  -- Check if email is provided
  IF email_input IS NULL OR trim(email_input) = '' THEN
    result := result || json_build_object('error', 'Email address is required');
    RETURN result;
  END IF;
  
  -- Validate email format
  is_valid := is_valid_email(email_input);
  IF NOT is_valid THEN
    result := result || json_build_object('error', 'Please enter a valid email address');
    RETURN result;
  END IF;
  
  -- Check for suspicious patterns
  is_suspicious := is_suspicious_email(email_input);
  IF is_suspicious THEN
    result := result || json_build_object('error', 'Please use a valid business email address');
    RETURN result;
  END IF;
  
  -- Normalize email
  normalized_email := normalize_email(email_input);
  
  -- Check for existing users with the same normalized email
  SELECT COUNT(*) INTO existing_count
  FROM auth.users 
  WHERE normalize_email(email) = normalized_email;
  
  IF existing_count > 0 THEN
    -- Provide helpful error message for Gmail variations
    IF email_input ~* '@gmail\.com$' OR email_input ~* '@googlemail\.com$' THEN
      error_message := 'An account already exists with this email address. Note: Gmail ignores dots and text after + signs.';
    ELSE
      error_message := 'An account with this email address already exists';
    END IF;
    
    result := result || json_build_object('error', error_message);
    RETURN result;
  END IF;
  
  -- Email is valid and available
  result := json_build_object(
    'valid', true,
    'error', null,
    'normalized_email', normalized_email,
    'original_email', email_input,
    'is_gmail_variant', email_input != normalized_email AND normalized_email LIKE '%@gmail.com'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get email variations (for educational purposes)
CREATE OR REPLACE FUNCTION get_email_variations(email_input text)
RETURNS json AS $$
DECLARE
  normalized_email text;
  local_part text;
  domain_part text;
  variations text[];
  result json;
BEGIN
  normalized_email := normalize_email(email_input);
  local_part := split_part(normalized_email, '@', 1);
  domain_part := split_part(normalized_email, '@', 2);
  
  -- Generate common variations for Gmail
  IF domain_part = 'gmail.com' THEN
    variations := ARRAY[
      normalized_email,
      replace(local_part, '', '.') || '@gmail.com',
      local_part || '+business@gmail.com',
      local_part || '+shop@gmail.com',
      local_part || '@googlemail.com'
    ];
  ELSE
    variations := ARRAY[
      normalized_email,
      local_part || '+business@' || domain_part,
      local_part || '+shop@' || domain_part
    ];
  END IF;
  
  result := json_build_object(
    'normalized', normalized_email,
    'variations', variations,
    'note', 'All these variations are treated as the same email address'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to safely check user email during login
CREATE OR REPLACE FUNCTION find_user_by_email(email_input text)
RETURNS json AS $$
DECLARE
  normalized_email text;
  user_record record;
  result json;
BEGIN
  normalized_email := normalize_email(email_input);
  
  -- Find user by normalized email
  SELECT id, email, created_at
  INTO user_record
  FROM auth.users 
  WHERE normalize_email(email) = normalized_email
  LIMIT 1;
  
  IF user_record.id IS NOT NULL THEN
    result := json_build_object(
      'found', true,
      'user_id', user_record.id,
      'registered_email', user_record.email,
      'created_at', user_record.created_at
    );
  ELSE
    result := json_build_object('found', false);
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION normalize_email(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_valid_email(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_suspicious_email(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_email_exists(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_email_for_signup(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_email_variations(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_user_by_email(text) TO authenticated, anon;

-- Create a table to store email validation logs (optional, for monitoring)
CREATE TABLE IF NOT EXISTS email_validation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_input text NOT NULL,
  normalized_email text NOT NULL,
  validation_result jsonb NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on email validation logs
ALTER TABLE email_validation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for email validation logs (admin only)
CREATE POLICY "Admin can view email validation logs" ON email_validation_logs
  FOR SELECT TO authenticated
  USING (false); -- Only accessible via direct database access

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_email_validation_logs_normalized 
ON email_validation_logs USING btree (normalized_email);

CREATE INDEX IF NOT EXISTS idx_email_validation_logs_created_at 
ON email_validation_logs USING btree (created_at);

-- Create function to log email validation attempts (optional)
CREATE OR REPLACE FUNCTION log_email_validation(
  email_input text,
  validation_result jsonb,
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO email_validation_logs (
    email_input,
    normalized_email,
    validation_result,
    ip_address,
    user_agent
  ) VALUES (
    email_input,
    normalize_email(email_input),
    validation_result,
    ip_address,
    user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_email_validation(text, jsonb, inet, text) TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION normalize_email(text) IS 'Normalizes email addresses by removing Gmail dots, aliases, and converting to lowercase';
COMMENT ON FUNCTION is_valid_email(text) IS 'Validates email format using regex pattern';
COMMENT ON FUNCTION is_suspicious_email(text) IS 'Detects suspicious email patterns like test@test.com';
COMMENT ON FUNCTION check_email_exists(text) IS 'Checks if a normalized email already exists in the system';
COMMENT ON FUNCTION validate_email_for_signup(text) IS 'Comprehensive email validation for user signup process';
COMMENT ON FUNCTION get_email_variations(text) IS 'Shows common email variations that would be treated as duplicates';
COMMENT ON FUNCTION find_user_by_email(text) IS 'Safely finds user by normalized email for login purposes';