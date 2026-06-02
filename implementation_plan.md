# Elite Production-Grade Multi-Tenant SaaS Implementation Plan

This updated plan transitions the **Bus Management System** into a high-security, production-grade Software-as-a-Service (SaaS) application. It incorporates robust multi-tenancy, granular Role-Based Access Control (RBAC), secure PostgreSQL Row-Level Security (RLS) policies, audit logging, composite constraints, and server-side RPC functions to prevent privilege escalation.

---

## User Review Required

> [!IMPORTANT]
> - **Subscription-Ready Core**: We will implement both `subscription_plan` (e.g. 'free', 'basic', 'premium') and `subscription_status` (e.g. 'active', 'past_due', 'trialing') columns inside the `tenants` table. This lays the perfect foundation for future self-service monetization and billing webhook integrations (like Stripe or Razorpay) without requiring any database schema adjustments later on.
> - **Unified RLS Helper**: We will implement a high-performance PostgreSQL function `get_current_tenant()` to centralize and optimize tenant resolution across all database policies.
> - **Server-Side Security Control**: All school registration and user role assignments will occur **strictly server-side** using a secure PostgreSQL RPC function. The mobile client is completely blocked from writing directly to `user_roles` or `tenants` tables, eliminating client-side privilege escalation vectors.
> - **Composite Constraints**: We will implement a composite unique constraint `UNIQUE (tenant_id, bus_number)` to allow different schools to register identical bus names (e.g., "Bus 1").
> - **Audit Logging**: We will introduce a global `audit_logs` table to log all administrative and driver actions for debugging, compliance, and security tracking.

---

## Proposed Database Structure (Extended & Hardened)

To achieve strict tenant isolation, every business-related table contains `tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE`.

### 1. `tenants` (Master School Directory & Billing)
Stores school metadata, unique system slugs, and active subscription profiles.
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `school_name` TEXT NOT NULL -- Allows duplicate school names (e.g. "St. Mary's School")
* `slug` TEXT NOT NULL UNIQUE -- Enforces unique system identifier (e.g. "st-marys-kochi")
* `subscription_plan` TEXT NOT NULL DEFAULT 'free' -- e.g., 'free', 'basic', 'premium', 'enterprise'
* `subscription_status` TEXT NOT NULL DEFAULT 'active' -- e.g., 'active', 'trialing', 'past_due', 'canceled'
* `contact_email` TEXT NOT NULL UNIQUE
* `created_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL

### 2. `user_roles` (Unified Session Roles)
Maps authenticated Supabase users to roles and schools.
* `user_id` UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `role` TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'parent'))
* `created_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
* PRIMARY KEY (user_id, tenant_id)

### 3. `drivers` (Normalized Driver Table)
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `user_id` UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
* `name` TEXT NOT NULL
* `phone` TEXT NOT NULL
* `created_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL

### 4. `buses` (Fleet Table with Composite Constraints)
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `bus_number` TEXT NOT NULL
* `capacity` INTEGER NOT NULL DEFAULT 40
* `driver_id` UUID REFERENCES public.drivers(id) ON DELETE SET NULL
* `status` TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
* **CONSTRAINT**: `UNIQUE (tenant_id, bus_number)` -- Allows "Bus 1" to coexist across different schools

### 5. `students` (Student Profiles)
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `name` TEXT NOT NULL
* `class` TEXT NOT NULL
* `section` TEXT
* `route_id` UUID REFERENCES public.routes(id) ON DELETE SET NULL
* `bus_id` UUID REFERENCES public.buses(id) ON DELETE SET NULL
* `boarding_stop` TEXT
* `monthly_fee` NUMERIC(10, 2) NOT NULL DEFAULT 0.00
* `fee_paid_until` DATE
* `is_active` BOOLEAN NOT NULL DEFAULT true

### 6. `parent_students` (Parent-Student Relationship Table)
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `parent_id` UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
* `student_id` UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE
* UNIQUE (parent_id, student_id)

### 7. `routes` (Stops & Fees Config)
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `route_name` TEXT NOT NULL
* `start_point` TEXT NOT NULL
* `end_point` TEXT NOT NULL
* `stops` TEXT[] NOT NULL DEFAULT '{}'
* `stop_fees` NUMERIC[] NOT NULL DEFAULT '{}'
* `monthly_fee` NUMERIC(10, 2) NOT NULL DEFAULT 0.00

### 8. `attendance` (Dynamic Boarding Logs)
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `student_id` UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE
* `date` DATE NOT NULL DEFAULT CURRENT_DATE
* `status` TEXT NOT NULL CHECK (status IN ('boarded', 'dropped', 'absent'))
* `recorded_by` UUID NOT NULL REFERENCES auth.users(id)
* `recorded_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL

