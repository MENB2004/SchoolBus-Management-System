import React, { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, ScrollView, StatusBar, ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        ]).start();
    }, []);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: Platform.OS !== "web" }),
        ]).start();
    };

    const handleReset = async () => {
        setError("");
        if (!email.trim()) {
            setError("Please enter your email address.");
            shake();
            return;
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Please enter a valid email address.");
            shake();
            return;
        }

        setLoading(true);
        try {
            if (isSupabaseConfigured) {
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                    email.trim().toLowerCase(),
                    { redirectTo: undefined }
                );
                if (resetError) throw resetError;
            } else {
                // Mock sandbox mode
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            setSuccess(true);
        } catch (e: any) {
            setError(e.message || "Failed to send reset email. Please try again.");
            shake();
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#020410", "#080812", "#040614"]} style={StyleSheet.absoluteFill} />

            <View style={styles.glowTop} />
            <View style={styles.glowBottom} />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        
                        {/* Back link */}
                        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={18} color="#FFB800" />
                            <Text style={styles.backLinkText}>Back to Login</Text>
                        </TouchableOpacity>

                        {/* Icon */}
                        <View style={styles.iconRow}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="mail" size={32} color="#FFB800" />
                            </View>
                        </View>

                        {/* Title */}
                        <View style={styles.titleArea}>
                            <Text style={styles.title}>Forgot Password</Text>
                            <Text style={styles.tagline}>RESET VIA EMAIL</Text>
                        </View>

                        {success ? (
                            <View style={styles.successCard}>
                                <Ionicons name="checkmark-circle" size={48} color="#00E676" />
                                <Text style={styles.successTitle}>Reset Email Sent!</Text>
                                <Text style={styles.successSub}>
                                    We've sent a password reset link to{"\n"}
                                    <Text style={{ fontWeight: "800", color: "#FFB800" }}>{email}</Text>
                                    {"\n\n"}Check your inbox and follow the link to set a new password.
                                </Text>
                                <TouchableOpacity style={styles.goToLoginBtn} onPress={() => router.replace("/(auth)/login")}>
                                    <Text style={styles.goToLoginBtnText}>BACK TO SIGN IN</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                                <Text style={styles.cardDescription}>
                                    Enter your registered email address and we'll send you a link to reset your password.
                                </Text>

                                {/* Email Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>EMAIL ADDRESS *</Text>
                                    <View style={styles.inputWrap}>
                                        <Ionicons name="mail-outline" size={16} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="your.email@school.edu"
                                            placeholderTextColor="#333"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            onSubmitEditing={handleReset}
                                        />
                                    </View>
                                </View>

                                {/* Error */}
                                {!!error && (
                                    <View style={styles.errorBox}>
                                        <Ionicons name="warning" size={13} color="#FF1744" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                {/* Submit Button */}
                                <TouchableOpacity onPress={handleReset} disabled={loading} activeOpacity={0.88}>
                                    <LinearGradient
                                        colors={loading ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                                        style={styles.resetBtn}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#0A0A0F" />
                                        ) : (
                                            <>
                                                <Ionicons name="send-outline" size={18} color="#0A0A0F" />
                                                <Text style={styles.resetBtnText}>SEND RESET LINK</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        <Text style={styles.bottomTag}>Bus Management System v1.0</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#020410" },
    scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
    glowTop: { position: "absolute", width: 320, height: 320, borderRadius: 160, top: -120, left: -80, backgroundColor: "rgba(255,184,0,0.05)" },
    glowBottom: { position: "absolute", width: 260, height: 260, borderRadius: 130, bottom: 40, right: -100, backgroundColor: "rgba(30,58,95,0.2)" },
    
    backLink: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
    backLinkText: { fontSize: 13, color: "#FFB800", fontWeight: "700" },

    iconRow: { alignItems: "center", marginBottom: 16 },
    iconCircle: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: "rgba(255,184,0,0.1)",
        borderWidth: 1, borderColor: "rgba(255,184,0,0.2)",
        alignItems: "center", justifyContent: "center",
    },

    titleArea: { alignItems: "center", marginBottom: 24 },
    title: { fontSize: 28, fontWeight: "900", color: "#FFFFFF" },
    tagline: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginTop: 6 },

    card: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 28, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    cardDescription: { fontSize: 13, color: "#666", lineHeight: 20, marginBottom: 20 },

    successCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 28, padding: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 16 },
    successTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
    successSub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
    goToLoginBtn: { height: 50, borderRadius: 14, backgroundColor: "#00E676", width: "100%", alignItems: "center", justifyContent: "center", marginTop: 10 },
    goToLoginBtnText: { fontSize: 13, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1.5 },

    inputGroup: { marginBottom: 14 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", paddingHorizontal: 14 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 52, color: "#FFFFFF", fontSize: 15 },

    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,23,68,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,23,68,0.2)" },
    errorText: { color: "#FF1744", fontSize: 13, flex: 1 },

    resetBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
    resetBtnText: { fontSize: 14, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1.5 },

    bottomTag: { textAlign: "center", color: "#1A2A40", fontSize: 11, marginTop: 28, fontWeight: "600" },
});
