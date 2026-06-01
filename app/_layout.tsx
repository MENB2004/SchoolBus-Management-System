import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth, UserType } from "@/src/context/AuthContext";
import { DatabaseProvider } from "@/src/context/DatabaseContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, StyleSheet, LogBox, Platform, View, Alert } from "react-native";
import * as Updates from "expo-updates";

if (Platform.OS === "web") {
    LogBox.ignoreLogs(["props.pointerEvents is deprecated"]);

    const originalWarn = console.warn;
    console.warn = (...args) => {
        const message = String(args[0] ?? "");
        if (message.includes("props.pointerEvents is deprecated")) {
            return;
        }
        originalWarn(...args);
    };
}

function dashboardForRole(role: UserType["role"]) {
    if (role === "admin") return "/(admin)/dashboard";
    if (role === "driver") return "/(driver)/dashboard";
    return "/(admin)/dashboard";
}

function RouteGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    React.useEffect(() => {
        if (isLoading) return;

        const routeSegments = segments as string[];
        const group = routeSegments[0];
        const screen = routeSegments[1];
        const isAuthRoute = group === "(auth)";
        const isLoginRoute = isAuthRoute && screen === "login";

        // Not logged in — redirect to login
        if (!user) {
            if (!isLoginRoute) {
                router.replace("/(auth)/login");
            }
            return;
        }

        // Force password change for drivers on first login
        const isChangePasswordRoute = group === "(auth)" && screen === "change-password";
        if (user.role === "driver" && user.needs_password_change) {
            if (!isChangePasswordRoute) {
                router.replace("/(auth)/change-password");
            }
            return;
        }

        // Logged in on login screen — redirect to dashboard
        if (isLoginRoute) {
            router.replace(dashboardForRole(user.role));
            return;
        }

        // Role-based route protection
        if (group === "(admin)" && user.role !== "admin") {
            router.replace(dashboardForRole(user.role));
            return;
        }

        if (group === "(driver)" && user.role !== "driver") {
            router.replace(dashboardForRole(user.role));
            return;
        }
    }, [isLoading, router, segments, user]);

    if (isLoading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#FFB800" />
            </View>
        );
    }

    return children;
}

export default function RootLayout() {
    React.useEffect(() => {
        if (Platform.OS === "web" || __DEV__) return;

        async function checkAndApplyUpdates() {
            try {
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    await Updates.fetchUpdateAsync();
                    Alert.alert(
                        "Update Available",
                        "A new version of the app is available! Restart the app now to apply the update.",
                        [
                            {
                                text: "Update Now",
                                onPress: async () => {
                                    await Updates.reloadAsync();
                                }
                            }
                        ],
                        { cancelable: false }
                    );
                }
            } catch (error) {
                console.log("Error checking for updates:", error);
            }
        }

        checkAndApplyUpdates();
    }, []);

    return (
        <GestureHandlerRootView style={styles.root}>
            <AuthProvider>
                <DatabaseProvider>
                    <RouteGuard>
                        <Stack screenOptions={{ headerShown: false }} />
                    </RouteGuard>
                </DatabaseProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loader: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#080812",
    },
});
