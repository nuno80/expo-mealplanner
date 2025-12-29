import { useMigrationHelper } from "@/db/migrate";
import { useAuthStore } from "@/stores/authStore";
import { Redirect } from "expo-router";
import { Text, View } from "react-native";

/**
 * Root index - handles initial routing after migrations complete.
 */
export default function Index() {
  const { success: migrationsReady } = useMigrationHelper();
  const { session, isLoading, hasCompletedOnboarding } = useAuthStore();

  // Wait for migrations
  if (!migrationsReady) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Inizializzazione...</Text>
      </View>
    );
  }

  // Wait for auth check
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Caricamento...</Text>
      </View>
    );
  }

  // Route based on auth status
  if (session) {
    if (hasCompletedOnboarding) {
      return <Redirect href="/(tabs)" />;
    }
    return <Redirect href="/(onboarding)/goal" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
