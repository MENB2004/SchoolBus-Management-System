import React, { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";

export default function EditStudentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { students, routes, updateStudent } = useDatabase();
    const student = students.find(s => s.id === id);

    const [name, setName] = useState(student?.name ?? "");
    const [studentClass, setStudentClass] = useState(student?.class ?? "");
    const [section, setSection] = useState(student?.section ?? "");
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(student?.route_id ?? null);
    const [boardingStop, setBoardingStop] = useState(student?.boarding_stop ?? "");
    const [monthlyFee, setMonthlyFee] = useState(String(student?.monthly_fee ?? ""));
    const [isActive, setIsActive] = useState(student?.is_active ?? true);
    const [loading, setLoading] = useState(false);

    const selectedRoute = routes.find(r => r.id === selectedRouteId);

    const handleSave = async () => {
        if (!name.trim() || !studentClass.trim()) {
            Alert.alert("Missing Fields", "Student name and class are required.");
            return;
        }
        const fee = parseFloat(monthlyFee);
        if (isNaN(fee) || fee < 0) { Alert.alert("Invalid Fee", "Enter a valid monthly fee."); return; }
        setLoading(true);
        try {
            await updateStudent(id!, {
                name: name.trim(), class: studentClass.trim(), section: section.trim() || null,
                route_id: selectedRouteId, bus_id: selectedRoute?.bus_id ?? null,
                boarding_stop: boardingStop.trim() || null, monthly_fee: fee, is_active: isActive,
            });
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!student) return <View style={styles.container}><Text style={{ color: "#555", margin: 40 }}>Student not found.</Text></View>;

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
                        <Text style={styles.headerLabel}>STUDENT MANAGEMENT</Text>
                        <Text style={styles.headerTitle}>Edit Student</Text>
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        {[
                            { label: "STUDENT NAME *", value: name, set: setName, placeholder: "Full name", icon: "person-outline" as const },
                            { label: "CLASS *", value: studentClass, set: setStudentClass, placeholder: "Grade 5", icon: "school-outline" as const },
                            { label: "SECTION", value: section, set: setSection, placeholder: "A", icon: "albums-outline" as const, autoCapitalize: "characters" as const },
                        ].map((f, i) => (
                            <View key={i} style={styles.field}>
                                <Text style={styles.label}>{f.label}</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name={f.icon} size={16} color="#555" style={styles.icon} />
                                    <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#333" value={f.value} onChangeText={f.set} autoCapitalize={f.autoCapitalize} />
                                </View>
                            </View>
                        ))}

                        <View style={styles.field}>
                            <Text style={styles.label}>ROUTE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.chips}>
                                    <TouchableOpacity style={[styles.chip, !selectedRouteId && styles.chipActive]} onPress={() => { setSelectedRouteId(null); setBoardingStop(""); }}>
                                        <Text style={[styles.chipText, !selectedRouteId && styles.chipTextActive]}>None</Text>
                                    </TouchableOpacity>
                                    {routes.map(r => (
                                        <TouchableOpacity key={r.id} style={[styles.chip, selectedRouteId === r.id && styles.chipActive]} onPress={() => { setSelectedRouteId(r.id); setBoardingStop(""); setMonthlyFee(String(r.monthly_fee ?? "")); }}>
                                            <Text style={[styles.chipText, selectedRouteId === r.id && styles.chipTextActive]}>{r.route_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {selectedRoute && (selectedRoute.stops ?? []).length > 0 && (
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
                                                    onPress={() => {
                                                        setBoardingStop(stop);
                                                        const stopIndex = selectedRoute.stops.indexOf(stop);
                                                        if (stopIndex !== -1 && selectedRoute.stop_fees && selectedRoute.stop_fees[stopIndex] !== undefined) {
                                                            setMonthlyFee(String(selectedRoute.stop_fees[stopIndex]));
                                                        } else {
                                                            setMonthlyFee(String(selectedRoute.monthly_fee ?? ""));
                                                        }
                                                    }}
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
                                <TextInput style={styles.input} placeholder="500" placeholderTextColor="#333" value={monthlyFee} onChangeText={setMonthlyFee} keyboardType="numeric" />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>ENROLLMENT STATUS</Text>
                            <View style={styles.statusRow}>
                                {([true, false] as const).map(s => (
                                    <TouchableOpacity key={String(s)} style={[styles.statusOption, isActive === s && styles.statusOptionActive]} onPress={() => setIsActive(s)}>
                                        <View style={[styles.statusDot, { backgroundColor: s ? "#00E676" : "#FF1744" }]} />
                                        <Text style={[styles.statusOptionText, isActive === s && styles.statusOptionTextActive]}>{s ? "Active" : "Inactive"}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.88}>
                        <LinearGradient colors={loading ? ["#333", "#222"] : ["#00C853", "#00E676"]} style={styles.saveBtn}>
                            {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={[styles.saveBtnText, { color: "#fff" }]}>SAVE CHANGES</Text></>}
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
    header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,230,118,0.1)", alignItems: "center", justifyContent: "center" },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#00E676", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
    form: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 20 },
    field: { marginBottom: 18 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14 },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 48, color: "#FFFFFF", fontSize: 15 },
    chips: { flexDirection: "row", gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    chipActive: { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.4)" },
    chipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    chipTextActive: { color: "#00E676" },
    statusRow: { flexDirection: "row", gap: 12 },
    statusOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    statusOptionActive: { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.4)" },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusOptionText: { fontSize: 13, fontWeight: "700", color: "#666" },
    statusOptionTextActive: { color: "#00E676" },
    saveBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    saveBtnText: { fontSize: 15, fontWeight: "900", letterSpacing: 2 },
});
