import React, { useRef, useState, useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet, View, Text, TouchableOpacity, Animated,
    PanResponder, Dimensions, Platform, Pressable, ScrollView
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import OnboardingOverlay from "@/src/components/OnboardingOverlay";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DriverLayout() {
    const { user, signOut, setOnboardingComplete } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    const [isOpen, setIsOpen] = useState(false);
    const [schoolName, setSchoolName] = useState("Fleet Manager Space");
    const [showTutorial, setShowTutorial] = useState(false);

    // Dynamic school name lookup
    useEffect(() => {
        const tenantId = user?.tenant_id;
        if (!tenantId) return;
        async function loadSchoolName() {
            try {
                const { data, error } = await supabase
                    .from("tenants")
                    .select("school_name")
                    .eq("id", tenantId)
                    .single();
                if (data && data.school_name) {
                    setSchoolName(data.school_name);
                }
            } catch (err) {
                console.log("Failed to load school name:", err);
            }
        }
        loadSchoolName();
    }, [user?.tenant_id]);

    // Animated values for sidebar drawer and backdrop opacity
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Draggable position coordinates for the floating navigation FAB
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    
    const pan = useRef(new Animated.ValueXY({ x: screenWidth - 76, y: 220 })).current;
    const lastOffset = useRef({ x: screenWidth - 76, y: 220 });

    useEffect(() => {
        pan.addListener((value) => {
            lastOffset.current = value;
        });
        return () => pan.removeAllListeners();
    }, []);

    // Slide drawer animation controls
    const openSidebar = () => {
        setIsOpen(true);
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true })
        ]).start();
    };

    const closeSidebar = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -300, duration: 220, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true })
        ]).start(() => setIsOpen(false));
    };

    const toggleSidebar = () => {
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    };

    // PanResponder for dragging and swiping the floating navigation FAB
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
            },
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: lastOffset.current.x,
                    y: lastOffset.current.y
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();
                
                const distanceMoved = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
                
                if (distanceMoved < 8) {
                    toggleSidebar();
                } else {
                    const isSwipeRight = gestureState.vx > 0.4 && lastOffset.current.x < screenWidth / 2;
                    const isSwipeLeft = gestureState.vx < -0.4 && lastOffset.current.x > screenWidth / 2;
                    
                    if (isSwipeRight || isSwipeLeft) {
                        openSidebar();
                    }

                    let targetY = lastOffset.current.y;
                    if (targetY < 50) targetY = 50;
                    if (targetY > screenHeight - 120) targetY = screenHeight - 120;

                    const endX = lastOffset.current.x < screenWidth / 2 ? 16 : screenWidth - 76;
                    
                    Animated.parallel([
                        Animated.spring(pan.x, {
                            toValue: endX,
                            useNativeDriver: false,
                            friction: 6,
                            tension: 40
                        }),
                        Animated.spring(pan.y, {
                            toValue: targetY,
                            useNativeDriver: false,
                            friction: 6,
                            tension: 40
                        })
                    ]).start();
                }
            }
        })
    ).current;

    const currentRoute = segments[segments.length - 1] || "dashboard";

    const navigateTo = (path: string) => {
        closeSidebar();
        router.replace(`/(driver)/${path}`);
    };

    const sidebarItems = [
        { id: "dashboard", label: "Dashboard", icon: "grid" },
        { id: "attendance", label: "Mark Attendance", icon: "calendar" },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.contentWrap}>
                <Slot />
            </View>

            {isOpen && (
                <Pressable style={styles.backdrop} onPress={closeSidebar}>
                    <Animated.View style={[styles.backdropBg, { opacity: backdropOpacity }]} />
                </Pressable>
            )}

            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <LinearGradient colors={["#0C0D21", "#070814"]} style={StyleSheet.absoluteFill} />
                
                <View style={styles.sidebarHeader}>
                    <View style={styles.logoRing}>
                        <Ionicons name="bus" size={24} color="#FFB800" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.schoolLabel} numberOfLines={1}>{schoolName.toUpperCase()}</Text>
                        <Text style={styles.roleLabel}>DRIVER CONSOLE</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>FLEET ACTIONS</Text>
                    {sidebarItems.map(item => {
                        const isActive = currentRoute === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.navItem, isActive && styles.navItemActive]}
                                onPress={() => navigateTo(item.id)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={isActive ? (item.icon as any) : `${item.icon}-outline`}
                                    size={20}
                                    color={isActive ? "#0A0A0F" : "#888"}
                                    style={styles.navIcon}
                                />
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                                    {item.label}
                                </Text>
                                {isActive && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <TouchableOpacity
                        style={styles.replayBtn}
                        onPress={async () => {
                            closeSidebar();
                            if (user?.id) {
                                await AsyncStorage.removeItem(`onboarding_seen_${user.id}`);
                            }
                            setShowTutorial(true);
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="school-outline" size={18} color="#7C3AED" />
                        <Text style={styles.replayText}>REPLAY TUTORIAL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.8}>
                        <Ionicons name="log-out-outline" size={20} color="#FF1744" />
                        <Text style={styles.logoutText}>SIGN OUT</Text>
                    </TouchableOpacity>
                    <Text style={styles.versionTag}>Fleet Manager v1.0</Text>
                </View>
            </Animated.View>

            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.floatingSymbol,
                    {
                        transform: [
                            { translateX: pan.x },
                            { translateY: pan.y }
                        ]
                    }
                ]}
            >
                <LinearGradient
                    colors={isOpen ? ["#FF1744", "#D50000"] : ["#FFB800", "#FF8C00"]}
                    style={styles.symbolGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons
                        name={isOpen ? "close" : "menu"}
                        size={24}
                        color={isOpen ? "#FFFFFF" : "#0A0A0F"}
                    />
                </LinearGradient>
            </Animated.View>

            {/* Replay onboarding tutorial */}
            <OnboardingOverlay
                role="driver"
                visible={showTutorial}
                onComplete={async () => {
                    await setOnboardingComplete();
                    setShowTutorial(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    contentWrap: { flex: 1 },
    
    backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 99 },
    backdropBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 3, 10, 0.75)" },

    sidebar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 300,
        backgroundColor: "#070814",
        zIndex: 100,
        borderRightWidth: 1,
        borderRightColor: "rgba(255,184,0,0.08)",
        paddingTop: Platform.OS === "ios" ? 60 : 40,
        paddingBottom: 20,
    },
    sidebarHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.04)"
    },
    logoRing: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "rgba(255,184,0,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.18)",
        alignItems: "center",
        justifyContent: "center"
    },
    schoolLabel: { fontSize: 13, fontWeight: "900", color: "#FFFFFF", letterSpacing: 0.5 },
    roleLabel: { fontSize: 10, color: "#FFB800", fontWeight: "800", letterSpacing: 1.5, marginTop: 2 },

    sidebarScroll: { paddingHorizontal: 16, paddingTop: 24 },
    sectionTitle: { fontSize: 9, fontWeight: "800", color: "#444", letterSpacing: 2, marginBottom: 12, paddingHorizontal: 10 },
    
    navItem: {
        flexDirection: "row",
        alignItems: "center",
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 6,
        position: "relative"
    },
    navItemActive: {
        backgroundColor: "#FFB800",
    },
    navIcon: { marginRight: 12 },
    navLabel: { fontSize: 13, fontWeight: "700", color: "#888", flex: 1 },
    navLabelActive: { color: "#0A0A0F", fontWeight: "bold" },
    activeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#0A0A0F",
        marginRight: 4
    },

    sidebarFooter: {
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.04)"
    },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "rgba(255,23,68,0.08)",
        borderRadius: 12,
        height: 46,
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.15)"
    },
    logoutText: { fontSize: 12, fontWeight: "900", color: "#FF1744", letterSpacing: 1 },
    versionTag: { textAlign: "center", fontSize: 10, color: "#222", marginTop: 12, fontWeight: "600" },
    replayBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "rgba(124,58,237,0.08)",
        borderRadius: 12,
        height: 46,
        borderWidth: 1,
        borderColor: "rgba(124,58,237,0.15)",
        marginBottom: 10,
    },
    replayText: { fontSize: 12, fontWeight: "900", color: "#7C3AED", letterSpacing: 1 },

    floatingSymbol: {
        position: "absolute",
        width: 60,
        height: 60,
        zIndex: 101,
        ...Platform.select({
            web: {
                cursor: "grab",
                userSelect: "none"
            } as any
        })
    },
    symbolGrad: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.15)",
        ...Platform.select({
            web: {
                boxShadow: "0 10px 24px rgba(0,0,0,0.5)"
            },
            default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 12
            }
        })
    }
});
