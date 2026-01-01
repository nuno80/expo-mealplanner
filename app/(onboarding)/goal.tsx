import type { Goal } from "@/schemas/auth";
import { useAuthStore } from "@/stores/authStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GOALS: {
  value: Goal;
  label: string;
  description: string;
  adjustment: number;
}[] = [
    {
      value: "cut",
      label: "🔥 Perdere peso",
      description: "Deficit calorico per dimagrire in modo sano",
      adjustment: -400,
    },
    {
      value: "maintain",
      label: "⚖️ Mantenere",
      description: "Mantieni il tuo peso attuale",
      adjustment: 0,
    },
    {
      value: "bulk",
      label: "💪 Aumentare massa",
      description: "Surplus calorico per costruire muscolo",
      adjustment: 300,
    },
  ];

export default function OnboardingGoalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { setOnboardingGoal } = useAuthStore();
  const isAddMember = mode === "add-member";

  const handleSelect = (goal: Goal, adjustment: number) => {
    setOnboardingGoal({ goal, calorieAdjustment: adjustment });
    router.push({
      pathname: "/(onboarding)/profile",
      params: { mode },
    });
  };

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom }}
    >
      <Text className="text-3xl font-bold text-gray-900 mb-4">
        {isAddMember ? "Obiettivo del membro" : "Qual è il tuo obiettivo?"}
      </Text>
      <Text className="text-gray-600 mb-8">
        {isAddMember
          ? "Seleziona l'obiettivo per questo familiare. Personalizzeremo le sue porzioni."
          : "Seleziona il tuo obiettivo principale. Potremo personalizzare il tuo piano alimentare di conseguenza."}
      </Text>

      <View className="flex-1 justify-center gap-4">
        {GOALS.map((g) => (
          <Pressable
            key={g.value}
            className="bg-gray-50 border border-gray-200 rounded-2xl p-5 active:bg-primary-50 active:border-primary-400"
            onPress={() => handleSelect(g.value, g.adjustment)}
          >
            <Text className="text-xl font-semibold text-gray-900 mb-1">
              {g.label}
            </Text>
            <Text className="text-gray-600">{g.description}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
