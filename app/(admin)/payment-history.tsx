import React, { useState, useMemo } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, FlatList, TextInput, ActivityIndicator, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

type ModeFilter = "All" | "Cash" | "UPI" | "Bank";

export default function PaymentHistoryTimelineScreen() {
    const { payments, students, isLoading, refreshData } = useDatabase();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMode, setSelectedMode] = useState<ModeFilter>("All");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Sort payments by transaction date descending
    const sortedPayments = useMemo(() => {
        return [...payments].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
    }, [payments]);

    // Filter payments based on search query and selected mode
    const filteredPayments = useMemo(() => {
        return sortedPayments.filter(p => {
            const student = students.find(s => s.id === p.student_id);
            const matchesSearch = student ? student.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            const matchesMode = selectedMode === "All" || p.payment_mode.toLowerCase() === selectedMode.toLowerCase();
            return matchesSearch && matchesMode;
        });
    }, [sortedPayments, students, searchQuery, selectedMode]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const handleModeSelect = async (mode: ModeFilter) => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
        setSelectedMode(mode);
    };

    const getModeColor = (mode: string) => {
        switch (mode.toLowerCase()) {
            case "cash": return "#00E676"; // Green
            case "upi": return "#7C3AED";  // Purple
            case "bank": return "#FFB800"; // Gold
            default: return "#00BCD4";     // Cyan
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode.toLowerCase()) {
            case "cash": return "cash-outline";
            case "upi": return "phone-portrait-outline";
            case "bank": return "business-outline";
            default: return "card-outline";
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#7C3AED" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerLabel}>FINANCIAL TIMELINE</Text>
                    <Text style={styles.headerTitle}>Transaction Logs</Text>
                </View>
            </View>

            {/* Search and Filters */}
            <View style={styles.filterSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by student name..."
                        placeholderTextColor="#444"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery !== "" && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={16} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Mode Selector Chips */}
                <View style={styles.chips}>
                    {(["All", "Cash", "UPI", "Bank"] as const).map(mode => {
                        const active = selectedMode === mode;
                        return (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => handleModeSelect(mode)}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {mode}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {isLoading && !isRefreshing ? (
                <View style={styles.centerWrap}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : filteredPayments.length === 0 ? (
                <View style={styles.centerWrap}>
                    <Ionicons name="receipt-outline" size={64} color="#222" />
                    <Text style={styles.emptyText}>No transactions logged</Text>
                    <Text style={styles.emptySub}>
                        {payments.length === 0 
                            ? "No fee payments have been recorded in the database yet." 
                            : "No payments match your search filter."}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPayments}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    renderItem={({ item, index }) => {
                        const s = students.find(st => st.id === item.student_id);
                        const modeColor = getModeColor(item.payment_mode);
                        const modeIcon = getModeIcon(item.payment_mode);
                        
                        // Parse date
                        const paidDateObj = new Date(item.paid_at);
                        const formattedDate = paidDateObj.toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric"
                        });
                        const formattedTime = paidDateObj.toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit"
                        });

                        return (
                            <View style={styles.timelineRow}>
                                {/* Timeline vertical node */}
                                <View style={styles.timelineLeft}>
                                    {/* Line above (unless first item) */}
                                    <View style={[styles.timelineLine, index === 0 && { backgroundColor: "transparent" }]} />
                                    {/* Circle dot */}
                                    <View style={[styles.timelineDot, { borderColor: modeColor }]}>
                                        <View style={[styles.timelineDotInner, { backgroundColor: modeColor }]} />
                                    </View>
                                    {/* Line below (unless last item) */}
                                    <View style={[styles.timelineLine, index === filteredPayments.length - 1 && { backgroundColor: "transparent" }]} />
                                </View>

                                {/* Payment Log Card */}
                                <View style={styles.timelineRight}>
                                    <View style={styles.paymentCard}>
                                        <View style={styles.cardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.studentName}>{s?.name ?? "Student"}</Text>
                                                <Text style={styles.studentMeta}>
                                                    {s?.class}{s?.section ? `-${s?.section}` : ""}
                                                </Text>
                                            </View>
                                            <Text style={styles.amount}>₹{item.amount.toLocaleString("en-IN")}</Text>
                                        </View>

                                        {/* Transaction specifics */}
                                        <View style={styles.metaRow}>
                                            <View style={styles.metaBadge}>
                                                <Ionicons name="calendar-outline" size={12} color="#666" />
                                                <Text style={styles.metaText}>{item.month}</Text>
                                            </View>

                                            <View style={[styles.metaBadge, { backgroundColor: "rgba(255,255,255,0.02)" }]}>
                                                <Ionicons name={modeIcon} size={12} color={modeColor} />
                                                <Text style={[styles.metaText, { color: modeColor }]}>{item.payment_mode}</Text>
                                            </View>
                                        </View>

                                        {item.notes && (
                                            <View style={styles.notesWrap}>
                                                <Ionicons name="document-text-outline" size={13} color="#555" />
                                                <Text style={styles.notesText}>{item.notes}</Text>
                                            </View>
                                        )}

                                        {/* Date and Admin log */}
                                        <View style={styles.cardFooter}>
                                            <Text style={styles.dateText}>
                                                {formattedDate} · {formattedTime}
                                            </Text>
                                            {item.notes?.includes("Recorded by") && (
                                                <Text style={styles.adminText}>
                                                    {item.notes.split("Recorded by")[1]?.trim()}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
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
        paddingBottom: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(124,58,237,0.15)",
        alignItems: "center", justifyContent: "center",
    },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#7C3AED", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },

    filterSection: {
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 10,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        color: "#FFFFFF",
        fontSize: 14,
        height: "100%",
    },
    chips: {
        flexDirection: "row",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    chipActive: {
        backgroundColor: "rgba(124,58,237,0.15)",
        borderColor: "rgba(124,58,237,0.4)",
    },
    chipText: {
        color: "#666",
        fontSize: 12,
        fontWeight: "700",
    },
    chipTextActive: {
        color: "#7C3AED",
    },

    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    timelineRow: {
        flexDirection: "row",
        minHeight: 100,
    },
    timelineLeft: {
        width: 32,
        alignItems: "center",
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    timelineDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#080812",
        marginVertical: 4,
    },
    timelineDotInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    timelineRight: {
        flex: 1,
        paddingBottom: 16,
        paddingLeft: 12,
    },
    paymentCard: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        borderRadius: 18,
        padding: 16,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    studentName: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    studentMeta: {
        fontSize: 11,
        color: "#555",
        fontWeight: "600",
        marginTop: 2,
    },
    amount: {
        fontSize: 16,
        fontWeight: "900",
        color: "#00E676",
    },
    metaRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 12,
    },
    metaBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.04)",
    },
    metaText: {
        fontSize: 10,
        color: "#888",
        fontWeight: "700",
    },
    notesWrap: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        backgroundColor: "rgba(255,255,255,0.01)",
        borderRadius: 10,
        padding: 10,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.02)",
    },
    notesText: {
        flex: 1,
        fontSize: 11,
        color: "#777",
        lineHeight: 15,
        fontWeight: "500",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.03)",
        paddingTop: 10,
    },
    dateText: {
        fontSize: 10,
        color: "#444",
        fontWeight: "600",
    },
    adminText: {
        fontSize: 10,
        color: "#7C3AED",
        fontWeight: "700",
    },

    centerWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 12,
        paddingBottom: 100,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#666",
    },
    emptySub: {
        fontSize: 12,
        color: "#444",
        textAlign: "center",
        lineHeight: 18,
    },
});
