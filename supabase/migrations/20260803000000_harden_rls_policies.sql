-- Harden row-level security policies so users can only access their own data.
-- This migration is idempotent and can be applied safely to existing environments.

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_products" ON public.products;
DROP POLICY IF EXISTS "users_manage_own_sales" ON public.sales;
DROP POLICY IF EXISTS "users_manage_own_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "users_manage_own_stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "users_manage_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_manage_own_settings" ON public.settings;
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "users_manage_own_payment_requests" ON public.payment_requests;
DROP POLICY IF EXISTS "users_manage_own_profiles" ON public.profiles;

CREATE POLICY "users_manage_own_products"
  ON public.products
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_sales"
  ON public.sales
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_suppliers"
  ON public.suppliers
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_stock_movements"
  ON public.stock_movements
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_settings"
  ON public.settings
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_subscriptions"
  ON public.user_subscriptions
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "users_manage_own_payment_requests"
  ON public.payment_requests
  FOR ALL
  USING (
    (auth.uid() IS NOT NULL AND user_id IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NOT NULL AND signup_data IS NOT NULL AND signup_data->>'email' = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id IS NOT NULL AND auth.uid() = user_id)
    OR
    (auth.uid() IS NOT NULL AND signup_data IS NOT NULL AND signup_data->>'email' = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

CREATE POLICY "users_manage_own_profiles"
  ON public.profiles
  FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);
