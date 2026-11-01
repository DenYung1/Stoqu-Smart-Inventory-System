DROP POLICY IF EXISTS "users_update_own_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "users_insert_own_subscriptions" ON public.user_subscriptions;

CREATE OR REPLACE FUNCTION public.cancel_my_subscription()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  UPDATE public.user_subscriptions
  SET status = 'cancelled',
      updated_at = now()
  WHERE user_id = auth.uid()
    AND status IN ('trial', 'active');

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No active subscription found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_my_subscription() TO authenticated;

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

CREATE POLICY "admins_manage_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.validate_payment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  plan_record public.subscription_plans;
  auth_user auth.users;
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Payment request user does not match authenticated user';
  END IF;

  SELECT * INTO plan_record
  FROM public.subscription_plans
  WHERE id = NEW.plan_id AND active = true AND price > 0;

  IF plan_record.id IS NULL THEN
    RAISE EXCEPTION 'Only active paid plans can be submitted';
  END IF;

  SELECT * INTO auth_user FROM auth.users WHERE id = auth.uid();

  NEW.amount := plan_record.price;
  NEW.currency := plan_record.currency;
  NEW.plan_name := plan_record.name;
  NEW.status := 'pending';
  NEW.payment_method := 'mtn_momo';
  NEW.user_email := COALESCE(auth_user.email, '');
  NEW.user_business_name := COALESCE(auth_user.raw_user_meta_data ->> 'business_name', 'Unknown Business');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_payment_request_before_insert ON public.payment_requests;
CREATE TRIGGER validate_payment_request_before_insert
  BEFORE INSERT ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_request();

REVOKE ALL ON FUNCTION public.validate_payment_request() FROM PUBLIC;
