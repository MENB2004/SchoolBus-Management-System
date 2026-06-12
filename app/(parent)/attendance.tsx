import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";

export default function ParentAttendanceScreen() {
    const { user } = useAuth();
    const { 
        students, getStudentAttendance, refreshData, 
        buses, drivers, triggerNotification, markAttendance 
    } = useDatabase();

    const [childrenIds, setChildrenIds] = useState<string[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Form states for planned absence
    const [showAbsenceModal, setShowAbsenceModal] = useState(false);
    const [absenceChildId, setAbsenceChildId] = useState<string>("");
    const [absenceDateType, setAbsenceDateType] = useState<"tomorrow" | "day_after" | "custom">("tomorrow");
    const [customDate, setCustomDate] = useState("");
    const [absenceReason, setAbsenceReason] = useState("");
    const [submittingAbsence, setSubmittingAbsence] = useState(false);

    // Date calculations
    const tomorrowDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d;
    }, []);

    const dayAfterDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        return d;
    }, []);

    const tomorrowStr = useMemo(() => tomorrowDate.toISOString().split("T")[0], [tomorrowDate]);
    const dayAfterStr = useMemo(() => dayAfterDate.toISOString().split("T")[0], [dayAfterDate]);
    const formattedTomorrow = useMemo(() => tomorrowDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), [tomorrowDate]);
    const formattedDayAfter = useMemo(() => dayAfterDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }), [dayAfterDate]);

    // Load parent-child associations
    useEffect(() => {
        const loadChildren = async () => {
            if (!isSupabaseConfigured) {
                const ids = students.slice(0, 2).map(s => s.id);
                setChildrenIds(ids);
                if (ids.length > 0) {
                    setSelectedChildId(ids[0]);
                    setAbsenceChildId(ids[0]);
                }
                return;
            }
            try {
                const { data } = await supabase
                    .from("parent_students")
                    .select("student_id")
                    .eq("parent_id", user?.id);
                const ids = (data ?? []).map((r: any) => r.student_id);
                setChildrenIds(ids);
                if (ids.length > 0) {
                    setSelectedChildId(ids[0]);
                    setAbsenceChildId(ids[0]);
                }
            } catch (e) {
                console.log("Error loading children:", e);
            }
        };
        loadChildren();
    }, [students]);

    // Load attendance for selected child
    const loadAttendance = async (childId: string) => {
        setLoading(true);
        try {
            const records = await getStudentAttendance(childId);
            setAttendanceRecords(records);
        } catch (e) {
            console.log("Error loading attendance:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedChildId) {
            loadAttendance(selectedChildId);
        }
    }, [selectedChildId]);

    const myChildren = useMemo(() =>
        students.filter(s => childrenIds.includes(s.id)),
        [students, childrenIds]
    );

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        if (selectedChildId) {
            await loadAttendance(selectedChildId);
        }
        setIsRefreshing(false);
    };

    // Handle Pre-planned Absence submission
    const handleSubmitAbsence = async () => {
        let targetDate = "";
        if (absenceDateType === "tomorrow") {
            targetDate = tomorrowStr;
        } else if (absenceDateType === "day_after") {
            targetDate = dayAfterStr;
        } else {
            // Validate custom date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(customDate)) {
                Alert.alert("Invalid Date Format", "Please specify custom date as YYYY-MM-DD.");
                return;
            }
            const parsed = Date.parse(customDate);
            if (isNaN(parsed)) {
                Alert.alert("Invalid Date", "Please enter a valid date.");
                return;
            }
            targetDate = customDate;
        }

        const childStudent = students.find(s => s.id === absenceChildId);
        if (!childStudent) {
            Alert.alert("Error", "Please select a valid child.");
            return;
        }

        setSubmittingAbsence(true);
        try {
            // 1. Mark attendance as "absent" on target date
            await markAttendance({
                student_id: absenceChildId,
                date: targetDate,
                status: "absent",
                recorded_by: user?.id || "mock-parent-id",
                notes: absenceReason ? `Planned Absence: ${absenceReason}` : "Planned Absence"
            });

            // 2. Resolve driver & notify them
            const bus = buses.find(b => b.id === childStudent.bus_id);
            const driver = drivers.find(d => d.id === bus?.driver_id);
            if (driver?.user_id) {
                await triggerNotification(
                    driver.user_id,
                    "Student Planned Absence",
                    `${childStudent.name} will be absent on ${targetDate}. Reason: ${absenceReason || "Not specified"}`,
                    { studentId: childStudent.id, date: targetDate }
                );
            }

            // 3. Notify admins
            if (isSupabaseConfigured) {
                const { data: adminRoles } = await supabase
                    .from("user_roles")
                    .select("user_id")
                    .eq("role", "admin");
                if (adminRoles) {
                    for (const role of adminRoles) {
                        await triggerNotification(
                            role.user_id,
                            "Planned Absence Alert",
                            `${childStudent.name} is scheduled to be absent on ${targetDate}. Reason: ${absenceReason || "Not specified"}`,
                            { studentId: childStudent.id, date: targetDate }
                        );
                    }
                }
            } else {
                // Mock notification to parent device so they see the push alert
                await triggerNotification(
                    user?.id || "mock-parent-id",
                    "Planned Absence Confirmed",
                    `Absence request registered for ${childStudent.name} on ${targetDate}.`,
                    { studentId: childStudent.id, date: targetDate }
                );
            }

            Alert.alert("Absence Planned", `Success! Absence logged for ${childStudent.name} on ${targetDate}.`);
            setShowAbsenceModal(false);
            setAbsenceReason("");
            setCustomDate("");
            
            // Reload attendance records for currently viewed child if they match
            if (selectedChildId === absenceChildId) {
                await loadAttendance(selectedChildId);
            }
        } catch (e: any) {
            Alert.alert("Submission Error", e.message || "Failed to submit absence.");
        } finally {
            setSubmittingAbsence(false);
        }
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
                <View>
                    <Text style={styles.sectionLabel}>ATTENDANCE LOG</Text>
                    <Text style={styles.title}>History</Text>
                </View>
                <TouchableOpacity 
                    style={styles.planAbsenceBtn} 
                    onPress={() => {
                        if (myChildren.length > 0) {
                            setAbsenceChildId(myChildren[0].id);
                        }
                        setShowAbsenceModal(true);
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="calendar-outline" size={16} color="#0A0A0F" />
                    <Text style={styles.planAbsenceBtnText}>PLAN ABSENCE</Text>
                </TouchableOpacity>
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
                            <Text style={styles.emptySub}>Attendance records will appear here once marked by the driver or pre-logged.</Text>
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
                                        {record.notes && <Text style={styles.recordNotes}>{record.notes}</Text>}
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

            {/* Plan Absence Bottom Sheet Modal */}
            <Modal visible={showAbsenceModal} transparent animationType="slide" onRequestClose={() => setShowAbsenceModal(false)}>
                <View style={modal.overlay}>
                    <View style={modal.sheet}>
                        <View style={modal.handle} />
                        <Text style={modal.title}>Plan Absence in Advance</Text>
                        <Text style={modal.sub}>Log advance absence to notify the bus driver and admin.</Text>

                        {/* Child selector in Form (if multiple children exist) */}
                        {myChildren.length > 1 && (
                            <>
                                <Text style={modal.label}>SELECT CHILD</Text>
                                <View style={modal.childChipsRow}>
                                    {myChildren.map(c => {
                                        const active = absenceChildId === c.id;
                                        return (
                                            <TouchableOpacity 
                                                key={c.id} 
                                                style={[modal.childChipBtn, active && modal.childChipBtnActive]}
                                                onPress={() => setAbsenceChildId(c.id)}
                                            >
                                                <Text style={[modal.childChipText, active && modal.childChipTextActive]}>{c.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Date selection chips */}
                        <Text style={modal.label}>SELECT DATE</Text>
                        <View style={modal.dateChips}>
                            <TouchableOpacity 
                                style={[modal.dateChip, absenceDateType === "tomorrow" && modal.dateChipActive]} 
                                onPress={() => setAbsenceDateType("tomorrow")}
                            >
                                <Text style={[modal.dateChipTitle, absenceDateType === "tomorrow" && modal.dateChipTitleActive]}>Tomorrow</Text>
                                <Text style={[modal.dateChipDate, absenceDateType === "tomorrow" && modal.dateChipDateActive]}>{formattedTomorrow}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[modal.dateChip, absenceDateType === "day_after" && modal.dateChipActive]} 
                                onPress={() => setAbsenceDateType("day_after")}
                            >
                                <Text style={[modal.dateChipTitle, absenceDateType === "day_after" && modal.dateChipTitleActive]}>Day After</Text>
                                <Text style={[modal.dateChipDate, absenceDateType === "day_after" && modal.dateChipDateActive]}>{formattedDayAfter}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[modal.dateChip, absenceDateType === "custom" && modal.dateChipActive]} 
                                onPress={() => {
                                    setAbsenceDateType("custom");
                                    // pre-fill custom date field with YYYY-MM-DD of tomorrow if empty
                                    if (!customDate) setCustomDate(tomorrowStr);
                                }}
                            >
                                <Text style={[modal.dateChipTitle, absenceDateType === "custom" && modal.dateChipTitleActive]}>Custom Date</Text>
                                <Text style={[modal.dateChipDate, absenceDateType === "custom" && modal.dateChipDateActive]}>Pick YYYY-MM-DD</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Custom Date Input (conditional) */}
                        {absenceDateType === "custom" && (
                            <View style={[modal.inputWrap, { marginTop: 8 }]}>
                                <TextInput
                                    style={modal.input}
                                    value={customDate}
                                    onChangeText={setCustomDate}
                                    placeholder="YYYY-MM-DD (e.g. 2026-06-15)"
                                    placeholderTextColor="#444"
                                />
                            </View>
                        )}

                        {/* Reason field */}
                        <Text style={modal.label}>REASON FOR ABSENCE</Text>
                        <View style={modal.inputWrap}>
                            <TextInput
                                style={[modal.input, { height: 60, paddingVertical: 8 }]}
                                value={absenceReason}
                                onChangeText={setAbsenceReason}
                                placeholder="e.g. Doctor's appointment, family trip"
                                placeholderTextColor="#444"
                                multiline
                            />
                        </View>

                        {/* Actions */}
                        <TouchableOpacity onPress={handleSubmitAbsence} disabled={submittingAbsence} activeOpacity={0.88} style={{ marginTop: 24 }}>
                            <LinearGradient
                                colors={submittingAbsence ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                                style={modal.recordBtn}
                            >
                                {submittingAbsence ? <ActivityIndicator color="#0A0A0F" /> : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#0A0A0F" />
                                        <Text style={modal.recordBtnText}>SUBMIT ABSENCE</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={modal.cancelBtn} onPress={() => setShowAbsenceModal(false)}>
                            <Text style={modal.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    header: { 
        paddingHorizontal: 20, 
        paddingTop: 60, 
        paddingBottom: 16, 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center" 
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
    planAbsenceBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFB800",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    planAbsenceBtnText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#0A0A0F",
        letterSpacing: 0.5
    },

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
    recordNotes: { fontSize: 11, color: "#888", fontStyle: "italic", marginTop: 4 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: "800" },
});

const modal = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    sheet: { 
        backgroundColor: "#0C0C1A", 
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28, 
        padding: 24, 
        paddingBottom: 40, 
        borderWidth: 1, 
        borderColor: "rgba(255,255,255,0.08)" 
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 20 },
    title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", marginBottom: 4 },
    sub: { fontSize: 13, color: "#666", marginBottom: 20 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
    childChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 4 },
    childChipBtn: { 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 10, 
        backgroundColor: "rgba(255,255,255,0.05)", 
        borderWidth: 1, 
        borderColor: "rgba(255,255,255,0.1)" 
    },
    childChipBtnActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    childChipText: { fontSize: 12, color: "#888", fontWeight: "600" },
    childChipTextActive: { color: "#FFB800", fontWeight: "800" },

    dateChips: { flexDirection: "row", gap: 8 },
    dateChip: { 
        flex: 1, 
        padding: 10, 
        borderRadius: 12, 
        backgroundColor: "rgba(255,255,255,0.04)", 
        borderWidth: 1, 
        borderColor: "rgba(255,255,255,0.08)", 
        alignItems: "center" 
    },
    dateChipActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    dateChipTitle: { fontSize: 12, color: "#FFFFFF", fontWeight: "800" },
    dateChipTitleActive: { color: "#FFB800" },
    dateChipDate: { fontSize: 10, color: "#555", fontWeight: "600", marginTop: 2 },
    dateChipDateActive: { color: "#FFB800" },

    inputWrap: { 
        backgroundColor: "rgba(255,255,255,0.06)", 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: "rgba(255,255,255,0.08)", 
        paddingHorizontal: 14, 
        flexDirection: "row", 
        alignItems: "center" 
    },
    input: { flex: 1, height: 48, color: "#FFFFFF", fontSize: 14 },
    recordBtn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    recordBtnText: { fontSize: 14, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1 },
    cancelBtn: { marginTop: 12, alignItems: "center" },
    cancelBtnText: { fontSize: 14, color: "#555", fontWeight: "600" },
});
