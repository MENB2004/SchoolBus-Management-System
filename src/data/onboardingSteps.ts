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
            "The Dashboard gives you an instant overview — total buses, routes, students, fee collection status, revenue trends, and quick action shortcuts to every feature.",
        screenId: "dashboard",
        accent: ["#FFB800", "#FF8C00"],
    },
    {
        icon: "bus",
        title: "Manage Your Buses",
        description:
            "Add your school buses with vehicle numbers, capacity, and status. Each bus can be assigned a driver and linked to a route. Start here to set up your fleet.",
        screenId: "buses",
        accent: ["#FF8C00", "#E65100"],
    },
    {
        icon: "map",
        title: "Create Routes & Stops",
        description:
            "Define routes with names, stops, and timings. Assign a bus to each route. Students will be linked to routes based on their boarding stops.",
        screenId: "routes",
        accent: ["#1E3A5F", "#2E5A9F"],
    },
    {
        icon: "car",
        title: "Register Drivers",
        description:
            "Add drivers with their phone numbers. They'll receive login credentials and can mark daily attendance for students on their assigned bus.",
        screenId: "drivers",
        accent: ["#FF8C00", "#FFB800"],
    },
    {
        icon: "people",
        title: "Enroll Students",
        description:
            "Add students with class, section, bus, route, and boarding stop. Set their monthly fee and track payment status. You can also link parents to students.",
        screenId: "students",
        accent: ["#00C853", "#00E676"],
    },
    {
        icon: "people-circle",
        title: "Manage Parents",
        description:
            "Parents get their own portal to track attendance, fees, and transport details. Add parents and link them to their children's profiles.",
        screenId: "parents",
        accent: ["#00BCD4", "#00E5FF"],
    },
    {
        icon: "calendar",
        title: "Attendance & Payments",
        description:
            "Monitor daily attendance logs marked by drivers. Track monthly fee payments — see who's paid, who's due, and who's overdue at a glance.",
        screenId: "attendance",
        accent: ["#7C3AED", "#9F67FF"],
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
            "Let's quickly show you around your driver console. You'll see your assigned bus, students, and how to mark daily attendance.",
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
        title: "Mark Attendance",
        description:
            "Every day, open the attendance screen to mark each student as Boarded, Dropped, or Absent. Parents get notified of their child's status in real-time.",
        screenId: "attendance",
        accent: ["#00C853", "#00E676"],
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
        title: "Daily Attendance",
        description:
            "Check if your child has boarded the bus, been dropped off, or is marked absent today. Attendance is updated by the driver in real-time.",
        screenId: "attendance",
        accent: ["#00BCD4", "#00E5FF"],
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
