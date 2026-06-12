import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Alert,
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";

type TrashTab = "students" | "buses" | "routes" | "drivers";

export default function TrashScreen() {
    const {
        trashStudents,
        trashBuses,
        trashRoutes,
        trashDrivers,
        restoreStudent,
        restoreBus,
        restoreRoute,
        restoreDriver,
        deleteStudent,
        deleteBus,
        deleteRoute,
        deleteDriver,
        refreshData,
    } = useDatabase();

    const [activeTab, setActiveTab] = useState<TrashTab>("students");
    const [actionLoading, setActionLoading] = useState(false);

    const activeList = React.useMemo(() => {
        if (activeTab === "students") return trashStudents;
        if (activeTab === "buses") return trashBuses;
        if (activeTab === "routes") return trashRoutes;
        return trashDrivers;
    }, [activeTab, trashStudents, trashBuses, trashRoutes, trashDrivers]);

    const handleRestore = async (id: string, name: string) => {
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}

        setActionLoading(true);
        try {
            if (activeTab === "students") await restoreStudent(id);
            else if (activeTab === "buses") await restoreBus(id);
            else if (activeTab === "routes") await restoreRoute(id);
            else await restoreDriver(id);

            Alert.alert("Restored", `Successfully restored "${name}"`);
        } catch (e: any) {
            Alert.alert("Restore Failed", e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePermanentDelete = (id: string, name: string) => {
        Alert.alert(
            "Permanent Deletion",
            `Are you sure you want to permanently delete "${name}"? This action CANNOT be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            if (activeTab === "students") await deleteStudent(id);
                            else if (activeTab === "buses") await deleteBus(id);
                            else if (activeTab === "routes") await deleteRoute(id);
                            else await deleteDriver(id);

                            Alert.alert("Deleted", `Permanently removed "${name}"`);
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#FF1744" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerLabel}>DATA RECOVERY CONSOLE</Text>
                    <Text style={styles.headerTitle}>System Trash</Text>
                </View>
            </View>

            {/* Tabs Selector */}
            <View style={styles.tabsContainer}>
                {(["students", "buses", "routes", "drivers"] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {actionLoading ? (
                <View style={styles.centerWrap}>
                    <ActivityIndicator size="large" color="#FF1744" />
                </View>
            ) : activeList.length === 0 ? (
                <View style={styles.centerWrap}>
                    <Ionicons name="trash-outline" size={64} color="#222" />
                    <Text style={styles.emptyText}>Trash is empty</Text>
                    <Text style={styles.emptySub}>
                        Deleted items will appear here for 30 days before being automatically purged.
                    </Text>
                </View>
            ) : (
                <FlatList<any>
                    data={activeList}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        let title = "";
                        let subtitle = "";
                        
                        if (activeTab === "students") {
                            title = (item as any).name;
                            subtitle = `Class ${(item as any).class} · Stop: ${(item as any).boarding_stop || "None"}`;
                        } else if (activeTab === "buses") {
                            title = (item as any).bus_number;
                            subtitle = `Capacity: ${(item as any).capacity} seats`;
                        } else if (activeTab === "routes") {
                            title = (item as any).route_name;
                            subtitle = `Fee: ₹ ${(item as any).monthly_fee}`;
                        } else {
                            title = (item as any).name;
                            subtitle = `Phone: ${(item as any).phone}`;
                        }

                        return (
                            <View style={styles.row}>
                                <View style={styles.info}>
                                    <Text style={styles.rowTitle}>{title}</Text>
                                    <Text style={styles.rowSub}>{subtitle}</Text>
                                    {item.deleted_at && (
                                        <Text style={styles.rowDate}>
                                            Deleted: {new Date(item.deleted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={styles.actionBtnRestore}
                                        onPressIn={blurActiveElement}
                                        onPress={() => runAfterBlur(() => handleRestore(item.id, title))}
                                        {...webNonFocusableProps}
                                    >
                                        <Ionicons name="refresh" size={16} color="#00E676" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionBtnDelete}
                                        onPressIn={blurActiveElement}
                                        onPress={() => runAfterBlur(() => handlePermanentDelete(item.id, title))}
                                        {...webNonFocusableProps}
                                    >
                                        <Ionicons name="trash-bin-outline" size={16} color="#FF1744" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,23,68,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerLabel: { fontSize: 10, fontWeight: "800", color: "#FF1744", letterSpacing: 2, marginBottom: 2 },
    headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },

    tabsContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 6,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    tabBtnActive: {
        backgroundColor: "rgba(255,23,68,0.1)",
        borderColor: "rgba(255,23,68,0.25)",
    },
    tabText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#666",
    },
    tabTextActive: {
        color: "#FF1744",
    },

    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        marginBottom: 10,
        gap: 12,
    },
    info: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    rowSub: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    rowDate: {
        fontSize: 10,
        color: "#444",
        fontWeight: "600",
        marginTop: 6,
    },
    actions: {
        flexDirection: "row",
        gap: 8,
    },
    actionBtnRestore: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(0,230,118,0.1)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(0,230,118,0.2)",
    },
    actionBtnDelete: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,23,68,0.1)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.2)",
    },
    centerWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 12,
        paddingBottom: 100,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#666",
    },
    emptySub: {
        fontSize: 12,
        color: "#444",
        textAlign: "center",
        lineHeight: 18,
    },
});
