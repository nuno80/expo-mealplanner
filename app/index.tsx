import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
	const { session, isLoading } = useAuthStore();

	if (isLoading) return null;

	if (session) {
		return <Redirect href="/(tabs)" />;
	}

	return <Redirect href="/(auth)/welcome" />;
}
