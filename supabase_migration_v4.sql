-- ═══════════════════════════════════════════════════════════════════════════════
-- Bus Management System — Database Schema Migration v4
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Update Public Tables with Username and Common Password Config ───────
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.parent_profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS common_password TEXT DEFAULT 'school123';

-- ─── 2. Clean Up Old Phone OTP Trigger Logic ──────────────────────────────────
DROP TRIGGER IF EXISTS tr_on_auth_user_phone_signup ON auth.users;
DROP TRIGGER IF EXISTS tr_on_auth_user_phone_signup_unified ON auth.users;
DROP FUNCTION IF EXISTS public.handle_phone_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_driver_phone_signup() CASCADE;

-- ─── 3. Create RPC to Create User Accounts and Assign Roles (Admin Only) ──────
-- This RPC allows admins to manually create accounts for drivers or parents.
-- Users are created with needs_password_change = true in metadata.
CREATE OR REPLACE FUNCTION public.create_auth_user(
    p_username TEXT,
    p_password TEXT,
    p_role TEXT,
    p_tenant_id UUID,
    p_name TEXT,
    p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- Only allow admins to execute this RPC
    IF public.get_current_role() != 'admin' THEN
        RAISE EXCEPTION 'Only school administrators can create accounts.';
    END IF;

    -- Format username to email syntax internally
    v_email := LOWER(TRIM(p_username)) || '@school.com';

    -- Check username availability
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RAISE EXCEPTION 'Username already exists.';
    END IF;

    -- Generate user UUID
    v_user_id := gen_random_uuid();

    -- Insert standard Supabase auth record
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', p_name, 'needs_password_change', true),
        now(),
        now()
    );

    -- Assign role mapping in public.user_roles
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (v_user_id, p_tenant_id, p_role);

    -- Log operation to audits
    INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
    VALUES (p_tenant_id, auth.uid(), 'Auth user created: ' || p_username || ' (' || p_role || ')', 'user_roles', v_user_id);

    RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.create_auth_user IS 'Creates a new auth user with role mapping (admin only)';
