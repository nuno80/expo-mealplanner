import { useSwapMeal } from "@/hooks/useMealPlan";
import { useRecipes } from "@/hooks/useRecipes";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Meal Swap Modal - Select alternative recipe.
 * Shows recipes from the same category as alternatives.
 */
export default function MealSwapModal() {
  const insets = useSafeAreaInsets();
  const { mealId } = useLocalSearchParams<{ mealId: string }>();
  const swapMeal = useSwapMeal();

  // Get lunch recipes as alternatives (TODO: get actual meal category)
  const { data: alternatives, isLoading } = useRecipes("lunch");

  const handleSwap = async (recipeId: string) => {
    if (!mealId) return;

    try {
      await swapMeal.mutateAsync({
        plannedMealId: mealId,
        newRecipeId: recipeId,
      });
      router.back();
    } catch (error) {
      console.error("Failed to swap meal:", error);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <Text className="text-xl text-gray-600">✕</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">
          Sostituisci pasto
        </Text>
        <View className="w-8" />
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <Text className="text-gray-500 mb-4">
          Seleziona un'alternativa simile:
        </Text>

        {isLoading ? (
          <View className="items-center py-10">
            <Text className="text-gray-400">Caricamento...</Text>
          </View>
        ) : !alternatives || alternatives.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-gray-400">Nessuna alternativa disponibile</Text>
          </View>
        ) : (
          <View className="gap-3">
            {alternatives.map((recipe) => (
              <Pressable
                key={recipe.id}
                onPress={() => handleSwap(recipe.id)}
                disabled={swapMeal.isPending}
                className="flex-row items-center bg-gray-50 rounded-xl p-3"
              >
                {/* Image */}
                <View className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 mr-3">
                  {recipe.imageUrl ? (
                    <Image
                      source={{ uri: recipe.imageUrl }}
                      contentFit="cover"
                      className="w-full h-full"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Text className="text-2xl">🍽️</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                    {recipe.nameIt}
                  </Text>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text className="text-sm text-orange-500 font-medium">
                      {recipe.kcalPerServing ?? "--"} kcal
                    </Text>
                    {recipe.totalTimeMin && (
                      <Text className="text-xs text-gray-400">
                        ⏱ {recipe.totalTimeMin}min
                      </Text>
                    )}
                  </View>
                </View>

                {/* Select button */}
                <View className="bg-orange-500 px-3 py-1.5 rounded-lg">
                  <Text className="text-white text-sm font-medium">Scegli</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Load more button */}
      <View
        className="px-5 border-t border-gray-100"
        style={{ paddingBottom: insets.bottom + 10, paddingTop: 10 }}
      >
        <Pressable className="bg-gray-100 py-3 rounded-xl items-center flex-row justify-center gap-2">
          <Text>🔄</Text>
          <Text className="text-gray-700 font-medium">Altri suggerimenti</Text>
        </Pressable>
      </View>
    </View>
  );
}
