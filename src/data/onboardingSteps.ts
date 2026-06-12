import { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type OnboardingStep = {
    /** Ionicons icon name */
    icon: ComponentProps<typeof Ionicons>["name"];
    /** Short title for the step */
    title: string;
    /** Descriptive paragraph explaining the feature */
    description: string;
    /** The sidebar / screen ID this step relates to (for reference) */
    screenId?: string;
    /** Accent color for the icon badge */
    accent: readonly [string, string];
};

// ─── Admin Onboarding Steps (Workflow Order) ──────────────────────────────────

export const ADMIN_STEPS: OnboardingStep[] = [
    {
        icon: "rocket",
        title: "Welcome to Fleet Manager!",
        description:
            "Let's take a quick tour of your admin console. You'll learn how to manage buses, routes, drivers, students, and payments — all from one place.",
        accent: ["#FFB800", "#FF8C00"],
    },
    {
        icon: "grid",
        title: "Your Command Center",
        description:
            "The Dashboard gives you an instant overview — total buses, routes, students, fee collection status, and quick action shortcuts to every feature.",
        screenId: "dashboard",
        accent: ["#FFB800", "#FF8C00"],
    },
    {
        icon: "bar-chart",
        title: "Advanced Analytics",
        description:
            "Examine weekly attendance patterns, passenger capacity ratios, and cash vs. online revenue splits using dynamic visual charts. Export PDF summaries on-the-fly.",
        screenId: "analytics",
        accent: ["#7C3AED", "#9F67FF"],
    },
    {
        icon: "search",
        title: "Fuzzy Global Search",
        description:
            "Need to find something fast? Tap the search icon at the top of any screen to perform fuzzy searches across routes, student details, buses, or drivers and jump directly there.",
        accent: ["#00BCD4", "#00E5FF"],
    },
    {
        icon: "bus",
        title: "Manage Your Buses",
        description:
            "Add your school buses, assign drivers, and manage status. Soft-deleted fleet items can be fully restored from the recovery console.",
        screenId: "buses",
        accent: ["#FF8C00", "#E65100"],
    },
    {
        icon: "map",
        title: "Create Routes & Stops",
        description:
            "Define routes with stops, monthly pricing, and timings. Assign a bus to each route. Students will be linked to routes based on their boarding stops.",
        screenId: "routes",
        accent: ["#1E3A5F", "#2E5A9F"],
    },
    {
        icon: "people",
        title: "Enroll Students",
        description:
            "Enroll students and link parents. Supports multi-month payment allocations using simple checkboxes to extend due dates correctly.",
        screenId: "students",
        accent: ["#00C853", "#00E676"],
    },
    {
        icon: "trash-bin",
        title: "30-Day Trash Recovery",
        description:
            "Accidental deletion? Soft-deleted students, buses, routes, and drivers go to the System Trash where you can recover them within 30 days before auto-purging.",
        screenId: "trash",
        accent: ["#FF1744", "#FF5252"],
    },
    {
        icon: "notifications",
        title: "System Alerts Center",
        description:
            "Tap the bell icon in the header to view chronological alert histories, including planned student absence reports and fee logs.",
        accent: ["#CE93D8", "#9C27B0"],
    },
    {
        icon: "menu",
        title: "Navigation Tip",
        description:
            "See the floating golden button? Tap it to open the sidebar menu and navigate between all screens. You can drag it anywhere on the screen! That's it — you're all set!",
        screenId: "settings",
        accent: ["#9C27B0", "#CE93D8"],
    },
];

// ─── Driver Onboarding Steps ──────────────────────────────────────────────────

export const DRIVER_STEPS: OnboardingStep[] = [
    {
        icon: "rocket",
        title: "Welcome, Driver!",
        description:
            "Let's quickly show you around your driver console. You'll see your assigned bus, students, and how to manage attendance.",
        accent: ["#FFB800", "#FF8C00"],
    },
    {
        icon: "grid",
        title: "Your Dashboard",
        description:
            "See your assigned bus, route name, and the list of students you're responsible for — all at a glance on your dashboard.",
        screenId: "dashboard",
        accent: ["#FFB800", "#FF8C00"],
    },
    {
        icon: "calendar",
        title: "Smart Daily Attendance",
        description:
            "Search students by name, filter by specific boarding stops, see a visual progress gauge, and use bulk actions to mark entire stops as Boarded/Dropped. Haptics confirm selections.",
        screenId: "attendance",
        accent: ["#00C853", "#00E676"],
    },
    {
        icon: "time",
        title: "14-Day History Logs",
        description:
            "Forgot to mark someone or made a mistake yesterday? Slide the date strip to view and correct attendance logs for the last 14 days.",
        accent: ["#00BCD4", "#00E5FF"],
    },
    {
        icon: "search",
        title: "Quick Search",
        description:
            "Tap the search icon in your dashboard header to perform fuzzy searches across your assigned students and locate their details instantly.",
        accent: ["#7C3AED", "#9F67FF"],
    },
    {
        icon: "menu",
        title: "Navigation Tip",
        description:
            "Tap the floating golden button to open the sidebar menu. You can drag it anywhere on screen for easy access. That's it — you're ready to go!",
        accent: ["#9C27B0", "#CE93D8"],
    },
];

// ─── Parent Onboarding Steps ──────────────────────────────────────────────────

export const PARENT_STEPS: OnboardingStep[] = [
    {
        icon: "rocket",
        title: "Welcome to Parent Portal!",
        description:
            "Let's show you how to track your children's school bus, attendance, and fees — everything you need in one place.",
        accent: ["#FFB800", "#FF8C00"],
    },
    {
        icon: "people",
        title: "My Children",
        description:
            "Your dashboard shows all your registered children — their class, section, assigned bus, route, and the driver's contact details.",
        screenId: "dashboard",
        accent: ["#00C853", "#00E676"],
    },
    {
        icon: "bus",
        title: "Daily Attendance Tracker",
        description:
            "Check if your child has boarded the bus, been dropped off, or is marked absent today. Attendance is updated by the driver in real-time.",
        screenId: "attendance",
        accent: ["#00BCD4", "#00E5FF"],
    },
    {
        icon: "calendar-sharp",
        title: "Schedule Planned Absence",
        description:
            "Mark upcoming student absences in advance for tomorrow, day after, or custom dates. This pre-fills the driver's attendance list and alerts admins automatically.",
        accent: ["#FF1744", "#FF5252"],
    },
    {
        icon: "cash",
        title: "Fee & Payments",
        description:
            "View your child's monthly transport fee, payment history, and due dates. Stay on top of payments to avoid overdue notices.",
        screenId: "payments",
        accent: ["#7C3AED", "#9F67FF"],
    },
    {
        icon: "menu",
        title: "Navigation Tip",
        description:
            "Tap the floating golden button to open the sidebar menu and switch between screens. You can drag it anywhere! That's all — enjoy the portal!",
        accent: ["#9C27B0", "#CE93D8"],
    },
];

/** Get the correct steps array for a given role */
export function getOnboardingSteps(role: "admin" | "driver" | "parent"): OnboardingStep[] {
    switch (role) {
        case "admin":
            return ADMIN_STEPS;
        case "driver":
            return DRIVER_STEPS;
        case "parent":
            return PARENT_STEPS;
        default:
            return ADMIN_STEPS;
    }
}
