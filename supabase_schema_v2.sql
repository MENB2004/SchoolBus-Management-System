-- ═══════════════════════════════════════════════════════════════════════════════
-- Bus Management System — Multi-Tenant SaaS Schema v2
-- ═══════════════════════════════════════════════════════════════════════════════
-- DESTRUCTIVE MIGRATION: This script drops all existing tables and recreates
-- them with full multi-tenancy, RLS, RBAC, audit logging, and composite constraints.
--
-- Instructions:
-- 1. BACKUP any data you want to keep before running this script
-- 2. Paste this entire script into the Supabase SQL Editor
-- 3. Click "Run" to execute
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Step 0: Enable Required Extensions ──────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Step 1: Drop Existing Tables (CASCADE removes dependent objects) ────────
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.parent_students CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.routes CASCADE;
DROP TABLE IF EXISTS public.buses CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_current_tenant() CASCADE;
DROP FUNCTION IF EXISTS public.register_new_school(TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.assign_user_role(UUID, TEXT, UUID) CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE DEFINITIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. tenants (Master School Directory & Billing) ──────────────────────────
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subscription_plan TEXT NOT NULL DEFAULT 'free'
        CHECK (subscription_plan IN ('free', 'basic', 'premium', 'enterprise')),
    subscription_status TEXT NOT NULL DEFAULT 'active'
        CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
    contact_email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.tenants IS 'Master school directory with billing/subscription metadata';

-- ─── 2. user_roles (Unified Session Roles) ───────────────────────────────────
CREATE TABLE public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'parent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, tenant_id),
    UNIQUE (user_id)  -- A user belongs to exactly one tenant
);

COMMENT ON TABLE public.user_roles IS 'Maps Supabase auth users to a role and tenant';

-- ─── 3. drivers (Normalized Driver Table) ────────────────────────────────────
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.drivers IS 'Driver profiles, optionally linked to auth users';

-- ─── 4. buses (Fleet Table with Composite Constraints) ───────────────────────
CREATE TABLE public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bus_number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 40,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (tenant_id, bus_number)  -- "Bus 1" can coexist across different schools
);

COMMENT ON TABLE public.buses IS 'Fleet table with tenant-scoped unique bus numbers';

-- ─── 5. routes (Stops & Fees Config) ─────────────────────────────────────────
CREATE TABLE public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    route_name TEXT NOT NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    start_point TEXT NOT NULL,
    end_point TEXT NOT NULL,
    stops TEXT[] NOT NULL DEFAULT '{}',
    stop_fees NUMERIC[] NOT NULL DEFAULT '{}',
    monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.routes IS 'Bus routes with stop-level fee configuration';

-- ─── 6. students (Student Profiles) ──────────────────────────────────────────
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT,
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    boarding_stop TEXT,
    monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fee_paid_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.students IS 'Student profiles linked to routes and buses';

-- ─── 7. parent_students (Parent-Student Relationship) ────────────────────────
CREATE TABLE public.parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (parent_id, student_id)
);

COMMENT ON TABLE public.parent_students IS 'Links parent auth users to their children';

-- ─── 8. payments (Fee Payments) ──────────────────────────────────────────────
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    month TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.payments IS 'Fee payment records per student';

-- ─── 9. attendance (Dynamic Boarding Logs) ───────────────────────────────────
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('boarded', 'dropped', 'absent')),
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.attendance IS 'Daily boarding/drop attendance logged by drivers';

