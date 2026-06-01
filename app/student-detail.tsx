import React, { useState, useCallback, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Alert, RefreshControl, Modal, TextInput,
    KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router, useLocalSearchParams } from "expo-router";
import { getFeeStatus, FEE_COLORS, formatDueDate, getCurrentMonthLabel, Payment } from "@/src/data/mockData";

function PaymentModal({
    visible,
    studentName,
    monthlyFee,
    onClose,
    onRecord,
}: {
    visible: boolean;
    studentName: string;
    monthlyFee: number;
    onClose: () => void;
    onRecord: (amount: number, mode: string, notes: string) => Promise<void>;
}) {
    const [amount, setAmount] = useState(String(monthlyFee));
    const [mode, setMode] = useState<"Cash" | "UPI" | "Bank">("Cash");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRecord = async () => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
            return;
        }
        setLoading(true);
        try {
            await onRecord(amt, mode, notes);
            onClose();
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={modal.overlay}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={modal.sheet}>
                        <View style={modal.handle} />
                        <Text style={modal.title}>Record Payment</Text>
                        <Text style={modal.sub}>{studentName}</Text>

                        <Text style={modal.label}>AMOUNT (₹)</Text>
                        <View style={modal.inputWrap}>
                            <Text style={modal.rupee}>₹</Text>
                            <TextInput
                                style={modal.input}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#333"
                            />
                        </View>

                        <Text style={modal.label}>PAYMENT MODE</Text>
                        <View style={modal.modeRow}>
                            {(["Cash", "UPI", "Bank"] as const).map(m => (
                                <TouchableOpacity
                                    key={m}
                                    style={[modal.modeBtn, mode === m && modal.modeBtnActive]}
                                    onPress={() => setMode(m)}
                                >
                                    <Text style={[modal.modeBtnText, mode === m && modal.modeBtnTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={modal.label}>NOTES (OPTIONAL)</Text>
                        <View style={modal.inputWrap}>
                            <TextInput
                                style={[modal.input, { paddingVertical: 8 }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="e.g. June 2026 fee"
                                placeholderTextColor="#333"
                                multiline
                            />
                        </View>

                        <TouchableOpacity onPress={handleRecord} disabled={loading} activeOpacity={0.88} style={{ marginTop: 16 }}>
                            <LinearGradient
                                colors={loading ? ["#333", "#222"] : ["#00C853", "#00E676"]}
                                style={modal.recordBtn}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                        <Text style={modal.recordBtnText}>RECORD PAYMENT</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
                            <Text style={modal.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

export default function StudentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { students, deleteStudent, refreshData, recordPayment, getStudentPayments, updateStudent } = useDatabase();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
    const [showPayModal, setShowPayModal] = useState(false);

    const student = students.find(s => s.id === id);

    useEffect(() => {
        if (id) {
            getStudentPayments(id).then(setPaymentHistory);
        }
    }, [id, students]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refreshData();
        if (id) {
            const h = await getStudentPayments(id);
            setPaymentHistory(h);
        }
        setIsRefreshing(false);
    }, [refreshData, id]);

    const handleRecordPayment = async (amount: number, mode: string, notes: string) => {
        if (!student) return;
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await recordPayment({
            student_id: student.id,
            amount,
            paid_at: now.toISOString(),
            month: getCurrentMonthLabel(),
            payment_mode: mode,
            notes: notes || null,
        });

        // Update fee_paid_until to next month
        await updateStudent(student.id, {
            fee_paid_until: nextMonth.toISOString().split("T")[0],
        });
        setShowPayModal(false);
    };

    const handleDelete = () => {
        Alert.alert(
            "Remove Student",
            `Remove ${student?.name} from the system?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteStudent(id!);
                            router.back();
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    },
                },
            ]
        );
    };

    if (!student) {
        return (
            <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: "#555" }}>Student not found.</Text>
            </View>
        );
    }

    const daysLeft = student.days_remaining ?? -999;
    const feeStatus = getFeeStatus(daysLeft);
    const colors = FEE_COLORS[feeStatus];
    const initials = student.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#00E676" colors={["#00E676"]} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#00E676" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => router.push({ pathname: "/edit-student", params: { id: student.id } })}
                    >
                        <Ionicons name="create-outline" size={18} color="#00E676" />
                    </TouchableOpacity>
                </View>

                {/* Hero */}
                <View style={styles.heroCard}>
                    <View style={[styles.avatarBig, { backgroundColor: colors.bg, borderColor: colors.ring }]}>
                        <Text style={[styles.avatarText, { color: colors.ring }]}>{initials}</Text>
                    </View>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.classText}>
                        {student.class}{student.section ? ` – Section ${student.section}` : ""}
                    </Text>

                    <View style={[styles.feeStatusBadge, { backgroundColor: colors.bg, borderColor: colors.ring + "55" }]}>
                        <View style={[styles.feeDot, { backgroundColor: colors.ring }]} />
                        <Text style={[styles.feeStatusText, { color: colors.text }]}>{colors.label}</Text>
                        {daysLeft >= 0 ? (
                            <Text style={[styles.feeDaysText, { color: colors.text }]}>
                                {daysLeft === 0 ? "• Due Today" : `• ${daysLeft}d left`}
                            </Text>
                        ) : (
                            <Text style={[styles.feeDaysText, { color: "#FF1744" }]}>
                                • {Math.abs(daysLeft)}d overdue
                            </Text>
                        )}
                    </View>

                    {/* Pay Button */}
                    <TouchableOpacity onPress={() => setShowPayModal(true)} activeOpacity={0.88} style={{ width: "100%", marginTop: 4 }}>
                        <LinearGradient
                            colors={["#00C853", "#00E676"]}
                            style={styles.payBtn}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="cash" size={18} color="#fff" />
                            <Text style={styles.payBtnText}>RECORD PAYMENT</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>STUDENT INFORMATION</Text>
                    <View style={styles.infoCard}>
                        <InfoRow icon="people" label="Parent / Guardian" value={student.parent_name} accent="#FFB800" />
                        {student.parent_phone && (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${student.parent_phone}`)}>
                                <InfoRow icon="call" label="Parent Phone" value={student.parent_phone} accent="#00E676" isLink />
                            </TouchableOpacity>
                        )}
                        {student.route && (
                            <InfoRow icon="map" label="Route" value={student.route.route_name} accent="#2E5A9F" />
                        )}
                        {student.bus && (
                            <InfoRow icon="bus" label="Bus Number" value={student.bus.bus_number} accent="#FFB800" />
                        )}
                        {student.boarding_stop && (
                            <InfoRow icon="location" label="Boarding Stop" value={student.boarding_stop} accent="#9C27B0" />
                        )}
                        <InfoRow icon="cash" label="Monthly Fee" value={`₹${student.monthly_fee.toLocaleString("en-IN")}`} accent="#00E676" />
                        <InfoRow icon="calendar" label="Fee Paid Until" value={formatDueDate(student.fee_paid_until)} accent="#2E5A9F" isLast />
                    </View>
                </View>

                {/* Payment History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PAYMENT HISTORY ({paymentHistory.length})</Text>
                    {paymentHistory.length === 0 ? (
                        <Text style={styles.emptyText}>No payments recorded yet.</Text>
                    ) : (
                        <View style={styles.infoCard}>
                            {paymentHistory.map((p, idx) => (
                                <View key={p.id} style={[styles.paymentRow, idx === paymentHistory.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.paymentIconWrap}>
                                        <Ionicons name="checkmark-circle" size={18} color="#00E676" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.paymentMonth}>{p.month}</Text>
                                        <Text style={styles.paymentDate}>
                                            {new Date(p.paid_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                            {" · "}{p.payment_mode}
                                        </Text>
                                        {p.notes && <Text style={styles.paymentNotes}>{p.notes}</Text>}
                                    </View>
                                    <Text style={styles.paymentAmount}>₹{p.amount.toLocaleString("en-IN")}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Delete */}
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
                    <Ionicons name="person-remove-outline" size={18} color="#FF1744" />
                    <Text style={styles.deleteBtnText}>Remove Student</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            <PaymentModal
                visible={showPayModal}
                studentName={student.name}
                monthlyFee={student.monthly_fee}
                onClose={() => setShowPayModal(false)}
                onRecord={handleRecordPayment}
            />
        </View>
    );
}

function InfoRow({ icon, label, value, accent, isLink, isLast }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    value: string;
    accent: string;
    isLink?: boolean;
    isLast?: boolean;
}) {
    return (
        <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIcon, { backgroundColor: accent + "22" }]}>
                <Ionicons name={icon} size={15} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={[styles.infoValue, isLink && { color: accent }]}>{value}</Text>
            </View>
            {isLink && <Ionicons name="call-outline" size={16} color={accent} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,230,118,0.1)", alignItems: "center", justifyContent: "center" },
    editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,230,118,0.1)", alignItems: "center", justifyContent: "center" },

    heroCard: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 24, padding: 24, alignItems: "center",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", marginBottom: 24, gap: 8,
    },
    avatarBig: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 3, marginBottom: 4 },
    avatarText: { fontSize: 28, fontWeight: "900" },
    studentName: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
    classText: { fontSize: 14, color: "#888", fontWeight: "600" },
    feeStatusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    feeDot: { width: 7, height: 7, borderRadius: 4 },
    feeStatusText: { fontSize: 12, fontWeight: "800" },
    feeDaysText: { fontSize: 11, fontWeight: "600" },
    payBtn: { height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    payBtnText: { fontSize: 14, fontWeight: "900", color: "#fff", letterSpacing: 1.5 },

    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 2, marginBottom: 12 },
    infoCard: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
    infoRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 12 },
    infoIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    infoLabel: { fontSize: 10, color: "#555", fontWeight: "700", letterSpacing: 1 },
    infoValue: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },

    paymentRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)", gap: 12 },
    paymentIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(0,230,118,0.15)", alignItems: "center", justifyContent: "center" },
    paymentMonth: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
    paymentDate: { fontSize: 11, color: "#666", marginTop: 2 },
    paymentNotes: { fontSize: 11, color: "#555", marginTop: 1 },
    paymentAmount: { fontSize: 16, fontWeight: "900", color: "#00E676" },

    emptyText: { fontSize: 13, color: "#444", fontWeight: "600", paddingVertical: 12 },
    deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16, backgroundColor: "rgba(255,23,68,0.1)", borderWidth: 1, borderColor: "rgba(255,23,68,0.2)", marginTop: 10 },
    deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#FF1744" },
});

const modal = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    sheet: { backgroundColor: "#0C0C1A", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 20 },
    title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", marginBottom: 4 },
    sub: { fontSize: 13, color: "#666", marginBottom: 20 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
    inputWrap: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
    rupee: { fontSize: 16, fontWeight: "800", color: "#FFB800", marginRight: 8 },
    input: { flex: 1, height: 48, color: "#FFFFFF", fontSize: 16 },
    modeRow: { flexDirection: "row", gap: 10 },
    modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", alignItems: "center" },
    modeBtnActive: { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.4)" },
    modeBtnText: { fontSize: 13, fontWeight: "700", color: "#666" },
    modeBtnTextActive: { color: "#00E676" },
    recordBtn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    recordBtnText: { fontSize: 14, fontWeight: "900", color: "#fff", letterSpacing: 1.5 },
    cancelBtn: { marginTop: 12, alignItems: "center" },
    cancelBtnText: { fontSize: 14, color: "#555", fontWeight: "600" },
});
