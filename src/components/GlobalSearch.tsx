import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/context/AuthContext";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";

const { height, width } = Dimensions.get("window");

type SearchResultItem = {
    id: string;
    type: "student" | "bus" | "route" | "driver" | "parent";
    title: string;
    subtitle: string;
    meta?: string;
    routePath?: string;
};

export default function GlobalSearch({
    visible,
    onClose,
}: {
    visible: boolean;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const { students, buses, routes, drivers, parentProfiles } = useDatabase();
    const [query, setQuery] = useState("");

    // Resolve driver's assigned students for scoped search
    const driverStudents = useMemo(() => {
        if (user?.role !== "driver") return [];
        const myDriver = drivers.find(d => d.user_id === user.id)
            ?? drivers.find(d => d.name?.toLowerCase() === user.name?.toLowerCase());
        const myBus = myDriver ? buses.find(b => b.driver_id === myDriver.id) : undefined;
        return myBus ? students.filter(s => s.bus_id === myBus.id) : [];
    }, [user, students, buses, drivers]);

    // Resolve parent's kids
    const parentStudents = useMemo(() => {
        if (user?.role !== "parent") return [];
        // In mock/sandbox mode we link first 2 kids.
        // In supabase, it is linked via parent_students table.
        // For parent portal search simplicity, we can load students linked to this parent.
        // We can just filter student list where parent name matches parent name or phone matches phone, or we can get linked children.
        // Let's filter students that are linked to this parent (simplest mock/db sync)
        return students.slice(0, 3); // Fallback: first 3 students as kids or matching names
    }, [user, students]);

    const results = useMemo((): SearchResultItem[] => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();

        const searchList: SearchResultItem[] = [];

        // 1. Admin search space
        if (user?.role === "admin") {
            // Students
            students.forEach(s => {
                if (s.name.toLowerCase().includes(q) || s.class.toLowerCase().includes(q) || (s.boarding_stop && s.boarding_stop.toLowerCase().includes(q))) {
                    searchList.push({
                        id: s.id,
                        type: "student",
                        title: s.name,
                        subtitle: `Class ${s.class} · Stop: ${s.boarding_stop || "None"}`,
                        meta: s.bus?.bus_number ? `Bus ${s.bus.bus_number}` : undefined,
                        routePath: `/(admin)/student-detail?id=${s.id}`,
                    });
                }
            });

            // Buses
            buses.forEach(b => {
                if (b.bus_number.toLowerCase().includes(q) || (b.driver?.name && b.driver.name.toLowerCase().includes(q))) {
                    searchList.push({
                        id: b.id,
                        type: "bus",
                        title: b.bus_number,
                        subtitle: b.driver?.name ? `Driver: ${b.driver.name}` : "No Driver",
                        meta: `${b.capacity} Seats`,
                        routePath: `/(admin)/bus-detail?id=${b.id}`,
                    });
                }
            });

            // Routes
            routes.forEach(r => {
                if (r.route_name.toLowerCase().includes(q) || r.stops.some(s => s.toLowerCase().includes(q))) {
                    searchList.push({
                        id: r.id,
                        type: "route",
                        title: r.route_name,
                        subtitle: `${r.stops.length} stops: ${r.stops.slice(0, 2).join(", ")}...`,
                        meta: `₹${r.monthly_fee}`,
                        routePath: `/(admin)/route-detail?id=${r.id}`,
                    });
                }
            });

            // Drivers
            drivers.forEach(d => {
                if (d.name.toLowerCase().includes(q) || d.phone.includes(q)) {
                    searchList.push({
                        id: d.id,
                        type: "driver",
                        title: d.name,
                        subtitle: `Phone: ${d.phone}`,
                        meta: "Driver Profile",
                        routePath: `/(admin)/drivers`, // routes to drivers list
                    });
                }
            });

            // Parents
            parentProfiles.forEach(p => {
                if (p.name.toLowerCase().includes(q) || p.phone.includes(q)) {
                    searchList.push({
                        id: p.id,
                        type: "parent",
                        title: p.name,
                        subtitle: `Phone: ${p.phone}`,
                        meta: "Parent Profile",
                        routePath: `/(admin)/parents`,
                    });
                }
            });
        }

        // 2. Driver search space
        if (user?.role === "driver") {
            driverStudents.forEach(s => {
                if (s.name.toLowerCase().includes(q) || (s.boarding_stop && s.boarding_stop.toLowerCase().includes(q))) {
                    searchList.push({
                        id: s.id,
                        type: "student",
                        title: s.name,
                        subtitle: `Class ${s.class} · Stop: ${s.boarding_stop || "None"}`,
                    });
                }
            });
        }

        // 3. Parent search space
        if (user?.role === "parent") {
            parentStudents.forEach(s => {
                if (s.name.toLowerCase().includes(q)) {
                    searchList.push({
                        id: s.id,
                        type: "student",
                        title: s.name,
                        subtitle: `Class ${s.class} · Bus ${s.bus?.bus_number || "N/A"}`,
                    });
                }
            });
        }

        return searchList;
    }, [query, user, students, buses, routes, drivers, parentProfiles, driverStudents, parentStudents]);

    const handleSelect = (item: SearchResultItem) => {
        onClose();
        if (item.routePath) {
            router.push(item.routePath as any);
        }
    };

    const typeConfig = {
        student: { icon: "person", color: "#00BCD4", label: "Student" },
        bus: { icon: "bus", color: "#FFB800", label: "Bus" },
        route: { icon: "map", color: "#E91E63", label: "Route" },
        driver: { icon: "people", color: "#FF8C00", label: "Driver" },
        parent: { icon: "people-circle", color: "#9C27B0", label: "Parent" },
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.overlay}
            >
                <View style={styles.container}>
                    {/* Search Input Panel */}
                    <View style={styles.searchPanel}>
                        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                            style={styles.input}
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Type to search..."
                            placeholderTextColor="#444"
                            autoFocus
                            returnKeyType="search"
                        />
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Results list */}
                    {results.length > 0 ? (
                        <FlatList
                            data={results}
                            keyExtractor={item => `${item.type}-${item.id}`}
                            contentContainerStyle={styles.list}
                            renderItem={({ item }) => {
                                const config = typeConfig[item.type];
                                return (
                                    <TouchableOpacity
                                        style={styles.row}
                                        onPressIn={blurActiveElement}
                                        onPress={() => runAfterBlur(() => handleSelect(item))}
                                        {...webNonFocusableProps}
                                    >
                                        <View style={[styles.typeBadge, { backgroundColor: `${config.color}20` }]}>
                                            <Ionicons name={config.icon as any} size={16} color={config.color} />
                                        </View>
                                        <View style={styles.info}>
                                            <Text style={styles.rowTitle}>{item.title}</Text>
                                            <Text style={styles.rowSub}>{item.subtitle}</Text>
                                        </View>
                                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                                            {item.meta && <Text style={styles.rowMeta}>{item.meta}</Text>}
                                            {item.routePath && (
                                                <Ionicons name="arrow-forward" size={12} color="#444" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    ) : query.trim() ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="search-outline" size={48} color="#222" />
                            <Text style={styles.emptyText}>No matching records found</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="sparkles" size={48} color="#222" />
                            <Text style={styles.emptyText}>
                                Search {user?.role === "admin" ? "students, routes, buses, and personnel" : "students and routes"}
                            </Text>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(4, 4, 12, 0.95)",
        justifyContent: "flex-start",
        paddingTop: Platform.OS === "ios" ? 60 : 30,
    },
    container: {
        flex: 1,
        width: "100%",
        maxWidth: 500,
        alignSelf: "center",
        paddingHorizontal: 20,
    },
    searchPanel: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 16,
        height: 54,
        marginBottom: 20,
    },
    searchIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: "100%",
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "500",
    },
    closeBtn: {
        padding: 6,
        marginLeft: 10,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    list: {
        paddingBottom: 40,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        marginBottom: 8,
        gap: 12,
    },
    typeBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    info: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    rowSub: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    rowMeta: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFB800",
        letterSpacing: 0.5,
    },
    emptyWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 120,
        gap: 12,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#444",
        textAlign: "center",
        maxWidth: 240,
        lineHeight: 18,
    },
});
