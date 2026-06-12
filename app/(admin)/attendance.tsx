import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, RefreshControl, ActivityIndicator, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { buildAttendanceReportHTML, printAndSharePDF } from "@/src/utils/pdfReports";

export default function AdminAttendanceScreen() {
    const { getAttendanceByDate, getAttendanceByDateRange, students, isLoading: dbLoading } = useDatabase();
    
    // States
    const [mode, setMode] = useState<"single" | "range">("single");
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
    
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            if (mode === "single") {
                const list = await getAttendanceByDate(selectedDate);
                setAttendanceList(list);
            } else {
                const list = await getAttendanceByDateRange(startDate, endDate);
                setAttendanceList(list);
            }
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to load attendance data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [selectedDate, startDate, endDate, mode]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchAttendance();
        setIsRefreshing(false);
    };

    // Calculate dates for single date mode
    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split("T")[0]);
    };

    // Date range adjusters
    const changeStartDate = (days: number) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + days);
        const nextDateStr = d.toISOString().split("T")[0];
        if (nextDateStr <= endDate) {
            setStartDate(nextDateStr);
        }
    };

    const changeEndDate = (days: number) => {
        const d = new Date(endDate);
        d.setDate(d.getDate() + days);
        const nextDateStr = d.toISOString().split("T")[0];
        if (nextDateStr >= startDate) {
            setEndDate(nextDateStr);
        }
    };

    const formatDateString = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    };

    const formatDateStringCompact = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    };

    // Summarize status & compute stats
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
        const rate = totalMarked > 0 
            ? Math.round(((boarded + dropped) / totalMarked) * 100) 
            : 0;
        return { boarded, dropped, absent, unmarked, totalMarked, totalStudents, rate };
    }, [attendanceList, students]);

    // Handle PDF report generation and sharing
    const handleExportPDF = async () => {
        if (attendanceList.length === 0) {
            Alert.alert("No Data", "There are no attendance records to export in the selected range.");
            return;
        }
        try {
            const html = buildAttendanceReportHTML(
                mode === "single" ? selectedDate : startDate,
                mode === "single" ? selectedDate : endDate,
                attendanceList,
                students.length
            );
            const fileName = `Attendance_Report_${mode === "single" ? selectedDate : `${startDate}_to_${endDate}`}`;
            await printAndSharePDF(html, fileName);
        } catch (e: any) {
            Alert.alert("Export Error", e.message || "Failed to generate report.");
        }
    };

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
                    <Text style={styles.sectionLabel}>{mode === "single" ? "DAILY ATTENDANCE LOG" : "RANGE ATTENDANCE LOG"}</Text>
                    <Text style={styles.title}>Attendance Tracker</Text>
                </View>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportPDF}>
                    <Ionicons name="download-outline" size={20} color="#0A0A0F" />
                </TouchableOpacity>
            </View>

            {/* Mode Selection Tab Bar */}
            <View style={styles.modeBar}>
                <TouchableOpacity 
                    style={[styles.modeTab, mode === "single" && styles.activeModeTab]} 
                    onPress={() => setMode("single")}
                >
                    <Ionicons name="calendar-outline" size={14} color={mode === "single" ? "#0A0A0F" : "#888"} />
                    <Text style={[styles.modeTabText, mode === "single" && styles.activeModeTabText]}>Single Date</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.modeTab, mode === "range" && styles.activeModeTab]} 
                    onPress={() => setMode("range")}
                >
                    <Ionicons name="analytics-outline" size={14} color={mode === "range" ? "#0A0A0F" : "#888"} />
                    <Text style={[styles.modeTabText, mode === "range" && styles.activeModeTabText]}>Date Range</Text>
                </TouchableOpacity>
            </View>

            {/* Single Date Switcher */}
            {mode === "single" && (
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
            )}

            {/* Date Range Selector */}
            {mode === "range" && (
                <View style={styles.rangeBarWrap}>
                    <View style={styles.rangeSubBar}>
                        <TouchableOpacity style={styles.dateArrow} onPress={() => changeStartDate(-1)}>
                            <Ionicons name="chevron-back" size={18} color="#FFB800" />
                        </TouchableOpacity>
                        <View style={styles.dateLabelWrap}>
                            <Text style={styles.rangeInputLabel}>FROM: </Text>
                            <Text style={styles.dateLabelCompact}>{formatDateStringCompact(startDate)}</Text>
                        </View>
                        <TouchableOpacity style={styles.dateArrow} onPress={() => changeStartDate(1)}>
                            <Ionicons name="chevron-forward" size={18} color="#FFB800" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.rangeSubBar}>
                        <TouchableOpacity style={styles.dateArrow} onPress={() => changeEndDate(-1)}>
                            <Ionicons name="chevron-back" size={18} color="#FFB800" />
                        </TouchableOpacity>
                        <View style={styles.dateLabelWrap}>
                            <Text style={styles.rangeInputLabel}>TO: </Text>
                            <Text style={styles.dateLabelCompact}>{formatDateStringCompact(endDate)}</Text>
                        </View>
                        <TouchableOpacity style={styles.dateArrow} onPress={() => changeEndDate(1)}>
                            <Ionicons name="chevron-forward" size={18} color="#FFB800" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
                {mode === "single" ? (
                    <View style={[styles.summaryCard, { borderColor: "rgba(255,255,255,0.06)" }]}>
                        <Text style={[styles.summaryValue, { color: "#888" }]}>{stats.unmarked}</Text>
                        <Text style={styles.summaryLabel}>Unmarked</Text>
                    </View>
                ) : (
                    <View style={[styles.summaryCard, { borderColor: "rgba(255,184,0,0.2)" }]}>
                        <Text style={[styles.summaryValue, { color: "#FFB800" }]}>{stats.rate}%</Text>
                        <Text style={styles.summaryLabel}>Rate</Text>
                    </View>
                )}
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
                            <Text style={styles.emptySub}>No attendance logs found in this date selection.</Text>
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
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <Text style={styles.studentName}>{stud?.name ?? "Unknown Student"}</Text>
                                            {mode === "range" && (
                                                <Text style={styles.dateBadge}>
                                                    {new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                </Text>
                                            )}
                                        </View>
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
    exportBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "#00E676",
        alignItems: "center", justifyContent: "center",
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#00E676", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },

    modeBar: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 4,
        marginHorizontal: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    modeTab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    activeModeTab: {
        backgroundColor: "#FFB800",
    },
    modeTabText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#888",
    },
    activeModeTabText: {
        color: "#0A0A0F",
    },

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

    rangeBarWrap: {
        flexDirection: "row",
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    rangeSubBar: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        height: 48,
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    dateLabelCompact: {
        fontSize: 12,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    rangeInputLabel: {
        fontSize: 9,
        fontWeight: "800",
        color: "#888",
    },

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
    dateBadge: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFB800",
        backgroundColor: "rgba(255,184,0,0.1)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: "hidden",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: "800" },
});