-- ─── 10. audit_logs (Security & Audit Trail) ────────────────────────────────
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.audit_logs IS 'Tracks all admin/driver/system actions for compliance';

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES (Performance)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX idx_drivers_tenant_id ON public.drivers(tenant_id);
CREATE INDEX idx_buses_tenant_id ON public.buses(tenant_id);
CREATE INDEX idx_routes_tenant_id ON public.routes(tenant_id);
CREATE INDEX idx_students_tenant_id ON public.students(tenant_id);
CREATE INDEX idx_students_bus_id ON public.students(bus_id);
CREATE INDEX idx_students_route_id ON public.students(route_id);
CREATE INDEX idx_parent_students_parent_id ON public.parent_students(parent_id);
CREATE INDEX idx_parent_students_student_id ON public.parent_students(student_id);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_student_id ON public.payments(student_id);
CREATE INDEX idx_attendance_tenant_id ON public.attendance(tenant_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Centralized tenant lookup used by all RLS policies
CREATE OR REPLACE FUNCTION public.get_current_tenant()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN (
        SELECT tenant_id
        FROM public.user_roles
        WHERE user_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION public.get_current_tenant IS 'Returns the tenant_id for the currently authenticated user';

-- Get current user role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN (
        SELECT role
        FROM public.user_roles
        WHERE user_id = auth.uid()
    );
END;
$$;

COMMENT ON FUNCTION public.get_current_role IS 'Returns the role for the currently authenticated user';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURE SERVER-SIDE RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Register a new school and assign the admin role to an existing auth user.
-- The auth user must be created FIRST via Supabase Edge Function or client signUp().
-- This RPC then creates the tenant record and assigns the admin role.
CREATE OR REPLACE FUNCTION public.register_new_school(
    p_school_name TEXT,
    p_slug TEXT,
    p_contact_email TEXT,
    p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_response JSONB;
BEGIN
    -- Validate the user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_admin_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User does not exist');
    END IF;

    -- Check user doesn't already have a role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_admin_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User already belongs to a school');
    END IF;

    -- 1. Create the School Tenant
    INSERT INTO public.tenants (school_name, slug, contact_email, subscription_plan, subscription_status)
    VALUES (p_school_name, p_slug, p_contact_email, 'free', 'active')
    RETURNING id INTO v_tenant_id;

    -- 2. Assign Admin Role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (p_admin_user_id, 'admin', v_tenant_id);

    -- 3. Record Audit Log
    INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
    VALUES (v_tenant_id, p_admin_user_id, 'School Registered', 'tenants', v_tenant_id);

    v_response := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'user_id', p_admin_user_id,
        'message', 'School successfully registered with free active plan!'
    );
    RETURN v_response;

EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'School slug or email already exists');
WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.register_new_school IS 'Server-side school registration — creates tenant + assigns admin role';

-- Assign a role to a user within a tenant (admin-only operation)
CREATE OR REPLACE FUNCTION public.assign_user_role(
    p_user_id UUID,
    p_role TEXT,
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant UUID;
    v_target_tenant UUID;
BEGIN
    -- Get caller's role and tenant
    SELECT role, tenant_id INTO v_caller_role, v_caller_tenant
    FROM public.user_roles WHERE user_id = auth.uid();

    -- Only admins can assign roles
    IF v_caller_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only admins can assign roles');
    END IF;

    -- Use caller's tenant if not specified
    v_target_tenant := COALESCE(p_tenant_id, v_caller_tenant);

    -- Admins can only assign within their own tenant
    IF v_target_tenant != v_caller_tenant THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot assign roles to other tenants');
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'driver', 'parent') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role: ' || p_role);
    END IF;

    -- Insert or update
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (p_user_id, p_role, v_target_tenant)
    ON CONFLICT (user_id) DO UPDATE SET role = p_role, tenant_id = v_target_tenant;

    -- Audit
    INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
    VALUES (v_target_tenant, auth.uid(), 'Role Assigned: ' || p_role, 'user_roles', p_user_id);

    RETURN jsonb_build_object('success', true, 'message', 'Role assigned successfully');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.assign_user_role IS 'Admin-only: assigns role to a user within the admin tenant';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on ALL tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── tenants ─────────────────────────────────────────────────────────────────
-- Users can only view their own tenant
CREATE POLICY "Users view own tenant"
    ON public.tenants FOR SELECT
    USING (id = public.get_current_tenant());

