import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useCallback,
    ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";
import type { Bus, Route, Student, Payment, Driver, Attendance } from "@/src/lib/supabase";
import { 
    getDaysRemaining,
    MOCK_BUSES, MOCK_ROUTES, MOCK_STUDENTS, MOCK_PAYMENTS, MOCK_DRIVERS, MOCK_TENANT_ID
} from "@/src/data/mockData";
import { useAuth } from "@/src/context/AuthContext";

type DatabaseContextType = {
    buses: Bus[];
    routes: Route[];
    students: Student[];
    payments: Payment[];
    drivers: Driver[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    fetchRevenueStats: () => Promise<{ month: string; revenue: number }[]>;

    // Bus operations
    addBus: (bus: Omit<Bus, "id" | "created_at" | "driver" | "tenant_id">) => Promise<void>;
    updateBus: (id: string, updates: Partial<Bus>) => Promise<void>;
    deleteBus: (id: string) => Promise<void>;

    // Route operations
    addRoute: (route: Omit<Route, "id" | "created_at" | "tenant_id">) => Promise<void>;
    updateRoute: (id: string, updates: Partial<Route>) => Promise<void>;
    deleteRoute: (id: string) => Promise<void>;

    // Student operations
    addStudent: (student: Omit<Student, "id" | "created_at" | "route" | "bus" | "days_remaining" | "tenant_id">) => Promise<void>;
    updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
    deleteStudent: (id: string) => Promise<void>;

    // Payment operations
    recordPayment: (payment: Omit<Payment, "id" | "student" | "created_at" | "tenant_id">) => Promise<void>;
    getStudentPayments: (studentId: string) => Promise<Payment[]>;

    // Driver operations
    addDriver: (driver: Omit<Driver, "id" | "created_at" | "tenant_id">) => Promise<void>;
    updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;
    deleteDriver: (id: string) => Promise<void>;

    // Attendance operations
    markAttendance: (attendance: Omit<Attendance, "id" | "recorded_at" | "student" | "tenant_id">) => Promise<void>;
    getAttendanceByDate: (date: string) => Promise<Attendance[]>;
    getStudentAttendance: (studentId: string) => Promise<Attendance[]>;
};

const DatabaseContext = createContext<DatabaseContextType>({} as DatabaseContextType);

export const useDatabase = () => useContext(DatabaseContext);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const tenantId = user?.tenant_id || MOCK_TENANT_ID;

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
    const [drivers, setDrivers] = useState<Driver[]>(isSupabaseConfigured ? [] : MOCK_DRIVERS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Data Loading (RLS handles tenant filtering on Supabase side) ─────────

    const loadDrivers = async (): Promise<Driver[]> => {
        const { data, error } = await supabase
            .from("drivers")
            .select("*")
            .order("name", { ascending: true });
        if (error) throw error;
        return (data ?? []) as Driver[];
    };

    const loadBuses = async (driverList: Driver[]): Promise<Bus[]> => {
        const { data, error } = await supabase
            .from("buses")
            .select("*")
            .order("bus_number", { ascending: true });
        if (error) throw error;
        return ((data ?? []) as Bus[]).map((b) => ({
            ...b,
            driver: driverList.find((d) => d.id === b.driver_id),
        }));
    };

    const loadRoutes = async (): Promise<Route[]> => {
        const { data, error } = await supabase
            .from("routes")
            .select("*")
            .order("route_name", { ascending: true });
        if (error) throw error;
        return (data ?? []) as Route[];
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
            const driverList = await loadDrivers();
            setDrivers(driverList);

            const busList = await loadBuses(driverList);
            setBuses(busList);

            const routeList = await loadRoutes();
            const routeListWithBus = routeList.map(r => ({
                ...r,
                bus: busList.find(b => b.id === r.bus_id)
            }));
            setRoutes(routeListWithBus);

            const studentList = await loadStudents(busList, routeListWithBus);
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

    // ─── Driver Operations ────────────────────────────────────────────────────

    const addDriver = async (driver: Omit<Driver, "id" | "created_at" | "tenant_id">) => {
        if (!isSupabaseConfigured) {
            const newDriver: Driver = {
                ...driver,
                id: `driver-${Date.now()}`,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
            };
            setDrivers(prev => [...prev, newDriver]);
            return;
        }
        const { error } = await supabase.from("drivers").insert([{ ...driver, tenant_id: tenantId }]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const updateDriver = async (id: string, updates: Partial<Driver>) => {
        if (!isSupabaseConfigured) {
            setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
            // Update driver info on buses that reference this driver
            setBuses(prev => prev.map(b => b.driver_id === id ? { ...b, driver: { ...b.driver!, ...updates } } : b));
            return;
        }
        const { tenant_id: _, ...safeUpdates } = updates as any;
        const { error } = await supabase.from("drivers").update(safeUpdates).eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const deleteDriver = async (id: string) => {
        if (!isSupabaseConfigured) {
            setDrivers(prev => prev.filter(d => d.id !== id));
            setBuses(prev => prev.map(b => b.driver_id === id ? { ...b, driver_id: null, driver: undefined } : b));
            return;
        }
        const { error } = await supabase.from("drivers").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    // ─── Bus Operations ───────────────────────────────────────────────────────

    const addBus = async (bus: Omit<Bus, "id" | "created_at" | "driver" | "tenant_id">) => {
        if (!isSupabaseConfigured) {
            const newBus: Bus = {
                ...bus,
                id: `bus-${Date.now()}`,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                driver: drivers.find(d => d.id === bus.driver_id),
            };
            setBuses(prev => [...prev, newBus]);
            return;
        }
        const { error } = await supabase.from("buses").insert([{ ...bus, tenant_id: tenantId }]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const updateBus = async (id: string, updates: Partial<Bus>) => {
        if (!isSupabaseConfigured) {
            const { driver: _, ...safeUpdates } = updates as any;
            setBuses(prev => prev.map(b => b.id === id ? {
                ...b,
                ...safeUpdates,
                driver: drivers.find(d => d.id === (safeUpdates.driver_id !== undefined ? safeUpdates.driver_id : b.driver_id)),
            } : b));
            return;
        }
        const { driver: _, tenant_id: __, ...safeUpdates } = updates as any;
        const { error } = await supabase.from("buses").update(safeUpdates).eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const deleteBus = async (id: string) => {
        if (!isSupabaseConfigured) {
            setBuses(prev => prev.filter(b => b.id !== id));
            setStudents(prev => prev.map(s => s.bus_id === id ? { ...s, bus_id: null, bus: undefined } : s));
            return;
        }
        const { error } = await supabase.from("buses").delete().eq("id", id);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    // ─── Route Operations ─────────────────────────────────────────────────────

    const addRoute = async (route: Omit<Route, "id" | "created_at" | "tenant_id">) => {
        if (!isSupabaseConfigured) {
            const newRoute: Route = {
                ...route,
                id: `route-${Date.now()}`,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
            };
            setRoutes(prev => [...prev, newRoute]);
            return;
        }
        const { error } = await supabase.from("routes").insert([{ ...route, tenant_id: tenantId }]);
        if (error) throw new Error(error.message);
        await refreshData();
    };

    const updateRoute = async (id: string, updates: Partial<Route>) => {
        if (!isSupabaseConfigured) {
            setRoutes(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
            setStudents(prev => prev.map(s => s.route_id === id ? { 
                ...s, 
                route: { ...s.route, ...updates } as Route 
            } : s));
            return;
        }
        const { tenant_id: _, ...safeUpdates } = updates as any;
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

    const addStudent = async (student: Omit<Student, "id" | "created_at" | "route" | "bus" | "days_remaining" | "tenant_id">) => {
        if (!isSupabaseConfigured) {
            const newStudent: Student = {
                ...student,
                id: `student-${Date.now()}`,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                bus: buses.find(b => b.id === student.bus_id),
                route: routes.find(r => r.id === student.route_id),
                days_remaining: getDaysRemaining(student.fee_paid_until)
            };
            setStudents(prev => [...prev, newStudent]);
            return;
        }
        const { error } = await supabase.from("students").insert([{ ...student, tenant_id: tenantId }]);
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
        const { bus: _, route: __, days_remaining: ___, tenant_id: ____, ...safeUpdates } = updates as any;
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

    const recordPayment = async (payment: Omit<Payment, "id" | "student" | "created_at" | "tenant_id">) => {
        if (!isSupabaseConfigured) {
            const newPayment: Payment = {
                ...payment,
                id: `pay-${Date.now()}`,
                tenant_id: tenantId,
                student: students.find(s => s.id === payment.student_id),
                created_at: new Date().toISOString(),
            };
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
        const { error } = await supabase.from("payments").insert([{ ...payment, tenant_id: tenantId }]);
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

    // ─── Attendance Operations ────────────────────────────────────────────────

    const markAttendance = async (attendance: Omit<Attendance, "id" | "recorded_at" | "student" | "tenant_id">) => {
        if (!isSupabaseConfigured) {
            // Mock: just log it
            console.log("Mock attendance marked:", attendance);
            return;
        }
        const { error } = await supabase.from("attendance").insert([{ ...attendance, tenant_id: tenantId }]);
        if (error) throw new Error(error.message);
    };

    const getAttendanceByDate = async (date: string): Promise<Attendance[]> => {
        if (!isSupabaseConfigured) return [];
        const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("date", date)
            .order("recorded_at", { ascending: false });
        if (error) throw new Error(error.message);
        return ((data ?? []) as Attendance[]).map(a => ({
            ...a,
            student: students.find(s => s.id === a.student_id),
        }));
    };

    const getStudentAttendance = async (studentId: string): Promise<Attendance[]> => {
        if (!isSupabaseConfigured) return [];
        const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("student_id", studentId)
            .order("date", { ascending: false })
            .limit(30);
        if (error) throw new Error(error.message);
        return (data ?? []) as Attendance[];
    };

    return (
        <DatabaseContext.Provider value={{
            buses,
            routes,
            students,
            payments,
            drivers,
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
            addDriver,
            updateDriver,
            deleteDriver,
            markAttendance,
            getAttendanceByDate,
            getStudentAttendance,
        }}>
            {children}
        </DatabaseContext.Provider>
    );
};
