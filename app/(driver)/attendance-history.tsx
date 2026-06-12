import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Alert, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

type TempAttendance = {
    [studentId: string]: "boarded" | "dropped" | "absent";
};

export default function DriverAttendanceHistoryScreen() {
    const { user } = useAuth();
    const { buses, students, drivers, markAttendance, getAttendanceByDate } = useDatabase();
    const [loading, setLoading] = useState(false);
    const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

    // Generate last 14 days list
    const datesList = useMemo(() => {
        const list = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            list.push(d);
        }
        return list;
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(
        datesList[0].toISOString().split("T")[0]
    );
    const [attendance, setAttendance] = useState<TempAttendance>({});

    // 1. Resolve Driver's Bus
    const myDriver = drivers.find(d => d.user_id === user?.id) 
        ?? drivers.find(d => d.name?.toLowerCase() === user?.name?.toLowerCase());
    let myBus = myDriver ? buses.find(b => b.driver_id === myDriver.id) : undefined;
    
    // Sandbox fallback
    if (!myBus && (user?.id?.startsWith("mock-") || user?.email === "driver@school.com")) {
        myBus = buses.find(b => b.status === "active");
    }

    const myStudents = useMemo(() => {
        return myBus ? students.filter(s => s.bus_id === myBus!.id && s.is_active) : [];
    }, [myBus, students]);

    // 2. Load Attendance when Selected Date changes
    const loadAttendanceForDate = async (dateStr: string) => {
        setLoading(true);
        try {
            const list = await getAttendanceByDate(dateStr);
            const mapping: TempAttendance = {};
            list.forEach(a => {
                mapping[a.student_id] = a.status as any;
            });
            setAttendance(mapping);
        } catch (e: any) {
            console.log("Error fetching attendance history:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttendanceForDate(selectedDate);
    }, [selectedDate]);

    // 3. Update Attendance Status on the fly
    const handleUpdateMark = async (studentId: string, status: "boarded" | "dropped" | "absent") => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}

        setUpdatingStudentId(studentId);
        try {
            await markAttendance({
                student_id: studentId,
                date: selectedDate,
                status: status,
                recorded_by: user?.id || ""
            });
            
            setAttendance(prev => ({
                ...prev,
                [studentId]: status
            }));
        } catch (e: any) {
            Alert.alert("Update Failed", e.message || "Failed to update attendance.");
        } finally {
            setUpdatingStudentId(null);
        }
    };

    if (!myBus) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />
                <View style={styles.errorWrap}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF1744" />
                    <Text style={styles.errorText}>No bus assigned to your account.</Text>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.replace("/(driver)/dashboard")}>
                        <Text style={styles.backLinkText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.replace("/(driver)/dashboard")}>
                    <Ionicons name="arrow-back" size={20} color="#FFB800" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>ATTENDANCE HISTORICAL LOGS</Text>
                    <Text style={styles.title}>History Log</Text>
                </View>
            </View>

            {/* Date Selection Strip */}
            <View style={styles.dateSelectorContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
                    {datesList.map(date => {
                        const dateStr = date.toISOString().split("T")[0];
                        const active = selectedDate === dateStr;
                        const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
                        const dayNum = date.getDate();
                        const month = date.toLocaleDateString("en-US", { month: "short" });

                        return (
                            <TouchableOpacity
                                key={dateStr}
                                style={[styles.dateChip, active && styles.dateChipActive]}
                                onPress={() => setSelectedDate(dateStr)}
                            >
                                <Text style={[styles.dateWeekday, active && styles.dateWeekdayActive]}>
                                    {weekday}
                                </Text>
                                <Text style={[styles.dateDayNum, active && styles.dateDayNumActive]}>
                                    {dayNum}
                                </Text>
                                <Text style={[styles.dateMonth, active && styles.dateMonthActive]}>
                                    {month}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#FFB800" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {myStudents.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="people-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>No Students Assigned</Text>
                            <Text style={styles.emptySub}>
                                There are no active students assigned to Bus {myBus.bus_number}.
                            </Text>
                        </View>
                    ) : (
                        myStudents.map(s => {
                            const markedStatus = attendance[s.id];
                            const initials = s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                            const isUpdating = updatingStudentId === s.id;

                            return (
                                <View key={s.id} style={styles.card}>
                                    <View style={styles.studentInfo}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{initials}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.studentName}>{s.name}</Text>
                                            <Text style={styles.studentStop}>
                                                {s.class}{s.section ? `-${s.section}` : ""} • {s.boarding_stop || "No stop"}
                                            </Text>
                                        </View>
                                        {/* Status indicator pill */}
                                        <View style={[
                                            styles.statusPill,
                                            markedStatus === "boarded" && styles.statusPillBoarded,
                                            markedStatus === "dropped" && styles.statusPillDropped,
                                            markedStatus === "absent" && styles.statusPillAbsent,
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                markedStatus === "boarded" && styles.statusTextBoarded,
                                                markedStatus === "dropped" && styles.statusTextDropped,
                                                markedStatus === "absent" && styles.statusTextAbsent,
                                            ]}>
                                                {markedStatus ? markedStatus.toUpperCase() : "UNMARKED"}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Inline Edit Buttons */}
                                    <View style={styles.actionRow}>
                                        {isUpdating ? (
                                            <View style={styles.updatingIndicator}>
                                                <ActivityIndicator size="small" color="#FFB800" />
                                                <Text style={styles.updatingText}>Updating log...</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.actionBtn, 
                                                        markedStatus === "boarded" && { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "#00E676" }
                                                    ]}
                                                    onPress={() => handleUpdateMark(s.id, "boarded")}
                                                >
                                                    <Ionicons name="bus" size={14} color={markedStatus === "boarded" ? "#00E676" : "#555"} />
                                                    <Text style={[styles.actionBtnText, markedStatus === "boarded" && { color: "#00E676" }]}>
                                                        Boarded
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.actionBtn, 
                                                        markedStatus === "dropped" && { backgroundColor: "rgba(0,188,212,0.15)", borderColor: "#00BCD4" }
                                                    ]}
                                                    onPress={() => handleUpdateMark(s.id, "dropped")}
                                                >
                                                    <Ionicons name="checkmark-circle" size={14} color={markedStatus === "dropped" ? "#00BCD4" : "#555"} />
                                                    <Text style={[styles.actionBtnText, markedStatus === "dropped" && { color: "#00BCD4" }]}>
                                                        Dropped
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.actionBtn, 
                                                        markedStatus === "absent" && { backgroundColor: "rgba(255,23,68,0.15)", borderColor: "#FF1744" }
                                                    ]}
                                                    onPress={() => handleUpdateMark(s.id, "absent")}
                                                >
                                                    <Ionicons name="close-circle" size={14} color={markedStatus === "absent" ? "#FF1744" : "#555"} />
                                                    <Text style={[styles.actionBtnText, markedStatus === "absent" && { color: "#FF1744" }]}>
                                                        Absent
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 40 }} />
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
        paddingBottom: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignItems: "center", justifyContent: "center",
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },

    dateSelectorContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
        marginBottom: 12,
    },
    dateScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    dateChip: {
        width: 62,
        height: 76,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },
    dateChipActive: {
        backgroundColor: "rgba(255,184,0,0.12)",
        borderColor: "rgba(255,184,0,0.4)",
    },
    dateWeekday: {
        fontSize: 10,
        color: "#555",
        fontWeight: "700",
        textTransform: "uppercase",
    },
    dateWeekdayActive: {
        color: "#FFB800",
    },
    dateDayNum: {
        fontSize: 18,
        fontWeight: "900",
        color: "#FFFFFF",
        marginVertical: 2,
    },
    dateDayNumActive: {
        color: "#FFB800",
    },
    dateMonth: {
        fontSize: 9,
        color: "#555",
        fontWeight: "700",
    },
    dateMonthActive: {
        color: "#FFB800",
    },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    card: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    studentInfo: { flexDirection: "row", alignItems: "center" },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.2)",
    },
    avatarText: { color: "#FFB800", fontSize: 14, fontWeight: "900" },
    studentName: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
    studentStop: { fontSize: 12, color: "#666", marginTop: 2, fontWeight: "600" },

    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    statusPillBoarded: {
        backgroundColor: "rgba(0,230,118,0.1)",
        borderColor: "rgba(0,230,118,0.2)",
    },
    statusPillDropped: {
        backgroundColor: "rgba(0,188,212,0.1)",
        borderColor: "rgba(0,188,212,0.2)",
    },
    statusPillAbsent: {
        backgroundColor: "rgba(255,23,68,0.1)",
        borderColor: "rgba(255,23,68,0.2)",
    },
    statusText: {
        fontSize: 10,
        fontWeight: "900",
        color: "#666",
    },
    statusTextBoarded: { color: "#00E676" },
    statusTextDropped: { color: "#00BCD4" },
    statusTextAbsent: { color: "#FF1744" },

    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.04)",
        paddingTop: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 34,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.04)",
    },
    actionBtnText: { fontSize: 11, fontWeight: "800", color: "#555" },

    updatingIndicator: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 34,
    },
    updatingText: {
        fontSize: 12,
        color: "#FFB800",
        fontWeight: "700",
    },

    errorWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 12 },
    errorText: { fontSize: 16, color: "#666", fontWeight: "700", textAlign: "center" },
    backLink: { padding: 12 },
    backLinkText: { color: "#FFB800", fontWeight: "800", fontSize: 14 },

    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444", textAlign: "center", paddingHorizontal: 40 },
});
