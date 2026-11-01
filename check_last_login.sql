-- Check if last_login is being recorded
SELECT 
  email,
  metadata->>'last_login' as last_login
FROM profiles 
WHERE email = 'admin@stoqu.com';
