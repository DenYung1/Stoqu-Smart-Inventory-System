CREATE OR REPLACE FUNCTION public.create_paid_user_profile(
  p_user_id uuid,
  p_business_name text DEFAULT 'My Business',
  p_owner_name text DEFAULT 'Business Owner'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'User authorization required');
  END IF;

  INSERT INTO public.settings (
    user_id,
    business_name,
    owner_name,
    phone,
    currency,
    tax_rate,
    low_stock_threshold,
    auto_backup,
    notifications_low_stock,
    notifications_daily_summary,
    notifications_weekly_report
  )
  VALUES (
    p_user_id,
    COALESCE(NULLIF(trim(p_business_name), ''), 'My Business'),
    COALESCE(NULLIF(trim(p_owner_name), ''), 'Business Owner'),
    '',
    'GHS',
    12.5,
    5,
    true,
    true,
    true,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  DELETE FROM public.user_subscriptions
  WHERE user_id = p_user_id AND status = 'trial';

  RETURN json_build_object('success', true, 'trial_started', false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_paid_user_profile(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_paid_user_profile(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_payment_request(request_id uuid, admin_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record public.payment_requests;
  period_end timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Admin authorization required');
  END IF;

  SELECT * INTO payment_record
  FROM public.payment_requests
  WHERE id = request_id
  FOR UPDATE;

  IF payment_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payment request not found');
  END IF;

  IF payment_record.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Payment request already processed');
  END IF;

  IF payment_record.user_id IS NULL OR payment_record.signup_data IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payment request has no valid user account');
  END IF;

  period_end := CASE
    WHEN payment_record.plan_id LIKE '%yearly%' THEN now() + interval '1 year'
    ELSE now() + interval '1 month'
  END;

  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  VALUES (
    payment_record.user_id,
    payment_record.plan_id,
    'active',
    now(),
    period_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    trial_start = NULL,
    trial_end = NULL,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now();

  UPDATE public.payment_requests
  SET status = 'approved',
      processed_at = now(),
      processed_by = COALESCE(auth.uid()::text, admin_id, 'admin'),
      updated_at = now()
  WHERE id = request_id;

  RETURN json_build_object('success', true, 'message', 'Payment approved and subscription activated');
END;
$$;
