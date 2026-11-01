-- Check the last_login values
SELECT id, email, last_login 
FROM profiles 
WHERE last_login IS NOT NULL 
ORDER BY last_login DESC 
LIMIT 5;
