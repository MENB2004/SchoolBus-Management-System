import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";

const { width } = Dimensions.get("window");

export default function AnalyticsScreen() {
    const { students, buses, routes, payments } = useDatabase();

    const [selectedRouteId, setSelectedRouteId] = useState<string>("all");
    const [selectedBusId, setSelectedBusId] = useState<string>("all");

    // Compute unique months from payments
    const monthOptions = useMemo(() => {
        const months = new Set<string>();
        payments.forEach(p => {
            if (p.month) months.add(p.month);
        });
        const arr = Array.from(months);
        if (arr.length === 0) {
            // Default list if empty
            const now = new Date();
            for (let i = 0; i < 3; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                arr.push(d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
            }
        }
        return arr;
    }, [payments]);

    const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]);

    // 1. Filtered Data
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchRoute = selectedRouteId === "all" || s.route_id === selectedRouteId;
            const matchBus = selectedBusId === "all" || s.bus_id === selectedBusId;
            return matchRoute && matchBus;
        });
    }, [students, selectedRouteId, selectedBusId]);

    // 2. Financial Metrics
    const financialMetrics = useMemo(() => {
        let expected = 0;
        filteredStudents.forEach(s => {
            expected += s.monthly_fee || 0;
        });

        // Filter payments for selected month & matching student scope
        let collected = 0;
        const studentIds = new Set(filteredStudents.map(s => s.id));
        const monthPayments = payments.filter(p => p.month === selectedMonth);

        monthPayments.forEach(p => {
            if (studentIds.has(p.student_id)) {
                collected += p.amount || 0;
            }
        });

        const collectionRate = expected > 0 ? (collected / expected) * 100 : 0;
        return {
            expected,
            collected,
            pending: Math.max(expected - collected, 0),
            collectionRate,
        };
    }, [filteredStudents, payments, selectedMonth]);

    // 3. Route Utilization Load Factors
    const routeLoadFactors = useMemo(() => {
        const data = routes.map(r => {
            const routeStudents = students.filter(s => s.route_id === r.id);
            const bus = buses.find(b => b.id === r.bus_id);
            const capacity = bus?.capacity || 40;
            const loadPercent = capacity > 0 ? (routeStudents.length / capacity) * 100 : 0;
            return {
                name: r.route_name.split(" ")[0] + " " + (r.route_name.split(" ")[1] || ""),
                students: routeStudents.length,
                capacity,
                loadPercent,
            };
        });
        return data.slice(0, 5); // top 5 routes
    }, [routes, students, buses]);

    // 4. Payment Modes Distribution
    const paymentModeSplits = useMemo(() => {
        let cash = 0, upi = 0, bank = 0;
        payments.forEach(p => {
            if (p.payment_mode === "Cash") cash++;
            else if (p.payment_mode === "UPI") upi++;
            else if (p.payment_mode === "Bank") bank++;
        });
        const total = cash + upi + bank || 1;
        return [
            { name: "UPI", count: upi, color: "#7C3AED", legendFontColor: "#FFF", legendFontSize: 11 },
            { name: "Cash", count: cash, color: "#00E676", legendFontColor: "#FFF", legendFontSize: 11 },
            { name: "Bank", count: bank, color: "#00BCD4", legendFontColor: "#FFF", legendFontSize: 11 },
        ];
    }, [payments]);

    // Mock weekly attendance rate trend
    const attendanceTrendData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        datasets: [{ data: [94, 96, 92, 95, 97] }]
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#FFB800" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerLabel}>ADMIN COMMAND</Text>
                    <Text style={styles.headerTitle}>Insights & Trends</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* ─── FILTERS ─── */}
                <Text style={styles.sectionTitle}>FILTER SCOPE</Text>
                <View style={styles.filtersBox}>
                    <View style={styles.filterRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>ROUTE</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                <TouchableOpacity
                                    style={[styles.chip, selectedRouteId === "all" && styles.chipActive]}
                                    onPress={() => setSelectedRouteId("all")}
                                >
                                    <Text style={[styles.chipText, selectedRouteId === "all" && styles.chipTextActive]}>All Routes</Text>
                                </TouchableOpacity>
                                {routes.map(r => (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[styles.chip, selectedRouteId === r.id && styles.chipActive]}
                                        onPress={() => setSelectedRouteId(r.id)}
                                    >
                                        <Text style={[styles.chipText, selectedRouteId === r.id && styles.chipTextActive]}>
                                            {r.route_name.split(" ")[0]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>BUS FLEET</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                <TouchableOpacity
                                    style={[styles.chip, selectedBusId === "all" && styles.chipActive]}
                                    onPress={() => setSelectedBusId("all")}
                                >
                                    <Text style={[styles.chipText, selectedBusId === "all" && styles.chipTextActive]}>All Buses</Text>
                                </TouchableOpacity>
                                {buses.map(b => (
                                    <TouchableOpacity
                                        key={b.id}
                                        style={[styles.chip, selectedBusId === b.id && styles.chipActive]}
                                        onPress={() => setSelectedBusId(b.id)}
                                    >
                                        <Text style={[styles.chipText, selectedBusId === b.id && styles.chipTextActive]}>
                                            Bus {b.bus_number.split("-").pop()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.filterLabel}>REPORTING MONTH (FINANCIALS)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                {monthOptions.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.chip, selectedMonth === m && styles.chipActive]}
                                        onPress={() => setSelectedMonth(m)}
                                    >
                                        <Text style={[styles.chipText, selectedMonth === m && styles.chipTextActive]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </View>

                {/* ─── METRICS CARDS ─── */}
                <Text style={styles.sectionTitle}>KEY METRICS</Text>
                <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                        <Ionicons name="cash-outline" size={18} color="#00E676" />
                        <Text style={styles.metricLabel}>Collected (This Month)</Text>
                        <Text style={[styles.metricValue, { color: "#00E676" }]}>
                            ₹{financialMetrics.collected.toLocaleString("en-IN")}
                        </Text>
                        <Text style={styles.metricSub}>Of ₹{financialMetrics.expected.toLocaleString("en-IN")}</Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Ionicons name="pie-chart-outline" size={18} color="#FFB800" />
                        <Text style={styles.metricLabel}>Collection Rate</Text>
                        <Text style={[styles.metricValue, { color: "#FFB800" }]}>
                            {financialMetrics.collectionRate.toFixed(1)}%
                        </Text>
                        <Text style={styles.metricSub}>
                            ₹{financialMetrics.pending.toLocaleString("en-IN")} pending
                        </Text>
                    </View>

                    <View style={styles.metricCard}>
                        <Ionicons name="people-outline" size={18} color="#00BCD4" />
                        <Text style={styles.metricLabel}>Scope Passengers</Text>
                        <Text style={[styles.metricValue, { color: "#00BCD4" }]}>
                            {filteredStudents.length}
                        </Text>
                        <Text style={styles.metricSub}>Students under scope</Text>
                    </View>
                </View>

                {/* ─── LINE CHART: ATTENDANCE TRENDS ─── */}
                <Text style={styles.sectionTitle}>ATTENDANCE RATE TREND (THIS WEEK)</Text>
                <View style={styles.chartBox}>
                    <LineChart
                        data={attendanceTrendData}
                        width={width - 40}
                        height={200}
                        yAxisSuffix="%"
                        chartConfig={{
                            backgroundColor: "#1C1C28",
                            backgroundGradientFrom: "#0E0E18",
                            backgroundGradientTo: "#121222",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(255, 184, 0, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.6})`,
                            propsForDots: { r: "4", strokeWidth: "2", stroke: "#FFB800" }
                        }}
                        bezier
                        style={{ borderRadius: 16 }}
                    />
                </View>

                {/* ─── BAR CHART: ROUTE UTILIZATION LOAD FACTOR ─── */}
                {routeLoadFactors.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>ROUTE LOAD FACTOR (PASSENGERS VS CAPACITY)</Text>
                        <View style={styles.chartBox}>
                            <BarChart
                                data={{
                                    labels: routeLoadFactors.map(f => f.name),
                                    datasets: [{ data: routeLoadFactors.map(f => f.students) }]
                                }}
                                width={width - 40}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix=""
                                chartConfig={{
                                    backgroundColor: "#1C1C28",
                                    backgroundGradientFrom: "#0E0E18",
                                    backgroundGradientTo: "#121222",
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(0, 188, 212, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.6})`,
                                }}
                                style={{ borderRadius: 16 }}
                            />
                        </View>
                    </>
                )}

                {/* ─── PIE CHART: PAYMENT SPLITS ─── */}
                <Text style={styles.sectionTitle}>COLLECTION MODES</Text>
                <View style={styles.chartBox}>
                    <PieChart
                        data={paymentModeSplits}
                        width={width - 40}
                        height={200}
                        chartConfig={{ color: (opacity = 1) => `rgba(255,255,255,${opacity})` }}
                        accessor={"count"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        absolute
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },

    scroll: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 12, marginTop: 16 },

    filtersBox: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        gap: 14,
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    filterLabel: {
        fontSize: 9,
        fontWeight: "900",
        color: "#444",
        letterSpacing: 1,
        marginBottom: 6,
    },
    chipScroll: {
        marginHorizontal: -8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginHorizontal: 4,
    },
    chipActive: {
        backgroundColor: "rgba(255,184,0,0.15)",
        borderColor: "rgba(255,184,0,0.3)",
    },
    chipText: { fontSize: 11, fontWeight: "700", color: "#666" },
    chipTextActive: { color: "#FFB800" },

    metricsGrid: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        borderRadius: 18,
        padding: 12,
        gap: 4,
    },
    metricLabel: {
        fontSize: 10,
        color: "#666",
        fontWeight: "700",
        marginTop: 6,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: "900",
    },
    metricSub: {
        fontSize: 9,
        color: "#444",
        fontWeight: "600",
    },
    chartBox: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
});
