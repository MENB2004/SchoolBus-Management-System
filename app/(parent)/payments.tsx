import React, { useState, useEffect, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";
import { getFeeStatus, FEE_COLORS, formatDueDate } from "@/src/data/mockData";

export default function ParentPaymentsScreen() {
    const { user } = useAuth();
    const { students, getStudentPayments, refreshData } = useDatabase();

    const [childrenIds, setChildrenIds] = useState<string[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load parent-child associations
    useEffect(() => {
        const loadChildren = async () => {
            if (!isSupabaseConfigured) {
                const ids = students.slice(0, 2).map(s => s.id);
                setChildrenIds(ids);
                if (ids.length > 0) setSelectedChildId(ids[0]);
                return;
            }
            try {
                const { data } = await supabase
                    .from("parent_students")
                    .select("student_id")
                    .eq("parent_id", user?.id);
                const ids = (data ?? []).map((r: any) => r.student_id);
                setChildrenIds(ids);
                if (ids.length > 0) setSelectedChildId(ids[0]);
            } catch (e) {
                console.log("Error loading children:", e);
            }
        };
        loadChildren();
    }, [students]);

    // Load payments for selected child
    useEffect(() => {
        if (!selectedChildId) return;
        const loadPayments = async () => {
            setLoading(true);
            try {
                const records = await getStudentPayments(selectedChildId);
                setPaymentRecords(records);
            } catch (e) {
                console.log("Error loading payments:", e);
            } finally {
                setLoading(false);
            }
        };
        loadPayments();
    }, [selectedChildId]);

    const myChildren = useMemo(() =>
        students.filter(s => childrenIds.includes(s.id)),
        [students, childrenIds]
    );

    const selectedChild = students.find(s => s.id === selectedChildId);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        if (selectedChildId) {
            const records = await getStudentPayments(selectedChildId);
            setPaymentRecords(records);
        }
        setIsRefreshing(false);
    };

    const totalPaid = paymentRecords.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <Text style={styles.sectionLabel}>FEE RECORDS</Text>
                <Text style={styles.title}>Payments</Text>
            </View>

            {/* Child Selector */}
            {myChildren.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
                    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20 }}>
                        {myChildren.map(child => (
                            <TouchableOpacity
                                key={child.id}
                                style={[styles.childChip, selectedChildId === child.id && styles.childChipActive]}
                                onPress={() => setSelectedChildId(child.id)}
                            >
                                <Text style={[styles.childChipText, selectedChildId === child.id && styles.childChipTextActive]}>
                                    {child.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Fee Summary Card */}
            {selectedChild && (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.summaryAmount}>₹{selectedChild.monthly_fee.toLocaleString("en-IN")}</Text>
                        <Text style={styles.summaryLabel}>Monthly Fee</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRight}>
                        <Text style={[styles.summaryAmount, { color: "#00E676", fontSize: 18 }]}>
                            ₹{totalPaid.toLocaleString("en-IN")}
                        </Text>
                        <Text style={styles.summaryLabel}>Total Paid</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRight}>
                        <Text style={[styles.summaryAmount, { color: "#FFB800", fontSize: 14 }]}>
                            {formatDueDate(selectedChild.fee_paid_until)}
                        </Text>
                        <Text style={styles.summaryLabel}>Paid Until</Text>
                    </View>
                </View>
            )}

            {loading ? (
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
                    {paymentRecords.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="cash-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>No Payment Records</Text>
                            <Text style={styles.emptySub}>Payment history will appear here once the school records your payments.</Text>
                        </View>
                    ) : (
                        paymentRecords.map((payment, index) => {
                            const dateStr = new Date(payment.paid_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric"
                            });
                            const modeIcons: Record<string, any> = {
                                cash: "cash-outline",
                                upi: "phone-portrait-outline",
                                bank: "business-outline",
                                cheque: "document-outline",
                            };
                            return (
                                <View key={payment.id || index} style={styles.paymentCard}>
                                    <View style={styles.paymentIcon}>
                                        <Ionicons 
                                            name={modeIcons[payment.payment_mode] ?? "cash-outline"} 
                                            size={18} color="#00E676" 
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.paymentDate}>{dateStr}</Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                                            <View style={styles.modeBadge}>
                                                <Text style={styles.modeText}>{(payment.payment_mode ?? "cash").toUpperCase()}</Text>
                                            </View>
                                            {payment.notes && (
                                                <Text style={styles.paymentNotes} numberOfLines={1}>{payment.notes}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.paymentAmount}>₹{(payment.amount ?? 0).toLocaleString("en-IN")}</Text>
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
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },

    childSelector: { marginBottom: 16 },
    childChip: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    childChipActive: { backgroundColor: "rgba(255,184,0,0.15)", borderColor: "rgba(255,184,0,0.4)" },
    childChipText: { fontSize: 13, fontWeight: "700", color: "#666" },
    childChipTextActive: { color: "#FFB800" },

    summaryCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 18, marginHorizontal: 20, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    },
    summaryLeft: { flex: 1, alignItems: "center" },
    summaryRight: { flex: 1, alignItems: "center" },
    summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.08)" },
    summaryAmount: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
    summaryLabel: { fontSize: 9, fontWeight: "700", color: "#555", letterSpacing: 1, marginTop: 4 },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444", textAlign: "center", paddingHorizontal: 20 },

    paymentCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 16, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    },
    paymentIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "rgba(0,230,118,0.1)",
        alignItems: "center", justifyContent: "center",
        borderWidth: 1, borderColor: "rgba(0,230,118,0.2)",
    },
    paymentDate: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    paymentNotes: { fontSize: 11, color: "#555", flex: 1 },
    paymentAmount: { fontSize: 16, fontWeight: "900", color: "#00E676" },
    modeBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
        backgroundColor: "rgba(255,184,0,0.1)",
    },
    modeText: { fontSize: 8, fontWeight: "900", color: "#FFB800", letterSpacing: 0.5 },
});
