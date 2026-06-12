import React, { useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Alert, RefreshControl, Linking, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";
import { getFeeStatus, FEE_COLORS } from "@/src/data/mockData";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";

export default function BusDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { buses, routes, students, deleteBus, refreshData } = useDatabase();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const bus = buses.find(b => b.id === id);
    const busRoutes = routes.filter(r => r.bus_id === id);
    const busStudents = students.filter(s => s.bus_id === id);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    }, [refreshData]);

    const handleDelete = () => {
        Alert.alert(
            "Delete Bus",
            `Are you sure you want to remove ${bus?.bus_number}? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteBus(id!);
                            router.back();
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    },
                },
            ]
        );
    };

    const callDriver = () => {
        if (bus?.driver?.phone) {
            Linking.openURL(`tel:${bus.driver.phone}`);
        }
    };

    if (!bus) {
        return (
            <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: "#555" }}>Bus not found.</Text>
            </View>
        );
    }

    const isActive = bus.status === "active";

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FFB800" colors={["#FFB800"]} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#FFB800" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => router.push({ pathname: "/edit-bus", params: { id: bus.id } })}
                    >
                        <Ionicons name="create-outline" size={18} color="#FFB800" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={isActive ? ["rgba(255,184,0,0.2)", "rgba(255,140,0,0.05)"] : ["rgba(80,80,80,0.2)", "rgba(40,40,40,0.05)"]}
                        style={styles.heroGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <LinearGradient
                            colors={isActive ? ["#FFB800", "#FF8C00"] : ["#444", "#333"]}
                            style={styles.busIconBig}
                        >
                            <Ionicons name="bus" size={40} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.busNumber}>{bus.bus_number}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: isActive ? "rgba(0,230,118,0.2)" : "rgba(255,23,68,0.2)" }]}>
                            <View style={[styles.statusDot, { backgroundColor: isActive ? "#00E676" : "#FF1744" }]} />
                            <Text style={[styles.statusText, { color: isActive ? "#00E676" : "#FF1744" }]}>
                                {isActive ? "Active" : "Inactive"}
                            </Text>
                        </View>

                        <View style={styles.heroStats}>
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatValue}>{busRoutes.length}</Text>
                                <Text style={styles.heroStatLabel}>Routes</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatValue}>{busStudents.length}</Text>
                                <Text style={styles.heroStatLabel}>Students</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatValue}>{bus.capacity}</Text>
                                <Text style={styles.heroStatLabel}>Capacity</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Driver Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DRIVER INFORMATION</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIcon}>
                                <Ionicons name="person" size={16} color="#FFB800" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Driver Name</Text>
                                <Text style={styles.infoValue}>{bus.driver?.name ?? "Not Assigned"}</Text>
                            </View>
                        </View>
                        {bus.driver?.phone && (
                            <TouchableOpacity style={styles.infoRow} onPress={callDriver} activeOpacity={0.7}>
                                <View style={[styles.infoIcon, { backgroundColor: "rgba(0,230,118,0.15)" }]}>
                                    <Ionicons name="call" size={16} color="#00E676" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.infoLabel}>Phone</Text>
                                    <Text style={[styles.infoValue, { color: "#00E676" }]}>{bus.driver.phone}</Text>
                                </View>
                                <Ionicons name="call-outline" size={18} color="#00E676" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Routes on this bus */}
                {busRoutes.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ASSIGNED ROUTES</Text>
                        {busRoutes.map(route => (
                            <TouchableOpacity
                                key={route.id}
                                style={styles.routeCard}
                                onPress={() => router.push({ pathname: "/route-detail", params: { id: route.id } })}
                                activeOpacity={0.8}
                            >
                                <View style={styles.routeIconWrap}>
                                    <Ionicons name="navigate" size={16} color="#2E5A9F" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.routeName}>{route.route_name}</Text>
                                    <Text style={styles.routeSub}>{route.start_point} → {route.end_point}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={14} color="#444" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Students on this bus */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>STUDENTS ({busStudents.length})</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: "/add-student" })}>
                            <Text style={styles.addLink}>+ Add</Text>
                        </TouchableOpacity>
                    </View>
                    {busStudents.length === 0 ? (
                        <Text style={styles.emptyText}>No students on this bus yet.</Text>
                    ) : (
                        busStudents.map(s => {
                            const daysLeft = s.days_remaining ?? -999;
                            const status = getFeeStatus(daysLeft);
                            const colors = FEE_COLORS[status];
                            const initials = s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                            return (
                                <TouchableOpacity
                                    key={s.id}
                                    style={styles.studentRow}
                                    onPress={() => router.push({ pathname: "/student-detail", params: { id: s.id } })}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.studentAvatar, { backgroundColor: colors.bg, borderColor: colors.ring }]}>
                                        <Text style={[styles.studentInitials, { color: colors.ring }]}>{initials}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.studentName}>{s.name}</Text>
                                        <Text style={styles.studentMeta}>{s.class}{s.section ? ` – ${s.section}` : ""}</Text>
                                    </View>
                                    <View style={[styles.feeBadge, { backgroundColor: colors.bg }]}>
                                        <Text style={[styles.feeText, { color: colors.text }]}>{colors.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Delete */}
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={18} color="#FF1744" />
                    <Text style={styles.deleteBtnText}>Remove Bus from Fleet</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,184,0,0.1)", alignItems: "center", justifyContent: "center" },
    editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,184,0,0.1)", alignItems: "center", justifyContent: "center" },

    heroCard: { borderRadius: 24, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,184,0,0.15)" },
    heroGrad: { alignItems: "center", padding: 28, gap: 12 },
    busIconBig: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    busNumber: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: "700" },
    heroStats: { flexDirection: "row", width: "100%", marginTop: 8 },
    heroStat: { flex: 1, alignItems: "center" },
    heroStatValue: { fontSize: 22, fontWeight: "900", color: "#FFB800" },
    heroStatLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginTop: 2 },
    heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },

    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 2, marginBottom: 10 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    addLink: { fontSize: 13, fontWeight: "700", color: "#FFB800" },

    infoCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
    infoRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 14 },
    infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: "rgba(255,184,0,0.15)", alignItems: "center", justifyContent: "center" },
    infoLabel: { fontSize: 10, color: "#555", fontWeight: "700", letterSpacing: 1 },
    infoValue: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },

    routeCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 12 },
    routeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(46,90,159,0.2)", alignItems: "center", justifyContent: "center" },
    routeName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    routeSub: { fontSize: 11, color: "#666", marginTop: 2 },

    studentRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 12 },
    studentAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2 },
    studentInitials: { fontSize: 14, fontWeight: "900" },
    studentName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    studentMeta: { fontSize: 11, color: "#666", marginTop: 1 },
    feeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    feeText: { fontSize: 10, fontWeight: "700" },

    emptyText: { fontSize: 13, color: "#444", fontWeight: "600", paddingVertical: 12 },

    deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, backgroundColor: "rgba(255,23,68,0.1)", borderWidth: 1, borderColor: "rgba(255,23,68,0.2)", marginTop: 10 },
    deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#FF1744" },
});
