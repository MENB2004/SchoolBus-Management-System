import React, { useRef, useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getOnboardingSteps, OnboardingStep } from "@/src/data/onboardingSteps";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = {
    role: "admin" | "driver" | "parent";
    visible: boolean;
    onComplete: () => void;
};

export default function OnboardingOverlay({ role, visible, onComplete }: Props) {
    const steps = getOnboardingSteps(role);
    const [currentStep, setCurrentStep] = useState(0);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const cardScale = useRef(new Animated.Value(0.9)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const overlayFade = useRef(new Animated.Value(0)).current;
    const iconPulse = useRef(new Animated.Value(1)).current;

    // Animate overlay entrance
    useEffect(() => {
        if (visible) {
            setCurrentStep(0);
            Animated.timing(overlayFade, {
                toValue: 1,
                duration: 400,
                useNativeDriver: Platform.OS !== "web",
            }).start(() => {
                animateStepIn();
            });
        }
    }, [visible]);

    const animateStepIn = useCallback(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(40);
        cardScale.setValue(0.9);
        iconPulse.setValue(0.6);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 350,
                useNativeDriver: Platform.OS !== "web",
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: Platform.OS !== "web",
            }),
            Animated.spring(cardScale, {
                toValue: 1,
                friction: 6,
                tension: 50,
                useNativeDriver: Platform.OS !== "web",
            }),
            Animated.spring(iconPulse, {
                toValue: 1,
                friction: 4,
                tension: 30,
                useNativeDriver: Platform.OS !== "web",
            }),
        ]).start();

        Animated.timing(progressAnim, {
            toValue: currentStep,
            duration: 400,
            useNativeDriver: false,
        }).start();
    }, [currentStep, fadeAnim, slideAnim, cardScale, progressAnim, iconPulse]);

    const animateStepOut = useCallback(
        (onFinish: () => void) => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: Platform.OS !== "web",
                }),
                Animated.timing(slideAnim, {
                    toValue: -30,
                    duration: 200,
                    useNativeDriver: Platform.OS !== "web",
                }),
            ]).start(onFinish);
        },
        [fadeAnim, slideAnim]
    );

    const goNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            animateStepOut(() => {
                setCurrentStep((prev) => {
                    const next = prev + 1;
                    // Update progress for next step
                    setTimeout(() => animateStepIn(), 50);
                    return next;
                });
            });
        } else {
            // Final step → complete
            handleComplete();
        }
    }, [currentStep, steps.length, animateStepOut, animateStepIn]);

    const goBack = useCallback(() => {
        if (currentStep > 0) {
            animateStepOut(() => {
                setCurrentStep((prev) => {
                    const next = prev - 1;
                    setTimeout(() => animateStepIn(), 50);
                    return next;
                });
            });
        }
    }, [currentStep, animateStepOut, animateStepIn]);

    const handleComplete = useCallback(() => {
        Animated.timing(overlayFade, {
            toValue: 0,
            duration: 300,
            useNativeDriver: Platform.OS !== "web",
        }).start(() => {
            onComplete();
        });
    }, [overlayFade, onComplete]);

    // Update progress animation when step changes
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: currentStep,
            duration: 400,
            useNativeDriver: false,
        }).start();
    }, [currentStep, progressAnim]);

    if (!visible) return null;

    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, steps.length - 1],
        outputRange: ["0%", "100%"],
        extrapolate: "clamp",
    });

    return (
        <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
            <Animated.View style={[styles.overlay, { opacity: overlayFade }]}>
                {/* Step counter at top */}
                <View style={styles.topSection}>
                    <View style={styles.stepCounterRow}>
                        <Text style={styles.stepCounterText}>
                            STEP {currentStep + 1} OF {steps.length}
                        </Text>
                        <TouchableOpacity onPress={handleComplete} activeOpacity={0.7}>
                            <Text style={styles.skipText}>SKIP TOUR</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                            <LinearGradient
                                colors={["#FFB800", "#FF8C00"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>

                    {/* Step dots */}
                    <View style={styles.dotsRow}>
                        {steps.map((_, idx) => (
                            <View
                                key={idx}
                                style={[
                                    styles.dot,
                                    idx === currentStep && styles.dotActive,
                                    idx < currentStep && styles.dotCompleted,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Step card */}
                <Animated.View
                    style={[
                        styles.cardContainer,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: cardScale },
                            ],
                        },
                    ]}
                >
                    <View style={styles.card}>
                        {/* Icon badge */}
                        <Animated.View
                            style={[
                                styles.iconBadgeOuter,
                                { transform: [{ scale: iconPulse }] },
                            ]}
                        >
                            <LinearGradient
                                colors={step.accent as [string, string]}
                                style={styles.iconBadge}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons
                                    name={step.icon}
                                    size={32}
                                    color="#FFFFFF"
                                />
                            </LinearGradient>
                        </Animated.View>

                        {/* Step content */}
                        <Text style={styles.cardTitle}>{step.title}</Text>
                        <Text style={styles.cardDescription}>{step.description}</Text>

                        {/* Screen tag */}
                        {step.screenId && (
                            <View style={styles.screenTag}>
                                <Ionicons name="navigate-outline" size={11} color="#FFB800" />
                                <Text style={styles.screenTagText}>
                                    Screen: {step.screenId.charAt(0).toUpperCase() + step.screenId.slice(1)}
                                </Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Bottom navigation */}
                <View style={styles.bottomNav}>
                    {/* Back button */}
                    {!isFirst ? (
                        <TouchableOpacity
                            style={styles.navBtnBack}
                            onPress={goBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={18} color="#AAA" />
                            <Text style={styles.navBtnBackText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.navBtnPlaceholder} />
                    )}

                    {/* Next / Get Started button */}
                    <TouchableOpacity
                        style={styles.navBtnNext}
                        onPress={goNext}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={isLast ? ["#00C853", "#00E676"] : ["#FFB800", "#FF8C00"]}
                            style={styles.navBtnNextGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.navBtnNextText}>
                                {isLast ? "Let's Get Started!" : "Next"}
                            </Text>
                            <Ionicons
                                name={isLast ? "checkmark-circle" : "arrow-forward"}
                                size={18}
                                color="#0A0A0F"
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(4, 4, 12, 0.94)",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "ios" ? 70 : 50,
        paddingBottom: Platform.OS === "ios" ? 40 : 30,
        paddingHorizontal: 24,
    },

    // ── Top Section ──
    topSection: {
        alignItems: "center",
    },
    stepCounterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: 16,
    },
    stepCounterText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#FFB800",
        letterSpacing: 2,
    },
    skipText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#555",
        letterSpacing: 1.5,
    },

    // ── Progress Bar ──
    progressTrack: {
        width: "100%",
        height: 4,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 16,
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
    },

    // ── Dots ──
    dotsRow: {
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    dotActive: {
        width: 20,
        backgroundColor: "#FFB800",
        borderRadius: 3,
    },
    dotCompleted: {
        backgroundColor: "rgba(255,184,0,0.4)",
    },

    // ── Card ──
    cardContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    card: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 28,
        padding: 32,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.1)",
        ...Platform.select({
            web: {
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            },
            default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.5,
                shadowRadius: 30,
                elevation: 20,
            },
        }),
    },

    // ── Icon Badge ──
    iconBadgeOuter: {
        marginBottom: 24,
    },
    iconBadge: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.15)",
    },

    // ── Card Content ──
    cardTitle: {
        fontSize: 22,
        fontWeight: "900",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 12,
        letterSpacing: -0.3,
    },
    cardDescription: {
        fontSize: 14,
        fontWeight: "500",
        color: "#999",
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 4,
    },

    // ── Screen Tag ──
    screenTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 20,
        backgroundColor: "rgba(255,184,0,0.08)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.12)",
    },
    screenTagText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFB800",
        letterSpacing: 0.5,
    },

    // ── Bottom Navigation ──
    bottomNav: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 16,
    },
    navBtnBack: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    navBtnBackText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#AAA",
    },
    navBtnPlaceholder: {
        width: 90,
    },
    navBtnNext: {
        flex: 1,
        marginLeft: 12,
    },
    navBtnNextGrad: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 52,
        borderRadius: 16,
    },
    navBtnNextText: {
        fontSize: 14,
        fontWeight: "900",
        color: "#0A0A0F",
        letterSpacing: 0.5,
    },
});
