import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import OnboardingOverlay from "@/src/components/OnboardingOverlay";

export default function DriverDashboard() {
    const { user, signOut, hasSeenOnboarding, setOnboardingComplete } = useAuth();
    const { buses, routes, students, drivers } = useDatabase();

    // Resolve driver's bus via user_id (reliable) then fallback to name match
    const myDriver = drivers.find(d => d.user_id === user?.id) 
        ?? drivers.find(d => d.name?.toLowerCase() === user?.name?.toLowerCase());
    let myBus = myDriver ? buses.find(b => b.driver_id === myDriver.id) : undefined;

    // Sandbox fallback
    if (!myBus && (user?.id?.startsWith("mock-") || user?.email === "driver@school.com")) {
        myBus = buses.find(b => b.status === "active");
    }

    const myRoute = myBus ? routes.find(r => r.bus_id === myBus!.id) : null;
    const myStudents = myBus ? students.filter(s => s.bus_id === myBus!.id) : [];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>MY DASHBOARD</Text>
                        <Text style={styles.userName}>{user?.name ?? "Driver"}</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color="#FF1744" />
                    </TouchableOpacity>
                </View>

                {myBus ? (
                    <>
                        <View style={styles.busCard}>
                            <LinearGradient colors={["#FFB800", "#FF8C00"]} style={styles.busIcon}>
                                <Ionicons name="bus" size={32} color="#fff" />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.busNumber}>{myBus.bus_number}</Text>
                                {myRoute && <Text style={styles.routeName}>{myRoute.route_name}</Text>}
                                <Text style={styles.busStats}>{myStudents.length} students assigned</Text>
                            </View>
                        </View>

                        {/* Mark Attendance Button */}
                        <TouchableOpacity 
                            onPress={() => router.push("/(driver)/attendance")} 
                            activeOpacity={0.88}
                            style={{ marginBottom: 24 }}
                        >
                            <LinearGradient 
                                colors={["#FFB800", "#FF8C00"]} 
                                style={styles.markBtn}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#0A0A0F" />
                                <Text style={styles.markBtnText}>MARK TODAY'S ATTENDANCE</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text style={styles.sectionTitle}>MY STUDENTS ({myStudents.length})</Text>
                        {myStudents.map(s => (
                            <View key={s.id} style={styles.studentRow}>
                                <View style={styles.studentAvatar}>
                                    <Text style={styles.studentInitials}>{s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.studentName}>{s.name}</Text>
                                    <Text style={styles.studentMeta}>{s.class}{s.section ? ` – ${s.section}` : ""}{s.boarding_stop ? ` • ${s.boarding_stop}` : ""}</Text>
                                </View>
                            </View>
                        ))}
                    </>
                ) : (
                    <View style={styles.empty}>
                        <Ionicons name="bus-outline" size={64} color="#222" />
                        <Text style={styles.emptyTitle}>No bus assigned</Text>
                        <Text style={styles.emptySub}>Contact your administrator to get assigned to a bus.</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* First-login onboarding tutorial */}
            <OnboardingOverlay
                role="driver"
                visible={!hasSeenOnboarding}
                onComplete={setOnboardingComplete}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    greeting: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 4 },
    userName: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
    logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,23,68,0.1)", alignItems: "center", justifyContent: "center" },
    busCard: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,184,0,0.15)" },
    busIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    busNumber: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
    routeName: { fontSize: 13, color: "#FFB800", fontWeight: "600", marginTop: 2 },
    busStats: { fontSize: 12, color: "#666", marginTop: 4 },
    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 2, marginBottom: 12 },
    studentRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    studentAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,184,0,0.15)", alignItems: "center", justifyContent: "center" },
    studentInitials: { fontSize: 14, fontWeight: "900", color: "#FFB800" },
    studentName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    studentMeta: { fontSize: 11, color: "#666", marginTop: 1 },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: "#333" },
    emptySub: { fontSize: 13, color: "#444", textAlign: "center" },
    markBtn: {
        height: 52,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    markBtnText: { fontSize: 13, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1 },
});
