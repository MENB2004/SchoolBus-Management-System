-- ═══════════════════════════════════════════════════════════════════════════════
-- Bus Management System — Database Schema Migration v3
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Create parent_profiles Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.parent_profiles IS 'Parent profiles containing user details and tenant linking';

-- Enable Row Level Security (RLS) on parent_profiles
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

-- ─── 2. Row Level Security Policies ──────────────────────────────────────────
-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Admins manage parent_profiles" ON public.parent_profiles;
DROP POLICY IF EXISTS "Parents view own profile" ON public.parent_profiles;

-- Admins can perform all actions on parent profiles in their tenant
CREATE POLICY "Admins manage parent_profiles"
    ON public.parent_profiles FOR ALL
    USING (tenant_id = public.get_current_tenant() AND public.get_current_role() = 'admin');

-- Parents can select/read their own parent profile
CREATE POLICY "Parents view own profile"
    ON public.parent_profiles FOR SELECT
    USING (user_id = auth.uid());

-- ─── 3. Helper RPC to Create User Accounts and Assign Roles (Admin Only) ──────
-- This RPC creates a new auth user and maps their role, useful for onboarding drivers or parents.
-- Since signup requires email/password, admins can generate credentials for them.
-- To allow creating auth users inside database functions, we utilize the extensions or create them via user_roles.
-- Let's make sure assign_user_role works, and add any specific helpers.

-- ─── 4. Unified Phone OTP Linking Trigger ─────────────────────────────────────
-- Trigger function to automatically link driver and parent profiles & assign roles
-- when a user signs up using a phone number registered by the admin.
CREATE OR REPLACE FUNCTION public.handle_phone_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_record RECORD;
    v_parent_record RECORD;
    v_phone TEXT;
BEGIN
    -- Only run if a phone number is registered in auth
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        v_phone := NEW.phone;
        
        -- 1. Check if matching driver record exists:
        SELECT * INTO v_driver_record
        FROM public.drivers
        WHERE phone = v_phone
           OR phone = REGEXP_REPLACE(v_phone, '^\+\d{1,3}', '')
        LIMIT 1;

        IF v_driver_record.id IS NOT NULL THEN
            -- Bind user_id to drivers table
            UPDATE public.drivers
            SET user_id = NEW.id
            WHERE id = v_driver_record.id;

            -- Assign 'driver' role inside user_roles
            INSERT INTO public.user_roles (user_id, tenant_id, role)
            VALUES (NEW.id, v_driver_record.tenant_id, 'driver')
            ON CONFLICT (user_id) DO UPDATE
            SET tenant_id = v_driver_record.tenant_id, role = 'driver';

            -- Record Audit Log
            INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
            VALUES (v_driver_record.tenant_id, NEW.id, 'Driver Phone OTP Account Linked', 'drivers', v_driver_record.id);
            
            RETURN NEW;
         END IF;

         -- 2. Check if matching parent record exists:
         SELECT * INTO v_parent_record
         FROM public.parent_profiles
         WHERE phone = v_phone
            OR phone = REGEXP_REPLACE(v_phone, '^\+\d{1,3}', '')
         LIMIT 1;

         IF v_parent_record.id IS NOT NULL THEN
             -- Bind user_id to parent_profiles table
             UPDATE public.parent_profiles
             SET user_id = NEW.id
             WHERE id = v_parent_record.id;

             -- Assign 'parent' role inside user_roles
             INSERT INTO public.user_roles (user_id, tenant_id, role)
             VALUES (NEW.id, v_parent_record.tenant_id, 'parent')
             ON CONFLICT (user_id) DO UPDATE
             SET tenant_id = v_parent_record.tenant_id, role = 'parent';

             -- Record Audit Log
             INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
             VALUES (v_parent_record.tenant_id, NEW.id, 'Parent Phone OTP Account Linked', 'parent_profiles', v_parent_record.id);
             
             RETURN NEW;
         END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Drop old triggers to prevent duplicate executions
DROP TRIGGER IF EXISTS tr_on_auth_user_phone_signup ON auth.users;
DROP TRIGGER IF EXISTS tr_on_auth_user_phone_signup_unified ON auth.users;

-- Attach trigger to auth.users (runs AFTER new auth row is inserted)
CREATE TRIGGER tr_on_auth_user_phone_signup_unified
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_phone_signup();
