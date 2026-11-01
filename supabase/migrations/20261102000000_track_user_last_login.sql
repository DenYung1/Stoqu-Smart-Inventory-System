ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE OR REPLACE FUNCTION public.record_user_login(
  p_user_id uuid,
  p_last_login_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'User is not authorized to record this login';
  END IF;

  UPDATE public.profiles
  SET last_login_at = p_last_login_at
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_login(uuid, timestamptz) TO authenticated;
