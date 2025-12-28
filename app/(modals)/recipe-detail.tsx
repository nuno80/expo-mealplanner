import { useRecipe } from "@/hooks/useRecipes";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = "ingredients" | "steps";

/**
 * Recipe Detail Modal - Full recipe information.
 * Shows image, nutrition, ingredients list, and preparation steps.
 */
export default function RecipeDetailModal() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id);
  const [activeTab, setActiveTab] = useState<Tab>("ingredients");
  const locale = "it"; // TODO: get from user settings

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400">Caricamento...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-500">Ricetta non trovata</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-orange-500">Torna indietro</Text>
        </Pressable>
      </View>
    );
  }

  const name = locale === "it" ? recipe.nameIt : recipe.nameEn;
  const description =
    locale === "it" ? recipe.descriptionIt : recipe.descriptionEn;
  const difficultyLabel = {
    easy: locale === "it" ? "Facile" : "Easy",
    medium: locale === "it" ? "Media" : "Medium",
    hard: locale === "it" ? "Difficile" : "Hard",
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header with close button */}
      <View
        className="absolute top-0 left-0 right-0 z-10 flex-row justify-between px-4"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
        >
          <Text className="text-white text-xl">✕</Text>
        </Pressable>
        <Pressable className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
          <Text className="text-xl">❤️</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Recipe Image */}
        <View className="aspect-[4/3] bg-gray-200">
          {recipe.imageUrl ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              contentFit="cover"
              className="w-full h-full"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Text className="text-6xl">🍽️</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-5 pt-5">
          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">{name}</Text>

          {/* Meta row */}
          <View className="flex-row items-center gap-4 mb-4">
            {recipe.totalTimeMin && (
              <View className="flex-row items-center gap-1">
                <Text>⏱</Text>
                <Text className="text-gray-600 text-sm">
                  {recipe.totalTimeMin} min
                </Text>
              </View>
            )}
            <View
              className={`px-2 py-0.5 rounded-full ${recipe.difficulty === "easy"
                  ? "bg-green-100"
                  : recipe.difficulty === "medium"
                    ? "bg-yellow-100"
                    : "bg-red-100"
                }`}
            >
              <Text
                className={`text-xs ${recipe.difficulty === "easy"
                    ? "text-green-700"
                    : recipe.difficulty === "medium"
                      ? "text-yellow-700"
                      : "text-red-700"
                  }`}
              >
                {difficultyLabel[recipe.difficulty]}
              </Text>
            </View>
          </View>

          {/* Nutrition Card */}
          <View className="bg-gray-50 rounded-xl p-4 flex-row justify-around mb-6">
            <View className="items-center">
              <Text className="text-xl font-bold text-orange-500">
                {recipe.kcalPerServing ?? recipe.kcalPer100g}
              </Text>
              <Text className="text-xs text-gray-500">kcal</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-gray-900">
                {recipe.proteinPer100g.toFixed(0)}g
              </Text>
              <Text className="text-xs text-gray-500">proteine</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-gray-900">
                {recipe.carbsPer100g.toFixed(0)}g
              </Text>
              <Text className="text-xs text-gray-500">carbs</Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-bold text-gray-900">
                {recipe.fatPer100g.toFixed(0)}g
              </Text>
              <Text className="text-xs text-gray-500">grassi</Text>
            </View>
          </View>

          {/* Description */}
          {description && (
            <Text className="text-gray-600 mb-6">{description}</Text>
          )}

          {/* Tabs */}
          <View className="flex-row mb-4 border-b border-gray-200">
            <Pressable
              onPress={() => setActiveTab("ingredients")}
              className={`flex-1 py-3 ${activeTab === "ingredients"
                  ? "border-b-2 border-orange-500"
                  : ""
                }`}
            >
              <Text
                className={`text-center font-medium ${activeTab === "ingredients"
                    ? "text-orange-500"
                    : "text-gray-500"
                  }`}
              >
                Ingredienti
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("steps")}
              className={`flex-1 py-3 ${activeTab === "steps" ? "border-b-2 border-orange-500" : ""
                }`}
            >
              <Text
                className={`text-center font-medium ${activeTab === "steps" ? "text-orange-500" : "text-gray-500"
                  }`}
              >
                Preparazione
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          {activeTab === "ingredients" ? (
            <View>
              <Text className="text-sm text-gray-500 mb-3">
                Per {recipe.servings} {recipe.servings === 1 ? "porzione" : "porzioni"}{" "}
                ({recipe.servingWeightG ?? "--"}g)
              </Text>
              {recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((ing) => {
                  const ingredientName =
                    locale === "it"
                      ? ing.ingredient.nameIt
                      : ing.ingredient.nameEn;
                  return (
                    <View
                      key={ing.id}
                      className="flex-row items-center py-2 border-b border-gray-100"
                    >
                      <Text className="text-gray-400 mr-3">•</Text>
                      <Text className="flex-1 text-gray-800">
                        {ingredientName}
                      </Text>
                      <Text className="text-gray-600">
                        {ing.quantity} {ing.unit}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="text-gray-400 text-center py-4">
                  Nessun ingrediente specificato
                </Text>
              )}
            </View>
          ) : (
            <View>
              {recipe.steps.length > 0 ? (
                recipe.steps.map((step) => {
                  const instruction =
                    locale === "it"
                      ? step.instructionIt
                      : step.instructionEn;
                  return (
                    <View key={step.id} className="flex-row mb-4">
                      <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                        <Text className="text-orange-500 font-bold">
                          {step.stepNumber}
                        </Text>
                      </View>
                      <Text className="flex-1 text-gray-700 leading-6">
                        {instruction}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="text-gray-400 text-center py-4">
                  Nessun passaggio specificato
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed bottom button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5"
        style={{ paddingBottom: insets.bottom + 10, paddingTop: 10 }}
      >
        <Pressable className="bg-orange-500 py-4 rounded-xl items-center">
          <Text className="text-white font-semibold text-base">
            + Aggiungi al piano
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
