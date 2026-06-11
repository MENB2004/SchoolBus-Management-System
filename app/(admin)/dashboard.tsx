import React, { useRef, useMemo, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Animated,
    ActivityIndicator,
    Platform,
    Image,
    RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { router } from "expo-router";
import { getFeeStatus, FEE_COLORS } from "@/src/data/mockData";
import { useDatabase } from "@/src/context/DatabaseContext";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";
import { LineChart, PieChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");
const CARD_W = (width - 20 * 2 - 12) / 2;

// ─── Stat Card ────────────────────────────────────────────────────────────────

type StatCardProps = {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    value: string;
    sub: string;
    colors: readonly [string, string];
    trend?: "up" | "down" | "neutral";
    onPress?: () => void;
};

function StatCard({ icon, label, value, sub, colors, trend, onPress }: StatCardProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const press = () =>
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.95, duration: 80, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: Platform.OS !== "web" }),
        ]).start();

    return (
        <Animated.View style={[styles.statCard, { transform: [{ scale }] }]}>
            <TouchableOpacity
                onPressIn={blurActiveElement}
                onPress={() => { press(); if (onPress) runAfterBlur(onPress); }}
                activeOpacity={1}
                style={styles.statCardInner}
                {...webNonFocusableProps}
            >
                <LinearGradient
                    colors={colors}
                    style={styles.statIconWrap}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name={icon} size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
                <View style={styles.statSubRow}>
                    <Ionicons
                        name={
                            trend === "up"
                                ? "trending-up"
                                : trend === "down"
                                ? "trending-down"
                                : "remove"
                        }
                        size={12}
                        color={
                            trend === "up"
                                ? "#00E676"
                                : trend === "down"
                                ? "#FF1744"
                                : "#666"
                        }
                    />
                    <Text
                        style={[
                            styles.statSub,
                            trend === "up" && { color: "#00E676" },
                            trend === "down" && { color: "#FF1744" },
                        ]}
                    >
                        {sub}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

function ActionGridItem({
    icon,
    title,
    onPress,
    accent,
}: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    title: string;
    onPress: () => void;
    accent: string;
}) {
    return (
        <TouchableOpacity
            style={styles.gridItem}
            onPressIn={blurActiveElement}
            onPress={() => runAfterBlur(onPress)}
            activeOpacity={0.8}
            {...webNonFocusableProps}
        >
            <LinearGradient colors={[accent + "33", accent + "11"]} style={styles.gridItemInner}>
                <Ionicons name={icon} size={20} color={accent} />
                <Text style={styles.gridItemText}>{title}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const { user, signOut } = useAuth();
    const { buses, routes, students, refreshData, fetchRevenueStats } = useDatabase();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        ]).start();

        fetchRevenueStats().then(setRevenueData);
    }, [fetchRevenueStats]);

    // Compute live payment stats
    const paymentStats = useMemo(() => {
        let paid = 0, due = 0, overdue = 0, totalRevenue = 0, collectedRevenue = 0;
        students.forEach((s) => {
            const dr = s.days_remaining ?? -999;
            const st = getFeeStatus(dr);
            if (st === "paid") { paid++; collectedRevenue += s.monthly_fee || 500; }
            else if (st === "due") due++;
            else overdue++;
            totalRevenue += s.monthly_fee || 500;
        });
        return { paid, due, overdue, totalRevenue, collectedRevenue };
    }, [students]);

    const handleLogout = async () => {
        await signOut();
    };

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshData();
            const revStats = await fetchRevenueStats();
            setRevenueData(revStats);
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshData, fetchRevenueStats]);

    if (user?.role !== "admin") return null;

    const stats: StatCardProps[] = [
        {
            icon: "bus",
            label: "Total Buses",
            value: `${buses.length}`,
            sub: `${buses.filter(b => b.status === "active").length} active`,
            colors: ["#FFB800", "#FF8C00"] as const,
            trend: "neutral",
        },
        {
            icon: "map",
            label: "Routes",
            value: `${routes.length}`,
            sub: "Active routes",
            colors: ["#1E3A5F", "#2E5A9F"] as const,
            trend: "neutral",
        },
        {
            icon: "people",
            label: "Students",
            value: `${students.length}`,
            sub: `${students.filter(s => s.is_active).length} enrolled`,
            colors: ["#00C853", "#00E676"] as const,
            trend: "up",
        },
        {
            icon: "checkmark-circle",
            label: "Fee Paid",
            value: `${paymentStats.paid}`,
            sub: `${paymentStats.overdue} overdue`,
            colors: paymentStats.overdue > 0
                ? ["#B71C1C", "#FF1744"] as const
                : ["#00C853", "#00E676"] as const,
            trend: paymentStats.overdue > 0 ? "down" : "neutral",
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor="#FFB800"
                        colors={["#FFB800"]}
                    />
                }
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Image
                                source={require("@/assets/images/logo.png")}
                                style={{ width: 40, height: 40, borderRadius: 10 }}
                                resizeMode="contain"
                            />
                            <View>
                                <Text style={styles.greeting}>FLEET COMMAND</Text>
                                <Text style={styles.userName}>{user?.name ?? "Admin"}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                            <Ionicons name="log-out-outline" size={20} color="#FF1744" />
                        </TouchableOpacity>
                    </View>

                    {/* Overdue alert */}
                    {paymentStats.overdue > 0 && (
                        <TouchableOpacity
                            onPressIn={blurActiveElement}
                            onPress={() => runAfterBlur(() => router.push("/(admin)/students"))}
                            activeOpacity={0.85}
                            {...webNonFocusableProps}
                        >
                            <LinearGradient
                                colors={["#2D0000", "#150000"]}
                                style={styles.alertBanner}
                            >
                                <Ionicons name="warning" size={18} color="#FF1744" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.alertTitle}>
                                        {paymentStats.overdue} Overdue Payment{paymentStats.overdue > 1 ? "s" : ""}
                                    </Text>
                                    <Text style={styles.alertSub}>
                                        ₹{(paymentStats.totalRevenue - paymentStats.collectedRevenue).toLocaleString("en-IN")} pending collection
                                    </Text>
                                </View>
                                <Ionicons name="arrow-forward" size={14} color="#FF1744" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.actionsGrid}>
                        <ActionGridItem
                            icon="bus"
                            title="Buses"
                            onPress={() => router.push("/(admin)/buses")}
                            accent="#FFB800"
                        />
                        <ActionGridItem
                            icon="add-circle"
                            title="Add Bus"
                            onPress={() => router.push("/add-bus")}
                            accent="#FF8C00"
                        />
                        <ActionGridItem
                            icon="map"
                            title="Routes"
                            onPress={() => router.push("/(admin)/routes")}
                            accent="#2E5A9F"
                        />
                        <ActionGridItem
                            icon="person-add"
                            title="Add Student"
                            onPress={() => router.push("/add-student")}
                            accent="#00C853"
                        />
                        <ActionGridItem
                            icon="cash"
                            title="Payments"
                            onPress={() => router.push("/payments")}
                            accent="#7C3AED"
                        />
                        <ActionGridItem
                            icon="people"
                            title="Students"
                            onPress={() => router.push("/(admin)/students")}
                            accent="#00BCD4"
                        />
                        <ActionGridItem
                            icon="add-circle"
                            title="Add Route"
                            onPress={() => router.push("/add-route")}
                            accent="#E91E63"
                        />
                        <ActionGridItem
                            icon="people"
                            title="Drivers"
                            onPress={() => router.push("/(admin)/drivers")}
                            accent="#FF8C00"
                        />
                        <ActionGridItem
                            icon="calendar"
                            title="Attendance"
                            onPress={() => router.push("/(admin)/attendance")}
                            accent="#00E676"
                        />
                        <ActionGridItem
                            icon="people-circle"
                            title="Parents"
                            onPress={() => router.push("/(admin)/parents")}
                            accent="#00BCD4"
                        />
                        <ActionGridItem
                            icon="shield-checkmark"
                            title="Audit Logs"
                            onPress={() => router.push("/(admin)/audit-logs")}
                            accent="#9C27B0"
                        />
                        <ActionGridItem
                            icon="settings"
                            title="Settings"
                            onPress={() => router.push("/(admin)/settings")}
                            accent="#9C27B0"
                        />
                    </View>

                    {/* Premium Summary Card */}
                    <View style={styles.premiumSummaryCard}>
                        <View style={styles.largeHeroLeft}>
                            <Text style={styles.premiumHeroCount}>{paymentStats.paid}</Text>
                            <Text style={styles.largeHeroLabel}>FEES PAID</Text>
                            <Text style={styles.largeHeroSub}>OUT OF {students.length} STUDENTS</Text>
                        </View>
                        <View style={styles.largeHeroRight}>
                            <View style={styles.premiumRevenueBadge}>
                                <Text style={styles.revenueLabel}>COLLECTED THIS MONTH</Text>
                                <Text style={styles.premiumRevenueValue}>
                                    ₹{paymentStats.collectedRevenue.toLocaleString("en-IN")}
                                </Text>
                                <Text style={[styles.revenueLabel, { marginTop: 12 }]}>TOTAL DUE</Text>
                                <Text style={[styles.premiumRevenueValue, { color: "#FF8C00", fontSize: 18 }]}>
                                    ₹{paymentStats.totalRevenue.toLocaleString("en-IN")}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats grid */}
                    <Text style={styles.sectionTitle}>KEY METRICS</Text>
                    <View style={styles.statsGrid}>
                        {stats.map((s, i) => (
                            <StatCard key={i} {...s} />
                        ))}
                    </View>

                    {/* Revenue Chart */}
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>REVENUE TREND (LAST 6 MONTHS)</Text>
                    <View style={styles.chartContainer}>
                        {revenueData.length > 0 ? (
                            <LineChart
                                data={{
                                    labels: revenueData.map(d => d.month),
                                    datasets: [{ data: revenueData.map(d => d.revenue) }]
                                }}
                                width={width - 40}
                                height={220}
                                yAxisLabel="₹"
                                yAxisSuffix=""
                                yAxisInterval={1}
                                chartConfig={{
                                    backgroundColor: "#1A1A24",
                                    backgroundGradientFrom: "#080812",
                                    backgroundGradientTo: "#0C0C1A",
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(255,184,0,${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(255,255,255,${opacity * 0.6})`,
                                    style: { borderRadius: 16 },
                                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#FFB800" }
                                }}
                                bezier
                                style={{ marginVertical: 8, borderRadius: 16 }}
                            />
                        ) : (
                            <Text style={styles.emptyText}>No revenue data yet...</Text>
                        )}
                    </View>

                    {/* Payment Status Pie Chart */}
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>STUDENT PAYMENT STATUS</Text>
                    <View style={styles.chartContainer}>
                        {students.length > 0 ? (
                            <PieChart
                                data={[
                                    { name: "Paid", population: Math.max(paymentStats.paid, 0.01), color: "#00E676", legendFontColor: "#FFF", legendFontSize: 12 },
                                    { name: "Due Soon", population: Math.max(paymentStats.due, 0.01), color: "#FFB800", legendFontColor: "#FFF", legendFontSize: 12 },
                                    { name: "Overdue", population: Math.max(paymentStats.overdue, 0.01), color: "#FF1744", legendFontColor: "#FFF", legendFontSize: 12 },
                                ]}
                                width={width - 40}
                                height={220}
                                chartConfig={{ color: (opacity = 1) => `rgba(255,255,255,${opacity})` }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                center={[10, 0]}
                                absolute
                            />
                        ) : (
                            <Text style={styles.emptyText}>No students enrolled yet...</Text>
                        )}
                    </View>

                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    greeting: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFB800",
        letterSpacing: 2,
        marginBottom: 4,
    },
    userName: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
    logoutBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,23,68,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },

    alertBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.25)",
    },
    alertTitle: { fontSize: 14, fontWeight: "700", color: "#FF1744" },
    alertSub: { fontSize: 11, color: "#888", marginTop: 2 },

    actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    gridItem: { width: (width - 20 * 2 - 30) / 4, height: 75 },
    gridItemInner: {
        flex: 1,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    gridItemText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5, textAlign: "center" },

    premiumSummaryCard: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 24,
        padding: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        minHeight: 160,
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.1)",
        overflow: "hidden",
    },
    largeHeroLeft: { flex: 1 },
    premiumHeroCount: { fontSize: 56, fontWeight: "900", color: "#FFB800", lineHeight: 60 },
    largeHeroLabel: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", letterSpacing: 1, marginTop: 4 },
    largeHeroSub: { fontSize: 11, color: "#666", marginTop: 2, fontWeight: "600" },
    largeHeroRight: { alignItems: "flex-end", justifyContent: "center" },
    premiumRevenueBadge: { alignItems: "flex-end" },
    revenueLabel: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1 },
    premiumRevenueValue: { fontSize: 22, fontWeight: "900", color: "#00E676", marginTop: 4 },

    sectionTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: "#555",
        letterSpacing: 2,
        marginBottom: 14,
    },

    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
    statCard: {
        width: CARD_W,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    statCardInner: { padding: 16 },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    statValue: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
    statLabel: { fontSize: 11, color: "#666", marginTop: 2, fontWeight: "600" },
    statSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
    statSub: { fontSize: 10, color: "#666" },

    chartContainer: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 20,
        padding: 16,
        paddingBottom: 0,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 220,
    },
    emptyText: { color: "#888", fontSize: 12, fontWeight: "600", paddingBottom: 16 },
});
