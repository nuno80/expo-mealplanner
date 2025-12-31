import "./global.css";

import { useMigrationHelper } from "@/db/migrate";
import { isSyncNeeded, syncRecipes } from "@/services/sync.service";
import { getPrimaryMember } from "@/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
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

  const { session, hasCompletedOnboarding, initialize, completeOnboarding } = useAuthStore();

  // Initialize auth listener on mount
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

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

  // Check onboarding status when user logs in
  useEffect(() => {
    const checkOnboarding = async () => {
      if (session?.user && !hasCompletedOnboarding && migrationsReady) {
        try {
          const primaryMember = await getPrimaryMember(session.user.id);
          if (primaryMember) {
            completeOnboarding();
          }
        } catch (error) {
          console.error("Error checking onboarding:", error);
        }
      }
    };
    checkOnboarding();
  }, [session, hasCompletedOnboarding, completeOnboarding, migrationsReady]);


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
