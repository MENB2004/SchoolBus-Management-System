import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, RefreshControl, ActivityIndicator, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";

export default function AdminAttendanceScreen() {
    const { getAttendanceByDate, students, isLoading: dbLoading } = useDatabase();
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAttendance = async (dateStr: string) => {
        setLoading(true);
        try {
            const list = await getAttendanceByDate(dateStr);
            setAttendanceList(list);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to load attendance data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance(selectedDate);
    }, [selectedDate]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchAttendance(selectedDate);
        setIsRefreshing(false);
    };

    // Calculate dates
    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split("T")[0]);
    };

    const formatDateString = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    };

    // Summarize status
    const stats = useMemo(() => {
        let boarded = 0, dropped = 0, absent = 0;
        attendanceList.forEach(a => {
            if (a.status === "boarded") boarded++;
            else if (a.status === "dropped") dropped++;
            else if (a.status === "absent") absent++;
        });
        const totalMarked = attendanceList.length;
        const totalStudents = students.length;
        const unmarked = Math.max(0, totalStudents - totalMarked);
        return { boarded, dropped, absent, unmarked, totalMarked, totalStudents };
    }, [attendanceList, students]);

    const statusConfig = {
        boarded: { label: "Boarded", icon: "bus", color: "#00E676", bg: "rgba(0,230,118,0.1)" },
        dropped: { label: "Dropped", icon: "checkmark-circle", color: "#00BCD4", bg: "rgba(0,188,212,0.1)" },
        absent: { label: "Absent", icon: "close-circle", color: "#FF1744", bg: "rgba(255,23,68,0.1)" },
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#00E676" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>DAILY ATTENDANCE LOG</Text>
                    <Text style={styles.title}>Attendance Tracker</Text>
                </View>
            </View>

            {/* Date Switcher */}
            <View style={styles.dateBar}>
                <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
                    <Ionicons name="chevron-back" size={20} color="#FFB800" />
                </TouchableOpacity>
                <View style={styles.dateLabelWrap}>
                    <Ionicons name="calendar-outline" size={16} color="#FFB800" style={{ marginRight: 6 }} />
                    <Text style={styles.dateLabel}>{formatDateString(selectedDate)}</Text>
                </View>
                <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
                    <Ionicons name="chevron-forward" size={20} color="#FFB800" />
                </TouchableOpacity>
            </View>

            {/* Attendance Summary */}
            <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { borderColor: "rgba(0,230,118,0.2)" }]}>
                    <Text style={[styles.summaryValue, { color: "#00E676" }]}>{stats.boarded}</Text>
                    <Text style={styles.summaryLabel}>Boarded</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: "rgba(0,188,212,0.2)" }]}>
                    <Text style={[styles.summaryValue, { color: "#00BCD4" }]}>{stats.dropped}</Text>
                    <Text style={styles.summaryLabel}>Dropped</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: "rgba(255,23,68,0.2)" }]}>
                    <Text style={[styles.summaryValue, { color: "#FF1744" }]}>{stats.absent}</Text>
                    <Text style={styles.summaryLabel}>Absent</Text>
                </View>
                <View style={[styles.summaryCard, { borderColor: "rgba(255,255,255,0.06)" }]}>
                    <Text style={[styles.summaryValue, { color: "#888" }]}>{stats.unmarked}</Text>
                    <Text style={styles.summaryLabel}>Unmarked</Text>
                </View>
            </View>

            {loading && !isRefreshing ? (
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#00E676" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E676" colors={["#00E676"]} />
                    }
                >
                    {attendanceList.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="calendar-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>No Attendance Recorded</Text>
                            <Text style={styles.emptySub}>Drivers haven't marked attendance for this date yet.</Text>
                        </View>
                    ) : (
                        attendanceList.map(a => {
                            const config = statusConfig[a.status as "boarded" | "dropped" | "absent"] || {
                                label: a.status, icon: "ellipse", color: "#888", bg: "rgba(255,255,255,0.05)"
                            };
                            const stud = students.find(s => s.id === a.student_id);
                            const initials = (stud?.name ?? "Student").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

                            return (
                                <View key={a.id} style={styles.card}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{initials}</Text>
                                    </View>
                                    
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={styles.studentName}>{stud?.name ?? "Unknown Student"}</Text>
                                        <Text style={styles.studentMeta}>
                                            Class {stud?.class ?? "—"}{stud?.section ? ` • ${stud.section}` : ""}
                                            {stud?.boarding_stop ? ` • Stop: ${stud.boarding_stop}` : ""}
                                        </Text>
                                    </View>

                                    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                                        <Ionicons name={config.icon as any} size={12} color={config.color} style={{ marginRight: 4 }} />
                                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(0,230,118,0.1)",
        alignItems: "center", justifyContent: "center",
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#00E676", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },

    dateBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        marginHorizontal: 20,
        height: 52,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 16,
    },
    dateArrow: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
    },
    dateLabelWrap: { flexDirection: "row", alignItems: "center" },
    dateLabel: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },

    summaryGrid: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginBottom: 16 },
    summaryCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12, borderWidth: 1, alignItems: "center" },
    summaryValue: { fontSize: 20, fontWeight: "900" },
    summaryLabel: { fontSize: 9, color: "#555", fontWeight: "700", marginTop: 2 },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444", textAlign: "center", paddingHorizontal: 40 },

    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.05)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    avatarText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
    studentName: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
    studentMeta: { fontSize: 11, color: "#666", marginTop: 2, fontWeight: "600" },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: "800" },
});
