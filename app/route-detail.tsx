import React, { useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Alert, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";
import { getFeeStatus, FEE_COLORS } from "@/src/data/mockData";

export default function RouteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { routes, students, deleteRoute, refreshData } = useDatabase();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const route = routes.find(r => r.id === id);
    const routeStudents = students.filter(s => s.route_id === id);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    }, [refreshData]);

    const handleDelete = () => {
        Alert.alert(
            "Delete Route",
            `Remove "${route?.route_name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteRoute(id!);
                            router.back();
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    },
                },
            ]
        );
    };

    if (!route) {
        return (
            <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: "#555" }}>Route not found.</Text>
            </View>
        );
    }

    const stops = route.stops ?? [];
    const paidCount = routeStudents.filter(s => getFeeStatus(s.days_remaining ?? -999) === "paid").length;
    const overdueCount = routeStudents.filter(s => getFeeStatus(s.days_remaining ?? -999) === "overdue").length;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2E5A9F" colors={["#2E5A9F"]} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#2E5A9F" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => router.push({ pathname: "/edit-route", params: { id: route.id } })}
                    >
                        <Ionicons name="create-outline" size={18} color="#2E5A9F" />
                    </TouchableOpacity>
                </View>

                {/* Hero */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={["rgba(30,58,95,0.4)", "rgba(46,90,159,0.1)"]}
                        style={styles.heroGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <LinearGradient colors={["#1E3A5F", "#2E5A9F"]} style={styles.routeIconBig}>
                            <Ionicons name="navigate" size={36} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.routeTitle}>{route.route_name}</Text>
                        {route.bus && (
                            <View style={styles.busBadge}>
                                <Ionicons name="bus-outline" size={13} color="#FFB800" />
                                <Text style={styles.busBadgeText}>{route.bus.bus_number}</Text>
                            </View>
                        )}
                        <View style={styles.heroStats}>
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatValue}>{routeStudents.length}</Text>
                                <Text style={styles.heroStatLabel}>Students</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatValue, { color: "#00E676" }]}>{paidCount}</Text>
                                <Text style={styles.heroStatLabel}>Paid</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatValue, { color: overdueCount > 0 ? "#FF1744" : "#666" }]}>{overdueCount}</Text>
                                <Text style={styles.heroStatLabel}>Overdue</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatValue, { color: "#FFB800" }]}>₹{route.monthly_fee}</Text>
                                <Text style={styles.heroStatLabel}>Monthly</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Route Path / Stops Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ROUTE PATH</Text>
                    <View style={styles.timelineCard}>
                        {/* Start */}
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                                <View style={[styles.timelineDot, { backgroundColor: "#00E676", width: 14, height: 14, borderRadius: 7 }]} />
                                {stops.length > 0 && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>START</Text>
                                <Text style={styles.timelineText}>{route.start_point}</Text>
                            </View>
                        </View>

                        {/* Stops */}
                        {stops.map((stop, idx) => (
                            <View key={idx} style={styles.timelineItem}>
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.timelineDot, { backgroundColor: "#2E5A9F" }]} />
                                    {idx < stops.length - 1 || true ? <View style={styles.timelineLine} /> : null}
                                </View>
                                <View style={styles.timelineContent}>
                                    <Text style={styles.timelineLabel}>STOP {idx + 1}</Text>
                                    <Text style={styles.timelineText}>{stop}</Text>
                                </View>
                                <View style={styles.studentCountBadge}>
                                    <Text style={styles.studentCountText}>
                                        {routeStudents.filter(s => s.boarding_stop === stop).length}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {/* End */}
                        <View style={[styles.timelineItem, { marginBottom: 0 }]}>
                            <View style={styles.timelineLeft}>
                                <View style={[styles.timelineDot, { backgroundColor: "#FF1744", width: 14, height: 14, borderRadius: 7 }]} />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>END</Text>
                                <Text style={styles.timelineText}>{route.end_point}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Students */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>STUDENTS ({routeStudents.length})</Text>
                        <TouchableOpacity onPress={() => router.push({ pathname: "/add-student", params: { routeId: id } })}>
                            <Text style={styles.addLink}>+ Enroll</Text>
                        </TouchableOpacity>
                    </View>
                    {routeStudents.length === 0 ? (
                        <Text style={styles.emptyText}>No students on this route yet.</Text>
                    ) : (
                        routeStudents.map(s => {
                            const daysLeft = s.days_remaining ?? -999;
                            const feeStatus = getFeeStatus(daysLeft);
                            const colors = FEE_COLORS[feeStatus];
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
                                        <Text style={styles.studentMeta}>
                                            {s.class}{s.section ? ` – ${s.section}` : ""}
                                            {s.boarding_stop ? ` • ${s.boarding_stop}` : ""}
                                        </Text>
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
                    <Text style={styles.deleteBtnText}>Delete Route</Text>
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
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(46,90,159,0.15)", alignItems: "center", justifyContent: "center" },
    editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(46,90,159,0.15)", alignItems: "center", justifyContent: "center" },

    heroCard: { borderRadius: 24, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: "rgba(46,90,159,0.3)" },
    heroGrad: { alignItems: "center", padding: 28, gap: 10 },
    routeIconBig: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    routeTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", textAlign: "center" },
    busBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,184,0,0.15)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    busBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFB800" },
    heroStats: { flexDirection: "row", width: "100%", marginTop: 12 },
    heroStat: { flex: 1, alignItems: "center" },
    heroStatValue: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
    heroStatLabel: { fontSize: 10, color: "#666", fontWeight: "600", marginTop: 2 },
    heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },

    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 2, marginBottom: 12 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    addLink: { fontSize: 13, fontWeight: "700", color: "#2E5A9F" },

    timelineCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
    timelineItem: { flexDirection: "row", marginBottom: 16 },
    timelineLeft: { alignItems: "center", marginRight: 14, width: 20 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2E5A9F" },
    timelineLine: { width: 2, flex: 1, backgroundColor: "rgba(46,90,159,0.3)", marginTop: 4, minHeight: 20 },
    timelineContent: { flex: 1, paddingTop: 2 },
    timelineLabel: { fontSize: 9, fontWeight: "800", color: "#555", letterSpacing: 1 },
    timelineText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
    studentCountBadge: { width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(46,90,159,0.3)", alignItems: "center", justifyContent: "center" },
    studentCountText: { fontSize: 11, fontWeight: "800", color: "#2E5A9F" },

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
