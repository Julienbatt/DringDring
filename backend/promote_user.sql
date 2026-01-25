DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Find the user ID for the newly registered email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'jub@ik.me';
    
    IF v_user_id IS NOT NULL THEN
        -- Upsert profile to make them super_admin
        INSERT INTO public.profiles (id, role) 
        VALUES (v_user_id, 'super_admin')
        ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
        
        RAISE NOTICE 'User jub@ik.me promoted to super_admin';
    ELSE
        RAISE EXCEPTION 'User jub@ik.me not found in auth.users';
    END IF;
END $$;
