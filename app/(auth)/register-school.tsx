import React, { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, ScrollView, StatusBar, Dimensions, ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from "@/src/lib/supabase";

export default function RegisterSchoolScreen() {
    const [schoolName, setSchoolName] = useState("");
    const [adminName, setAdminName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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

    const handleRegister = async () => {
        setError("");
        if (!schoolName.trim() || !adminName.trim() || !email.trim() || !password.trim()) {
            setError("All fields are required.");
            shake();
            return;
        }

        setLoading(true);
        try {
            if (isSupabaseConfigured) {
                // Secure school registration flow via Edge Function
                const targetUrl = `${supabaseUrl}/functions/v1/register-school`;
                console.log(`[RegisterSchool] Sending request to Edge Function at: ${targetUrl}`);
                
                const response = await fetch(targetUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${supabaseAnonKey}`
                    },
                    body: JSON.stringify({
                        school_name: schoolName.trim(),
                        admin_name: adminName.trim(),
                        email: email.trim().toLowerCase(),
                        password: password
                    })
                });

                console.log(`[RegisterSchool] Edge Function responded with status: ${response.status}`);
                
                let resultText = "";
                try {
                    resultText = await response.text();
                } catch (textErr: any) {
                    console.error("[RegisterSchool] Failed to read response body text:", textErr);
                }

                let result: any = {};
                try {
                    if (resultText) {
                        result = JSON.parse(resultText);
                    }
                } catch (jsonErr: any) {
                    console.error(`[RegisterSchool] Failed to parse JSON response. Raw text: "${resultText}"`, jsonErr);
                    throw new Error(`Server returned invalid response (Status ${response.status}). Please check browser console.`);
                }

                if (!response.ok) {
                    console.error("[RegisterSchool] Edge Function returned an error response:", result);
                    throw new Error(result.error || `Failed to register school (Status ${response.status}).`);
                }

                console.log("[RegisterSchool] School successfully registered:", result);
            } else {
                // Mock success in Sandbox
                console.log("[RegisterSchool] Supabase not configured. Mocking success in Sandbox.");
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            setSuccess(true);
        } catch (e: any) {
            console.error("[RegisterSchool] Registration exception caught:", e);
            setError(e.message || "Registration failed. Please try again.");
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
                        
                        {/* Header back button */}
                        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={18} color="#FFB800" />
                            <Text style={styles.backLinkText}>Back to Login</Text>
                        </TouchableOpacity>

                        {/* Title */}
                        <View style={styles.titleArea}>
                            <Text style={styles.title}>Register School</Text>
                            <Text style={styles.tagline}>CREATE NEW MULTI-TENANT SPACE</Text>
                        </View>

                        {success ? (
                            <View style={styles.successCard}>
                                <Ionicons name="checkmark-circle" size={48} color="#00E676" />
                                <Text style={styles.successTitle}>School Registered!</Text>
                                <Text style={styles.successSub}>
                                    Your multi-tenant school space was created successfully. You can now sign in with your admin credentials.
                                </Text>
                                <TouchableOpacity style={styles.goToLoginBtn} onPress={() => router.replace("/(auth)/login")}>
                                    <Text style={styles.goToLoginBtnText}>GO TO SIGN IN</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                                {/* School Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>SCHOOL NAME *</Text>
                                    <View style={styles.inputWrap}>
                                        <Ionicons name="school-outline" size={16} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Oakridge International School"
                                            placeholderTextColor="#333"
                                            value={schoolName}
                                            onChangeText={setSchoolName}
                                        />
                                    </View>
                                </View>

                                {/* Admin Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>ADMIN FULL NAME *</Text>
                                    <View style={styles.inputWrap}>
                                        <Ionicons name="person-outline" size={16} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. John Doe"
                                            placeholderTextColor="#333"
                                            value={adminName}
                                            onChangeText={setAdminName}
                                        />
                                    </View>
                                </View>

                                {/* Email */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>ADMIN EMAIL *</Text>
                                    <View style={styles.inputWrap}>
                                        <Ionicons name="mail-outline" size={16} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="admin@school.edu"
                                            placeholderTextColor="#333"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                {/* Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>PASSWORD *</Text>
                                    <View style={styles.inputWrap}>
                                        <Ionicons name="lock-closed-outline" size={16} color="#555" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="••••••••"
                                            placeholderTextColor="#333"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={16} color="#555" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Error */}
                                {!!error && (
                                    <View style={styles.errorBox}>
                                        <Ionicons name="warning" size={13} color="#FF1744" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                {/* Register Button */}
                                <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.88}>
                                    <LinearGradient
                                        colors={loading ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                                        style={styles.registerBtn}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#0A0A0F" />
                                        ) : (
                                            <>
                                                <Ionicons name="create-outline" size={18} color="#0A0A0F" />
                                                <Text style={styles.registerBtnText}>CREATE TENANT SPACE</Text>
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

    titleArea: { alignItems: "center", marginBottom: 24 },
    title: { fontSize: 32, fontWeight: "900", color: "#FFFFFF" },
    tagline: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginTop: 6 },

    card: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 28, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
    
    successCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 28, padding: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", alignItems: "center", gap: 16 },
    successTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
    successSub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
    goToLoginBtn: { height: 50, borderRadius: 14, backgroundColor: "#00E676", width: "100%", alignItems: "center", justifyContent: "center", marginTop: 10 },
    goToLoginBtnText: { fontSize: 13, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1.5 },

    inputGroup: { marginBottom: 14 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5, marginBottom: 8 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", paddingHorizontal: 14 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 50, color: "#FFFFFF", fontSize: 14 },

    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,23,68,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,23,68,0.2)" },
    errorText: { color: "#FF1744", fontSize: 13, flex: 1 },

    registerBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
    registerBtnText: { fontSize: 14, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1.5 },

    bottomTag: { textAlign: "center", color: "#1A2A40", fontSize: 11, marginTop: 28, fontWeight: "600" }
});
