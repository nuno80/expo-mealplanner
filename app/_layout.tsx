import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import "../global.css";

export default function RootLayout() {
	const { session, setSession, isLoading } = useAuthStore();
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		// 1. Initial Session Check
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		// 2. Auth Listener
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});

		return () => subscription.unsubscribe();
	}, [setSession]);

	useEffect(() => {
		if (isLoading) return;

		const inAuthGroup = segments[0] === "(auth)";

		if (!session && !inAuthGroup) {
			// Redirect to auth if not logged in
			router.replace("/(auth)/welcome");
		} else if (session && inAuthGroup) {
			// Redirect to home if logged in and trying to access auth screens
			router.replace("/(tabs)");
		}
	}, [session, isLoading, segments, router]);

	// Show loading indicator or splash screen while checking auth
	// (For now we rely on the native splash screen or render null/loading view)

	return (
		<SafeAreaProvider>
			<StatusBar style="auto" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(onboarding)" />
				<Stack.Screen name="(tabs)" />
			</Stack>
		</SafeAreaProvider>
	);
}