-- Only service_role (Edge Functions) can insert tenants
-- (register_new_school RPC has SECURITY DEFINER so it bypasses RLS)

-- Admins can update their own tenant
CREATE POLICY "Admins update own tenant"
    ON public.tenants FOR UPDATE
    USING (id = public.get_current_tenant() AND public.get_current_role() = 'admin');

-- ─── user_roles ──────────────────────────────────────────────────────────────
-- Users can read roles in their tenant
CREATE POLICY "Users view tenant roles"
    ON public.user_roles FOR SELECT
    USING (tenant_id = public.get_current_tenant());

-- Block ALL direct inserts from clients (must use RPC)
-- SECURITY DEFINER functions bypass RLS, so register_new_school and assign_user_role work

-- ─── drivers ─────────────────────────────────────────────────────────────────
CREATE POLICY "Tenant isolation on drivers"
    ON public.drivers FOR ALL
    USING (tenant_id = public.get_current_tenant());

-- ─── buses ───────────────────────────────────────────────────────────────────
CREATE POLICY "Tenant isolation on buses"
    ON public.buses FOR ALL
    USING (tenant_id = public.get_current_tenant());

-- ─── routes ──────────────────────────────────────────────────────────────────
CREATE POLICY "Tenant isolation on routes"
    ON public.routes FOR ALL
    USING (tenant_id = public.get_current_tenant());

-- ─── students ────────────────────────────────────────────────────────────────
-- Admins and drivers see all students in their tenant
CREATE POLICY "Tenant isolation on students"
    ON public.students FOR ALL
    USING (tenant_id = public.get_current_tenant() AND public.get_current_role() IN ('admin', 'driver'));

-- Parents see only their linked children
CREATE POLICY "Parents view only their children"
    ON public.students FOR SELECT
    USING (
        public.get_current_role() = 'parent'
        AND id IN (
            SELECT student_id
            FROM public.parent_students
            WHERE parent_id = auth.uid()
        )
    );

-- ─── parent_students ────────────────────────────────────────────────────────
-- Admins can manage parent-student links
CREATE POLICY "Admins manage parent_students"
    ON public.parent_students FOR ALL
    USING (tenant_id = public.get_current_tenant() AND public.get_current_role() = 'admin');

-- Parents can view their own links
CREATE POLICY "Parents view own links"
    ON public.parent_students FOR SELECT
    USING (parent_id = auth.uid());

-- ─── payments ────────────────────────────────────────────────────────────────
-- Admins see all payments in their tenant
CREATE POLICY "Tenant isolation on payments (admin)"
    ON public.payments FOR ALL
    USING (tenant_id = public.get_current_tenant() AND public.get_current_role() = 'admin');

-- Parents see payments for their children
CREATE POLICY "Parents view own children payments"
    ON public.payments FOR SELECT
    USING (
        public.get_current_role() = 'parent'
        AND student_id IN (
            SELECT student_id
            FROM public.parent_students
            WHERE parent_id = auth.uid()
        )
    );

-- ─── attendance ──────────────────────────────────────────────────────────────
-- Admins and drivers have full access within their tenant
CREATE POLICY "Tenant isolation on attendance"
    ON public.attendance FOR ALL
    USING (tenant_id = public.get_current_tenant() AND public.get_current_role() IN ('admin', 'driver'));

-- Parents can view attendance for their children
CREATE POLICY "Parents view own children attendance"
    ON public.attendance FOR SELECT
    USING (
        public.get_current_role() = 'parent'
        AND student_id IN (
            SELECT student_id
            FROM public.parent_students
            WHERE parent_id = auth.uid()
        )
    );

-- ─── audit_logs ──────────────────────────────────────────────────────────────
-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (tenant_id = public.get_current_tenant() AND public.get_current_role() = 'admin');

