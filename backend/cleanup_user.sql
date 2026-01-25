-- Clean up manually created user to allow clean signup
DELETE FROM auth.users WHERE email = 'superadmin@dringdring.ch';
