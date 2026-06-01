import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export default function Index() {
    const { user, isLoading } = useAuth();
    if (isLoading) return null;
    if (!user) return <Redirect href="/(auth)/login" />;
    if (user.role === "admin") return <Redirect href="/(admin)/dashboard" />;
    return <Redirect href="/(driver)/dashboard" />;
}
