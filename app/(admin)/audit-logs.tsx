import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, RefreshControl, ActivityIndicator, TextInput
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import type { AuditLog } from "@/src/lib/supabase";

const ACTION_ICONS: Record<string, { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string }> = {
    "Bus Added": { icon: "bus", color: "#FFB800" },
    "Bus Updated": { icon: "bus-outline", color: "#FF8C00" },
    "Bus Deleted": { icon: "bus-outline", color: "#FF1744" },
    "Route Added": { icon: "map", color: "#2E5A9F" },
    "Route Updated": { icon: "map-outline", color: "#2E5A9F" },
    "Route Deleted": { icon: "map-outline", color: "#FF1744" },
    "Student Added": { icon: "person-add", color: "#00E676" },
    "Student Updated": { icon: "person", color: "#00BCD4" },
    "Student Deleted": { icon: "person-remove", color: "#FF1744" },
    "Driver Added": { icon: "car", color: "#FFB800" },
    "Driver Updated": { icon: "car-outline", color: "#FF8C00" },
    "Driver Deleted": { icon: "car-outline", color: "#FF1744" },
    "Payment Recorded": { icon: "cash", color: "#7C3AED" },
    "Attendance Marked": { icon: "calendar", color: "#00E676" },
    "School Registered": { icon: "school", color: "#FFB800" },
    "Role Assigned: admin": { icon: "shield-checkmark", color: "#FFB800" },
    "Role Assigned: driver": { icon: "shield", color: "#FF8C00" },
    "Role Assigned: parent": { icon: "shield-half", color: "#00BCD4" },
    "Parent Profile Added": { icon: "people", color: "#00BCD4" },
    "Parent Profile Updated": { icon: "people-outline", color: "#00BCD4" },
    "Parent Profile Deleted": { icon: "people-outline", color: "#FF1744" },
    "Parent Linked to Student": { icon: "link", color: "#00E676" },
    "Parent Unlinked from Student": { icon: "unlink", color: "#FF1744" },
    "Driver Phone OTP Account Linked": { icon: "phone-portrait", color: "#00E676" },
};

function getActionConfig(action: string) {
    if (ACTION_ICONS[action]) return ACTION_ICONS[action];
    // Try partial match
    for (const key of Object.keys(ACTION_ICONS)) {
        if (action.startsWith(key.split(":")[0])) return ACTION_ICONS[key];
    }
    return { icon: "document-text-outline" as const, color: "#666" };
}

function formatTimestamp(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AuditLogsScreen() {
    const { auditLogs, loadAuditLogs, isLoading } = useDatabase();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [filterTable, setFilterTable] = useState<string | null>(null);

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadAuditLogs();
        setIsRefreshing(false);
    };

    // Get unique table names for filtering
    const tableNames = useMemo(() => {
        const names = new Set(auditLogs.map(l => l.table_name));
        return Array.from(names).sort();
    }, [auditLogs]);

    const filtered = useMemo(() => {
        let logs = auditLogs;
        if (filterTable) {
            logs = logs.filter(l => l.table_name === filterTable);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            logs = logs.filter(l =>
                l.action.toLowerCase().includes(q) ||
                l.table_name.toLowerCase().includes(q) ||
                l.record_id.toLowerCase().includes(q)
            );
        }
        return logs;
    }, [auditLogs, filterTable, search]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>SECURITY & COMPLIANCE</Text>
                    <Text style={styles.title}>Audit Logs</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{filtered.length}</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchBarWrap}>
                <Ionicons name="search-outline" size={18} color="#555" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by action, table, or record ID..."
                    placeholderTextColor="#444"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={16} color="#555" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Table filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                <TouchableOpacity
                    style={[styles.filterChip, !filterTable && styles.filterChipActive]}
                    onPress={() => setFilterTable(null)}
                >
                    <Text style={[styles.filterChipText, !filterTable && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {tableNames.map(table => (
                    <TouchableOpacity
                        key={table}
                        style={[styles.filterChip, filterTable === table && styles.filterChipActive]}
                        onPress={() => setFilterTable(filterTable === table ? null : table)}
                    >
                        <Text style={[styles.filterChipText, filterTable === table && styles.filterChipTextActive]}>
                            {table}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {isLoading && !isRefreshing ? (
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#FFB800" />
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
                        <View style={styles.emptyWrap}>
                            <Ionicons name="document-text-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>No Audit Logs</Text>
                            <Text style={styles.emptySub}>
                                Actions performed in the system will appear here for tracking and compliance.
                            </Text>
                        </View>
                    ) : (
                        filtered.map((log, index) => {
                            const config = getActionConfig(log.action);
                            const isLast = index === filtered.length - 1;
                            return (
                                <View key={log.id} style={styles.logEntry}>
                                    {/* Timeline connector */}
                                    <View style={styles.timeline}>
                                        <View style={[styles.timelineDot, { backgroundColor: config.color + "33", borderColor: config.color }]}>
                                            <Ionicons name={config.icon} size={14} color={config.color} />
                                        </View>
                                        {!isLast && <View style={styles.timelineLine} />}
                                    </View>

                                    {/* Log content */}
                                    <View style={styles.logContent}>
                                        <Text style={[styles.logAction, { color: config.color }]}>{log.action}</Text>
                                        <View style={styles.logMetaRow}>
                                            <View style={styles.tableBadge}>
                                                <Text style={styles.tableBadgeText}>{log.table_name}</Text>
                                            </View>
                                            <Text style={styles.logTime}>{formatTimestamp(log.created_at)}</Text>
                                        </View>
                                        <Text style={styles.logRecordId} numberOfLines={1}>
                                            ID: {log.record_id}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                    <View style={{ height: 100 }} />
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
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#9C27B0", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
    countBadge: {
        backgroundColor: "rgba(156,39,176,0.15)",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: "rgba(156,39,176,0.3)",
    },
    countText: { fontSize: 16, fontWeight: "900", color: "#9C27B0" },

    searchBarWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        marginHorizontal: 20,
        paddingHorizontal: 12,
        height: 46,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 12,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },

    filterRow: { marginBottom: 12, maxHeight: 40 },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    filterChipActive: { backgroundColor: "rgba(156,39,176,0.15)", borderColor: "rgba(156,39,176,0.4)" },
    filterChipText: { fontSize: 11, fontWeight: "700", color: "#666" },
    filterChipTextActive: { color: "#CE93D8" },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444", textAlign: "center", paddingHorizontal: 30 },

    logEntry: {
        flexDirection: "row",
        marginBottom: 0,
    },

    // Timeline
    timeline: {
        width: 36,
        alignItems: "center",
    },
    timelineDot: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        marginVertical: 4,
    },

    // Log content
    logContent: {
        flex: 1,
        marginLeft: 12,
        paddingBottom: 20,
    },
    logAction: {
        fontSize: 14,
        fontWeight: "800",
    },
    logMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    tableBadge: {
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tableBadgeText: { fontSize: 10, fontWeight: "700", color: "#888" },
    logTime: { fontSize: 10, color: "#555", fontWeight: "600" },
    logRecordId: {
        fontSize: 10,
        color: "#333",
        fontWeight: "600",
        fontFamily: "monospace",
        marginTop: 4,
    },
});
