CREATE OR REPLACE FUNCTION public.is_current_user_banned()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_banned FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.check_current_user_access()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('allowed', false, 'reason', 'Authentication required');
  END IF;

  IF public.is_current_user_banned() THEN
    RETURN json_build_object('allowed', false, 'reason', 'Account suspended');
  END IF;

  RETURN json_build_object('allowed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_current_user_access() TO authenticated;
REVOKE ALL ON FUNCTION public.is_current_user_banned() FROM PUBLIC;

DROP POLICY IF EXISTS "users_manage_own_products" ON public.products;
CREATE POLICY "users_manage_own_products" ON public.products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_banned())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned());

DROP POLICY IF EXISTS "users_manage_own_sales" ON public.sales;
CREATE POLICY "users_manage_own_sales" ON public.sales
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_banned())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned());

DROP POLICY IF EXISTS "users_manage_own_suppliers" ON public.suppliers;
CREATE POLICY "users_manage_own_suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_banned())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned());

DROP POLICY IF EXISTS "users_manage_own_stock_movements" ON public.stock_movements;
CREATE POLICY "users_manage_own_stock_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_banned())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned());

DROP POLICY IF EXISTS "users_manage_own_notifications" ON public.notifications;
CREATE POLICY "users_manage_own_notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_banned())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned());

DROP POLICY IF EXISTS "users_manage_own_settings" ON public.settings;
CREATE POLICY "users_manage_own_settings" ON public.settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_current_user_banned())
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned());

DROP POLICY IF EXISTS "users_read_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "users_read_own_subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id AND NOT public.is_current_user_banned()) OR public.is_admin());

DROP POLICY IF EXISTS "users_read_own_payment_requests" ON public.payment_requests;
CREATE POLICY "users_read_own_payment_requests" ON public.payment_requests
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id AND NOT public.is_current_user_banned()) OR public.is_admin());

DROP POLICY IF EXISTS "users_insert_own_payment_requests" ON public.payment_requests;
CREATE POLICY "users_insert_own_payment_requests" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_current_user_banned() AND signup_data IS NULL);
