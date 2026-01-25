-- Customer link: add client_id to profiles and extend auth trigger

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_id UUID;

    IF to_regclass('public.client') IS NOT NULL THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_client_id_fkey
        FOREIGN KEY (client_id) REFERENCES public.client(id)
        ON DELETE SET NULL;
    END IF;
  END IF;

  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $func$
    BEGIN
      INSERT INTO public.profiles (id, role, admin_region_id, city_id, hq_id, shop_id, client_id)
      VALUES (
        new.id,
        COALESCE(new.raw_app_meta_data ->> 'role', 'customer'),
        NULLIF(new.raw_app_meta_data ->> 'admin_region_id', '')::uuid,
        NULLIF(new.raw_app_meta_data ->> 'city_id', '')::uuid,
        NULLIF(new.raw_app_meta_data ->> 'hq_id', '')::uuid,
        NULLIF(new.raw_app_meta_data ->> 'shop_id', '')::uuid,
        NULLIF(new.raw_app_meta_data ->> 'client_id', '')::uuid
      )
      ON CONFLICT (id) DO NOTHING;

      RETURN new;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $$;
