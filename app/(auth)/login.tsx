import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ScrollView,
    StatusBar,
    Dimensions,
    Image,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/src/lib/supabase";


const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
    const { user, signInMockUser } = useAuth();
    const { drivers, parentProfiles } = useDatabase();
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: Platform.OS !== "web" }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 80,
                useNativeDriver: Platform.OS !== "web",
            }),
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

    const handleLogin = async () => {
        setError("");
        setLoading(true);
        try {
            const inputVal = emailOrUsername.trim();
            if (!inputVal) {
                setError("Please enter your email or username.");
                shake();
                return;
            }

            if (!password) {
                setError("Please enter your password.");
                shake();
                return;
            }

            // Normalizing username: if it has no '@', append '@school.com'
            let normalizedEmail = inputVal.toLowerCase();
            if (!normalizedEmail.includes("@")) {
                normalizedEmail = `${normalizedEmail}@school.com`;
            }

            if (!isSupabaseConfigured) {
                const username = inputVal.toLowerCase();
                if (username === "admin" && password === "admin123") {
                    signInMockUser?.("admin", "admin@school.com", "Mock Admin", false);
                    return;
                }
                
                // Check in local drivers
                const matchedDriver = drivers.find(d => d.username?.toLowerCase() === username);
                if (matchedDriver && password === "school123") {
                    signInMockUser?.("driver", `${username}@school.com`, matchedDriver.name, true);
                    return;
                }

                // Check in local parent profiles
                const matchedParent = parentProfiles.find(p => p.username?.toLowerCase() === username);
                if (matchedParent && password === "school123") {
                    signInMockUser?.("parent", `${username}@school.com`, matchedParent.name, true);
                    return;
                }

                setError("Mock Mode: Use admin/admin123, ramesh/school123, or rajesh/school123");
                shake();
                return;
            }

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (authError) {
                setError(authError.message || "Invalid credentials.");
                shake();
                return;
            }

            // Navigation is handled by RouteGuard in _layout.tsx via onAuthStateChange
        } catch (e: any) {
            setError(e.message || "Something went wrong.");
            shake();
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Dark navy gradient bg */}
            <LinearGradient
                colors={["#020410", "#080812", "#040614"]}
                style={StyleSheet.absoluteFill}
            />

            {/* Yellow glow top */}
            <View style={styles.glowTop} />
            {/* Blue glow bottom */}
            <View style={styles.glowBottom} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: scaleAnim },
                            ],
                        }}
                    >
                        {/* ── Logo ──────────────────────────────────────── */}
                        <View style={styles.logoArea}>
                            <View style={styles.logoWrapper}>
                                <Image
                                    source={require("@/assets/images/logo.png")}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.appName}>BUS</Text>
                            <Text style={styles.appNameAccent}>MANAGER</Text>
                            <Text style={styles.tagline}>SCHOOL FLEET COMMAND</Text>
                        </View>

                        {/* ── Login Card ────────────────────────────────── */}
                        <Animated.View
                            style={[
                                styles.card,
                                { transform: [{ translateX: shakeAnim }] },
                            ]}
                        >
                            <Text style={styles.cardTitle}>Sign In</Text>
                            <Text style={styles.cardSub}>
                                Access your fleet dashboard
                            </Text>

                            {/* Email/Username input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>EMAIL OR USERNAME</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons
                                        name="person-outline"
                                        size={16}
                                        color="#555"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="yourname or mail@school.edu"
                                        placeholderTextColor="#333"
                                        value={emailOrUsername}
                                        onChangeText={setEmailOrUsername}
                                        autoCapitalize="none"
                                        returnKeyType="next"
                                    />
                                </View>
                            </View>

                            {/* Password input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>PASSWORD</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={16}
                                        color="#555"
                                        style={styles.inputIcon}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#333"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        returnKeyType="done"
                                        onSubmitEditing={handleLogin}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={16}
                                            color="#555"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Error */}
                            {!!error && (
                                <View style={styles.errorBox}>
                                    <Ionicons
                                        name="warning"
                                        size={13}
                                        color="#FF1744"
                                    />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Login button */}
                            <TouchableOpacity
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={
                                        loading
                                            ? ["#333", "#222"]
                                            : ["#FFB800", "#FF8C00"]
                                    }
                                    style={styles.loginBtn}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <LoadingDots />
                                    ) : (
                                        <>
                                            <Ionicons name="bus" size={18} color="#0A0A0F" />
                                            <Text style={styles.loginBtnText}>
                                                LET'S RIDE
                                            </Text>
                                            <Ionicons
                                                name="arrow-forward"
                                                size={18}
                                                color="#0A0A0F"
                                            />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>


                        {/* Register School Link */}
                        <TouchableOpacity 
                            style={{ alignSelf: "center", marginTop: 20 }}
                            onPress={() => router.push("/(auth)/register-school")}
                        >
                            <Text style={{ color: "#FFB800", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 }}>
                                REGISTER A NEW SCHOOL
                            </Text>
                        </TouchableOpacity>

                        {/* Bottom tag */}
                        <Text style={styles.bottomTag}>
                            Bus Management System v1.0
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function LoadingDots() {
    const a = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== "web" }),
                Animated.timing(a, { toValue: 0, duration: 500, useNativeDriver: Platform.OS !== "web" }),
            ])
        ).start();
    }, []);
    return (
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            {[0, 150, 300].map((delay, i) => (
                <Animated.View
                    key={i}
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#0A0A0F",
                        opacity: a,
                    }}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#020410" },
    scroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 48,
    },

    // Glow orbs
    glowTop: {
        position: "absolute",
        width: 320,
        height: 320,
        borderRadius: 160,
        top: -120,
        left: -80,
        backgroundColor: "rgba(255,184,0,0.07)",
    },
    glowBottom: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        bottom: 40,
        right: -100,
        backgroundColor: "rgba(30,58,95,0.25)",
    },

    // Logo
    logoArea: { alignItems: "center", marginBottom: 32 },
    logoWrapper: {
        width: 120,
        height: 120,
        borderRadius: 30,
        backgroundColor: "rgba(255,184,0,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    logoImage: { width: 100, height: 100 },
    appName: {
        fontSize: 40,
        fontWeight: "900",
        color: "#FFFFFF",
        letterSpacing: 6,
        lineHeight: 44,
    },
    appNameAccent: {
        fontSize: 40,
        fontWeight: "900",
        color: "#FFB800",
        letterSpacing: 6,
        lineHeight: 44,
    },
    tagline: {
        fontSize: 11,
        fontWeight: "700",
        color: "#2A3A5C",
        letterSpacing: 3,
        marginTop: 10,
    },

    // Card
    card: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    cardTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
    cardSub: { fontSize: 13, color: "#555", marginTop: 4, marginBottom: 24 },

    // Inputs
    inputGroup: { marginBottom: 16 },
    label: {
        fontSize: 10,
        fontWeight: "800",
        color: "#555",
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
        paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 52, color: "#FFFFFF", fontSize: 15 },

    // Error
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

    // Login button
    loginBtn: {
        height: 56,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 4,
        ...Platform.select({
            web: {
                boxShadow: "0 8px 24px rgba(255,184,0,0.4)",
            },
            default: {
                shadowColor: "#FFB800",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 10,
            },
        }),
    },
    loginBtnText: {
        fontSize: 15,
        fontWeight: "900",
        color: "#0A0A0F",
        letterSpacing: 2,
    },

    bottomTag: {
        textAlign: "center",
        color: "#1A2A40",
        fontSize: 11,
        marginTop: 28,
        fontWeight: "600",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: "#FFB800",
    },
    tabText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#666",
        letterSpacing: 1,
    },
    activeTabText: {
        color: "#0A0A0F",
    },
    fieldHelp: {
        fontSize: 11,
        color: "#3F4F72",
        marginTop: 6,
        lineHeight: 14,
        fontWeight: "500",
    },
    editPhoneLink: {
        fontSize: 11,
        fontWeight: "800",
        color: "#FFB800",
        textDecorationLine: "underline",
    },
});

