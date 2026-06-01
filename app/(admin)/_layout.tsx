import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({
    name,
    focused,
}: {
    name: React.ComponentProps<typeof Ionicons>["name"];
    focused: boolean;
}) {
    return (
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
            <Ionicons
                name={name}
                size={22}
                color={focused ? "#FFB800" : "#555"}
            />
        </View>
    );
}

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const dynamicBottom = insets.bottom > 0 ? insets.bottom + 8 : 16;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [styles.tabBar, { bottom: dynamicBottom }],
                tabBarShowLabel: true,
                tabBarLabelStyle: styles.tabLabel,
                tabBarActiveTintColor: "#FFB800",
                tabBarInactiveTintColor: "#555",
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? "grid" : "grid-outline"} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="buses"
                options={{
                    title: "Buses",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? "bus" : "bus-outline"} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="routes"
                options={{
                    title: "Routes",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? "map" : "map-outline"} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="students"
                options={{
                    title: "Students",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? "people" : "people-outline"} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name={focused ? "settings" : "settings-outline"} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: "rgba(12, 12, 26, 0.96)",
        position: "absolute",
        alignSelf: "center",
        width: "90%",
        maxWidth: 500,
        height: 68,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255, 184, 0, 0.15)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
        paddingBottom: 10,
        paddingTop: 8,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
        marginTop: 2,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    iconWrapActive: {
        backgroundColor: "rgba(255,184,0,0.12)",
    },
});
