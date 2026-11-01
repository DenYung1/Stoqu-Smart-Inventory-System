-- Final security hardening.
-- Paid signups now create an Auth account before submitting payment, so
-- payment_requests must never contain passwords or anonymous signup records.

UPDATE public.payment_requests
SET signup_data = NULL
WHERE signup_data IS NOT NULL;

DROP POLICY IF EXISTS "Anonymous users can create signup payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Anonymous users can view signup requests by email" ON public.payment_requests;

DO $$
DECLARE
  policy_record record;
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products',
    'sales',
    'suppliers',
    'stock_movements',
    'notifications',
    'settings',
    'user_subscriptions',
    'payment_requests',
    'profiles'
  ] LOOP
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
    END LOOP;
  END LOOP;
END $$;

REVOKE ALL ON public.payment_requests FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.user_subscriptions FROM anon;
REVOKE SELECT ON auth.users FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
    OR (auth.jwt() ->> 'email') IN ('admin@stoqu.com', 'stoqu@admin.com', 'dennisabayateye@gmail.com'),
    false
  );
$$;

CREATE POLICY "users_manage_own_products" ON public.products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_sales" ON public.sales
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_manage_own_settings" ON public.settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users_update_own_subscriptions" ON public.user_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users_insert_own_subscriptions" ON public.user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_payment_requests" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users_insert_own_payment_requests" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND signup_data IS NULL);

CREATE POLICY "admins_update_payment_requests" ON public.payment_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.approve_payment_request(request_id uuid, admin_id text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record public.payment_requests;
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
    RETURN json_build_object('success', false, 'error', 'This legacy signup request must be resubmitted after account creation');
  END IF;

  UPDATE public.payment_requests
  SET status = 'approved',
      processed_at = now(),
      processed_by = COALESCE(auth.uid()::text, admin_id, 'admin'),
      updated_at = now()
  WHERE id = request_id;

  UPDATE public.user_subscriptions
  SET plan_id = payment_record.plan_id,
      status = 'active',
      current_period_start = now(),
      current_period_end = CASE
        WHEN payment_record.plan_id LIKE '%yearly%' THEN now() + interval '1 year'
        ELSE now() + interval '1 month'
      END,
      updated_at = now()
  WHERE user_id = payment_record.user_id;

  RETURN json_build_object('success', true, 'message', 'Payment approved and subscription updated');
END;
$$;

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

REVOKE ALL ON FUNCTION public.approve_payment_request(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_payment_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_payment_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_request(uuid, text, text) TO authenticated;
