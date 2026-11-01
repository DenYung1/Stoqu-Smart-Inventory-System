-- Keep the existing RPC contract while avoiding the PL/pgSQL parameter/column
-- name collision that caused rejection requests to return an error.
CREATE OR REPLACE FUNCTION public.reject_payment_request(
  request_id uuid,
  rejection_reason text,
  admin_id text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rejection_reason text := rejection_reason;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Admin authorization required');
  END IF;

  UPDATE public.payment_requests
  SET status = 'rejected',
      processed_at = now(),
      processed_by = COALESCE(auth.uid()::text, admin_id, 'admin'),
      rejection_reason = NULLIF(trim(v_rejection_reason), ''),
      updated_at = now()
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Payment request not found or already processed');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Payment request rejected');
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payment_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_payment_request(uuid, text, text) TO authenticated;
