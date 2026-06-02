import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isValidUrl = rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"));

export const supabaseUrl = isValidUrl ? rawUrl : "https://dummyprojecturl.supabase.co";
export const supabaseAnonKey = rawKey || "dummyanonkey";

// SSR-Safe storage adapter mapping to LocalStorage on Web and AsyncStorage on Native
const safeStorage = {
    getItem: async (key: string) => {
        if (Platform.OS === "web") {
            if (typeof window === "undefined") return null;
            return window.localStorage.getItem(key);
        }
        return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === "web") {
            if (typeof window === "undefined") return;
            window.localStorage.setItem(key, value);
            return;
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (Platform.OS === "web") {
            if (typeof window === "undefined") return;
            window.localStorage.removeItem(key);
            return;
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export const isSupabaseConfigured = !!isValidUrl && !!rawKey && rawUrl !== "your_supabase_project_url";

// ─── Role Types ──────────────────────────────────────────────────────────────
export type AppRole = "admin" | "driver" | "parent";

// ─── Database Types ──────────────────────────────────────────────────────────

export type Tenant = {
    id: string;
    school_name: string;
    slug: string;
    subscription_plan: "free" | "basic" | "premium" | "enterprise";
    subscription_status: "active" | "trialing" | "past_due" | "canceled";
    contact_email: string;
    created_at: string;
};

export type UserRole = {
    user_id: string;
    tenant_id: string;
    role: AppRole;
    created_at: string;
};

export type Driver = {
    id: string;
    tenant_id: string;
    user_id: string | null;
    name: string;
    phone: string;
    created_at: string;
};

export type Bus = {
    id: string;
    tenant_id: string;
    bus_number: string;
    capacity: number;
    driver_id: string | null;
    status: "active" | "inactive";
    created_at: string;
    // Joined fields (not in DB, populated by queries)
    driver?: Driver;
};

export type Route = {
    id: string;
    tenant_id: string;
    route_name: string;
    bus_id: string | null;
    start_point: string;
    end_point: string;
    stops: string[];
    stop_fees?: number[];
    monthly_fee: number;
    created_at: string;
    // Joined fields
    bus?: Bus;
};

export type Student = {
    id: string;
    tenant_id: string;
    name: string;
    class: string;
    section: string | null;
    route_id: string | null;
    bus_id: string | null;
    boarding_stop: string | null;
    monthly_fee: number;
    fee_paid_until: string | null;
    is_active: boolean;
    created_at: string;
    // Joined fields
    route?: Route;
    bus?: Bus;
    days_remaining?: number;
};

export type ParentStudent = {
    id: string;
    tenant_id: string;
    parent_id: string;
    student_id: string;
    created_at: string;
};

export type Payment = {
    id: string;
    tenant_id: string;
    student_id: string;
    amount: number;
    paid_at: string;
    month: string;
    payment_mode: string;
    notes: string | null;
    created_at: string;
    // Joined fields
    student?: Student;
};

export type Attendance = {
    id: string;
    tenant_id: string;
    student_id: string;
    date: string;
    status: "boarded" | "dropped" | "absent";
    recorded_by: string;
    recorded_at: string;
    // Joined fields
    student?: Student;
};

export type AuditLog = {
    id: string;
    tenant_id: string;
    user_id: string | null;
    action: string;
    table_name: string;
    record_id: string;
    metadata?: Record<string, any>;
    created_at: string;
};

// ─── Database Schema Type (for Supabase client typing) ───────────────────────

export type Database = {
    public: {
        Tables: {
            tenants: { Row: Tenant };
            user_roles: { Row: UserRole };
            drivers: { Row: Driver };
            buses: { Row: Omit<Bus, "driver"> };
            routes: { Row: Omit<Route, "bus"> };
            students: { Row: Omit<Student, "route" | "bus" | "days_remaining"> };
            parent_students: { Row: ParentStudent };
            payments: { Row: Omit<Payment, "student" | "created_at"> & { created_at: string } };
            attendance: { Row: Omit<Attendance, "student"> };
            audit_logs: { Row: AuditLog };
        };
    };
};
