-- Clean up user to allow retry with known password
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'jub@ik.me');
DELETE FROM auth.users WHERE email = 'jub@ik.me';
