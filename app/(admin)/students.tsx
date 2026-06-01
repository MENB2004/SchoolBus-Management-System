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
import { Student, getFeeStatus, FEE_COLORS } from "@/src/data/mockData";

function StudentCard({ student }: { student: Student }) {
    const daysLeft = student.days_remaining ?? -999;
    const status = getFeeStatus(daysLeft);
    const colors = FEE_COLORS[status];
    const initials = student.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    return (
        <TouchableOpacity
            style={styles.card}
            onPressIn={blurActiveElement}
            onPress={() => runAfterBlur(() => router.push({ pathname: "/student-detail", params: { id: student.id } }))}
            activeOpacity={0.85}
            {...webNonFocusableProps}
        >
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: colors.bg, borderColor: colors.ring }]}>
                <Text style={[styles.avatarText, { color: colors.ring }]}>{initials}</Text>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.nameRow}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>{colors.label}</Text>
                    </View>
                </View>

                <Text style={styles.classText}>
                    {student.class}{student.section ? ` – ${student.section}` : ""}
                </Text>

                <View style={styles.metaRow}>
                    {student.route && (
                        <View style={styles.meta}>
                            <Ionicons name="map-outline" size={11} color="#555" />
                            <Text style={styles.metaText}>{student.route.route_name}</Text>
                        </View>
                    )}
                    {student.bus && (
                        <View style={styles.meta}>
                            <Ionicons name="bus-outline" size={11} color="#555" />
                            <Text style={styles.metaText}>{student.bus.bus_number}</Text>
                        </View>
                    )}
                </View>

                {daysLeft >= 0 ? (
                    <Text style={styles.daysText}>
                        {daysLeft === 0 ? "Due today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                    </Text>
                ) : (
                    <Text style={[styles.daysText, { color: "#FF1744" }]}>
                        {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? "s" : ""} overdue
                    </Text>
                )}
            </View>

            <Ionicons name="chevron-forward" size={16} color="#333" />
        </TouchableOpacity>
    );
}

export default function StudentsScreen() {
    const { students, isLoading, refreshData } = useDatabase();
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "due" | "overdue">("all");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filtered = useMemo(() => {
        let list = students;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.class.toLowerCase().includes(q) ||
                s.parent_name.toLowerCase().includes(q)
            );
        }
        if (filterStatus !== "all") {
            list = list.filter(s => getFeeStatus(s.days_remaining ?? -999) === filterStatus);
        }
        return list;
    }, [students, search, filterStatus]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const counts = useMemo(() => {
        const paid = students.filter(s => getFeeStatus(s.days_remaining ?? -999) === "paid").length;
        const due = students.filter(s => getFeeStatus(s.days_remaining ?? -999) === "due").length;
        const overdue = students.filter(s => getFeeStatus(s.days_remaining ?? -999) === "overdue").length;
        return { paid, due, overdue };
    }, [students]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>STUDENT DIRECTORY</Text>
                    <Text style={styles.title}>Students</Text>
                </View>
                <TouchableOpacity
                    onPress={() => router.push("/add-student")}
                    {...webNonFocusableProps}
                >
                    <LinearGradient colors={["#00C853", "#00E676"]} style={styles.addBtnGrad}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: "#00E676" }]}>{counts.paid}</Text>
                    <Text style={styles.summaryLabel}>Paid</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: "#FFB800" }]}>{counts.due}</Text>
                    <Text style={styles.summaryLabel}>Due Soon</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: "#FF1744" }]}>{counts.overdue}</Text>
                    <Text style={styles.summaryLabel}>Overdue</Text>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={16} color="#555" style={{ marginRight: 10 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, class..."
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

            <View style={styles.chips}>
                {(["all", "paid", "due", "overdue"] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.chip, filterStatus === f && styles.chipActive]}
                        onPress={() => setFilterStatus(f)}
                    >
                        <Text style={[styles.chipText, filterStatus === f && styles.chipTextActive]}>
                            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
                <View style={{ flex: 1 }} />
                <Text style={styles.countText}>{filtered.length}</Text>
            </View>

            {isLoading && !isRefreshing ? (
                <View style={styles.loader}>
                    <ActivityIndicator color="#00E676" size="large" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E676" colors={["#00E676"]} />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={56} color="#222" />
                            <Text style={styles.emptyTitle}>No students found</Text>
                            <Text style={styles.emptySub}>Add students to a route to get started</Text>
                        </View>
                    ) : (
                        filtered.map(s => <StudentCard key={s.id} student={s} />)
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
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#00E676", letterSpacing: 2, marginBottom: 4 },
    title: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
    addBtnGrad: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },

    summaryRow: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryCount: { fontSize: 24, fontWeight: "900" },
    summaryLabel: { fontSize: 11, color: "#666", fontWeight: "600", marginTop: 2 },
    summaryDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.08)" },

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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    chipActive: { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.4)" },
    chipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    chipTextActive: { color: "#00E676" },
    countText: { fontSize: 12, color: "#555", fontWeight: "600" },

    list: { paddingHorizontal: 20, paddingTop: 4 },
    loader: { flex: 1, alignItems: "center", justifyContent: "center" },

    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
    },
    avatarText: { fontSize: 16, fontWeight: "900" },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
    studentName: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", flex: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 10, fontWeight: "700" },
    classText: { fontSize: 12, color: "#888", fontWeight: "600", marginBottom: 4 },
    metaRow: { flexDirection: "row", gap: 12, marginBottom: 3 },
    meta: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 11, color: "#555" },
    daysText: { fontSize: 11, color: "#666", fontWeight: "600" },

    empty: { alignItems: "center", paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: "800", color: "#333", marginTop: 16 },
    emptySub: { fontSize: 13, color: "#444", marginTop: 6 },
});
