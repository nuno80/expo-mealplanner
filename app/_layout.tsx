import "@/lib/nativewind"; // Register expo-image
import "./global.css";

import { useMigrationHelper } from "@/db/migrate";
import { supabase } from "@/lib/supabase";
import { isSyncNeeded, syncRecipes } from "@/services/sync.service";
import { getPrimaryMember } from "@/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { useFamilyStore } from "@/stores/familyStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
  const router = useRouter();

  const { session, hasCompletedOnboarding, initialize, completeOnboarding } =
    useAuthStore();

  // Initialize auth listener on mount
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  // Handle Deep Linking for Auth (Password Recovery)
  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // Simple parsing of hash params
      if (url.includes("access_token") && url.includes("refresh_token")) {
        const params: Record<string, string> = {};
        const hash = url.split("#")[1];
        if (hash) {
          hash.split("&").forEach((part) => {
            const [key, value] = part.split("=");
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          });
        }

        if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
        }
      }
    };

    // Check initial URL
    Linking.getInitialURL().then(handleDeepLink);

    // Listen for incoming URLs
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Listen for Auth State Changes to redirect
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === "PASSWORD_RECOVERY") {
          router.push("/(auth)/reset-password");
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
          await syncRecipes();
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
              console.log("[App] Initializing selectedMemberId to primary member:", primaryMember.id.slice(0, 8));
              setSelectedMemberId(primaryMember.id);
            }
          }
        } catch (error) {
          console.error("Error checking onboarding:", error);
        }
      }
    };
    checkOnboarding();
  }, [session, hasCompletedOnboarding, completeOnboarding, migrationsReady, selectedMemberId, setSelectedMemberId]);

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
