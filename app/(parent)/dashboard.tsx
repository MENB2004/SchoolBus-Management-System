import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl, Linking, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";
import { getFeeStatus, FEE_COLORS, formatDueDate } from "@/src/data/mockData";
import OnboardingOverlay from "@/src/components/OnboardingOverlay";

export default function ParentDashboardScreen() {
    const { user, signOut, hasSeenOnboarding, setOnboardingComplete } = useAuth();
    const { students, buses, refreshData, getStudentAttendance, isLoading: dbLoading } = useDatabase();
    
    const [childrenIds, setChildrenIds] = useState<string[]>([]);
    const [childrenAttendance, setChildrenAttendance] = useState<{ [studentId: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 1. Fetch children associations from parent_students table or mock it
    const loadParentChildren = async () => {
        if (!isSupabaseConfigured) {
            // Mock sandbox mode: associate the first two students
            setChildrenIds(students.slice(0, 2).map(s => s.id));
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("parent_students")
                .select("student_id")
                .eq("parent_id", user?.id);

            if (error) throw error;
            setChildrenIds((data ?? []).map((row: any) => row.student_id));
        } catch (e: any) {
            console.log("Error loading parent-child links:", e);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch attendance for all associated children using DatabaseContext
    const loadChildrenAttendance = async (ids: string[]) => {
        const mapping: { [studentId: string]: string } = {};
        const today = new Date().toISOString().split("T")[0];
        
        try {
            for (const id of ids) {
                // Use DatabaseContext method (works in both mock and production)
                const records = await getStudentAttendance(id);
                const todayRecord = records.find(a => a.date === today);
                mapping[id] = todayRecord?.status ?? "Not Marked";
            }
            setChildrenAttendance(mapping);
        } catch (e) {
            console.log("Error fetching children attendance:", e);
        }
    };

    useEffect(() => {
        loadParentChildren();
    }, [students]);

    useEffect(() => {
        if (childrenIds.length > 0) {
            loadChildrenAttendance(childrenIds);
        }
    }, [childrenIds]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        await loadParentChildren();
        setIsRefreshing(false);
    };

    const myChildren = useMemo(() => {
        return students.filter(s => childrenIds.includes(s.id));
    }, [students, childrenIds]);

    const handleCallDriver = (phone: string | undefined) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            Alert.alert("Not Available", "Driver phone number is not available.");
        }
    };

    const attendanceStyles = {
        boarded: { label: "Boarded Bus", icon: "bus" as const, color: "#00E676", bg: "rgba(0,230,118,0.1)" },
        dropped: { label: "Dropped Off", icon: "checkmark-circle" as const, color: "#00BCD4", bg: "rgba(0,188,212,0.1)" },
        absent: { label: "Absent today", icon: "close-circle" as const, color: "#FF1744", bg: "rgba(255,23,68,0.1)" },
        "Not Marked": { label: "Not yet marked", icon: "help-circle-outline" as const, color: "#666", bg: "rgba(255,255,255,0.04)" }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FFB800" colors={["#FFB800"]} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>PARENT PORTAL</Text>
                        <Text style={styles.userName}>{user?.name ?? "Parent"}</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={20} color="#FF1744" />
                    </TouchableOpacity>
                </View>

                {loading || dbLoading ? (
                    <View style={{ flex: 1, justifyContent: "center", paddingVertical: 100 }}>
                        <ActivityIndicator size="large" color="#FFB800" />
                    </View>
                ) : myChildren.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Ionicons name="people-outline" size={64} color="#222" />
                        <Text style={styles.emptyTitle}>No children registered</Text>
                        <Text style={styles.emptySub}>Ask the school administrator to link your account to your children's profiles.</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>MY CHILDREN ({myChildren.length})</Text>
                        {myChildren.map(child => {
                            const daysLeft = child.days_remaining ?? -999;
                            const feeStatus = getFeeStatus(daysLeft);
                            const feeColor = FEE_COLORS[feeStatus];
                            const initials = child.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                            
                            // Get today's attendance status
                            const attStatus = childrenAttendance[child.id] || "Not Marked";
                            const attConfig = attendanceStyles[attStatus as keyof typeof attendanceStyles] || attendanceStyles["Not Marked"];

                            // Resolve Driver info via Bus
                            const bus = buses.find(b => b.id === child.bus_id);

                            return (
                                <View key={child.id} style={styles.childCard}>
                                    {/* Child Header Card */}
                                    <View style={styles.childHeader}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{initials}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.childName}>{child.name}</Text>
                                            <Text style={styles.childClass}>
                                                Class {child.class}{child.section ? ` - ${child.section}` : ""}
                                            </Text>
                                        </View>
                                        <View style={[styles.feeStatusBadge, { backgroundColor: feeColor.bg }]}>
                                            <Text style={[styles.feeStatusText, { color: feeColor.text }]}>
                                                {feeColor.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Daily Attendance Card */}
                                    <View style={styles.infoSection}>
                                        <Text style={styles.infoSectionTitle}>TODAY'S ATTENDANCE</Text>
                                        <View style={[styles.attendanceBanner, { backgroundColor: attConfig.bg }]}>
                                            <Ionicons name={attConfig.icon} size={18} color={attConfig.color} />
                                            <Text style={[styles.attendanceLabel, { color: attConfig.color }]}>
                                                {attConfig.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Route & Bus Details */}
                                    <View style={styles.infoSection}>
                                        <Text style={styles.infoSectionTitle}>TRANSPORT DETAILS</Text>
                                        <View style={styles.detailsGrid}>
                                            <View style={styles.detailRow}>
                                                <Ionicons name="map-outline" size={14} color="#666" style={styles.detailIcon} />
                                                <View>
                                                    <Text style={styles.detailLabel}>Route / Stop</Text>
                                                    <Text style={styles.detailValue}>
                                                        {child.route?.route_name ?? "None"} • {child.boarding_stop ?? "No stop"}
                                                    </Text>
                                                </View>
                                            </View>

                                            {bus && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="bus-outline" size={14} color="#666" style={styles.detailIcon} />
                                                    <View>
                                                        <Text style={styles.detailLabel}>Bus Number</Text>
                                                        <Text style={styles.detailValue}>{bus.bus_number}</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {bus?.driver && (
                                                <TouchableOpacity 
                                                    style={styles.detailRowClickable} 
                                                    onPress={() => handleCallDriver(bus.driver?.phone)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="call-outline" size={14} color="#00E676" style={styles.detailIcon} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.detailLabel, { color: "#00E676" }]}>Call Driver</Text>
                                                        <Text style={[styles.detailValue, { color: "#00E676" }]}>
                                                            {bus.driver.name} ({bus.driver.phone})
                                                        </Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={12} color="#00E676" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    {/* Fee details */}
                                    <View style={styles.infoSection}>
                                        <Text style={styles.infoSectionTitle}>FEE INFORMATION</Text>
                                        <View style={styles.feeBanner}>
                                            <View>
                                                <Text style={styles.feeTitle}>Monthly school transport fee</Text>
                                                <Text style={styles.feeSub}>Paid until: {formatDueDate(child.fee_paid_until)}</Text>
                                            </View>
                                            <Text style={styles.feeAmount}>₹{child.monthly_fee.toLocaleString("en-IN")}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* First-login onboarding tutorial */}
            <OnboardingOverlay
                role="parent"
                visible={!hasSeenOnboarding}
                onComplete={setOnboardingComplete}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    greeting: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 4 },
    userName: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
    logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,23,68,0.1)", alignItems: "center", justifyContent: "center" },
    
    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 2, marginBottom: 12 },

    childCard: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 16,
    },
    childHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.2)",
    },
    avatarText: { color: "#FFB800", fontSize: 15, fontWeight: "900" },
    childName: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
    childClass: { fontSize: 12, color: "#666", fontWeight: "600", marginTop: 2 },
    feeStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    feeStatusText: { fontSize: 10, fontWeight: "800" },

    infoSection: { marginTop: 14 },
    infoSectionTitle: { fontSize: 9, fontWeight: "800", color: "#444", letterSpacing: 1, marginBottom: 8 },
    
    attendanceBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.02)",
    },
    attendanceLabel: { fontSize: 13, fontWeight: "800" },

    detailsGrid: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderRadius: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.03)",
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.04)",
    },
    detailRowClickable: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
    },
    detailIcon: { marginRight: 12, width: 16, textAlign: "center" },
    detailLabel: { fontSize: 10, color: "#555", fontWeight: "700" },
    detailValue: { fontSize: 13, color: "#FFF", fontWeight: "600", marginTop: 2 },

    feeBanner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.04)",
    },
    feeTitle: { fontSize: 12, color: "#FFFFFF", fontWeight: "700" },
    feeSub: { fontSize: 11, color: "#555", fontWeight: "600", marginTop: 2 },
    feeAmount: { fontSize: 16, fontWeight: "900", color: "#FFB800" },

    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: "#333" },
    emptySub: { fontSize: 13, color: "#444", textAlign: "center", paddingHorizontal: 30 },
});
