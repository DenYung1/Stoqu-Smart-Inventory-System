-- Add last_sign_in column to metadata for all users
UPDATE profiles
SET metadata = jsonb_build_object(
  'last_sign_in', auth.users.last_sign_in_at::text
)
FROM auth.users
WHERE profiles.id = auth.users.id
  AND (profiles.metadata IS NULL OR profiles.metadata->>'last_sign_in' IS NULL);

-- Create a trigger function to keep last_sign_in updated
CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{last_sign_in}',
    to_jsonb(NEW.last_sign_in_at::text)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_last_sign_in_trigger ON auth.users;
CREATE TRIGGER sync_last_sign_in_trigger
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_sign_in();
