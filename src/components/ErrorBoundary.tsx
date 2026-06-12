import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught app execution error:", error, errorInfo);
    }

    private handleRestart = async () => {
        try {
            if (Platform.OS === "web") {
                window.location.reload();
            } else {
                await Updates.reloadAsync();
            }
        } catch (e) {
            console.log("Relaunch failed:", e);
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <StatusBar barStyle="light-content" />
                    <LinearGradient colors={["#0C0C1E", "#06060F"]} style={StyleSheet.absoluteFill} />

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={["#FF1744", "#D50000"]}
                                style={styles.iconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="alert-circle-outline" size={42} color="#fff" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.title}>System Crash Detected</Text>
                        <Text style={styles.subtitle}>
                            An unexpected execution error has occurred in the application shell.
                        </Text>

                        {this.state.error && (
                            <View style={styles.errorBox}>
                                <ScrollViewContainer>
                                    <Text style={styles.errorText}>
                                        {this.state.error.name}: {this.state.error.message}
                                    </Text>
                                    {this.state.error.stack && (
                                        <Text style={styles.stackText}>
                                            {this.state.error.stack.split("\n").slice(0, 4).join("\n")}
                                        </Text>
                                    )}
                                </ScrollViewContainer>
                            </View>
                        )}

                        <TouchableOpacity style={styles.button} onPress={this.handleRestart} activeOpacity={0.85}>
                            <LinearGradient
                                colors={["#FFB800", "#FF8C00"]}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="refresh" size={18} color="#0A0A0F" />
                                <Text style={styles.buttonText}>RELAUNCH APPLICATION</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

// Simple internal container to handle long text wrap/scroll
function ScrollViewContainer({ children }: { children: ReactNode }) {
    if (Platform.OS === "web") {
        return <View style={{ maxHeight: 150, overflowY: "auto" } as any}>{children}</View>;
    }
    const { ScrollView } = require("react-native");
    return <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#080812",
        padding: 24,
    },
    content: {
        width: "100%",
        maxWidth: 420,
        alignItems: "center",
        gap: 16,
    },
    iconContainer: {
        marginBottom: 8,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FF1744",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: "900",
        color: "#FFFFFF",
        textAlign: "center",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "500",
        color: "#666",
        textAlign: "center",
        lineHeight: 18,
        paddingHorizontal: 16,
    },
    errorBox: {
        width: "100%",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,23,68,0.15)",
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginVertical: 10,
    },
    errorText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FF1744",
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    stackText: {
        fontSize: 10,
        fontWeight: "500",
        color: "#444",
        marginTop: 6,
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
        lineHeight: 13,
    },
    button: {
        width: "100%",
        height: 52,
        borderRadius: 16,
        overflow: "hidden",
        marginTop: 10,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    buttonText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#0A0A0F",
        letterSpacing: 1,
    },
});
