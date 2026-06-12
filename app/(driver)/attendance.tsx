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

type TempAttendance = {
    [studentId: string]: "boarded" | "dropped" | "absent";
};

export default function DriverAttendanceScreen() {
    const { user } = useAuth();
    const { buses, students, drivers, markAttendance, getAttendanceByDate } = useDatabase();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [attendance, setAttendance] = useState<TempAttendance>({});
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

    // 2. Load Existing Attendance for Today
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

    const handleMark = (studentId: string, status: "boarded" | "dropped" | "absent") => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
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
                    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                        {myStudents.length === 0 ? (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="people-outline" size={48} color="#333" />
                                <Text style={styles.emptyTitle}>No Students Assigned</Text>
                                <Text style={styles.emptySub}>There are no active students assigned to Bus {myBus.bus_number}.</Text>
                            </View>
                        ) : (
                            myStudents.map(s => {
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
                        <View style={{ height: 100 }} />
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
        paddingBottom: 20,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignItems: "center", justifyContent: "center",
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },

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
