// ─── Types ────────────────────────────────────────────────────────────────────

export type FeeStatus = "paid" | "due" | "overdue";

export type Bus = {
    id: string;
    bus_number: string;
    driver_name: string;
    driver_phone: string | null;
    capacity: number;
    status: "active" | "inactive";
    created_at: string;
};

export type Route = {
    id: string;
    route_name: string;
    bus_id: string | null;
    start_point: string;
    end_point: string;
    stops: string[];
    stop_fees?: number[];
    monthly_fee: number;
    created_at: string;
    bus?: Bus;
};

export type Student = {
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
    route?: Route;
    bus?: Bus;
    days_remaining?: number;
};

export type Payment = {
    id: string;
    student_id: string;
    amount: number;
    paid_at: string;
    month: string;
    payment_mode: string;
    notes: string | null;
    student?: Student;
};

// ─── Fee Utilities ────────────────────────────────────────────────────────────

/**
 * Compute days remaining until next fee.
 * Uses fee_paid_until date to determine when next payment is due.
 * Returns negative values for overdue.
 */
export function getDaysRemaining(feePaidUntil: string | null): number {
    if (!feePaidUntil) return -999;
    const dueDate = new Date(feePaidUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
}

/**
 * Compute fee status from days remaining.
 * < 0   → overdue
 * 0–7   → due soon
 * > 7   → paid / active
 */
export function getFeeStatus(daysRemaining: number): FeeStatus {
    if (daysRemaining < 0) return "overdue";
    if (daysRemaining <= 7) return "due";
    return "paid";
}

/** Colors for each fee status */
export const FEE_COLORS: Record<FeeStatus, { ring: string; bg: string; text: string; label: string }> = {
    paid:    { ring: "#00E676", bg: "rgba(0,230,118,0.15)",   text: "#00E676", label: "Paid" },
    due:     { ring: "#FFB300", bg: "rgba(255,179,0,0.15)",   text: "#FFB300", label: "Due Soon" },
    overdue: { ring: "#FF1744", bg: "rgba(255,23,68,0.15)",   text: "#FF1744", label: "Overdue" },
};

/** Get formatted due date string */
export function formatDueDate(feePaidUntil: string | null): string {
    if (!feePaidUntil) return "No payment recorded";
    return new Date(feePaidUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** Get current month label e.g. "June 2026" */
export function getCurrentMonthLabel(): string {
    return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Get student by ID from a list */
export function getStudentById(students: Student[], id: string): Student | undefined {
    return students.find((s) => String(s.id) === id);
}

/** Get bus by ID from a list */
export function getBusById(buses: Bus[], id: string): Bus | undefined {
    return buses.find((b) => String(b.id) === id);
}

/** Get route by ID from a list */
export function getRouteById(routes: Route[], id: string): Route | undefined {
    return routes.find((r) => String(r.id) === id);
}

// ─── Mock Datasets for Sandbox Fallback ────────────────────────────────────────

export const MOCK_BUSES: Bus[] = [
    {
        id: "bus-1",
        bus_number: "KA-01-F-1234",
        driver_name: "Ramesh Kumar",
        driver_phone: "9876543210",
        capacity: 40,
        status: "active",
        created_at: new Date().toISOString(),
    },
    {
        id: "bus-2",
        bus_number: "KA-01-F-5678",
        driver_name: "Suresh Singh",
        driver_phone: "9876543211",
        capacity: 30,
        status: "active",
        created_at: new Date().toISOString(),
    },
    {
        id: "bus-3",
        bus_number: "KA-01-F-9012",
        driver_name: "Mahesh Yadav",
        driver_phone: "9876543212",
        capacity: 50,
        status: "inactive",
        created_at: new Date().toISOString(),
    },
];

export const MOCK_ROUTES: Route[] = [
    {
        id: "route-1",
        route_name: "Route A (HSR Layout)",
        bus_id: "bus-1",
        start_point: "School Campus",
        end_point: "HSR Sector 7",
        stops: ["Sector 1", "Sector 3", "Sector 5", "Sector 7"],
        stop_fees: [1500, 1800, 2200, 2500],
        monthly_fee: 2500,
        created_at: new Date().toISOString(),
    },
    {
        id: "route-2",
        route_name: "Route B (Koramangala)",
        bus_id: "bus-2",
        start_point: "School Campus",
        end_point: "Koramangala 8th Block",
        stops: ["Sony Signal", "Wipro Park", "Koramangala 4th Block", "Koramangala 8th Block"],
        stop_fees: [2000, 2200, 2600, 3000],
        monthly_fee: 3000,
        created_at: new Date().toISOString(),
    },
];

export const MOCK_STUDENTS: Student[] = [
    {
        id: "student-1",
        name: "Aarav Sharma",
        class: "5th",
        section: "A",
        parent_name: "Rajesh Sharma",
        parent_phone: "9988776655",
        route_id: "route-1",
        bus_id: "bus-1",
        boarding_stop: "Sector 3",
        monthly_fee: 2500,
        fee_paid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: "student-2",
        name: "Ananya Iyer",
        class: "8th",
        section: "B",
        parent_name: "Subramanian Iyer",
        parent_phone: "9988776656",
        route_id: "route-1",
        bus_id: "bus-1",
        boarding_stop: "Sector 7",
        monthly_fee: 2500,
        fee_paid_until: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now (due soon)
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: "student-3",
        name: "Vihaan Patel",
        class: "10th",
        section: "C",
        parent_name: "Amit Patel",
        parent_phone: "9988776657",
        route_id: "route-2",
        bus_id: "bus-2",
        boarding_stop: "Sony Signal",
        monthly_fee: 3000,
        fee_paid_until: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago (overdue)
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
    },
];

export const MOCK_PAYMENTS: Payment[] = [
    {
        id: "pay-1",
        student_id: "student-1",
        amount: 2500,
        paid_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        month: "May 2026",
        payment_mode: "UPI",
        notes: "Fee paid successfully via GPay",
    },
    {
        id: "pay-2",
        student_id: "student-2",
        amount: 2500,
        paid_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        month: "April 2026",
        payment_mode: "Cash",
        notes: "Handed over to class teacher",
    },
];
