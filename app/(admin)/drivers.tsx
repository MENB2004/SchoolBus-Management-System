import React, { useState, useMemo } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, RefreshControl, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { router } from "expo-router";
import { blurActiveElement, runAfterBlur, webNonFocusableProps } from "@/src/utils/webFocus";
import { Driver } from "@/src/lib/supabase";

export default function DriversScreen() {
    const { drivers, addDriver, updateDriver, deleteDriver, generateDriverLogin, isLoading, refreshData } = useDatabase();
    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [saving, setSaving] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return drivers;
        const q = search.toLowerCase();
        return drivers.filter(d => 
            d.name.toLowerCase().includes(q) || 
            d.phone.includes(q)
        );
    }, [drivers, search]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const openAddModal = () => {
        setEditingDriver(null);
        setName("");
        setPhone("");
        setUsername("");
        setModalVisible(true);
    };

    const openEditModal = (driver: Driver) => {
        setEditingDriver(driver);
        setName(driver.name);
        setPhone(driver.phone);
        setUsername(driver.username || "");
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !phone.trim() || (!editingDriver && !username.trim())) {
            Alert.alert("Required Fields", "Please enter name, phone, and username.");
            return;
        }

        if (!editingDriver && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
            Alert.alert("Invalid Username", "Username must be 3-20 characters long and contain only letters, numbers, or underscores.");
            return;
        }

        setSaving(true);
        try {
            if (editingDriver) {
                await updateDriver(editingDriver.id, { name: name.trim(), phone: phone.trim() });
            } else {
                await addDriver({ 
                    name: name.trim(), 
                    phone: phone.trim(), 
                    username: username.trim().toLowerCase(),
                    user_id: null 
                });
            }
            setModalVisible(false);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to save driver details.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (driver: Driver) => {
        Alert.alert(
            "Remove Driver",
            `Are you sure you want to remove ${driver.name}? This will unassign them from any buses.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDriver(driver.id);
                        } catch (e: any) {
                            Alert.alert("Error", e.message || "Failed to remove driver.");
                        }
                    }
                }
            ]
        );
    };

    const handlePromptGenerateLogin = (driver: Driver) => {
        const cleanName = driver.name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 10);
        const suffix = driver.phone.replace(/[^0-9]/g, "").slice(-4);
        const suggestedUsername = `${cleanName}${suffix || "drv"}`;

        Alert.alert(
            "Generate Login",
            `Create login credentials for ${driver.name}?\n\nUsername: @${suggestedUsername}\nPassword: [Common Onboarding Password]`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Generate", 
                    onPress: async () => {
                        try {
                            await generateDriverLogin(driver.id, suggestedUsername);
                            Alert.alert("Success", `Login credentials generated for ${driver.name}!\nUsername: @${suggestedUsername}`);
                        } catch (e: any) {
                            Alert.alert("Error", e.message || "Failed to generate login credentials.");
                        }
                    } 
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>FLEET DIRECTORY</Text>
                    <Text style={styles.title}>Drivers</Text>
                </View>
                <TouchableOpacity
                    onPress={openAddModal}
                    activeOpacity={0.85}
                    style={styles.addBtn}
                >
                    <LinearGradient
                        colors={["#FFB800", "#FF8C00"]}
                        style={styles.addBtnGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="person-add" size={16} color="#0A0A0F" />
                        <Text style={styles.addBtnText}>ADD NEW</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBarWrap}>
                <Ionicons name="search-outline" size={18} color="#555" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search drivers by name or phone..."
                    placeholderTextColor="#444"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={16} color="#555" />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading && !isRefreshing ? (
                <View style={{ flex: 1, justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#FFB800" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#FFB800" colors={["#FFB800"]} />
                    }
                >
                    {filtered.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="people-outline" size={48} color="#333" />
                            <Text style={styles.emptyTitle}>No Drivers Found</Text>
                            <Text style={styles.emptySub}>Add drivers or pull to refresh</Text>
                        </View>
                    ) : (
                        filtered.map(d => (
                            <View key={d.id} style={styles.card}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {d.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.driverName}>{d.name}</Text>
                                    <View style={styles.phoneRow}>
                                        <Ionicons name="call-outline" size={12} color="#666" />
                                        <Text style={styles.driverPhone}>{d.phone}</Text>
                                    </View>
                                    {d.username ? (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                                            <Ionicons name="person-outline" size={10} color="#FFB800" />
                                            <Text style={{ fontSize: 11, color: "#FFB800", fontWeight: "700" }}>@{d.username}</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.generateBtn}
                                            onPress={() => handlePromptGenerateLogin(d)}
                                        >
                                            <Ionicons name="key" size={10} color="#FFB800" />
                                            <Text style={styles.generateBtnText}>GENERATE LOGIN</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(d)}>
                                        <Ionicons name="create-outline" size={18} color="#FFB800" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "rgba(255,23,68,0.06)" }]} onPress={() => handleDelete(d)}>
                                        <Ionicons name="trash-outline" size={18} color="#FF1744" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Add/Edit Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingDriver ? "Edit Driver" : "Add Driver"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.field}>
                                <Text style={styles.label}>DRIVER FULL NAME *</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="person-outline" size={16} color="#555" style={styles.fieldIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Ramesh Kumar"
                                        placeholderTextColor="#333"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>CONTACT NUMBER *</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="call-outline" size={16} color="#555" style={styles.fieldIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. +91 98765 43210"
                                        placeholderTextColor="#333"
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.field}>
                                <Text style={styles.label}>USERNAME *</Text>
                                <View style={[styles.inputWrap, editingDriver && { opacity: 0.5 }]}>
                                    <Ionicons name="person-outline" size={16} color="#555" style={styles.fieldIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. ramesh123"
                                        placeholderTextColor="#333"
                                        value={username}
                                        onChangeText={setUsername}
                                        editable={!editingDriver}
                                        autoCapitalize="none"
                                    />
                                </View>
                                {!editingDriver && (
                                    <Text style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                                        Will be used for primary login. Spaces/special characters not allowed.
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 10 }}>
                                <LinearGradient
                                    colors={saving ? ["#333", "#222"] : ["#FFB800", "#FF8C00"]}
                                    style={styles.saveBtn}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#0A0A0F" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={18} color="#0A0A0F" />
                                            <Text style={styles.saveBtnText}>{editingDriver ? "SAVE CHANGES" : "ADD DRIVER"}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080812" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    sectionLabel: { fontSize: 10, fontWeight: "800", color: "#FFB800", letterSpacing: 2, marginBottom: 2 },
    title: { fontSize: 26, fontWeight: "900", color: "#FFFFFF" },
    addBtn: { borderRadius: 12, overflow: "hidden" },
    addBtnGrad: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        height: 38,
        justifyContent: "center",
    },
    addBtnText: { fontSize: 11, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1 },

    searchBarWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        marginHorizontal: 20,
        paddingHorizontal: 12,
        height: 46,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 16,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: "#FFFFFF", fontSize: 14 },

    list: { paddingHorizontal: 20, paddingBottom: 40 },
    emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: "#666" },
    emptySub: { fontSize: 12, color: "#444" },

    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,184,0,0.2)",
    },
    avatarText: { color: "#FFB800", fontSize: 15, fontWeight: "900" },
    driverName: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    driverPhone: { fontSize: 12, color: "#888", fontWeight: "600" },
    actions: { flexDirection: "row", gap: 8 },
    actionBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "rgba(255,184,0,0.06)",
        alignItems: "center",
        justifyContent: "center",
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#0C0C1A",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderTopWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF" },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalBody: { gap: 16 },
    field: { gap: 8 },
    label: { fontSize: 10, fontWeight: "800", color: "#555", letterSpacing: 1.5 },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 12,
        height: 48,
    },
    fieldIcon: { marginRight: 10 },
    input: { flex: 1, color: "#FFFFFF", fontSize: 14 },
    saveBtn: {
        height: 52,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    saveBtnText: { fontSize: 13, fontWeight: "900", color: "#0A0A0F", letterSpacing: 1.5 },
    generateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: "rgba(255,184,0,0.1)",
        alignSelf: "flex-start",
    },
    generateBtnText: {
        fontSize: 10,
        color: "#FFB800",
        fontWeight: "800",
        letterSpacing: 0.5,
    },
});
