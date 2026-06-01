import React, { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";

export default function AddStudentScreen() {
    const { routeId } = useLocalSearchParams<{ routeId?: string }>();
    const { routes, buses, addStudent } = useDatabase();

    const [name, setName] = useState("");
    const [studentClass, setStudentClass] = useState("");
    const [section, setSection] = useState("");
    const [parentName, setParentName] = useState("");
    const [parentPhone, setParentPhone] = useState("");
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routeId ?? null);
    const [boardingStop, setBoardingStop] = useState("");
    const [monthlyFee, setMonthlyFee] = useState("");
    const [loading, setLoading] = useState(false);

    const selectedRoute = routes.find(r => r.id === selectedRouteId);
    const selectedBusId = selectedRoute?.bus_id ?? null;

    React.useEffect(() => {
        if (selectedRoute) {
            if (boardingStop) {
                const stopIndex = selectedRoute.stops.indexOf(boardingStop);
                if (stopIndex !== -1 && selectedRoute.stop_fees && selectedRoute.stop_fees[stopIndex] !== undefined) {
                    setMonthlyFee(String(selectedRoute.stop_fees[stopIndex]));
                    return;
                }
            }
            setMonthlyFee(String(selectedRoute.monthly_fee ?? ""));
        }
    }, [selectedRoute, boardingStop]);

    const handleSave = async () => {
        if (!name.trim() || !studentClass.trim() || !parentName.trim()) {
            Alert.alert("Missing Fields", "Student name, class, and parent name are required.");
            return;
        }
        const fee = parseFloat(monthlyFee);
        if (isNaN(fee) || fee < 0) {
            Alert.alert("Invalid Fee", "Please enter a valid monthly fee.");
            return;
        }
        setLoading(true);
        try {
            await addStudent({
                name: name.trim(),
                class: studentClass.trim(),
                section: section.trim() || null,
                parent_name: parentName.trim(),
                parent_phone: parentPhone.trim() || null,
                route_id: selectedRouteId,
                bus_id: selectedBusId,
                boarding_stop: boardingStop.trim() || null,
                monthly_fee: fee,
                fee_paid_until: null,
                avatar_url: null,
                is_active: true,
            });
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to add student.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#00E676" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>STUDENT ENROLLMENT</Text>
                        <Text style={styles.headerTitle}>Add New Student</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.iconRow}>
                        <LinearGradient colors={["#00C853", "#00E676"]} style={styles.bigIcon}>
                            <Ionicons name="person-add" size={36} color="#fff" />
                        </LinearGradient>
                    </View>

                    <View style={styles.card}>
                        {/* Name */}
                        <View style={styles.field}>
                            <Text style={styles.label}>STUDENT NAME *</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="person-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#333" value={name} onChangeText={setName} />
                            </View>
                        </View>

                        {/* Class & Section */}
                        <View style={styles.row}>
                            <View style={[styles.field, { flex: 2 }]}>
                                <Text style={styles.label}>CLASS *</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="school-outline" size={16} color="#555" style={styles.icon} />
                                    <TextInput style={styles.input} placeholder="Grade 5" placeholderTextColor="#333" value={studentClass} onChangeText={setStudentClass} />
                                </View>
                            </View>
                            <View style={[styles.field, { flex: 1 }]}>
                                <Text style={styles.label}>SECTION</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput style={styles.input} placeholder="A" placeholderTextColor="#333" value={section} onChangeText={setSection} autoCapitalize="characters" />
                                </View>
                            </View>
                        </View>

                        {/* Parent */}
                        <View style={styles.field}>
                            <Text style={styles.label}>PARENT / GUARDIAN NAME *</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="people-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput style={styles.input} placeholder="Parent full name" placeholderTextColor="#333" value={parentName} onChangeText={setParentName} />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>PARENT PHONE</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="call-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput style={styles.input} placeholder="+91 XXXXX XXXXX" placeholderTextColor="#333" value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" />
                            </View>
                        </View>

                        {/* Route */}
                        <View style={styles.field}>
                            <Text style={styles.label}>ASSIGN ROUTE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.chips}>
                                    <TouchableOpacity
                                        style={[styles.chip, !selectedRouteId && styles.chipActive]}
                                        onPress={() => setSelectedRouteId(null)}
                                    >
                                        <Text style={[styles.chipText, !selectedRouteId && styles.chipTextActive]}>None</Text>
                                    </TouchableOpacity>
                                    {routes.map(r => (
                                        <TouchableOpacity
                                            key={r.id}
                                            style={[styles.chip, selectedRouteId === r.id && styles.chipActive]}
                                            onPress={() => setSelectedRouteId(r.id)}
                                        >
                                            <Ionicons name="map-outline" size={11} color={selectedRouteId === r.id ? "#00E676" : "#555"} />
                                            <Text style={[styles.chipText, selectedRouteId === r.id && styles.chipTextActive]}>{r.route_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Boarding Stop */}
                        {selectedRoute && (
                            <View style={styles.field}>
                                <Text style={styles.label}>BOARDING STOP</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.chips}>
                                        {(selectedRoute.stops ?? []).map((stop, index) => {
                                            const feeVal = selectedRoute.stop_fees?.[index] ?? selectedRoute.monthly_fee;
                                            return (
                                                <TouchableOpacity
                                                    key={stop}
                                                    style={[styles.chip, boardingStop === stop && styles.chipActive]}
                                                    onPress={() => setBoardingStop(stop)}
                                                >
                                                    <Text style={[styles.chipText, boardingStop === stop && styles.chipTextActive]}>
                                                        {stop} (₹{feeVal})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* Monthly Fee */}
                        <View style={styles.field}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <Text style={styles.label}>MONTHLY FEE (₹)</Text>
                                <TouchableOpacity onPress={() => router.push("/(admin)/settings")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                    <Ionicons name="settings-outline" size={12} color="#00E676" />
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#00E676" }}>MANAGE STOP FEES</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputWrap}>
                                <Text style={[styles.icon, { color: "#FFB800", fontWeight: "800", fontSize: 15 }]}>₹</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={selectedRoute ? String(selectedRoute.monthly_fee) : "500"}
                                    placeholderTextColor="#333"
                                    value={monthlyFee}
                                    onChangeText={setMonthlyFee}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Assigned Bus Info */}
                        {selectedBusId && (
                            <View style={styles.busInfoBanner}>
                                <Ionicons name="bus" size={16} color="#FFB800" />
                                <Text style={styles.busInfoText}>
                                    Auto-assigned: {buses.find(b => b.id === selectedBusId)?.bus_number ?? "Bus"}
                                </Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.88}>
                        <LinearGradient
                            colors={loading ? ["#333", "#222"] : ["#00C853", "#00E676"]}
                            style={styles.saveBtn}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={[styles.saveBtnText, { color: "#fff" }]}>ENROLL STUDENT</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#00E676", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
    form: { paddingHorizontal: 20, paddingBottom: 40 },
    iconRow: { alignItems: "center", marginBottom: 24 },
    bigIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    card: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 20,
    },
    row: { flexDirection: "row", gap: 12 },
    field: { marginBottom: 18 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 12, borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 48, color: "#FFFFFF", fontSize: 15 },
    chips: { flexDirection: "row", gap: 8 },
    chip: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    chipActive: { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.4)" },
    chipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    chipTextActive: { color: "#00E676" },
    busInfoBanner: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "rgba(255,184,0,0.1)", borderRadius: 10, padding: 10,
        borderWidth: 1, borderColor: "rgba(255,184,0,0.2)",
    },
    busInfoText: { fontSize: 13, color: "#FFB800", fontWeight: "600" },
    saveBtn: {
        height: 56, borderRadius: 16, flexDirection: "row",
        alignItems: "center", justifyContent: "center", gap: 10,
    },
    saveBtnText: { fontSize: 15, fontWeight: "900", letterSpacing: 2 },
});
