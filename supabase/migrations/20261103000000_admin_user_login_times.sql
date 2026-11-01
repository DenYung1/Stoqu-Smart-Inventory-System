CREATE OR REPLACE FUNCTION public.get_admin_user_last_logins()
RETURNS TABLE (
  user_id uuid,
  last_login_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;

  RETURN QUERY
  SELECT
    auth_user.id,
    COALESCE(auth_user.last_sign_in_at, profile.last_login_at)
  FROM auth.users AS auth_user
  LEFT JOIN public.profiles AS profile ON profile.id = auth_user.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_user_last_logins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_user_last_logins() TO authenticated;
