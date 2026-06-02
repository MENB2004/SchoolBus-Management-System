import React, { useState, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Animated, Platform, RefreshControl, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";
import { Bus } from "@/src/data/mockData";

function BusCard({ bus, routeCount, studentCount }: { bus: Bus; routeCount: number; studentCount: number }) {
    const isActive = bus.status === "active";
    return (
        <TouchableOpacity
            style={styles.card}
            onPressIn={blurActiveElement}
            onPress={() => runAfterBlur(() => router.push({ pathname: "/bus-detail", params: { id: bus.id } }))}
            activeOpacity={0.85}
            {...webNonFocusableProps}
        >
            <View style={styles.cardHeader}>
                <LinearGradient
                    colors={isActive ? ["#FFB800", "#FF8C00"] : ["#444", "#333"]}
                    style={styles.busIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="bus" size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.busNumber}>{bus.bus_number}</Text>
                    <Text style={styles.driverName}>{bus.driver?.name ?? "No driver"}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isActive ? "rgba(0,230,118,0.15)" : "rgba(255,23,68,0.15)" }]}>
                    <View style={[styles.statusDot, { backgroundColor: isActive ? "#00E676" : "#FF1744" }]} />
                    <Text style={[styles.statusText, { color: isActive ? "#00E676" : "#FF1744" }]}>
                        {isActive ? "Active" : "Inactive"}
                    </Text>
                </View>
            </View>

            <View style={styles.cardStats}>
                <View style={styles.cardStat}>
                    <Ionicons name="map-outline" size={14} color="#FFB800" />
                    <Text style={styles.cardStatText}>{routeCount} route{routeCount !== 1 ? "s" : ""}</Text>
                </View>
                <View style={styles.cardStat}>
                    <Ionicons name="people-outline" size={14} color="#2E5A9F" />
                    <Text style={styles.cardStatText}>{studentCount} student{studentCount !== 1 ? "s" : ""}</Text>
                </View>
                <View style={styles.cardStat}>
                    <Ionicons name="people-circle-outline" size={14} color="#888" />
                    <Text style={styles.cardStatText}>Cap: {bus.capacity}</Text>
                </View>
            </View>

            {bus.driver?.phone && (
                <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={12} color="#555" />
                    <Text style={styles.phoneText}>{bus.driver.phone}</Text>
                </View>
            )}

            <Ionicons name="chevron-forward" size={16} color="#444" style={styles.chevron} />
        </TouchableOpacity>
    );
}

export default function BusesScreen() {
    const { buses, routes, students, isLoading, refreshData } = useDatabase();
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filtered = useMemo(() => {
        let list = buses;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(b =>
                b.bus_number.toLowerCase().includes(q) ||
                b.driver?.name?.toLowerCase().includes(q)
            );
        }
        if (filterStatus !== "all") {
            list = list.filter(b => b.status === filterStatus);
        }
        return list;
    }, [buses, search, filterStatus]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>FLEET MANAGEMENT</Text>
                    <Text style={styles.title}>Buses</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => router.push("/add-bus")}
                    {...webNonFocusableProps}
                >
                    <LinearGradient colors={["#FFB800", "#FF8C00"]} style={styles.addBtnInner}>
                        <Ionicons name="add" size={22} color="#0A0A0F" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color="#555" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by bus number or driver..."
                    placeholderTextColor="#444"
                    value={search}
                    onChangeText={setSearch}
                />
                {!!search && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons name="close-circle" size={16} color="#555" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Chips */}
            <View style={styles.chips}>
                {(["all", "active", "inactive"] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.chip, filterStatus === f && styles.chipActive]}
                        onPress={() => setFilterStatus(f)}
                    >
                        <Text style={[styles.chipText, filterStatus === f && styles.chipTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.chipSpacer} />
                <Text style={styles.countText}>{filtered.length} bus{filtered.length !== 1 ? "es" : ""}</Text>
            </View>

            {/* List */}
            {isLoading && !isRefreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color="#FFB800" size="large" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FFB800" colors={["#FFB800"]} />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="bus-outline" size={56} color="#222" />
                            <Text style={styles.emptyTitle}>No buses found</Text>
                            <Text style={styles.emptySub}>Add your first bus to get started</Text>
                        </View>
                    ) : (
                        filtered.map(bus => {
                            const routeCount = routes.filter(r => r.bus_id === bus.id).length;
                            const studentCount = students.filter(s => s.bus_id === bus.id).length;
                            return (
                                <BusCard
                                    key={bus.id}
                                    bus={bus}
                                    routeCount={routeCount}
                                    studentCount={studentCount}
                                />
                            );
                        })
                    )}
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 4 },
    title: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
    addBtn: { marginBottom: 4 },
    addBtnInner: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },

    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        paddingHorizontal: 14,
        marginHorizontal: 20,
        marginBottom: 12,
        height: 48,
    },
    searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },

    chips: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginBottom: 16 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    chipActive: {
        backgroundColor: "rgba(255,184,0,0.15)",
        borderColor: "rgba(255,184,0,0.4)",
    },
    chipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    chipTextActive: { color: "#FFB800" },
    chipSpacer: { flex: 1 },
    countText: { fontSize: 12, color: "#555", fontWeight: "600" },

    list: { paddingHorizontal: 20, paddingTop: 4 },

    card: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    busIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    busNumber: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
    driverName: { fontSize: 13, color: "#888", marginTop: 2 },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: "700" },

    cardStats: { flexDirection: "row", gap: 16, marginBottom: 10 },
    cardStat: { flexDirection: "row", alignItems: "center", gap: 5 },
    cardStatText: { fontSize: 12, color: "#888", fontWeight: "600" },

    phoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    phoneText: { fontSize: 12, color: "#555" },

    chevron: { position: "absolute", right: 16, top: "50%" },

    loader: { flex: 1, alignItems: "center", justifyContent: "center" },

    empty: { alignItems: "center", paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333", marginTop: 16 },
    emptySub: { fontSize: 13, color: "#444", marginTop: 6 },
});