-- Insert allowed for all authenticated users in their tenant (for logging)
CREATE POLICY "Authenticated users insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (tenant_id = public.get_current_tenant());

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA (Two schools to test multi-tenancy)
-- ═══════════════════════════════════════════════════════════════════════════════

-- NOTE: Run this AFTER creating auth users in the Supabase dashboard.
-- Replace the UUIDs below with actual auth.users IDs.

-- Tenant 1: Greenwood International School
INSERT INTO public.tenants (id, school_name, slug, contact_email, subscription_plan, subscription_status)
VALUES (
    '11111111-0000-0000-0000-000000000001',
    'Greenwood International School',
    'greenwood-bangalore',
    'admin@greenwood.edu.in',
    'premium',
    'active'
);

-- Tenant 2: Oakridge International School
INSERT INTO public.tenants (id, school_name, slug, contact_email, subscription_plan, subscription_status)
VALUES (
    '22222222-0000-0000-0000-000000000002',
    'Oakridge International School',
    'oakridge-hyderabad',
    'admin@oakridge.edu.in',
    'basic',
    'active'
);

-- ─── Seed Drivers (Greenwood) ────────────────────────────────────────────────
INSERT INTO public.drivers (id, tenant_id, name, phone) VALUES
('d1111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'Ramesh Kumar', '9876543210'),
('d2222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000001', 'Suresh Singh', '9876543211');

-- ─── Seed Drivers (Oakridge) ─────────────────────────────────────────────────
INSERT INTO public.drivers (id, tenant_id, name, phone) VALUES
('d3333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000002', 'Mahesh Yadav', '9876543212');

-- ─── Seed Buses (Greenwood — "Bus 1" exists here) ───────────────────────────
INSERT INTO public.buses (id, tenant_id, bus_number, capacity, driver_id, status) VALUES
('b1111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'KA-01-F-1234', 40, 'd1111111-1111-1111-1111-111111111111', 'active'),
('b2222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000001', 'KA-01-F-5678', 30, 'd2222222-2222-2222-2222-222222222222', 'active');

-- ─── Seed Buses (Oakridge — "Bus 1" also exists here, no conflict!) ─────────
INSERT INTO public.buses (id, tenant_id, bus_number, capacity, driver_id, status) VALUES
('b3333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000002', 'TS-09-A-4567', 50, 'd3333333-3333-3333-3333-333333333333', 'active');

-- ─── Seed Routes (Greenwood) ─────────────────────────────────────────────────
INSERT INTO public.routes (id, tenant_id, route_name, bus_id, start_point, end_point, stops, stop_fees, monthly_fee) VALUES
('a1111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'Route A (HSR Layout)', 'b1111111-1111-1111-1111-111111111111', 'School Campus', 'HSR Sector 7', ARRAY['Sector 1', 'Sector 3', 'Sector 5', 'Sector 7'], ARRAY[1500, 1800, 2200, 2500], 2500.00),
('a2222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000001', 'Route B (Koramangala)', 'b2222222-2222-2222-2222-222222222222', 'School Campus', 'Koramangala 8th Block', ARRAY['Sony Signal', 'Wipro Park', 'Koramangala 4th Block', 'Koramangala 8th Block'], ARRAY[2000, 2200, 2600, 3000], 3000.00);

-- ─── Seed Routes (Oakridge) ──────────────────────────────────────────────────
INSERT INTO public.routes (id, tenant_id, route_name, bus_id, start_point, end_point, stops, stop_fees, monthly_fee) VALUES
('a3333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000002', 'Route X (Jubilee Hills)', 'b3333333-3333-3333-3333-333333333333', 'School Campus', 'Jubilee Hills Checkpost', ARRAY['Film Nagar', 'Road No. 36', 'KBR Park', 'Checkpost'], ARRAY[1800, 2000, 2400, 2800], 2800.00);

-- ─── Seed Students (Greenwood) ───────────────────────────────────────────────
INSERT INTO public.students (id, tenant_id, name, class, section, route_id, bus_id, boarding_stop, monthly_fee, fee_paid_until, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'Aarav Sharma', '5th', 'A', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Sector 3', 2500.00, CURRENT_DATE + INTERVAL '30 days', true),
('c2222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000001', 'Ananya Iyer', '8th', 'B', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Sector 7', 2500.00, CURRENT_DATE + INTERVAL '4 days', true);

-- ─── Seed Students (Oakridge) ────────────────────────────────────────────────
INSERT INTO public.students (id, tenant_id, name, class, section, route_id, bus_id, boarding_stop, monthly_fee, fee_paid_until, is_active) VALUES
('c3333333-3333-3333-3333-333333333333', '22222222-0000-0000-0000-000000000002', 'Vihaan Patel', '10th', 'C', 'a3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Film Nagar', 2800.00, CURRENT_DATE - INTERVAL '10 days', true);

-- ─── Seed Payments (Greenwood) ───────────────────────────────────────────────
INSERT INTO public.payments (id, tenant_id, student_id, amount, paid_at, month, payment_mode, notes) VALUES
('e1111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001', 'c1111111-1111-1111-1111-111111111111', 2500.00, NOW() - INTERVAL '15 days', 'May 2026', 'UPI', 'Fee paid successfully via GPay'),
('e2222222-2222-2222-2222-222222222222', '11111111-0000-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222', 2500.00, NOW() - INTERVAL '25 days', 'April 2026', 'Cash', 'Handed over to class teacher');

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATED DRIVER PHONE OTP LINKING (OPTION B)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger function to automatically link driver profile & assign 'driver' role
-- when a user signs up using a phone number that is registered by the school.
CREATE OR REPLACE FUNCTION public.handle_driver_phone_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_driver_record RECORD;
BEGIN
    -- Only run if a phone number is registered
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        -- Find driver profile matching:
        -- 1. Exact phone number (e.g. +919876543210)
        -- 2. Strip leading country codes (e.g. match 9876543210 even if admin registered without +91)
        SELECT * INTO v_driver_record
        FROM public.drivers
        WHERE phone = NEW.phone
           OR phone = REGEXP_REPLACE(NEW.phone, '^\+\d{1,3}', '')
        LIMIT 1;

        -- If matching driver record exists:
        IF v_driver_record.id IS NOT NULL THEN
            -- 1. Bind user_id to drivers table
            UPDATE public.drivers
            SET user_id = NEW.id
            WHERE id = v_driver_record.id;

            -- 2. Assign 'driver' role inside user_roles
            INSERT INTO public.user_roles (user_id, tenant_id, role)
            VALUES (NEW.id, v_driver_record.tenant_id, 'driver')
            ON CONFLICT (user_id) DO UPDATE
            SET tenant_id = v_driver_record.tenant_id, role = 'driver';

            -- 3. Record Audit Log
            INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
            VALUES (v_driver_record.tenant_id, NEW.id, 'Driver Phone OTP Account Linked', 'drivers', v_driver_record.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_driver_phone_signup() IS 'Auto-links newly registered phone auth users to pre-existing driver profiles';

-- Attach trigger to auth.users (executed AFTER a new auth row is inserted)
DROP TRIGGER IF EXISTS tr_on_auth_user_phone_signup ON auth.users;
CREATE TRIGGER tr_on_auth_user_phone_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_driver_phone_signup();

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! Your multi-tenant SaaS schema is ready.
-- ═══════════════════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Create auth users in Supabase Dashboard (Authentication > Users)
-- 2. Insert user_roles records using the assign_user_role() RPC or
--    manually for the first admin:
--    INSERT INTO public.user_roles (user_id, tenant_id, role)
--    VALUES ('<your-auth-user-uuid>', '11111111-0000-0000-0000-000000000001', 'admin');
-- 3. Deploy the Edge Function for server-side registration
-- ═══════════════════════════════════════════════════════════════════════════════
