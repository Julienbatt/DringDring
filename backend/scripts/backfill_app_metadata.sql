-- One-off backfill: sync app_metadata from public.profiles

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_strip_nulls(
        jsonb_build_object(
            'role', p.role,
            'admin_region_id', p.admin_region_id::text,
            'shop_id', p.shop_id::text,
            'city_id', p.city_id::text,
            'hq_id', p.hq_id::text,
            'client_id', p.client_id::text
        )
    )
FROM public.profiles p
WHERE p.id = u.id;
