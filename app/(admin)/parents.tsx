import React, { useState, useMemo, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, RefreshControl, ActivityIndicator, Alert,
    Modal, KeyboardAvoidingView, Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "@/src/context/DatabaseContext";
import { supabase, isSupabaseConfigured, ParentProfile, ParentStudent } from "@/src/lib/supabase";

export default function ParentsScreen() {
    const {
        parentProfiles, students, addParentProfile, updateParentProfile,
        deleteParentProfile, linkParentToStudent, unlinkParentFromStudent,
        isLoading, refreshData, refreshParents
    } = useDatabase();

    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Add/Edit modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingParent, setEditingParent] = useState<ParentProfile | null>(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [username, setUsername] = useState("");
    const [saving, setSaving] = useState(false);

    // Link student modal
    const [linkModalVisible, setLinkModalVisible] = useState(false);
    const [linkingParent, setLinkingParent] = useState<ParentProfile | null>(null);
    const [parentLinks, setParentLinks] = useState<ParentStudent[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [linkingStudentId, setLinkingStudentId] = useState<string | null>(null);
    const [linking, setLinking] = useState(false);

    const filtered = useMemo(() => {
        if (!search.trim()) return parentProfiles;
        const q = search.toLowerCase();
        return parentProfiles.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.phone.includes(q)
        );
    }, [parentProfiles, search]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const openAddModal = () => {
        setEditingParent(null);
        setName("");
        setPhone("");
        setUsername("");
        setModalVisible(true);
    };

    const openEditModal = (parent: ParentProfile) => {
        setEditingParent(parent);
        setName(parent.name);
        setPhone(parent.phone);
        setUsername(parent.username || "");
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !phone.trim() || (!editingParent && !username.trim())) {
            Alert.alert("Required Fields", "Please enter name, phone, and username.");
            return;
        }

        if (!editingParent && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
            Alert.alert("Invalid Username", "Username must be 3-20 characters long and contain only letters, numbers, or underscores.");
            return;
        }

        setSaving(true);
        try {
            if (editingParent) {
                await updateParentProfile(editingParent.id, { name: name.trim(), phone: phone.trim() });
            } else {
                await addParentProfile({ 
                    name: name.trim(), 
                    phone: phone.trim(), 
                    username: username.trim().toLowerCase(),
                    user_id: null 
                });
            }
            setModalVisible(false);
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to save parent profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (parent: ParentProfile) => {
        Alert.alert(
            "Remove Parent",
            `Are you sure you want to remove ${parent.name}? This will also remove all student links.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteParentProfile(parent.id);
                        } catch (e: any) {
                            Alert.alert("Error", e.message || "Failed to remove parent.");
                        }
                    }
                }
            ]
        );
    };

    // Link student management
    const openLinkModal = async (parent: ParentProfile) => {
        setLinkingParent(parent);
        setLinkModalVisible(true);
        setLoadingLinks(true);
        setLinkingStudentId(null);

        try {
            if (parent.user_id && isSupabaseConfigured) {
                const { data, error } = await supabase
                    .from("parent_students")
                    .select("*")
                    .eq("parent_id", parent.user_id);
                if (!error && data) {
                    setParentLinks(data as ParentStudent[]);
                } else {
                    setParentLinks([]);
                }
            } else {
                setParentLinks([]);
            }
        } catch {
            setParentLinks([]);
        } finally {
            setLoadingLinks(false);
        }
    };

    const handleLinkStudent = async () => {
        if (!linkingParent?.user_id || !linkingStudentId) {
            Alert.alert("Info", "Parent must have a linked auth user, and select a student to link.");
            return;
        }
        setLinking(true);
        try {
            await linkParentToStudent(linkingParent.user_id, linkingStudentId);
            // Refresh links
            const { data } = await supabase
                .from("parent_students")
                .select("*")
                .eq("parent_id", linkingParent.user_id);
            setParentLinks((data ?? []) as ParentStudent[]);
            setLinkingStudentId(null);
            Alert.alert("Success", "Student linked to parent!");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to link student.");
        } finally {
            setLinking(false);
        }
    };

    const handleUnlinkStudent = async (studentId: string) => {
        if (!linkingParent?.user_id) return;
        Alert.alert("Unlink Student", "Remove this student from parent?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Unlink",
                style: "destructive",
                onPress: async () => {
                    try {
                        await unlinkParentFromStudent(linkingParent.user_id!, studentId);
                        setParentLinks(prev => prev.filter(l => l.student_id !== studentId));
                    } catch (e: any) {
                        Alert.alert("Error", e.message || "Failed to unlink.");
                    }
                }
            }
        ]);
    };

    const linkedStudentIds = useMemo(() => parentLinks.map(l => l.student_id), [parentLinks]);
    const availableStudents = useMemo(
        () => students.filter(s => !linkedStudentIds.includes(s.id)),
        [students, linkedStudentIds]
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={["#080812", "#0C0C1A"]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>PARENT DIRECTORY</Text>
                    <Text style={styles.title}>Parents</Text>
                </View>
                <TouchableOpacity onPress={openAddModal} activeOpacity={0.85} style={styles.addBtn}>
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

            {/* Search */}
            <View style={styles.searchBarWrap}>
                <Ionicons name="search-outline" size={18} color="#555" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search parents by name or phone..."
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
                            <Text style={styles.emptyTitle}>No Parents Found</Text>
                            <Text style={styles.emptySub}>Add parent profiles to manage parent-student links</Text>
                        </View>
                    ) : (
                        filtered.map(p => (
                            <View key={p.id} style={styles.card}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {p.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.parentName}>{p.name}</Text>
                                    <View style={styles.phoneRow}>
                                        <Ionicons name="call-outline" size={12} color="#666" />
                                        <Text style={styles.parentPhone}>{p.phone}</Text>
                                    </View>
                                    {p.username && (
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                                            <Ionicons name="person-outline" size={10} color="#00BCD4" />
                                            <Text style={{ fontSize: 11, color: "#00BCD4", fontWeight: "700" }}>@{p.username}</Text>
                                        </View>
                                    )}
                                    {p.user_id && (
                                        <View style={styles.linkedBadge}>
                                            <Ionicons name="checkmark-circle" size={10} color="#00E676" />
                                            <Text style={styles.linkedText}>Auth linked</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openLinkModal(p)}>
                                        <Ionicons name="link-outline" size={18} color="#00BCD4" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(p)}>
                                        <Ionicons name="create-outline" size={18} color="#FFB800" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "rgba(255,23,68,0.06)" }]} onPress={() => handleDelete(p)}>
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
                            <Text style={styles.modalTitle}>{editingParent ? "Edit Parent" : "Add Parent"}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.field}>
                                <Text style={styles.label}>PARENT FULL NAME *</Text>
                                <View style={styles.inputWrap}>
                                    <Ionicons name="person-outline" size={16} color="#555" style={styles.fieldIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Rajesh Sharma"
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
                                <View style={[styles.inputWrap, editingParent && { opacity: 0.5 }]}>
                                    <Ionicons name="person-outline" size={16} color="#555" style={styles.fieldIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. rajesh_parent"
                                        placeholderTextColor="#333"
                                        value={username}
                                        onChangeText={setUsername}
                                        editable={!editingParent}
                                        autoCapitalize="none"
                                    />
                                </View>
                                {!editingParent && (
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
                                            <Text style={styles.saveBtnText}>{editingParent ? "SAVE CHANGES" : "ADD PARENT"}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Link Students Modal */}
            <Modal visible={linkModalVisible} transparent animationType="slide" onRequestClose={() => setLinkModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Manage Links</Text>
                                <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                    {linkingParent?.name ?? "Parent"} — Student Assignments
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setLinkModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                            {!linkingParent?.user_id ? (
                                <View style={{ padding: 20, alignItems: "center" }}>
                                    <Ionicons name="alert-circle-outline" size={40} color="#FFB800" />
                                    <Text style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 12 }}>
                                        This parent does not have an auth account linked yet.{"\n"}
                                        The parent must sign up first before you can link students.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Linked students */}
                                    <Text style={[styles.label, { marginBottom: 8, marginTop: 4 }]}>LINKED STUDENTS ({parentLinks.length})</Text>
                                    {loadingLinks ? (
                                        <ActivityIndicator color="#FFB800" style={{ marginVertical: 20 }} />
                                    ) : parentLinks.length === 0 ? (
                                        <Text style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>No students linked yet.</Text>
                                    ) : (
                                        parentLinks.map(link => {
                                            const student = students.find(s => s.id === link.student_id);
                                            return (
                                                <View key={link.student_id} style={styles.linkRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                                                            {student?.name ?? link.student_id}
                                                        </Text>
                                                        {student && (
                                                            <Text style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                                                                Class {student.class}{student.section ? ` - ${student.section}` : ""}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.unlinkBtn}
                                                        onPress={() => handleUnlinkStudent(link.student_id)}
                                                    >
                                                        <Ionicons name="unlink-outline" size={14} color="#FF1744" />
                                                        <Text style={{ color: "#FF1744", fontSize: 10, fontWeight: "800" }}>UNLINK</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })
                                    )}

                                    {/* Link new student */}
                                    <Text style={[styles.label, { marginBottom: 8, marginTop: 20 }]}>LINK A STUDENT</Text>
                                    {availableStudents.length === 0 ? (
                                        <Text style={{ color: "#555", fontSize: 12 }}>All students are already linked.</Text>
                                    ) : (
                                        <>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                                <View style={{ flexDirection: "row", gap: 8 }}>
                                                    {availableStudents.map(s => (
                                                        <TouchableOpacity
                                                            key={s.id}
                                                            style={[
                                                                styles.studentChip,
                                                                linkingStudentId === s.id && styles.studentChipActive
                                                            ]}
                                                            onPress={() => setLinkingStudentId(s.id)}
                                                        >
                                                            <Text style={[
                                                                styles.studentChipText,
                                                                linkingStudentId === s.id && styles.studentChipTextActive
                                                            ]}>
                                                                {s.name} ({s.class})
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </ScrollView>
                                            <TouchableOpacity
                                                onPress={handleLinkStudent}
                                                disabled={!linkingStudentId || linking}
                                                activeOpacity={0.85}
                                            >
                                                <LinearGradient
                                                    colors={(!linkingStudentId || linking) ? ["#333", "#222"] : ["#00BCD4", "#0097A7"]}
                                                    style={styles.saveBtn}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                >
                                                    {linking ? (
                                                        <ActivityIndicator color="#fff" />
                                                    ) : (
                                                        <>
                                                            <Ionicons name="link" size={18} color="#fff" />
                                                            <Text style={[styles.saveBtnText, { color: "#fff" }]}>LINK STUDENT</Text>
                                                        </>
                                                    )}
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
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
    emptySub: { fontSize: 12, color: "#444", textAlign: "center" },

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
        backgroundColor: "rgba(0,188,212,0.1)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(0,188,212,0.2)",
    },
    avatarText: { color: "#00BCD4", fontSize: 15, fontWeight: "900" },
    parentName: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
    phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    parentPhone: { fontSize: 12, color: "#888", fontWeight: "600" },
    linkedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    linkedText: { fontSize: 10, color: "#00E676", fontWeight: "700" },
    actions: { flexDirection: "row", gap: 6 },
    actionBtn: {
        width: 32,
        height: 32,
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

    // Link management
    linkRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    unlinkBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "rgba(255,23,68,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,23,68,0.2)",
    },
    studentChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    studentChipActive: { backgroundColor: "rgba(0,188,212,0.15)", borderColor: "rgba(0,188,212,0.4)" },
    studentChipText: { fontSize: 12, fontWeight: "700", color: "#666" },
    studentChipTextActive: { color: "#00BCD4" },
});