### 9. `audit_logs` (Security & Audit Trail)
Tracks administrative, driver, and system operations.
* `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
* `tenant_id` UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
* `user_id` UUID REFERENCES auth.users(id) ON DELETE SET NULL
* `action` TEXT NOT NULL -- e.g. "Driver Added", "Student Deleted", "Payment Recorded"
* `table_name` TEXT NOT NULL
* `record_id` UUID NOT NULL
* `created_at` TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL

---

## 🔒 Row-Level Security (RLS) Policy Specifications

### Centralized Tenant Lookup Helper Function
To streamline policies and maximize database indexing performance, we define a centralized security helper:

```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant()
RETURNS UUID SECURITY DEFINER AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM public.user_roles 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql;
```

### RLS Policies Using the Helper
RLS constraints are defined simply and cleanly using `get_current_tenant()`:

```sql
-- RLS Policy on 'students' for Admins & Drivers:
CREATE POLICY "Tenant isolation on students" ON public.students
    FOR ALL USING (tenant_id = public.get_current_tenant());

-- RLS Policy on 'attendance' for Admins & Drivers:
CREATE POLICY "Tenant isolation on attendance" ON public.attendance
    FOR ALL USING (tenant_id = public.get_current_tenant());

-- RLS Policy on 'students' for Parents (Strict selective student access):
CREATE POLICY "Parents view only their children" ON public.students
    FOR SELECT USING (
        id IN (
            SELECT student_id 
            FROM public.parent_students 
            WHERE parent_id = auth.uid()
        )
    );
```

---

## 🛡️ Secure Server-Side Onboarding RPC Function

To completely prevent client-side privilege escalation attacks (e.g., users inserting their own admin roles), **direct insert access on `tenants` and `user_roles` is blocked for the mobile client**. 

All registration runs server-side via this secure PostgreSQL RPC function with `SECURITY DEFINER` (escalated privileges inside database constraints):

```sql
CREATE OR REPLACE FUNCTION public.register_new_school(
    p_school_name TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_password TEXT
)
RETURNS JSONB SECURITY DEFINER AS $$
DECLARE
    v_tenant_id UUID;
    v_auth_user_id UUID;
    v_response JSONB;
BEGIN
    -- 1. Create the School Tenant with default subscription options
    INSERT INTO public.tenants (school_name, slug, subscription_plan, subscription_status)
    VALUES (p_school_name, p_slug, 'free', 'active')
    RETURNING id INTO v_tenant_id;

    -- 2. Create the Auth User securely in auth.users
    v_auth_user_id := auth.create_user(p_admin_email, p_admin_password); -- Auth API Wrapper

    -- 3. Assign Admin Role & Tenant ID
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (v_auth_user_id, 'admin', v_tenant_id);

    -- 4. Record Audit Log
    INSERT INTO public.audit_logs (tenant_id, user_id, action, table_name, record_id)
    VALUES (v_tenant_id, v_auth_user_id, 'School Registered', 'tenants', v_tenant_id);

    v_response := jsonb_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'user_id', v_auth_user_id,
        'message', 'School successfully registered server-side with free active plan!'
    );
    RETURN v_response;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```

---

## Verification Plan

### Automated Checks
* Run `npx tsc --noEmit` to verify type safety across the new `parent` dashboard and `attendance` tables.

### Manual Verification
1. **School Name Conflict Test**: Register `St. Mary's School` with slug `st-marys-kochi`. Register a second `St. Mary's School` with slug `st-marys-bangalore`. Verify both register successfully without duplicate school name errors.
2. **Bus Number Conflict Test**: Greenwood High adds "Bus 1" (`UNIQUE`). Oakridge School adds "Bus 1" (`UNIQUE`). Verify both buses exist successfully in the database under their respective `tenant_id` blocks.
3. **Privilege Escalation Block Test**: Connect to Supabase using a client session. Attempt to insert a row into `public.user_roles` with `role = 'admin'` directly. Verify PostgreSQL rejects the query immediately with a database constraint/policy error.
