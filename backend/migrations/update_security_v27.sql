-- Lock search_path for handle_new_user (any signature)

DO $$
DECLARE
  proc_name text;
BEGIN
  FOR proc_name IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth', proc_name);
  END LOOP;
END $$;
