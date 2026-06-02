import React, { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";

export default function EditBusScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { buses, drivers, updateBus } = useDatabase();
    const bus = buses.find(b => b.id === id);

    const [busNumber, setBusNumber] = useState(bus?.bus_number ?? "");
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(bus?.driver_id ?? null);
    const [capacity, setCapacity] = useState(String(bus?.capacity ?? 40));
    const [status, setStatus] = useState<"active" | "inactive">(bus?.status as any ?? "active");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!busNumber.trim()) {
            Alert.alert("Missing Fields", "Bus number is required.");
            return;
        }
        const cap = parseInt(capacity, 10);
        if (isNaN(cap) || cap < 1) { Alert.alert("Invalid Capacity", "Please enter a valid capacity."); return; }
        setLoading(true);
        try {
            await updateBus(id!, {
                bus_number: busNumber.trim().toUpperCase(),
                driver_id: selectedDriverId,
                capacity: cap,
                status,
            });
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!bus) return <View style={styles.container}><Text style={{ color: "#555", margin: 40 }}>Bus not found.</Text></View>;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#FFB800" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>FLEET MANAGEMENT</Text>
                        <Text style={styles.headerTitle}>Edit Bus</Text>
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        {/* Bus Number */}
                        <View style={styles.field}>
                            <Text style={styles.label}>BUS NUMBER *</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="id-card-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="KA01 AB 1234"
                                    placeholderTextColor="#333"
                                    value={busNumber}
                                    onChangeText={setBusNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        {/* Driver Selection */}
                        <View style={styles.field}>
                            <Text style={styles.label}>ASSIGN DRIVER</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                                <TouchableOpacity
                                    style={[styles.driverChip, selectedDriverId === null && styles.driverChipActive]}
                                    onPress={() => setSelectedDriverId(null)}
                                >
                                    <Ionicons name="close-circle-outline" size={14} color={selectedDriverId === null ? "#FFB800" : "#555"} />
                                    <Text style={[styles.driverChipText, selectedDriverId === null && styles.driverChipTextActive]}>None</Text>
                                </TouchableOpacity>
                                {drivers.map(d => (
                                    <TouchableOpacity
                                        key={d.id}
                                        style={[styles.driverChip, selectedDriverId === d.id && styles.driverChipActive]}
                                        onPress={() => setSelectedDriverId(d.id)}
                                    >
                                        <Ionicons name="person" size={14} color={selectedDriverId === d.id ? "#FFB800" : "#555"} />
                                        <Text style={[styles.driverChipText, selectedDriverId === d.id && styles.driverChipTextActive]}>
                                            {d.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Capacity */}
                        <View style={styles.field}>
                            <Text style={styles.label}>CAPACITY</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="people-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="40"
                                    placeholderTextColor="#333"
                                    value={capacity}
                                    onChangeText={setCapacity}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Status */}
                        <View style={styles.field}>
                            <Text style={styles.label}>STATUS</Text>
                            <View style={styles.statusRow}>
                                {(["active", "inactive"] as const).map(s => (
                                    <TouchableOpacity key={s} style={[styles.statusOption, status === s && styles.statusOptionActive]} onPress={() => setStatus(s)}>
                                        <View style={[styles.statusDot, { backgroundColor: s === "active" ? "#00E676" : "#FF1744" }]} />
                                        <Text style={[styles.statusOptionText, status === s && styles.statusOptionTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.88}>
                        <LinearGradient colors={loading ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]} style={styles.saveBtn}>
                            {loading ? <ActivityIndicator color="#0A0A0F" /> : <><Ionicons name="checkmark-circle" size={20} color="#0A0A0F" /><Text style={styles.saveBtnText}>SAVE CHANGES</Text></>}
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
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,184,0,0.1)", alignItems: "center", justifyContent: "center" },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
    form: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 20 },
    field: { marginBottom: 18 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14 },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 48, color: "#FFFFFF", fontSize: 15 },
    driverChip: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginHorizontal: 4,
    },
    driverChipActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    driverChipText: { fontSize: 13, fontWeight: "700", color: "#666" },
    driverChipTextActive: { color: "#FFB800" },
    statusRow: { flexDirection: "row", gap: 12 },
    statusOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    statusOptionActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusOptionText: { fontSize: 13, fontWeight: "700", color: "#666" },
    statusOptionTextActive: { color: "#FFB800" },
    saveBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    saveBtnText: { fontSize: 15, fontWeight: "900", color: "#0A0A0F", letterSpacing: 2 },
});
