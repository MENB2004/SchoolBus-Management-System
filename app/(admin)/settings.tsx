import React, { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Alert, ActivityIndicator, Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";

function SettingRow({
    icon,
    title,
    subtitle,
    onPress,
    accent = "#FFB800",
    rightElement,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    subtitle?: string;
    onPress?: () => void;
    accent?: string;
    rightElement?: React.ReactNode;
}) {
    return (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            {...webNonFocusableProps}
        >
            <View style={[styles.settingIcon, { backgroundColor: accent + "22" }]}>
                <Ionicons name={icon} size={18} color={accent} />
            </View>
            <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {rightElement ?? (onPress && <Ionicons name="chevron-forward" size={16} color="#444" />)}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const { user, signOut, updateProfile } = useAuth();
    const { buses, routes, students, updateRoute } = useDatabase();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Stop Pricing Manager States
    const [isPricingExpanded, setIsPricingExpanded] = useState(false);
    const [pricingRouteId, setPricingRouteId] = useState<string | null>(null);
    const [pricingStop, setPricingStop] = useState<string | null>(null);
    const [singleFeeInput, setSingleFeeInput] = useState("");
    const [bulkFeeInput, setBulkFeeInput] = useState("");
    const [isPricingUpdating, setIsPricingUpdating] = useState(false);

    const handleUpdateSingleFee = async (isRelative: boolean) => {
        if (!pricingRouteId || !pricingStop) {
            Alert.alert("Error", "Please select a route and a boarding stop.");
            return;
        }
        const val = parseFloat(singleFeeInput);
        if (isNaN(val) || val <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid numeric amount.");
            return;
        }

        const selRoute = routes.find(r => r.id === pricingRouteId);
        if (!selRoute) return;

        const stopIndex = selRoute.stops.indexOf(pricingStop);
        if (stopIndex === -1) return;

        setIsPricingUpdating(true);
        try {
            const currentFees = selRoute.stop_fees && selRoute.stop_fees.length === selRoute.stops.length 
                ? [...selRoute.stop_fees] 
                : selRoute.stops.map(() => selRoute.monthly_fee);

            if (isRelative) {
                currentFees[stopIndex] = (currentFees[stopIndex] ?? 0) + val;
            } else {
                currentFees[stopIndex] = val;
            }

            await updateRoute(selRoute.id, { stop_fees: currentFees });
            Alert.alert("Success", `Stop fee updated successfully to ₹${currentFees[stopIndex]}!`);
            setSingleFeeInput("");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to update stop fee.");
        } finally {
            setIsPricingUpdating(false);
        }
    };

    const handleBulkIncreaseFees = async () => {
        if (!pricingRouteId) {
            Alert.alert("Error", "Please select a route.");
            return;
        }
        const val = parseFloat(bulkFeeInput);
        if (isNaN(val) || val <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid numeric increase amount.");
            return;
        }

        const selRoute = routes.find(r => r.id === pricingRouteId);
        if (!selRoute) return;

        setIsPricingUpdating(true);
        try {
            const currentFees = selRoute.stop_fees && selRoute.stop_fees.length === selRoute.stops.length 
                ? [...selRoute.stop_fees] 
                : selRoute.stops.map(() => selRoute.monthly_fee);

            const newFees = currentFees.map(f => (f ?? 0) + val);

            await updateRoute(selRoute.id, { stop_fees: newFees });
            Alert.alert("Success", `Increased fee of all ${selRoute.stops.length} stops on this route by ₹${val}!`);
            setBulkFeeInput("");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to increase fees.");
        } finally {
            setIsPricingUpdating(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        setIsLoggingOut(true);
                        await signOut();
                        setIsLoggingOut(false);
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
                    <Text style={styles.title}>Settings</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <LinearGradient
                        colors={["rgba(255,184,0,0.15)", "rgba(255,140,0,0.05)"]}
                        style={styles.profileGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileInitials}>
                                {user?.name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() ?? "A"}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.profileName}>{user?.name ?? "Admin"}</Text>
                            <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
                            <View style={styles.roleBadge}>
                                <Ionicons name="shield-checkmark" size={12} color="#FFB800" />
                                <Text style={styles.roleText}>Administrator</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Fleet Summary */}
                <Text style={styles.sectionTitle}>FLEET SUMMARY</Text>
                <View style={styles.section}>
                    <View style={styles.fleetRow}>
                        <View style={styles.fleetStat}>
                            <Text style={styles.fleetCount}>{buses.length}</Text>
                            <Text style={styles.fleetLabel}>Buses</Text>
                        </View>
                        <View style={styles.fleetDivider} />
                        <View style={styles.fleetStat}>
                            <Text style={styles.fleetCount}>{routes.length}</Text>
                            <Text style={styles.fleetLabel}>Routes</Text>
                        </View>
                        <View style={styles.fleetDivider} />
                        <View style={styles.fleetStat}>
                            <Text style={styles.fleetCount}>{students.length}</Text>
                            <Text style={styles.fleetLabel}>Students</Text>
                        </View>
                        <View style={styles.fleetDivider} />
                        <View style={styles.fleetStat}>
                            <Text style={styles.fleetCount}>{students.filter(s => s.is_active).length}</Text>
                            <Text style={styles.fleetLabel}>Active</Text>
                        </View>
                    </View>
                </View>

                {/* Route Stop Pricing Manager */}
                <Text style={styles.sectionTitle}>ROUTE STOP PRICING</Text>
                <View style={[styles.section, { padding: 16 }]}>
                    <TouchableOpacity
                        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                        onPress={() => setIsPricingExpanded(!isPricingExpanded)}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View style={[styles.settingIcon, { backgroundColor: "rgba(255,184,0,0.15)", marginRight: 0 }]}>
                                <Ionicons name="card-outline" size={18} color="#FFB800" />
                            </View>
                            <View>
                                <Text style={[styles.settingTitle, { fontSize: 15 }]}>Manage Stop Fees</Text>
                                <Text style={styles.settingSubtitle}>Configure per-stop monthly pricing</Text>
                            </View>
                        </View>
                        <Ionicons
                            name={isPricingExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#888"
                        />
                    </TouchableOpacity>

                    {isPricingExpanded && (
                        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", paddingTop: 16 }}>
                            {/* Step 1: Select Route */}
                            <Text style={styles.pricingSublabel}>SELECT ROUTE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    {routes.map(r => (
                                        <TouchableOpacity
                                            key={r.id}
                                            style={[
                                                styles.pricingChip,
                                                pricingRouteId === r.id && styles.pricingChipActive
                                            ]}
                                            onPress={() => {
                                                setPricingRouteId(r.id);
                                                setPricingStop(null);
                                            }}
                                        >
                                            <Ionicons name="navigate-outline" size={12} color={pricingRouteId === r.id ? "#FFB800" : "#666"} />
                                            <Text style={[styles.pricingChipText, pricingRouteId === r.id && styles.pricingChipTextActive]}>
                                                {r.route_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>

                            {pricingRouteId ? (
                                <>
                                    {/* Step 2: Select Stop */}
                                    <Text style={styles.pricingSublabel}>SELECT BOARDING STOP</Text>
                                    {(() => {
                                        const route = routes.find(r => r.id === pricingRouteId);
                                        const stops = route?.stops ?? [];
                                        if (stops.length === 0) {
                                            return <Text style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>No stops registered on this route.</Text>;
                                        }
                                        return (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                                                <View style={{ flexDirection: "row", gap: 8 }}>
                                                    {stops.map((stop, index) => {
                                                        const fee = route?.stop_fees?.[index] ?? route?.monthly_fee ?? 0;
                                                        return (
                                                            <TouchableOpacity
                                                                key={stop}
                                                                style={[
                                                                    styles.pricingChip,
                                                                    pricingStop === stop && styles.pricingChipActive
                                                                ]}
                                                                onPress={() => setPricingStop(stop)}
                                                            >
                                                                <Text style={[styles.pricingChipText, pricingStop === stop && styles.pricingChipTextActive]}>
                                                                    {stop} (₹{fee})
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        );
                                    })()}

                                    {/* Stop pricing editor action cards */}
                                    <View style={{ gap: 16 }}>
                                        {/* Action Card 1: Single Stop Editor */}
                                        {pricingStop && (
                                            <View style={styles.pricingActionCard}>
                                                <Text style={styles.actionCardTitle}>Edit Stop: {pricingStop}</Text>
                                                <Text style={styles.actionCardSubtitle}>
                                                    Current Fee: ₹{
                                                        (() => {
                                                            const route = routes.find(r => r.id === pricingRouteId);
                                                            const index = route?.stops.indexOf(pricingStop) ?? -1;
                                                            return index !== -1 ? (route?.stop_fees?.[index] ?? route?.monthly_fee) : 0;
                                                        })()
                                                    }
                                                </Text>

                                                <View style={styles.pricingInputWrap}>
                                                    <Text style={{ color: "#FFB800", fontWeight: "800", fontSize: 15, marginRight: 8 }}>₹</Text>
                                                    <TextInput
                                                        style={styles.pricingInput}
                                                        placeholder="Enter amount (e.g. 2000)"
                                                        placeholderTextColor="#333"
                                                        value={singleFeeInput}
                                                        onChangeText={setSingleFeeInput}
                                                        keyboardType="numeric"
                                                    />
                                                </View>

                                                <View style={{ flexDirection: "row", gap: 10 }}>
                                                    <TouchableOpacity
                                                        style={[styles.pricingBtn, { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.3)" }]}
                                                        onPress={() => handleUpdateSingleFee(false)}
                                                        disabled={isPricingUpdating}
                                                    >
                                                        <Text style={[styles.pricingBtnText, { color: "#00E676" }]}>SET NEW FEE</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.pricingBtn, { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.3)" }]}
                                                        onPress={() => handleUpdateSingleFee(true)}
                                                        disabled={isPricingUpdating}
                                                    >
                                                        <Text style={[styles.pricingBtnText, { color: "#FFB800" }]}>INCREASE FEE</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}

                                        {/* Action Card 2: Bulk Route Increaser */}
                                        <View style={styles.pricingActionCard}>
                                            <Text style={styles.actionCardTitle}>Bulk Route Increaser</Text>
                                            <Text style={styles.actionCardSubtitle}>Increase the fee of all stops along this route at once.</Text>

                                            <View style={styles.pricingInputWrap}>
                                                <Text style={{ color: "#FFB800", fontWeight: "800", fontSize: 15, marginRight: 8 }}>₹</Text>
                                                <TextInput
                                                    style={styles.pricingInput}
                                                    placeholder="Increase amount (e.g. 200)"
                                                    placeholderTextColor="#333"
                                                    value={bulkFeeInput}
                                                    onChangeText={setBulkFeeInput}
                                                    keyboardType="numeric"
                                                />
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.pricingBtn, { width: "100%", backgroundColor: "rgba(46,90,159,0.15)", borderColor: "rgba(46,90,159,0.3)" }]}
                                                onPress={handleBulkIncreaseFees}
                                                disabled={isPricingUpdating}
                                            >
                                                <Text style={[styles.pricingBtnText, { color: "#2E5A9F" }]}>INCREASE EVERY STOP FEE</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <Text style={{ color: "#555", fontSize: 13, fontStyle: "italic", textAlign: "center", marginVertical: 10 }}>Select a route above to start editing stop fees.</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                <View style={styles.section}>
                    <SettingRow
                        icon="bus-outline"
                        title="Manage Buses"
                        subtitle="View, add, and edit bus fleet"
                        onPress={() => router.push("/(admin)/buses")}
                        accent="#FFB800"
                    />
                    <SettingRow
                        icon="map-outline"
                        title="Manage Routes"
                        subtitle="Set up and configure routes"
                        onPress={() => router.push("/(admin)/routes")}
                        accent="#2E5A9F"
                    />
                    <SettingRow
                        icon="people-outline"
                        title="Manage Students"
                        subtitle="View all student enrollments"
                        onPress={() => router.push("/(admin)/students")}
                        accent="#00E676"
                    />
                    <SettingRow
                        icon="cash-outline"
                        title="Payment Records"
                        subtitle="View and record payments"
                        onPress={() => router.push("/payments")}
                        accent="#7C3AED"
                    />
                </View>

                {/* Add New */}
                <Text style={styles.sectionTitle}>ADD NEW</Text>
                <View style={styles.section}>
                    <SettingRow
                        icon="add-circle-outline"
                        title="Add New Bus"
                        subtitle="Register a new bus to the fleet"
                        onPress={() => router.push("/add-bus")}
                        accent="#FFB800"
                    />
                    <SettingRow
                        icon="git-branch-outline"
                        title="Add New Route"
                        subtitle="Create a new bus route"
                        onPress={() => router.push("/add-route")}
                        accent="#2E5A9F"
                    />
                    <SettingRow
                        icon="person-add-outline"
                        title="Add New Student"
                        subtitle="Enroll a new student"
                        onPress={() => router.push("/add-student")}
                        accent="#00E676"
                    />
                </View>

                {/* Account */}
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <View style={styles.section}>
                    <SettingRow
                        icon="information-circle-outline"
                        title="App Version"
                        subtitle="Bus Management System v1.0"
                        accent="#555"
                    />
                    <TouchableOpacity
                        style={[styles.settingRow, styles.logoutRow]}
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                        {...webNonFocusableProps}
                    >
                        <View style={[styles.settingIcon, { backgroundColor: "rgba(255,23,68,0.15)" }]}>
                            <Ionicons name="log-out-outline" size={18} color="#FF1744" />
                        </View>
                        <Text style={styles.logoutText}>Sign Out</Text>
                        {isLoggingOut && <ActivityIndicator color="#FF1744" size="small" />}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

    header: { marginBottom: 20 },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 4 },
    title: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },

    profileCard: {
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 28,
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.2)",
    },
    profileGrad: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: "rgba(255,184,0,0.2)",
        borderWidth: 2,
        borderColor: "#FFB800",
        alignItems: "center",
        justifyContent: "center",
    },
    profileInitials: { fontSize: 20, fontWeight: "900", color: "#FFB800" },
    profileName: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 },
    profileEmail: { fontSize: 13, color: "#888", marginBottom: 8 },
    roleBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
    roleText: { fontSize: 11, fontWeight: "700", color: "#FFB800" },

    sectionTitle: {
        fontSize: 10,
        fontWeight: "800",
        color: "#555",
        letterSpacing: 2,
        marginBottom: 10,
        marginTop: 8,
    },
    section: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
        marginBottom: 20,
    },

    fleetRow: {
        flexDirection: "row",
        padding: 20,
    },
    fleetStat: { flex: 1, alignItems: "center" },
    fleetCount: { fontSize: 22, fontWeight: "900", color: "#FFB800" },
    fleetLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginTop: 2 },
    fleetDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },

    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.04)",
    },
    settingIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14,
    },
    settingText: { flex: 1 },
    settingTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    settingSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },

    logoutRow: { borderBottomWidth: 0 },
    logoutText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#FF1744" },

    // Stop Pricing Styles
    pricingSublabel: { fontSize: 9, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    pricingChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    pricingChipActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    pricingChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    pricingChipTextActive: { color: "#FFB800" },
    pricingActionCard: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    actionCardTitle: { fontSize: 13, fontWeight: "800", color: "#FFFFFF", marginBottom: 2 },
    actionCardSubtitle: { fontSize: 11, color: "#666", marginBottom: 12 },
    pricingInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    pricingInput: { flex: 1, height: 42, color: "#FFFFFF", fontSize: 14 },
    pricingBtn: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    pricingBtnText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
});
