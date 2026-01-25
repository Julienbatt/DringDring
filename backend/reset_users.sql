-- Clean up script to ensure we only have one admin
-- Deletes superadmin@dringdring.ch and jub@ik.me to allow fresh start

-- Remove from public.profiles first (FK constraint usually cascades but safer)
DELETE FROM public.profiles WHERE id IN (
    SELECT id FROM auth.users WHERE email IN ('superadmin@dringdring.ch', 'jub@ik.me')
);

-- Remove from auth.users
DELETE FROM auth.users WHERE email IN ('superadmin@dringdring.ch', 'jub@ik.me');

-- Reset sequences or cleanup unrelated data if needed (Skipped for safety)
