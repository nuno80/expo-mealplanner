import type { MealType, PlannedMealWithRecipe } from "@/schemas/mealPlan";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface MealCardProps {
  meal: PlannedMealWithRecipe;
  locale?: "it" | "en";
  onPress?: () => void;
  onSwap?: () => void;
  onComplete?: () => void;
}

const MEAL_CONFIG: Record<MealType, { icon: string; labelIt: string }> = {
  breakfast: { icon: "☀️", labelIt: "Colazione" },
  lunch: { icon: "🍝", labelIt: "Pranzo" },
  dinner: { icon: "🌙", labelIt: "Cena" },
  snack_am: { icon: "🍎", labelIt: "Snack" },
  snack_pm: { icon: "🍪", labelIt: "Snack" },
};

export const MealCard = React.memo(function MealCard({
  meal,
  locale = "it",
  onPress,
  onSwap,
  onComplete,
}: MealCardProps) {
  const config = MEAL_CONFIG[meal.mealType];
  const recipeName = locale === "it" ? meal.recipe.nameIt : meal.recipe.nameEn;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center bg-white p-2 pr-4 rounded-2xl mb-3 border border-ui-100 ${meal.isCompleted ? "opacity-60 bg-ui-50" : ""
        }`}
      style={
        !meal.isCompleted
          ? {
            shadowColor: "#64748b",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }
          : {}
      }
    >
      {/* Image / Icon */}
      <View className="w-16 h-16 rounded-xl overflow-hidden bg-ui-100 mr-4 border border-ui-100">
        {meal.recipe.imageUrl ? (
          <Image
            source={{ uri: meal.recipe.imageUrl }}
            contentFit="cover"
            className="w-full h-full"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-brand-50">
            <Text className="text-2xl">{config.icon}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1 justify-center py-1">
        <Text className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-0.5">
          {config.labelIt}
        </Text>

        <Text
          className="text-base font-bold text-ui-900 leading-tight mb-1"
          numberOfLines={1}
        >
          {recipeName}
        </Text>

        <View className="flex-row items-center gap-3">
          <Text className="text-xs font-medium text-ui-500">
            {meal.portionKcal} kcal
          </Text>
          <View className="w-1 h-1 rounded-full bg-ui-300" />
          <Text className="text-xs font-medium text-ui-400">
            {meal.portionGrams}g
          </Text>
        </View>

        {/* Side Dish Info */}
        {meal.sideRecipe && (
          <View className="mt-1.5 pt-1 border-t border-ui-100 flex-row items-center">
            <Text className="text-[10px] text-ui-400 mr-1">+</Text>
            <Text className="text-xs text-ui-600" numberOfLines={1}>
              <Text className="font-bold">{meal.sidePortionGrams}g</Text>{" "}
              {locale === "it" ? meal.sideRecipe.nameIt : meal.sideRecipe.nameEn}
            </Text>
          </View>
        )}
      </View>

      {/* Actions Column */}
      <View className="items-end pl-2">
        {/* Completion Toggle - Always visible */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onComplete?.();
          }}
          className={`w-8 h-8 rounded-full items-center justify-center border ${meal.isCompleted
            ? "bg-success-100 border-success-200"
            : "bg-ui-50 border-ui-200"
            }`}
        >
          {meal.isCompleted ? (
            <Text className="text-success-600 font-bold">✓</Text>
          ) : (
            <View className="w-4 h-4 rounded-full border-2 border-ui-300" />
          )}
        </Pressable>

        {/* Swap Button - Only if not completed */}
        {!meal.isCompleted && onSwap && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onSwap();
            }}
            className="w-8 h-8 rounded-full bg-ui-50 items-center justify-center mt-1"
          >
            <Text className="text-xs">🔄</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

MealCard.displayName = "MealCard";
