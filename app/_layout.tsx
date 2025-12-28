import "./global.css";

import { getPrimaryMember } from "@/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const {
    session,
    isLoading,
    hasCompletedOnboarding,
    initialize,
    completeOnboarding,
  } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize auth listener on mount
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  // Check onboarding status when user logs in
  useEffect(() => {
    const checkOnboarding = async () => {
      if (session?.user && !hasCompletedOnboarding) {
        const primaryMember = await getPrimaryMember(session.user.id);
        if (primaryMember) {
          // User already completed onboarding in a previous session
          completeOnboarding();
        }
      }
    };
    checkOnboarding();
  }, [session, hasCompletedOnboarding, completeOnboarding]);

  // Handle navigation based on auth and onboarding status
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!session && !inAuthGroup) {
      // Not logged in -> go to welcome
      router.replace("/(auth)/welcome");
    } else if (session && inAuthGroup) {
      // Logged in but in auth screens
      if (hasCompletedOnboarding) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(onboarding)/goal");
      }
    } else if (session && !inOnboardingGroup && !hasCompletedOnboarding) {
      // Logged in but onboarding not complete -> force onboarding
      // (skip this check if already in onboarding)
      router.replace("/(onboarding)/goal");
    }
  }, [session, isLoading, segments, router, hasCompletedOnboarding]);

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
