-- Ensure every user has one idempotent seven-day trial subscription.

WITH duplicate_subscriptions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN status IN ('active', 'trial') THEN 0 ELSE 1 END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS row_number
  FROM public.user_subscriptions
)
DELETE FROM public.user_subscriptions subscriptions
USING duplicate_subscriptions duplicates
WHERE subscriptions.id = duplicates.id
  AND duplicates.row_number > 1;

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_unique;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_business_name text DEFAULT 'My Business',
  p_owner_name text DEFAULT 'Business Owner'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_trial_end timestamptz := v_now + interval '7 days';
BEGIN
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

  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end
  )
  VALUES (
    p_user_id,
    'trial',
    'trial',
    v_now,
    v_trial_end,
    v_now,
    v_trial_end
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'message', 'Profile initialized successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_profile(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text) TO authenticated;
