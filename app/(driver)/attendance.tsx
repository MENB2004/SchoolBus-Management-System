import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Alert, Platform, TextInput
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

export default function DriverAttendanceScreen() {
    const { user } = useAuth();
    const { buses, students, drivers, markAttendance, getAttendanceByDate } = useDatabase();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [attendance, setAttendance] = useState<TempAttendance>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStop, setSelectedStop] = useState("All");
    const today = useMemo(() => new Date().toISOString().split("T")[0], []);

    // 1. Resolve Driver's Bus via user_id (reliable) then fallback to name match
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

    // Extract unique boarding stops
    const boardingStops = useMemo(() => {
        const stops = new Set<string>();
        myStudents.forEach(s => {
            if (s.boarding_stop) stops.add(s.boarding_stop);
        });
        return ["All", ...Array.from(stops)];
    }, [myStudents]);

    // Load Existing Attendance for Today
    useEffect(() => {
        async function loadTodayAttendance() {
            setLoading(true);
            try {
                const list = await getAttendanceByDate(today);
                const mapping: TempAttendance = {};
                list.forEach(a => {
                    mapping[a.student_id] = a.status as any;
                });
                setAttendance(mapping);
            } catch (e: any) {
                console.log("Error fetching today attendance:", e);
            } finally {
                setLoading(false);
            }
        }
        loadTodayAttendance();
    }, [today]);

    // Filtered Students
    const filteredStudents = useMemo(() => {
        return myStudents.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStop = selectedStop === "All" || s.boarding_stop === selectedStop;
            return matchesSearch && matchesStop;
        });
    }, [myStudents, searchQuery, selectedStop]);

    // Stats Calculation
    const stats = useMemo(() => {
        const total = myStudents.length;
        const marked = myStudents.filter(s => attendance[s.id]).length;
        const boarded = myStudents.filter(s => attendance[s.id] === "boarded").length;
        const dropped = myStudents.filter(s => attendance[s.id] === "dropped").length;
        const absent = myStudents.filter(s => attendance[s.id] === "absent").length;
        const percent = total > 0 ? (marked / total) * 100 : 0;
        return { total, marked, boarded, dropped, absent, percent };
    }, [myStudents, attendance]);

    const handleMark = async (studentId: string, status: "boarded" | "dropped" | "absent") => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleBulkMark = async (status: "boarded" | "dropped") => {
        if (filteredStudents.length === 0) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}

        setAttendance(prev => {
            const next = { ...prev };
            filteredStudents.forEach(s => {
                next[s.id] = status;
            });
            return next;
        });
    };

    const handleSave = async () => {
        if (myStudents.length === 0) return;
        
        setSubmitting(true);
        try {
            // Loop through students and submit attendance
            for (const s of myStudents) {
                const status = attendance[s.id];
                if (status) {
                    await markAttendance({
                        student_id: s.id,
                        date: today,
                        status: status,
                        recorded_by: user?.id || ""
                    });
                }
            }
            Alert.alert("Success", "Attendance submitted successfully!", [
                { text: "OK", onPress: () => router.replace("/(driver)/dashboard") }
            ]);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to mark attendance.");
        } finally {
            setSubmitting(false);
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
                    <Text style={styles.sectionLabel}>DAILY BUS PASSENGERS</Text>
                    <Text style={styles.title}>Mark Attendance</Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#FFB800" />
                </View>
            ) : (
                <>
                    {/* Progress Card */}
                    {myStudents.length > 0 && (
                        <View style={styles.progressCard}>
                            <View style={styles.progressTextRow}>
                                <Text style={styles.progressLabel}>Marked Progress</Text>
                                <Text style={styles.progressCount}>{stats.marked} / {stats.total} students</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <LinearGradient
                                    colors={["#FFB800", "#FF8C00"]}
                                    style={[styles.progressBarFill, { width: `${stats.percent}%` }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                            <View style={styles.statusLegend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#00E676" }]} />
                                    <Text style={styles.legendText}>{stats.boarded} Boarded</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#00BCD4" }]} />
                                    <Text style={styles.legendText}>{stats.dropped} Dropped</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: "#FF1744" }]} />
                                    <Text style={styles.legendText}>{stats.absent} Absent</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Search & Filters */}
                    {myStudents.length > 0 && (
                        <View style={styles.filterContainer}>
                            <View style={styles.searchBar}>
                                <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search by name..."
                                    placeholderTextColor="#555"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery !== "" && (
                                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                                        <Ionicons name="close-circle" size={16} color="#666" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Stop Filter Horizontal List */}
                            {boardingStops.length > 2 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.stopsScroll}
                                >
                                    {boardingStops.map(stop => {
                                        const active = selectedStop === stop;
                                        return (
                                            <TouchableOpacity
                                                key={stop}
                                                style={[styles.stopChip, active && styles.stopChipActive]}
                                                onPress={() => setSelectedStop(stop)}
                                            >
                                                <Text style={[styles.stopChipText, active && styles.stopChipTextActive]}>
                                                    {stop}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}

                            {/* Bulk Actions */}
                            <View style={styles.bulkRow}>
                                <TouchableOpacity
                                    style={[styles.bulkBtn, { borderColor: "rgba(0, 230, 118, 0.3)" }]}
                                    onPress={() => handleBulkMark("boarded")}
                                >
                                    <Ionicons name="bus" size={14} color="#00E676" />
                                    <Text style={[styles.bulkBtnText, { color: "#00E676" }]}>Bulk Boarded</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.bulkBtn, { borderColor: "rgba(0, 188, 212, 0.3)" }]}
                                    onPress={() => handleBulkMark("dropped")}
                                >
                                    <Ionicons name="checkmark-circle" size={14} color="#00BCD4" />
                                    <Text style={[styles.bulkBtnText, { color: "#00BCD4" }]}>Bulk Dropped</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                        {filteredStudents.length === 0 ? (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="people-outline" size={48} color="#333" />
                                <Text style={styles.emptyTitle}>No Students Found</Text>
                                <Text style={styles.emptySub}>
                                    {myStudents.length === 0
                                        ? "There are no active students assigned to Bus " + myBus.bus_number
                                        : "No students match your search filters."}
                                </Text>
                            </View>
                        ) : (
                            filteredStudents.map(s => {
                                const markedStatus = attendance[s.id];
                                const initials = s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

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
                                        </View>

                                        {/* Attendance Buttons */}
                                        <View style={styles.actionRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn, 
                                                    markedStatus === "boarded" && { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "#00E676" }
                                                ]}
                                                onPress={() => handleMark(s.id, "boarded")}
                                            >
                                                <Ionicons name="bus" size={16} color={markedStatus === "boarded" ? "#00E676" : "#666"} />
                                                <Text style={[styles.actionBtnText, markedStatus === "boarded" && { color: "#00E676" }]}>
                                                    Boarded
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn, 
                                                    markedStatus === "dropped" && { backgroundColor: "rgba(0,188,212,0.15)", borderColor: "#00BCD4" }
                                                ]}
                                                onPress={() => handleMark(s.id, "dropped")}
                                            >
                                                <Ionicons name="checkmark-circle" size={16} color={markedStatus === "dropped" ? "#00BCD4" : "#666"} />
                                                <Text style={[styles.actionBtnText, markedStatus === "dropped" && { color: "#00BCD4" }]}>
                                                    Dropped
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn, 
                                                    markedStatus === "absent" && { backgroundColor: "rgba(255,23,68,0.15)", borderColor: "#FF1744" }
                                                ]}
                                                onPress={() => handleMark(s.id, "absent")}
                                            >
                                                <Ionicons name="close-circle" size={16} color={markedStatus === "absent" ? "#FF1744" : "#666"} />
                                                <Text style={[styles.actionBtnText, markedStatus === "absent" && { color: "#FF1744" }]}>
                                                    Absent
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                        <View style={{ height: 120 }} />
                    </ScrollView>

                    {myStudents.length > 0 && (
                        <View style={styles.footer}>
                            <TouchableOpacity onPress={handleSave} disabled={submitting} activeOpacity={0.88}>
                                <LinearGradient
                                    colors={submitting ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                                    style={styles.submitBtn}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#0A0A0F" />
                                    ) : (
                                        <>
                                            <Ionicons name="cloud-upload-outline" size={20} color="#0A0A0F" />
                                            <Text style={styles.submitBtnText}>SUBMIT ATTENDANCE</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
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

    progressCard: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 18,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    progressTextRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    progressLabel: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
    progressCount: { fontSize: 12, color: "#888", fontWeight: "600" },
    progressBarBg: {
        height: 8,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    statusLegend: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: "#666",
        fontWeight: "600",
    },

    filterContainer: {
        marginHorizontal: 20,
        marginBottom: 12,
        gap: 8,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        color: "#FFFFFF",
        fontSize: 14,
        height: "100%",
    },
    stopsScroll: {
        gap: 6,
        paddingVertical: 2,
    },
    stopChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    stopChipActive: {
        backgroundColor: "rgba(255,184,0,0.1)",
        borderColor: "rgba(255,184,0,0.3)",
    },
    stopChipText: {
        color: "#666",
        fontSize: 12,
        fontWeight: "700",
    },
    stopChipTextActive: {
        color: "#FFB800",
    },
    bulkRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 4,
    },
    bulkBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 36,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
    },
    bulkBtnText: {
        fontSize: 12,
        fontWeight: "800",
    },

    list: { paddingHorizontal: 20, paddingBottom: 100 },
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

    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 38,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    actionBtnText: { fontSize: 11, fontWeight: "800", color: "#666" },

    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 34 : 20,
        backgroundColor: "#080812F0",
        borderTopWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    submitBtn: {
        height: 54,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    submitBtnText: { fontSize: 14, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1.5 },

    errorWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 12 },
    errorText: { fontSize: 16, color: "#666", fontWeight: "700", textAlign: "center" },
    backLink: { padding: 12 },
    backLinkText: { color: "#FFB800", fontWeight: "800", fontSize: 14 },

    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444", textAlign: "center", paddingHorizontal: 40 },
});
