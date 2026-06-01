import React, { useState, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, RefreshControl, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";
import { Route } from "@/src/data/mockData";

function RouteCard({ route, studentCount }: { route: Route; studentCount: number }) {
    const fee = route.monthly_fee ?? 0;
    return (
        <TouchableOpacity
            style={styles.card}
            onPressIn={blurActiveElement}
            onPress={() => runAfterBlur(() => router.push({ pathname: "/route-detail", params: { id: route.id } }))}
            activeOpacity={0.85}
            {...webNonFocusableProps}
        >
            {/* Top accent bar */}
            <LinearGradient
                colors={["#1E3A5F", "#2E5A9F"]}
                style={styles.cardAccent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            />

            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={styles.routeIconWrap}>
                        <Ionicons name="navigate" size={18} color="#2E5A9F" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.routeName}>{route.route_name}</Text>
                        {route.bus && (
                            <View style={styles.busTag}>
                                <Ionicons name="bus-outline" size={11} color="#FFB800" />
                                <Text style={styles.busTagText}>{route.bus.bus_number}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.feeBadge}>
                        <Text style={styles.feeLabel}>FEE</Text>
                        <Text style={styles.feeValue}>₹{fee.toLocaleString("en-IN")}</Text>
                    </View>
                </View>

                {/* Route path */}
                <View style={styles.routePath}>
                    <View style={styles.routeEndpoint}>
                        <View style={[styles.endpointDot, { backgroundColor: "#00E676" }]} />
                        <Text style={styles.endpointText}>{route.start_point}</Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeEndpoint}>
                        <View style={[styles.endpointDot, { backgroundColor: "#FF1744" }]} />
                        <Text style={styles.endpointText}>{route.end_point}</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Ionicons name="location-outline" size={13} color="#555" />
                        <Text style={styles.statText}>{(route.stops ?? []).length} stops</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="people-outline" size={13} color="#555" />
                        <Text style={styles.statText}>{studentCount} student{studentCount !== 1 ? "s" : ""}</Text>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#333" style={styles.chevron} />
        </TouchableOpacity>
    );
}

export default function RoutesScreen() {
    const { routes, students, isLoading, refreshData } = useDatabase();
    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return routes;
        const q = search.toLowerCase();
        return routes.filter(r =>
            r.route_name.toLowerCase().includes(q) ||
            r.start_point.toLowerCase().includes(q) ||
            r.end_point.toLowerCase().includes(q)
        );
    }, [routes, search]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>ROUTE MANAGEMENT</Text>
                    <Text style={styles.title}>Routes</Text>
                </View>
                <TouchableOpacity
                    style={styles.addBtnInner}
                    onPress={() => router.push("/add-route")}
                    {...webNonFocusableProps}
                >
                    <LinearGradient colors={["#1E3A5F", "#2E5A9F"]} style={styles.addBtnGrad}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color="#555" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search routes, stops..."
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

            <View style={styles.countRow}>
                <Text style={styles.countText}>{filtered.length} route{filtered.length !== 1 ? "s" : ""}</Text>
            </View>

            {isLoading && !isRefreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color="#2E5A9F" size="large" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2E5A9F" colors={["#2E5A9F"]} />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="map-outline" size={56} color="#222" />
                            <Text style={styles.emptyTitle}>No routes found</Text>
                            <Text style={styles.emptySub}>Add your first route to get started</Text>
                        </View>
                    ) : (
                        filtered.map(route => {
                            const studentCount = students.filter(s => s.route_id === route.id).length;
                            return <RouteCard key={route.id} route={route} studentCount={studentCount} />;
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
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#2E5A9F", letterSpacing: 2, marginBottom: 4 },
    title: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
    addBtnInner: { marginBottom: 4 },
    addBtnGrad: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
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
    countRow: { paddingHorizontal: 20, marginBottom: 12 },
    countText: { fontSize: 12, color: "#555", fontWeight: "600" },
    list: { paddingHorizontal: 20, paddingTop: 4 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },

    card: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        overflow: "hidden",
    },
    cardAccent: { height: 4 },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
    routeIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(46,90,159,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    routeName: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 },
    busTag: { flexDirection: "row", alignItems: "center", gap: 4 },
    busTagText: { fontSize: 11, color: "#FFB800", fontWeight: "700" },
    feeBadge: { alignItems: "flex-end" },
    feeLabel: { fontSize: 9, fontWeight: "800", color: "#555", letterSpacing: 1 },
    feeValue: { fontSize: 16, fontWeight: "900", color: "#FFB800" },

    routePath: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
    routeEndpoint: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
    endpointDot: { width: 8, height: 8, borderRadius: 4 },
    endpointText: { fontSize: 12, color: "#AAA", fontWeight: "600", flex: 1 },
    routeLine: { width: 20, height: 1, backgroundColor: "#333" },

    statsRow: { flexDirection: "row", gap: 16 },
    stat: { flexDirection: "row", alignItems: "center", gap: 5 },
    statText: { fontSize: 12, color: "#666", fontWeight: "600" },

    chevron: { position: "absolute", right: 16, bottom: 28 },

    empty: { alignItems: "center", paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333", marginTop: 16 },
    emptySub: { fontSize: 13, color: "#444", marginTop: 6 },
});
