import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const isValidUrl = rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"));

const supabaseUrl = isValidUrl ? rawUrl : "https://dummyprojecturl.supabase.co";
const supabaseAnonKey = rawKey || "dummyanonkey";

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

export type AppRole = "admin" | "driver";

export type Database = {
    public: {
        Tables: {
            user_roles: {
                Row: {
                    id: string;
                    user_id: string;
                    role: AppRole;
                    created_at: string;
                };
            };
            buses: {
                Row: {
                    id: string;
                    bus_number: string;
                    driver_name: string;
                    driver_phone: string | null;
                    capacity: number;
                    status: string;
                    created_at: string;
                };
            };
            routes: {
                Row: {
                    id: string;
                    route_name: string;
                    bus_id: string | null;
                    start_point: string;
                    end_point: string;
                    stops: string[];
                    monthly_fee: number;
                    created_at: string;
                };
            };
            students: {
                Row: {
                    id: string;
                    name: string;
                    class: string;
                    section: string | null;
                    parent_name: string;
                    parent_phone: string | null;
                    route_id: string | null;
                    bus_id: string | null;
                    boarding_stop: string | null;
                    monthly_fee: number;
                    fee_paid_until: string | null;
                    avatar_url: string | null;
                    is_active: boolean;
                    created_at: string;
                };
            };
            payments: {
                Row: {
                    id: string;
                    student_id: string;
                    amount: number;
                    paid_at: string;
                    month: string;
                    payment_mode: string;
                    notes: string | null;
                };
            };
        };
    };
};
