import React from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { LinearGradient } from "expo-linear-gradient";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";

const { width, height } = Dimensions.get("window");

export default function NotificationPanel({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    const { notifications, markNotificationRead, clearAllNotifications } = useDatabase();

    const handleRead = async (id: string) => {
        try {
            await markNotificationRead(id);
        } catch (e) {
            console.log("Failed to mark notification read:", e);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearAllNotifications();
        } catch (e) {
            console.log("Failed to clear notifications:", e);
        }
    };

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);

            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        } catch {
            return "";
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.drawer}>
                    <LinearGradient colors={["#0C0C1F", "#080812"]} style={StyleSheet.absoluteFill} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLabel}>NOTIFICATIONS</Text>
                            <Text style={styles.headerTitle}>Alert History</Text>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            {notifications.length > 0 && (
                                <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn} activeOpacity={0.8}>
                                    <Text style={styles.clearText}>Clear All</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
                                <Ionicons name="close" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Notification list */}
                    {notifications.length > 0 ? (
                        <FlatList
                            data={notifications}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.list}
                            renderItem={({ item }) => {
                                const isUnread = item.status === "unread";
                                return (
                                    <TouchableOpacity
                                        style={[styles.row, isUnread && styles.rowUnread]}
                                        onPressIn={blurActiveElement}
                                        onPress={() => {
                                            if (isUnread) handleRead(item.id);
                                            runAfterBlur(() => {});
                                        }}
                                        activeOpacity={0.9}
                                        {...webNonFocusableProps}
                                    >
                                        {isUnread && <View style={styles.dot} />}
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.title, isUnread && styles.titleUnread]}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.body}>{item.body}</Text>
                                            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="notifications-off-outline" size={48} color="#222" />
                            <Text style={styles.emptyText}>No alerts received yet</Text>
                            <Text style={styles.emptySub}>
                                You will receive real-time notifications about route boarding, drops, and payments.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    drawer: {
        width: "100%",
        height: height * 0.85,
        maxHeight: 650,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFB800",
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#FFFFFF",
    },
    closeBtn: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    clearBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: "rgba(255,23,68,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.2)",
    },
    clearText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#FF1744",
    },
    list: {
        padding: 20,
        paddingBottom: 40,
    },
    row: {
        padding: 16,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.04)",
        marginBottom: 10,
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    rowUnread: {
        backgroundColor: "rgba(255,184,0,0.04)",
        borderColor: "rgba(255,184,0,0.12)",
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FFB800",
        marginTop: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
        color: "#888",
    },
    titleUnread: {
        color: "#FFFFFF",
    },
    body: {
        fontSize: 12,
        color: "#666",
        lineHeight: 16,
        marginTop: 4,
    },
    time: {
        fontSize: 10,
        color: "#444",
        fontWeight: "600",
        marginTop: 8,
    },
    emptyWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 12,
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
        paddingHorizontal: 20,
    },
});
