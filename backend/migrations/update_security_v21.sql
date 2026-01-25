-- Fix: allow users to read their own profile (prevents role=guest)

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
    CREATE POLICY profiles_self_read ON public.profiles
      FOR SELECT
      USING (
        id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
          ''
        )::uuid
      );
  END IF;
END $$;
