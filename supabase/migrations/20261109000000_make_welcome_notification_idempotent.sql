CREATE OR REPLACE FUNCTION public.ensure_welcome_notification(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'User authorization required');
  END IF;

  INSERT INTO public.notification_history (user_id, type)
  VALUES (p_user_id, 'welcome')
  ON CONFLICT (user_id, type) DO NOTHING;

  IF NOT FOUND THEN
    RETURN json_build_object('success', true, 'created', false);
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    is_read,
    priority,
    created_at
  )
  VALUES (
    p_user_id,
    'system',
    'Welcome to Stoqu',
    'Welcome to Stoqu! Get started by adding your business information in Settings.',
    false,
    'low',
    now()
  );

  RETURN json_build_object('success', true, 'created', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_welcome_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_welcome_notification(uuid) TO authenticated;

DELETE FROM public.notifications duplicate_notifications
USING public.notifications retained_notification
WHERE duplicate_notifications.user_id = retained_notification.user_id
  AND duplicate_notifications.type = 'system'
  AND duplicate_notifications.title = 'Welcome to Stoqu'
  AND retained_notification.type = 'system'
  AND retained_notification.title = 'Welcome to Stoqu'
  AND duplicate_notifications.id > retained_notification.id;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_welcome_per_user
  ON public.notifications (user_id, type)
  WHERE type = 'system' AND title = 'Welcome to Stoqu';
