import { supabase } from "@/lib/supabase";
import { createPrimaryMember, createUser } from "@/services/user.service";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OnboardingFamilyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, onboardingData, completeOnboarding } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    try {
      setLoading(true);

      if (
        !user ||
        !onboardingData.profile ||
        !onboardingData.goal ||
        !onboardingData.tdee
      ) {
        Alert.alert("Errore", "Dati mancanti. Riprova dall'inizio.");
        router.replace("/(onboarding)/goal");
        return;
      }

      // 1. Create user in local DB
      await createUser(user.id, user.email ?? "", onboardingData.profile.name);

      // 2. Create primary family member
      await createPrimaryMember(
        user.id,
        onboardingData.profile,
        onboardingData.goal,
        onboardingData.tdee,
      );

      // 2b. Sync name to Supabase Auth metadata (so it's available in session)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: onboardingData.profile.name },
      });
      if (updateError) {
        console.warn("Failed to update Supabase metadata:", updateError);
        // Continue anyway, as local DB is the source of truth
      }

      // 3. Mark onboarding complete
      completeOnboarding();

      // 4. Navigate to main app
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Onboarding error:", error);
      Alert.alert("Errore", "Si è verificato un errore. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLater = () => {
    // For now, just finish without adding family members
    // Future: show a modal to add family members
    handleFinish();
  };

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom }}
    >
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        Aggiungi la famiglia
      </Text>
      <Text className="text-gray-600 mb-8">
        NutriPlanIT può pianificare pasti per tutta la famiglia, con porzioni
        personalizzate per ogni membro.
      </Text>

      {/* Family illustration placeholder */}
      <View className="flex-1 items-center justify-center">
        <View className="bg-primary-50 rounded-full w-48 h-48 items-center justify-center mb-6">
          <Text className="text-6xl">👨‍👩‍👧‍👦</Text>
        </View>
        <Text className="text-gray-600 text-center px-8">
          Potrai aggiungere altri membri della famiglia in seguito dalle
          impostazioni del profilo.
        </Text>
      </View>

      {/* Buttons */}
      <View className="gap-3">
        {/* Add family member button - Future feature */}
        {/*
				<Pressable
					className="w-full border-2 border-primary-500 py-4 rounded-xl"
					onPress={() => {}}
				>
					<Text className="text-primary-600 text-center text-lg font-semibold">
						+ Aggiungi familiare
					</Text>
				</Pressable>
				*/}

        <Pressable
          className={`w-full bg-primary-500 py-4 rounded-xl ${loading ? "opacity-70" : ""}`}
          onPress={handleAddLater}
          disabled={loading}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {loading ? "Salvataggio..." : "Inizia a pianificare 🚀"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
