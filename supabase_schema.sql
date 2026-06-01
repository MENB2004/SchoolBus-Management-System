-- ─── Supabase Database Schema Setup for Bus Management System ───
-- Paste this script into the Supabase SQL Editor and click "Run" to set up your tables!

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create User Roles Table (to map auth.users to admin/driver roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Buses Table
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_number TEXT NOT NULL UNIQUE,
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    capacity INTEGER NOT NULL DEFAULT 40,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Routes Table
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name TEXT NOT NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    start_point TEXT NOT NULL,
    end_point TEXT NOT NULL,
    stops TEXT[] NOT NULL DEFAULT '{}',
    stop_fees NUMERIC[] NOT NULL DEFAULT '{}',
    monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT,
    parent_name TEXT NOT NULL,
    parent_phone TEXT,
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    boarding_stop TEXT,
    monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    fee_paid_until DATE,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    month TEXT NOT NULL, -- e.g., "June 2026"
    payment_mode TEXT NOT NULL, -- Cash, UPI, Bank
    notes TEXT
);

-- ─── Row Level Security (RLS) & Policies ──────────────────────────────────
-- Enable RLS on all public tables to secure access
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Simple public access policies (Perfect for local development & testing)
CREATE POLICY "Allow public read on user_roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Allow public write on user_roles" ON public.user_roles FOR ALL USING (true);

CREATE POLICY "Allow public read on buses" ON public.buses FOR SELECT USING (true);
CREATE POLICY "Allow all actions on buses" ON public.buses FOR ALL USING (true);

CREATE POLICY "Allow public read on routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Allow all actions on routes" ON public.routes FOR ALL USING (true);

CREATE POLICY "Allow public read on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow all actions on students" ON public.students FOR ALL USING (true);

CREATE POLICY "Allow public read on payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Allow all actions on payments" ON public.payments FOR ALL USING (true);

-- ─── Seed Initial Mock Driver User Role ──────────────────────────────────
-- Note: Replace with actual driver auth user UUID once created in auth dashboard.
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<USER_UUID>', 'driver');

-- ─── Seed Rich Initial Mock Data ──────────────────────────────────────────
-- Populates the live Supabase tables with initial data so you don't start with a blank app!

-- 1. Insert Buses
INSERT INTO public.buses (id, bus_number, driver_name, driver_phone, capacity, status) VALUES
('b1111111-1111-1111-1111-111111111111', 'KA-01-F-1234', 'Ramesh Kumar', '9876543210', 40, 'active'),
('b2222222-2222-2222-2222-222222222222', 'KA-01-F-5678', 'Suresh Singh', '9876543211', 30, 'active'),
('b3333333-3333-3333-3333-333333333333', 'KA-01-F-9012', 'Mahesh Yadav', '9876543212', 50, 'inactive')
ON CONFLICT (bus_number) DO NOTHING;

-- 2. Insert Routes
INSERT INTO public.routes (id, route_name, bus_id, start_point, end_point, stops, stop_fees, monthly_fee) VALUES
('a1111111-1111-1111-1111-111111111111', 'Route A (HSR Layout)', 'b1111111-1111-1111-1111-111111111111', 'School Campus', 'HSR Sector 7', ARRAY['Sector 1', 'Sector 3', 'Sector 5', 'Sector 7'], ARRAY[1500, 1800, 2200, 2500], 2500.00),
('a2222222-2222-2222-2222-222222222222', 'Route B (Koramangala)', 'b2222222-2222-2222-2222-222222222222', 'School Campus', 'Koramangala 8th Block', ARRAY['Sony Signal', 'Wipro Park', 'Koramangala 4th Block', 'Koramangala 8th Block'], ARRAY[2000, 2200, 2600, 3000], 3000.00)
ON CONFLICT DO NOTHING;

-- 3. Insert Students
INSERT INTO public.students (id, name, class, section, parent_name, parent_phone, route_id, bus_id, boarding_stop, monthly_fee, fee_paid_until, is_active) VALUES
('c1111111-1111-1111-1111-111111111111', 'Aarav Sharma', '5th', 'A', 'Rajesh Sharma', '9988776655', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Sector 3', 2500.00, CURRENT_DATE + INTERVAL '30 days', true),
('c2222222-2222-2222-2222-222222222222', 'Ananya Iyer', '8th', 'B', 'Subramanian Iyer', '9988776656', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Sector 7', 2500.00, CURRENT_DATE + INTERVAL '4 days', true),
('c3333333-3333-3333-3333-333333333333', 'Vihaan Patel', '10th', 'C', 'Amit Patel', '9988776657', 'a2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Sony Signal', 3000.00, CURRENT_DATE - INTERVAL '10 days', true)
ON CONFLICT DO NOTHING;

-- 4. Insert Payments
INSERT INTO public.payments (id, student_id, amount, paid_at, month, payment_mode, notes) VALUES
('d1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 2500.00, NOW() - INTERVAL '15 days', 'May 2026', 'UPI', 'Fee paid successfully via GPay'),
('d2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 2500.00, NOW() - INTERVAL '25 days', 'April 2026', 'Cash', 'Handed over to class teacher')
ON CONFLICT DO NOTHING;
