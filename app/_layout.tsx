import "react-native-url-polyfill/auto";
import "@/lib/nativewind"; // Register expo-image
import "./global.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useMigrationHelper } from "@/db/migrate";
import { parsePasswordRecoveryDeepLink } from "@/lib/authDeepLink";
import { API_BASE_URL } from "@/lib/api";
import { AUTH_REDIRECT_URL, wipeStoredSession, supabase } from "@/lib/supabase";
import { isSyncNeeded, syncRecipes } from "@/services/sync.service";
import { getPrimaryMember } from "@/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { useFamilyStore } from "@/stores/familyStore";

// Create a client outside the component to avoid re-creation on re-renders
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
		},
	},
});

function RootLayoutContent() {
	// Run database migrations on startup
	const { success: migrationsReady } = useMigrationHelper();
	const [syncComplete, setSyncComplete] = useState(false);

	const { session, hasCompletedOnboarding, initialize, completeOnboarding } =
		useAuthStore();
	const { isLoading } = useAuthStore();

	const router = useRouter();

	// Route based on auth status, reactively: index.tsx only redirects on mount
	// (cold start), so a sign-out while inside (tabs) would leave the user on
	// the same screen with no navigation. Handle it here, where session lives.
	useEffect(() => {
		if (!session && !isLoading) {
			router.replace("/(auth)/welcome");
		}
	}, [session, isLoading, router]);


	// Initialize auth listener on mount
	useEffect(() => {
		// Connectivity test against the real API (Google is flaky on Android HTTP/3)
		fetch(API_BASE_URL)
			.then(() => console.log("[Network] Connectivity test to API: OK"))
			.catch((e) => console.warn("[Network] Connectivity test to API: FAIL", e.message));

		const unsubscribe = initialize();
		return () => unsubscribe();
	}, [initialize]);

	// Handle Deep Linking for Auth (Password Recovery)
	// One handler for every path the recovery link can arrive from:
	//   - app already open → Linking "url" event
	//   - app cold-started by the link → Linking.getInitialURL()
	//   - in-app email provider opened through the custom scheme
	// Only the exact custom-scheme endpoint (see parsePasswordRecoveryDeepLink)
	// is accepted; any other deep link is ignored so a foreign URL cannot
	// replace the active session.
	useEffect(() => {
		const handleDeepLink = async (url: string | null) => {
			if (!url) return;

			const recoveryTokens = parsePasswordRecoveryDeepLink(url);
			if (!recoveryTokens) return;

			const { error } = await supabase.auth.setSession({
				access_token: recoveryTokens.accessToken,
				refresh_token: recoveryTokens.refreshToken,
			});

			if (error) {
				console.warn("Password recovery session rejected:", error.message);
				return;
			}

			// Do not rely on an untrusted `next` parameter for navigation.
			router.replace("/(auth)/reset-password");
		};

		// Check initial URL
		Linking.getInitialURL().then(handleDeepLink);

		// Listen for incoming URLs
		const subscription = Linking.addEventListener("url", ({ url }) => {
			handleDeepLink(url);
		});

		// Wipe leftover persisted session on sign-out (network hiccup between
		// revoke and storage removal). Navigation after logout is handled by the
		// reactive redirect above, so no router call is needed here.
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(event, _session) => {
				if (event === "SIGNED_OUT") {
					wipeStoredSession().catch((e) =>
						console.warn("[Auth] SIGNED_OUT wipe failed:", e?.message || e),
					);
				}
			},
		);

		return () => {
			subscription.remove();
			authListener.subscription.unsubscribe();
		};
	}, [router]);

	// Sync recipes from API after migrations are ready
	useEffect(() => {
		const runSync = async () => {
			if (migrationsReady && !syncComplete) {
				const needsSync = await isSyncNeeded();
				if (needsSync) {
					console.log("[App] Starting recipe sync...");
					try {
						await syncRecipes();
					} catch (err) {
						console.error("[App] Recipe sync failed:", err);
					}
				}
				setSyncComplete(true);
			}
		};
		runSync();
	}, [migrationsReady, syncComplete]);

	// Check onboarding status when user logs in AND initialize selectedMemberId
	const { selectedMemberId, setSelectedMemberId } = useFamilyStore();

	useEffect(() => {
		const checkOnboarding = async () => {
			if (session?.user && migrationsReady) {
				try {
					const primaryMember = await getPrimaryMember(session.user.id);
					if (primaryMember) {
						// Mark onboarding as complete
						if (!hasCompletedOnboarding) {
							completeOnboarding();
						}
						// Initialize selectedMemberId if not already set
						if (!selectedMemberId) {
							console.log(
								"[App] Initializing selectedMemberId to primary member:",
								primaryMember.id.slice(0, 8),
							);
							setSelectedMemberId(primaryMember.id);
						}
					}
				} catch (error) {
					console.error("Error checking onboarding:", error);
				}
			}
		};
		checkOnboarding();
	}, [
		session,
		hasCompletedOnboarding,
		completeOnboarding,
		migrationsReady,
		selectedMemberId,
		setSelectedMemberId,
	]);

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="index" />
			<Stack.Screen name="(auth)" />
			<Stack.Screen name="(onboarding)" />
			<Stack.Screen name="(tabs)" />
			<Stack.Screen name="(modals)" options={{ presentation: "modal" }} />
		</Stack>
	);
}

export default function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<SafeAreaProvider>
				<StatusBar style="auto" />
				<RootLayoutContent />
			</SafeAreaProvider>
		</QueryClientProvider>
	);
}
