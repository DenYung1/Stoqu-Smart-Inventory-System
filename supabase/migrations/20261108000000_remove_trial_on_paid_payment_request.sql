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

  DELETE FROM public.user_subscriptions
  WHERE user_id = auth.uid() AND status = 'trial';

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
