import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/context/AuthContext";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ChangePasswordScreen() {
    const { updatePassword, user } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Live validation rule checks
    const passwordRules = useMemo(() => {
        return {
            length: newPassword.length >= 8,
            uppercase: /[A-Z]/.test(newPassword),
            lowercase: /[a-z]/.test(newPassword),
            digitOrSpecial: /[\d\W]/.test(newPassword),
        };
    }, [newPassword]);

    const strength = useMemo(() => {
        const passed = Object.values(passwordRules).filter(Boolean).length;
        if (newPassword.length === 0) return { label: "Empty", color: "rgba(255,255,255,0.06)", percent: 0 };
        if (passed <= 1) return { label: "Weak", color: "#FF1744", percent: 25 };
        if (passed === 2) return { label: "Fair", color: "#FFB800", percent: 50 };
        if (passed === 3) return { label: "Good", color: "#00BCD4", percent: 75 };
        return { label: "Strong & Safe", color: "#00E676", percent: 100 };
    }, [passwordRules, newPassword]);

    const isPasswordValid = useMemo(() => {
        return Object.values(passwordRules).every(Boolean);
    }, [passwordRules]);

    const handleSubmit = async () => {
        setError("");
        if (!isPasswordValid) {
            setError("Password does not meet the safety requirements.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await updatePassword(newPassword);
            const dashboard = user?.role === "parent" 
                ? "/(parent)/dashboard" 
                : user?.role === "driver"
                ? "/(driver)/dashboard"
                : "/(admin)/dashboard";
            setTimeout(() => {
                router.replace(dashboard as any);
            }, 300);
        } catch (e: any) {
            setError(e.message || "Failed to update password.");
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#020410", "#080812"]} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <View style={styles.iconRow}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={32} color="#FFB800" />
                        </View>
                    </View>

                    <Text style={styles.title}>Secure Your Account</Text>
                    <Text style={styles.sub}>Please configure a strong password to continue using the application.</Text>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>NEW PASSWORD</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter secure password"
                                    placeholderTextColor="#444"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNew}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                    <Ionicons name={showNew ? "eye-off" : "eye"} size={16} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Visual Strength Meter */}
                        {newPassword.length > 0 && (
                            <View style={styles.strengthMeterContainer}>
                                <View style={styles.strengthRow}>
                                    <Text style={styles.strengthLabel}>Password Strength:</Text>
                                    <Text style={[styles.strengthValueText, { color: strength.color }]}>
                                        {strength.label}
                                    </Text>
                                </View>
                                <View style={styles.strengthBarBg}>
                                    <View style={[styles.strengthBarFill, { width: `${strength.percent}%`, backgroundColor: strength.color }]} />
                                </View>
                            </View>
                        )}

                        {/* Rules list */}
                        <View style={styles.rulesList}>
                            <RuleRow label="At least 8 characters" met={passwordRules.length} />
                            <RuleRow label="At least one uppercase letter (A-Z)" met={passwordRules.uppercase} />
                            <RuleRow label="At least one lowercase letter (a-z)" met={passwordRules.lowercase} />
                            <RuleRow label="At least one number or symbol (0-9, @, #...)" met={passwordRules.digitOrSpecial} />
                        </View>

                        <View style={[styles.inputGroup, { marginTop: 8 }]}>
                            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Repeat new password"
                                    placeholderTextColor="#444"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirm}
                                    onSubmitEditing={handleSubmit}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                    <Ionicons name={showConfirm ? "eye-off" : "eye"} size={16} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!!error && (
                            <View style={styles.errorBox}>
                                <Ionicons name="warning" size={13} color="#FF1744" style={{ marginTop: 2 }} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity 
                            onPress={handleSubmit} 
                            disabled={loading || !isPasswordValid || newPassword !== confirmPassword} 
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={loading || !isPasswordValid || newPassword !== confirmPassword 
                                    ? ["#333", "#222"] 
                                    : ["#FFB800", "#FF8C00"]}
                                style={styles.btn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#0A0A0F" />
                                ) : (
                                    <>
                                        <Text style={[
                                            styles.btnText, 
                                            (loading || !isPasswordValid || newPassword !== confirmPassword) && { color: "#666" }
                                        ]}>
                                            UPDATE PASSWORD
                                        </Text>
                                        <Ionicons 
                                            name="arrow-forward" 
                                            size={18} 
                                            color={loading || !isPasswordValid || newPassword !== confirmPassword ? "#666" : "#0A0A0F"} 
                                        />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function RuleRow({ label, met }: { label: string; met: boolean }) {
    return (
        <View style={styles.ruleRow}>
            <Ionicons 
                name={met ? "checkmark-circle" : "close-circle"} 
                size={14} 
                color={met ? "#00E676" : "#444"} 
            />
            <Text style={[styles.ruleText, met ? styles.ruleTextMet : styles.ruleTextUnmet]}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#020410" },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
    iconRow: { alignItems: "center", marginBottom: 24 },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: "rgba(255,184,0,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF", textAlign: "center", marginBottom: 8 },
    sub: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 32, paddingHorizontal: 12, lineHeight: 20 },
    card: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        paddingHorizontal: 14,
    },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 52, color: "#FFFFFF", fontSize: 15 },
    
    strengthMeterContainer: {
        marginBottom: 16,
    },
    strengthRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    strengthLabel: {
        fontSize: 11,
        color: "#666",
        fontWeight: "600",
    },
    strengthValueText: {
        fontSize: 12,
        fontWeight: "800",
    },
    strengthBarBg: {
        height: 6,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 3,
        overflow: "hidden",
    },
    strengthBarFill: {
        height: "100%",
        borderRadius: 3,
    },

    rulesList: {
        backgroundColor: "rgba(255,255,255,0.01)",
        borderRadius: 14,
        padding: 14,
        marginBottom: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.02)",
    },
    ruleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    ruleText: {
        fontSize: 11,
        fontWeight: "600",
    },
    ruleTextMet: {
        color: "#888",
    },
    ruleTextUnmet: {
        color: "#444",
    },

    errorBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "rgba(255,23,68,0.1)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.2)",
    },
    errorText: { color: "#FF1744", fontSize: 13, flex: 1, lineHeight: 18 },
    btn: {
        height: 56,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 4,
    },
    btnText: { fontSize: 15, fontWeight: "900", color: "#0A0A0F", letterSpacing: 2 },
});
