-- ═══════════════════════════════════════════════════════════════════════════════
-- Bus Management System — Database Schema Migration v5
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Create Notifications Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.notifications IS 'Push and in-app notifications dispatched to users';

-- ─── 2. Add Soft Delete Support Column ────────────────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- ─── 3. Add Notes/Reason Column to Attendance Table ───────────────────────────
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── 4. Performance Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON public.students(is_deleted);
CREATE INDEX IF NOT EXISTS idx_buses_is_deleted ON public.buses(is_deleted);
CREATE INDEX IF NOT EXISTS idx_routes_is_deleted ON public.routes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_drivers_is_deleted ON public.drivers(is_deleted);

-- ─── 5. Enable RLS and Configure Policies for Notifications ──────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Authenticated users insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (tenant_id = public.get_current_tenant());
