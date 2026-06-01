import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";
import { 
    Bus, Route, Student, Payment, getDaysRemaining,
    MOCK_BUSES, MOCK_ROUTES, MOCK_STUDENTS, MOCK_PAYMENTS 
} from "@/src/data/mockData";

type DatabaseContextType = {
    buses: Bus[];
    routes: Route[];
    students: Student[];
    payments: Payment[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    fetchRevenueStats: () => Promise<{ month: string; revenue: number }[]>;

    // Bus operations
    addBus: (bus: Omit<Bus, "id" | "created_at">) => Promise<void>;
    updateBus: (id: string, updates: Partial<Bus>) => Promise<void>;
    deleteBus: (id: string) => Promise<void>;

    // Route operations
    addRoute: (route: Omit<Route, "id" | "created_at" | "bus">) => Promise<void>;
    updateRoute: (id: string, updates: Partial<Route>) => Promise<void>;
    deleteRoute: (id: string) => Promise<void>;

    // Student operations
    addStudent: (student: Omit<Student, "id" | "created_at" | "route" | "bus" | "days_remaining">) => Promise<void>;
    updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;

    // Payment operations
    recordPayment: (payment: Omit<Payment, "id" | "student">) => Promise<void>;
    getStudentPayments: (studentId: string) => Promise<Payment[]>;
};

const DatabaseContext = createContext<DatabaseContextType>({} as DatabaseContextType);

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
    const [buses, setBuses] = useState<Bus[]>(isSupabaseConfigured ? [] : MOCK_BUSES);
    const [routes, setRoutes] = useState<Route[]>(isSupabaseConfigured ? [] : MOCK_ROUTES.map(r => ({
        ...r,
        bus: MOCK_BUSES.find(b => b.id === r.bus_id)
    })));
    const [students, setStudents] = useState<Student[]>(isSupabaseConfigured ? [] : MOCK_STUDENTS.map(s => ({
        ...s,
        bus: MOCK_BUSES.find(b => b.id === s.bus_id),
        route: MOCK_ROUTES.find(r => r.id === s.route_id),
        days_remaining: getDaysRemaining(s.fee_paid_until)
    })));
    const [payments, setPayments] = useState<Payment[]>(isSupabaseConfigured ? [] : MOCK_PAYMENTS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBuses = async (): Promise<Bus[]> => {
        const { data, error } = await supabase
            .from("buses")
            .select("*")
            .order("bus_number", { ascending: true });
        if (error) throw error;
        return (data ?? []) as Bus[];
    };

    const loadRoutes = async (busList: Bus[]): Promise<Route[]> => {
        const { data, error } = await supabase
            .from("routes")
            .select("*")
            .order("route_name", { ascending: true });
        if (error) throw error;
        return ((data ?? []) as Route[]).map((r) => ({
            ...r,
            bus: busList.find((b) => b.id === r.bus_id),
        }));
    };

    const loadStudents = async (busList: Bus[], routeList: Route[]): Promise<Student[]> => {
        const { data, error } = await supabase
            .from("students")
            .select("*")
            .order("name", { ascending: true });
        if (error) throw error;
        return ((data ?? []) as Student[]).map((s) => ({
            ...s,
            bus: busList.find((b) => b.id === s.bus_id),
            route: routeList.find((r) => r.id === s.route_id),
            days_remaining: getDaysRemaining(s.fee_paid_until),
        }));
    };

    const loadPayments = async (): Promise<Payment[]> => {
        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .order("paid_at", { ascending: false })
            .limit(200);
        if (error) throw error;
        return (data ?? []) as Payment[];
    };

    const refreshData = useCallback(async () => {
        if (!isSupabaseConfigured) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const busList = await loadBuses();
            setBuses(busList);

            const routeList = await loadRoutes(busList);
            setRoutes(routeList);

            const studentList = await loadStudents(busList, routeList);
            setStudents(studentList);

            const paymentList = await loadPayments();
            setPayments(paymentList);
        } catch (e: any) {
            setError(e.message || "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const fetchRevenueStats = useCallback(async (): Promise<{ month: string; revenue: number }[]> => {
        if (!isSupabaseConfigured) {
            const monthMap: Record<string, number> = {};
            payments.forEach((p: any) => {
                const d = new Date(p.paid_at);
                const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                monthMap[key] = (monthMap[key] ?? 0) + (p.amount ?? 0);
            });
            const entries = Object.entries(monthMap).slice(-6);
            return entries.map(([month, revenue]) => ({ month, revenue }));
        }
        const { data, error } = await supabase
            .from("payments")
            .select("paid_at, amount")
            .order("paid_at", { ascending: true });

        if (error || !data) return [];

        const monthMap: Record<string, number> = {};
        data.forEach((p: any) => {
            const d = new Date(p.paid_at);
            const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
            monthMap[key] = (monthMap[key] ?? 0) + (p.amount ?? 0);
        });

        const entries = Object.entries(monthMap).slice(-6);
        return entries.map(([month, revenue]) => ({ month, revenue }));
    }, [payments]);

    // ─── Bus Operations ───────────────────────────────────────────────────────

    const addBus = async (bus: Omit<Bus, "id" | "created_at">) => {
        if (!isSupabaseConfigured) {
            const newBus: Bus = {
                ...bus,
                id: `bus-${Date.now()}`,
                created_at: new Date().toISOString()
            } as Bus;
            setBuses(prev => [...prev, newBus]);
            return;
        }
        const { error } = await supabase.from("buses").insert([bus]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const updateBus = async (id: string, updates: Partial<Bus>) => {
        if (!isSupabaseConfigured) {
            setBuses(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
            setRoutes(prev => prev.map(r => r.bus_id === id ? { ...r, bus: { ...r.bus, ...updates } as Bus } : r));
            setStudents(prev => prev.map(s => s.bus_id === id ? { ...s, bus: { ...s.bus, ...updates } as Bus } : s));
            return;
        }
        const { error } = await supabase.from("buses").update(updates).eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const deleteBus = async (id: string) => {
        if (!isSupabaseConfigured) {
            setBuses(prev => prev.filter(b => b.id !== id));
            setRoutes(prev => prev.map(r => r.bus_id === id ? { ...r, bus_id: null, bus: undefined } : r));
            setStudents(prev => prev.map(s => s.bus_id === id ? { ...s, bus_id: null, bus: undefined } : s));
            return;
        }
        const { error } = await supabase.from("buses").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    // ─── Route Operations ─────────────────────────────────────────────────────

    const addRoute = async (route: Omit<Route, "id" | "created_at" | "bus">) => {
        if (!isSupabaseConfigured) {
            const newRoute: Route = {
                ...route,
                id: `route-${Date.now()}`,
                created_at: new Date().toISOString(),
                bus: buses.find(b => b.id === route.bus_id)
            } as Route;
            setRoutes(prev => [...prev, newRoute]);
            return;
        }
        const { error } = await supabase.from("routes").insert([route]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const updateRoute = async (id: string, updates: Partial<Route>) => {
        if (!isSupabaseConfigured) {
            const { bus: _, ...safeUpdates } = updates as any;
            setRoutes(prev => prev.map(r => r.id === id ? { 
                ...r, 
                ...safeUpdates, 
                bus: buses.find(b => b.id === (safeUpdates.bus_id !== undefined ? safeUpdates.bus_id : r.bus_id))
            } : r));
            setStudents(prev => prev.map(s => s.route_id === id ? { 
                ...s, 
                route: { ...s.route, ...safeUpdates } as Route 
            } : s));
            return;
        }
        const { bus: _, ...safeUpdates } = updates as any;
        const { error } = await supabase.from("routes").update(safeUpdates).eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const deleteRoute = async (id: string) => {
        if (!isSupabaseConfigured) {
            setRoutes(prev => prev.filter(r => r.id !== id));
            setStudents(prev => prev.map(s => s.route_id === id ? { ...s, route_id: null, route: undefined } : s));
            return;
        }
        const { error } = await supabase.from("routes").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    // ─── Student Operations ───────────────────────────────────────────────────

    const addStudent = async (student: Omit<Student, "id" | "created_at" | "route" | "bus" | "days_remaining">) => {
        if (!isSupabaseConfigured) {
            const newStudent: Student = {
                ...student,
                id: `student-${Date.now()}`,
                created_at: new Date().toISOString(),
                bus: buses.find(b => b.id === student.bus_id),
                route: routes.find(r => r.id === student.route_id),
                days_remaining: getDaysRemaining(student.fee_paid_until)
            } as Student;
            setStudents(prev => [...prev, newStudent]);
            return;
        }
        const { error } = await supabase.from("students").insert([student]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const updateStudent = async (id: string, updates: Partial<Student>) => {
        if (!isSupabaseConfigured) {
            const { bus: _, route: __, days_remaining: ___, ...safeUpdates } = updates as any;
            setStudents(prev => prev.map(s => {
                if (s.id !== id) return s;
                const nextVal = { ...s, ...safeUpdates };
                return {
                    ...nextVal,
                    bus: buses.find(b => b.id === nextVal.bus_id),
                    route: routes.find(r => r.id === nextVal.route_id),
                    days_remaining: getDaysRemaining(nextVal.fee_paid_until)
                };
            }));
            return;
        }
        const { bus: _, route: __, days_remaining: ___, ...safeUpdates } = updates as any;
        const { error } = await supabase.from("students").update(safeUpdates).eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const deleteStudent = async (id: string) => {
        if (!isSupabaseConfigured) {
            setStudents(prev => prev.filter(s => s.id !== id));
            return;
        }
        const { error } = await supabase.from("students").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    // ─── Payment Operations ───────────────────────────────────────────────────

    const recordPayment = async (payment: Omit<Payment, "id" | "student">) => {
        if (!isSupabaseConfigured) {
            const newPayment: Payment = {
                ...payment,
                id: `pay-${Date.now()}`,
                student: students.find(s => s.id === payment.student_id)
            } as Payment;
            setPayments(prev => [newPayment, ...prev]);

            const studentId = payment.student_id;
            const monthText = payment.month;
            const parsedMonth = new Date(Date.parse(`1 ${monthText}`));
            const lastDay = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 0);
            const paidUntilStr = lastDay.toISOString().split('T')[0];

            setStudents(prev => prev.map(s => s.id === studentId ? {
                ...s,
                fee_paid_until: paidUntilStr,
                days_remaining: getDaysRemaining(paidUntilStr)
            } : s));
            return;
        }
        const { error } = await supabase.from("payments").insert([payment]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const getStudentPayments = async (studentId: string): Promise<Payment[]> => {
        if (!isSupabaseConfigured) {
            return payments.filter(p => p.student_id === studentId);
        }
        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("student_id", studentId)
            .order("paid_at", { ascending: false });
        if (error) throw new Error(error.message);
        return (data ?? []) as Payment[];
    };

    return (
        <DatabaseContext.Provider value={{
            buses,
            routes,
            students,
            payments,
            isLoading,
            error,
            refreshData,
            fetchRevenueStats,
            addBus,
            updateBus,
            deleteBus,
            addRoute,
            updateRoute,
            deleteRoute,
            addStudent,
            updateStudent,
            deleteStudent,
            recordPayment,
            getStudentPayments,
        }}>
            {children}
        </DatabaseContext.Provider>
    );
};
