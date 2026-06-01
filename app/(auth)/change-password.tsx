import React, { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";

export default function ChangePasswordScreen() {
    const { updatePassword } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setError("");
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await updatePassword(newPassword);
        } catch (e: any) {
            setError(e.message || "Failed to update password.");
        } finally {
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
                            <Ionicons name="lock-closed" size={32} color="#FFB800" />
                        </View>
                    </View>

                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.sub}>You need to set a new password before continuing.</Text>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>NEW PASSWORD</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Min. 8 characters"
                                    placeholderTextColor="#333"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNew}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                    <Ionicons name={showNew ? "eye-off" : "eye"} size={16} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CONFIRM PASSWORD</Text>
                            <View style={styles.inputWrap}>
                                <Ionicons name="lock-closed-outline" size={16} color="#555" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Repeat password"
                                    placeholderTextColor="#333"
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
                                <Ionicons name="warning" size={13} color="#FF1744" />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.88}>
                            <LinearGradient
                                colors={loading ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                                style={styles.btn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#0A0A0F" />
                                ) : (
                                    <>
                                        <Text style={styles.btnText}>SET PASSWORD</Text>
                                        <Ionicons name="arrow-forward" size={18} color="#0A0A0F" />
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
    sub: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 32 },
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
    errorBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255,23,68,0.1)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.2)",
    },
    errorText: { color: "#FF1744", fontSize: 13, flex: 1 },
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
