import React, { useState, useMemo, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { getFeeStatus, FEE_COLORS } from "@/src/data/mockData";
import { buildMonthlyPaymentReportHTML, printAndSharePDF } from "@/src/utils/pdfReports";

export default function PaymentsScreen() {
    const { students, payments, routes, refreshData, isLoading } = useDatabase();
    const [filter, setFilter] = useState<"all" | "paid" | "due" | "overdue">("all");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Generate last 6 months as selectable labels
    const monthOptions = useMemo(() => {
        const months: string[] = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
        }
        return months;
    }, []);
    const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);

    const stats = useMemo(() => {
        let paid = 0, due = 0, overdue = 0, collected = 0, total = 0;
        students.forEach(s => {
            const dr = s.days_remaining ?? -999;
            const st = getFeeStatus(dr);
            if (st === "paid") { paid++; collected += s.monthly_fee ?? 0; }
            else if (st === "due") due++;
            else overdue++;
            total += s.monthly_fee ?? 0;
        });
        return { paid, due, overdue, collected, total, pending: total - collected };
    }, [students]);

    const filtered = useMemo(() => {
        if (filter === "all") return students;
        return students.filter(s => getFeeStatus(s.days_remaining ?? -999) === filter);
    }, [students, filter]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    }, [refreshData]);

    // Filter payments for the selected month
    const monthPayments = useMemo(() => {
        return payments.filter(p => p.month === selectedMonth);
    }, [payments, selectedMonth]);

    const handleExportPDF = useCallback(async () => {
        setIsExporting(true);
        try {
            const html = buildMonthlyPaymentReportHTML(selectedMonth, monthPayments, students, routes);
            await printAndSharePDF(html, `Payment_Report_${selectedMonth.replace(/\s+/g, "_")}`);
        } catch (e: any) {
            Alert.alert("Export Error", e.message);
        } finally {
            setIsExporting(false);
        }
    }, [selectedMonth, monthPayments, students, routes]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#7C3AED" colors={["#7C3AED"]} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#7C3AED" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerLabel}>PAYMENT MANAGEMENT</Text>
                        <Text style={styles.headerTitle}>Fee Collection</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleExportPDF}
                        disabled={isExporting}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={isExporting ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                            style={styles.exportHeaderBtn}
                        >
                            {isExporting
                                ? <ActivityIndicator size="small" color="#0A0A0F" />
                                : <Ionicons name="download-outline" size={18} color="#0A0A0F" />
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                    <View style={[styles.summaryCard, { borderColor: "rgba(0,230,118,0.3)" }]}>
                        <Text style={[styles.summaryValue, { color: "#00E676" }]}>{stats.paid}</Text>
                        <Text style={styles.summaryLabel}>Paid</Text>
                        <Text style={[styles.summaryAmount, { color: "#00E676" }]}>₹{stats.collected.toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: "rgba(255,184,0,0.3)" }]}>
                        <Text style={[styles.summaryValue, { color: "#FFB800" }]}>{stats.due}</Text>
                        <Text style={styles.summaryLabel}>Due Soon</Text>
                        <Text style={styles.summaryAmount}>—</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: "rgba(255,23,68,0.3)" }]}>
                        <Text style={[styles.summaryValue, { color: "#FF1744" }]}>{stats.overdue}</Text>
                        <Text style={styles.summaryLabel}>Overdue</Text>
                        <Text style={[styles.summaryAmount, { color: "#FF1744" }]}>₹{stats.pending.toLocaleString("en-IN")}</Text>
                    </View>
                </View>

                {/* Total Revenue Card */}
                <LinearGradient
                    colors={["rgba(124,58,237,0.2)", "rgba(124,58,237,0.05)"]}
                    style={styles.revenueCard}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <View>
                        <Text style={styles.revLabel}>TOTAL COLLECTED THIS MONTH</Text>
                        <Text style={styles.revValue}>₹{stats.collected.toLocaleString("en-IN")}</Text>
                    </View>
                    <View style={styles.revRight}>
                        <Text style={styles.revLabel}>OF TOTAL</Text>
                        <Text style={[styles.revValue, { fontSize: 18, color: "#888" }]}>₹{stats.total.toLocaleString("en-IN")}</Text>
                        <View style={styles.revBar}>
                            <View style={[styles.revBarFill, { width: `${stats.total > 0 ? (stats.collected / stats.total) * 100 : 0}%` as any }]} />
                        </View>
                    </View>
                </LinearGradient>

                {/* Month Selector */}
                <Text style={styles.sectionTitle}>SELECT MONTH</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={{ paddingRight: 20 }}>
                    {monthOptions.map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                            onPress={() => setSelectedMonth(m)}
                        >
                            <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                                {m}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Export Row */}
                <TouchableOpacity onPress={handleExportPDF} disabled={isExporting} activeOpacity={0.88}>
                    <LinearGradient colors={isExporting ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]} style={styles.exportBtn}>
                        {isExporting ? <ActivityIndicator color="#0A0A0F" /> : (
                            <>
                                <Ionicons name="document-text-outline" size={18} color="#0A0A0F" />
                                <Text style={styles.exportBtnText}>EXPORT {selectedMonth.toUpperCase()} REPORT</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Recent Payments */}
                {payments.length > 0 && (
                    <>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>RECENT PAYMENTS</Text>
                            <TouchableOpacity onPress={() => router.push("/(admin)/payment-history")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons name="time-outline" size={14} color="#7C3AED" />
                                <Text style={{ fontSize: 12, fontWeight: "700", color: "#7C3AED" }}>View Timeline</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.recentCard}>
                            {payments.slice(0, 10).map((p, idx) => {
                                const s = students.find(st => st.id === p.student_id);
                                return (
                                    <View key={p.id} style={[styles.recentRow, idx === 0 && { borderTopWidth: 0 }]}>
                                        <View style={styles.recentIcon}>
                                            <Ionicons name="checkmark-circle" size={18} color="#00E676" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.recentName}>{s?.name ?? "Student"}</Text>
                                            <Text style={styles.recentMeta}>
                                                {new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                {" · "}{p.payment_mode}
                                                {" · "}{p.month}
                                            </Text>
                                        </View>
                                        <Text style={styles.recentAmount}>₹{p.amount.toLocaleString("en-IN")}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Filter Students */}
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>STUDENT FEE STATUS</Text>
                <View style={styles.chips}>
                    {(["all", "paid", "due", "overdue"] as const).map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.chip, filter === f && styles.chipActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {isLoading && !isRefreshing ? (
                    <ActivityIndicator color="#7C3AED" style={{ marginTop: 20 }} />
                ) : (
                    filtered.map(s => {
                        const dr = s.days_remaining ?? -999;
                        const st = getFeeStatus(dr);
                        const colors = FEE_COLORS[st];
                        const initials = s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                        return (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.studentRow}
                                onPress={() => router.push({ pathname: "/(admin)/student-detail", params: { id: s.id } })}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.studentAvatar, { backgroundColor: colors.bg, borderColor: colors.ring }]}>
                                    <Text style={[styles.studentInitials, { color: colors.ring }]}>{initials}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.studentName}>{s.name}</Text>
                                    <Text style={styles.studentMeta}>{s.class}{s.route ? ` • ${s.route.route_name}` : ""}</Text>
                                </View>
                                <View style={{ alignItems: "flex-end" }}>
                                    <Text style={[styles.feeText, { color: colors.text }]}>₹{s.monthly_fee.toLocaleString("en-IN")}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                                        <Text style={[styles.statusText, { color: colors.text }]}>{colors.label}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

    header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(124,58,237,0.15)", alignItems: "center", justifyContent: "center" },
    exportHeaderBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#7C3AED", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },

    summaryGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
    summaryCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 14, borderWidth: 1, alignItems: "center" },
    summaryValue: { fontSize: 26, fontWeight: "900" },
    summaryLabel: { fontSize: 10, color: "#666", fontWeight: "700", marginTop: 2 },
    summaryAmount: { fontSize: 12, fontWeight: "700", color: "#555", marginTop: 4 },

    revenueCard: {
        borderRadius: 20, padding: 20, flexDirection: "row",
        justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    },
    revLabel: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1, marginBottom: 6 },
    revValue: { fontSize: 22, fontWeight: "900", color: "#7C3AED" },
    revRight: { alignItems: "flex-end" },
    revBar: { width: 80, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", marginTop: 8, overflow: "hidden" },
    revBarFill: { height: 4, backgroundColor: "#7C3AED", borderRadius: 2 },

    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 2, marginBottom: 12 },

    recentCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 24 },
    recentRow: { flexDirection: "row", alignItems: "center", padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", gap: 12 },
    recentIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(0,230,118,0.15)", alignItems: "center", justifyContent: "center" },
    recentName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    recentMeta: { fontSize: 11, color: "#666", marginTop: 1 },
    recentAmount: { fontSize: 15, fontWeight: "900", color: "#00E676" },

    chips: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    chipActive: { backgroundColor: "rgba(124,58,237,0.15)", borderColor: "rgba(124,58,237,0.4)" },
    chipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    chipTextActive: { color: "#7C3AED" },

    studentRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", gap: 12 },
    studentAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
    studentInitials: { fontSize: 15, fontWeight: "900" },
    studentName: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
    studentMeta: { fontSize: 12, color: "#666", marginTop: 2 },
    feeText: { fontSize: 15, fontWeight: "900" },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 3 },
    statusText: { fontSize: 10, fontWeight: "700" },

    monthScroll: { marginBottom: 16, marginHorizontal: -20, paddingLeft: 20 },
    monthChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginRight: 8 },
    monthChipActive: { backgroundColor: "rgba(124,58,237,0.2)", borderColor: "rgba(124,58,237,0.5)" },
    monthChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    monthChipTextActive: { color: "#7C3AED" },
    exportBtn: { height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 },
    exportBtnText: { fontSize: 13, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1 },
});
