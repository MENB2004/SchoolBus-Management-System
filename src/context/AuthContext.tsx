import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    ReactNode,
} from "react";
import { supabase, AppRole } from "@/src/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

export type UserType = {
    id: string;
    name: string;
    role: AppRole;
    tenant_id: string;
    email?: string;
    avatar_url?: string | null;
    needs_password_change?: boolean;
};

type AuthContextType = {
    user: UserType | null;
    session: Session | null;
    updateProfile: (name: string, email: string, avatarUrl?: string | null) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    signOut: () => Promise<void>;
    isLoading: boolean;
};

export const AuthContext = createContext<AuthContextType>(
    {} as AuthContextType
);

export const useAuth = () => useContext(AuthContext);

/** Fetch the app_role and tenant_id for a given auth user id from the user_roles table */
async function fetchUserRoleAndTenant(userId: string): Promise<{ role: AppRole; tenant_id: string }> {
    const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        // Default: no tenant assigned yet (pending registration)
        return { role: "driver", tenant_id: "" };
    }
    return { role: data.role as AppRole, tenant_id: data.tenant_id as string };
}

/** Build our UserType from a Supabase User + role + tenant */
function buildUserType(supabaseUser: User, role: AppRole, tenantId: string): UserType {
    const meta = supabaseUser.user_metadata ?? {};
    return {
        id: supabaseUser.id,
        name: meta.name ?? meta.full_name ?? supabaseUser.email?.split("@")[0] ?? "User",
        email: supabaseUser.email ?? undefined,
        avatar_url: meta.avatar_url ?? null,
        role,
        tenant_id: tenantId,
        needs_password_change: !!meta.needs_password_change,
    };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserType | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const { role, tenant_id } = await fetchUserRoleAndTenant(session.user.id);
                setUser(buildUserType(session.user, role, tenant_id));
                setSession(session);
            }
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    const { role, tenant_id } = await fetchUserRoleAndTenant(session.user.id);
                    setUser(buildUserType(session.user, role, tenant_id));
                    setSession(session);
                } else {
                    setUser(null);
                    setSession(null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const updateProfile = async (name: string, email: string, avatarUrl?: string | null) => {
        let accessToken = session?.access_token;
        if (!accessToken) {
            const { data: sessionData } = await supabase.auth.getSession();
            accessToken = sessionData?.session?.access_token;
        }
        if (!accessToken) throw new Error("No active session. Please log in again.");

        const updates: Record<string, any> = { data: { name } };
        if (email && email !== session?.user?.email) {
            updates.email = email;
        }
        if (avatarUrl !== undefined) {
            updates.data.avatar_url = avatarUrl;
        }

        const { data, error } = await supabase.auth.updateUser(updates);
        if (error) {
            throw new Error(error.message || "Failed to update profile");
        }

        if (data.user && user) {
            setUser({ ...user, name, email: email || user.email, avatar_url: avatarUrl ?? user.avatar_url });
        }
    };

    const updatePassword = async (newPassword: string) => {
        let accessToken = session?.access_token;
        if (!accessToken) {
            const { data: sessionData } = await supabase.auth.getSession();
            accessToken = sessionData?.session?.access_token;
        }

        if (!accessToken || !user?.id) {
            throw new Error("No active session. Please log in again.");
        }

        const { error } = await supabase.auth.updateUser({ 
            password: newPassword,
            data: { needs_password_change: false }
        });
        if (error) throw new Error(error.message || "Failed to update password");

        setUser({ ...user, needs_password_change: false });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, updateProfile, updatePassword, signOut, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
