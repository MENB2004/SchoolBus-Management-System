import React, { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";

export default function EditRouteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { routes, buses, updateRoute } = useDatabase();
    const route = routes.find(r => r.id === id);

    const [routeName, setRouteName] = useState(route?.route_name ?? "");
    const [selectedBusId, setSelectedBusId] = useState<string | null>(route?.bus_id ?? null);
    const [startPoint, setStartPoint] = useState(route?.start_point ?? "");
    const [endPoint, setEndPoint] = useState(route?.end_point ?? "");
    const [stops, setStops] = useState<string[]>(route?.stops ?? []);
    const [newStop, setNewStop] = useState("");
    const [newStopFee, setNewStopFee] = useState("1000");
    const [stopFees, setStopFees] = useState<number[]>(() => {
        if (route?.stop_fees && route.stop_fees.length === (route.stops?.length ?? 0)) {
            return route.stop_fees;
        }
        const defaultFee = route?.monthly_fee ?? 1000;
        return route?.stops?.map(() => defaultFee) ?? [];
    });
    const [monthlyFee, setMonthlyFee] = useState(String(route?.monthly_fee ?? ""));
    const [loading, setLoading] = useState(false);

    const handleAddStop = () => {
        if (newStop.trim()) {
            const feeVal = parseFloat(newStopFee) || 0;
            setStops(prev => [...prev, newStop.trim()]);
            setStopFees(prev => [...prev, feeVal]);
            setNewStop("");
        }
    };

    const handleRemoveStop = (index: number) => {
        setStops(prev => prev.filter((_, i) => i !== index));
        setStopFees(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!routeName.trim() || !startPoint.trim() || !endPoint.trim()) {
            Alert.alert("Missing Fields", "Route name, start point, and end point are required.");
            return;
        }
        const fee = parseFloat(monthlyFee);
        if (isNaN(fee) || fee < 0) { Alert.alert("Invalid Fee", "Please enter a valid fee."); return; }
        setLoading(true);
        try {
            await updateRoute(id!, { 
                route_name: routeName.trim(), 
                bus_id: selectedBusId, 
                start_point: startPoint.trim(), 
                end_point: endPoint.trim(), 
                stops, 
                stop_fees: stopFees,
                monthly_fee: fee 
            });
            router.back();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!route) return <View style={styles.container}><Text style={{ color: "#555", margin: 40 }}>Route not found.</Text></View>;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#2E5A9F" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>ROUTE MANAGEMENT</Text>
                        <Text style={styles.headerTitle}>Edit Route</Text>
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        {[
                            { label: "ROUTE NAME *", value: routeName, set: setRouteName, placeholder: "e.g. Route 3 – Koramangala", icon: "git-branch-outline" as const },
                            { label: "START POINT *", value: startPoint, set: setStartPoint, placeholder: "Start location", icon: "location-outline" as const },
                            { label: "END POINT *", value: endPoint, set: setEndPoint, placeholder: "End location", icon: "location-outline" as const },
                        ].map((f, i) => (
                            <View key={i} style={styles.field}>
                                <Text style={styles.label}>{f.label}</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name={f.icon} size={16} color="#555" style={styles.icon} />
                                    <TextInput style={styles.input} placeholder={f.placeholder} placeholderTextColor="#333" value={f.value} onChangeText={f.set} />
                                </View>
                            </View>
                        ))}

                        {/* Stops Section */}
                        <View style={styles.field}>
                            <Text style={styles.label}>BOARDING STOPS (CHRONOLOGICAL ORDER)</Text>
                            
                            {/* Input area */}
                            <View style={{ flexDirection: "column", gap: 10, marginBottom: 12 }}>
                                <View style={styles.addStopRow}>
                                    <View style={[styles.inputWrap, { flex: 2 }]}>
                                        <Ionicons name="location-outline" size={16} color="#555" style={styles.icon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Stop Name (e.g. Sector 3)"
                                            placeholderTextColor="#333"
                                            value={newStop}
                                            onChangeText={setNewStop}
                                        />
                                    </View>
                                    <View style={[styles.inputWrap, { flex: 1.2 }]}>
                                        <Text style={{ color: "#FFB800", fontWeight: "800", marginRight: 6 }}>₹</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Stop Fee"
                                            placeholderTextColor="#333"
                                            value={newStopFee}
                                            onChangeText={setNewStopFee}
                                            keyboardType="numeric"
                                            onSubmitEditing={handleAddStop}
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity style={[styles.addStopBtn, { width: "100%", justifyContent: "center" }]} onPress={handleAddStop}>
                                    <Ionicons name="add-circle" size={18} color="#FFB800" />
                                    <Text style={styles.addStopBtnText}>ADD BOARDING STOP WITH FEE</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Stops Timeline/Sequence List */}
                            {stops.length > 0 ? (
                                <View style={styles.stopsList}>
                                    {stops.map((stop, index) => (
                                        <View key={index} style={styles.stopItem}>
                                            {/* Visual Connector Dot & Line */}
                                            <View style={styles.timelineIndicators}>
                                                <View style={[styles.timelineDot, { backgroundColor: index === 0 ? "#00E676" : index === stops.length - 1 ? "#FF1744" : "#2E5A9F" }]} />
                                                {index < stops.length - 1 && <View style={styles.timelineLine} />}
                                            </View>
                                            
                                            <Text style={styles.stopText}>
                                                {index + 1}. {stop} <Text style={{ color: "#FFB800", fontWeight: "700" }}>(₹{stopFees[index] ?? 0})</Text>
                                            </Text>
                                            
                                            <TouchableOpacity onPress={() => handleRemoveStop(index)} style={styles.removeStopBtn}>
                                                <Ionicons name="trash-outline" size={16} color="#FF1744" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.noStopsText}>No stops added yet. Type a stop above and click ADD.</Text>
                            )}
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>MONTHLY FEE (₹)</Text>
                            <View style={styles.inputWrap}>
                                <Text style={[styles.icon, { color: "#FFB800", fontWeight: "800", fontSize: 15 }]}>₹</Text>
                                <TextInput style={styles.input} placeholder="500" placeholderTextColor="#333" value={monthlyFee} onChangeText={setMonthlyFee} keyboardType="numeric" />
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>ASSIGN BUS</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.busChips}>
                                    <TouchableOpacity style={[styles.busChip, !selectedBusId && styles.busChipActive]} onPress={() => setSelectedBusId(null)}>
                                        <Text style={[styles.busChipText, !selectedBusId && styles.busChipTextActive]}>None</Text>
                                    </TouchableOpacity>
                                    {buses.map(b => (
                                        <TouchableOpacity key={b.id} style={[styles.busChip, selectedBusId === b.id && styles.busChipActive]} onPress={() => setSelectedBusId(b.id)}>
                                            <Ionicons name="bus-outline" size={12} color={selectedBusId === b.id ? "#FFB800" : "#555"} />
                                            <Text style={[styles.busChipText, selectedBusId === b.id && styles.busChipTextActive]}>{b.bus_number}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.88}>
                        <LinearGradient colors={loading ? ["#333", "#222"] : ["#1E3A5F", "#2E5A9F"]} style={styles.saveBtn}>
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
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(46,90,159,0.15)", alignItems: "center", justifyContent: "center" },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#2E5A9F", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
    form: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 20 },
    field: { marginBottom: 18 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14 },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 48, color: "#FFFFFF", fontSize: 15 },
    addStopRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 },
    addStopBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,184,0,0.15)", paddingHorizontal: 16, height: 48, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,184,0,0.3)" },
    addStopBtnText: { color: "#FFB800", fontWeight: "900", fontSize: 13, letterSpacing: 1 },
    stopsList: { marginTop: 8, backgroundColor: "rgba(255,255,255,0.02)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
    stopItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    timelineIndicators: { width: 14, alignItems: "center", justifyContent: "center" },
    timelineDot: { width: 10, height: 10, borderRadius: 5, zIndex: 2 },
    timelineLine: { position: "absolute", width: 2, height: 32, backgroundColor: "rgba(255,255,255,0.1)", top: 10, zIndex: 1 },
    stopText: { flex: 1, color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
    removeStopBtn: { padding: 6 },
    noStopsText: { fontSize: 12, color: "#444", fontStyle: "italic", marginTop: 4 },
    busChips: { flexDirection: "row", gap: 8 },
    busChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    busChipActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    busChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    busChipTextActive: { color: "#FFB800" },
    saveBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    saveBtnText: { fontSize: 15, fontWeight: "900", letterSpacing: 2 },
});
