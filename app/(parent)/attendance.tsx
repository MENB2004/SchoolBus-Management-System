import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";

export default function ParentAttendanceScreen() {
    const { user } = useAuth();
    const { students, getStudentAttendance, refreshData } = useDatabase();

    const [childrenIds, setChildrenIds] = useState<string[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load parent-child associations
    useEffect(() => {
        const loadChildren = async () => {
            if (!isSupabaseConfigured) {
                const ids = students.slice(0, 2).map(s => s.id);
                setChildrenIds(ids);
                if (ids.length > 0) setSelectedChildId(ids[0]);
                return;
            }
            try {
                const { data } = await supabase
                    .from("parent_students")
                    .select("student_id")
                    .eq("parent_id", user?.id);
                const ids = (data ?? []).map((r: any) => r.student_id);
                setChildrenIds(ids);
                if (ids.length > 0) setSelectedChildId(ids[0]);
            } catch (e) {
                console.log("Error loading children:", e);
            }
        };
        loadChildren();
    }, [students]);

    // Load attendance for selected child
    useEffect(() => {
        if (!selectedChildId) return;
        const loadAttendance = async () => {
            setLoading(true);
            try {
                const records = await getStudentAttendance(selectedChildId);
                setAttendanceRecords(records);
            } catch (e) {
                console.log("Error loading attendance:", e);
            } finally {
                setLoading(false);
            }
        };
        loadAttendance();
    }, [selectedChildId]);

    const myChildren = useMemo(() =>
        students.filter(s => childrenIds.includes(s.id)),
        [students, childrenIds]
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        if (selectedChildId) {
            const records = await getStudentAttendance(selectedChildId);
            setAttendanceRecords(records);
        }
        setIsRefreshing(false);
    };

    const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
        boarded: { label: "Boarded", icon: "bus", color: "#00E676", bg: "rgba(0,230,118,0.1)" },
        dropped: { label: "Dropped", icon: "checkmark-circle", color: "#00BCD4", bg: "rgba(0,188,212,0.1)" },
        absent: { label: "Absent", icon: "close-circle", color: "#FF1744", bg: "rgba(255,23,68,0.1)" },
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <Text style={styles.sectionLabel}>ATTENDANCE LOG</Text>
                <Text style={styles.title}>History</Text>
            </View>

            {/* Child Selector */}
            {myChildren.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
                    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20 }}>
                        {myChildren.map(child => (
                            <TouchableOpacity
                                key={child.id}
                                style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
                                onPress={() => setSelectedChildId(child.id)}
                            >
                                <Text style={[styles.childChipText, selectedChildId === child.id && styles.childChipTextActive]}>
                                    {child.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#FFB800" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FFB800" colors={["#FFB800"]} />
                    }
                >
                    {attendanceRecords.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="calendar-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>No Attendance Records</Text>
                            <Text style={styles.emptySub}>Attendance records will appear here once marked by the driver.</Text>
                        </View>
                    ) : (
                        attendanceRecords.map((record, index) => {
                            const config = statusConfig[record.status] ?? { label: record.status, icon: "help-circle-outline", color: "#666", bg: "rgba(255,255,255,0.04)" };
                            const dateStr = new Date(record.date + "T00:00:00").toLocaleDateString("en-IN", {
                                weekday: "short", day: "numeric", month: "short", year: "numeric"
                            });
                            return (
                                <View key={record.id || index} style={styles.recordCard}>
                                    <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.recordDate}>{dateStr}</Text>
                                        <Text style={styles.recordBy}>
                                            Recorded by: {record.recorded_by ?? "Driver"}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                                        <Ionicons name={config.icon} size={12} color={config.color} />
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
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },

    childSelector: { marginBottom: 16 },
    childChip: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    childChipActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    childChipText: { fontSize: 13, fontWeight: "700", color: "#666" },
    childChipTextActive: { color: "#FFB800" },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444", textAlign: "center", paddingHorizontal: 20 },

    recordCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 16, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    recordDate: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    recordBy: { fontSize: 11, color: "#555", marginTop: 2 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: "800" },
});
