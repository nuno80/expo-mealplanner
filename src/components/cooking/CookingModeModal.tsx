import Ionicons from "@expo/vector-icons/Ionicons";
import type { InferSelectModel } from "drizzle-orm";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Types
import type { familyMembers } from "@/db/schema";
import type {
  RecipeIngredientWithDetails,
  RecipeWithDetails,
} from "@/schemas/recipe";
// Utils
import {
  calculateDetailedCookedPortions,
  calculateMealTarget,
  calculateRawIngredients,
} from "@/utils/portion-calculator";

type FamilyMember = InferSelectModel<typeof familyMembers>;

interface CookingModeModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: RecipeWithDetails;
  ingredients: RecipeIngredientWithDetails[];
  members: FamilyMember[];
  currentMemberId?: string; // Auto-select this one
  mealType?: string; // 'lunch' | 'dinner' (default: based on time or recipe preferred)
}

export function CookingModeModal({
  visible,
  onClose,
  recipe,
  ingredients,
  members,
  currentMemberId,
  mealType = "lunch", // Default assumption if not passed
}: CookingModeModalProps) {
  const insets = useSafeAreaInsets();

  // Initialize with current member selected, or all if none specified?
  // Let's select currentMemberId by default if present, or just the first primary.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (currentMemberId) return new Set([currentMemberId]);
    if (members.length > 0) return new Set([members[0].id]);
    return new Set();
  });

  const toggleMember = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    // Prevent empty selection? No, allow empty but show 0.
    setSelectedIds(next);
  };

  // 1. Prepare data for logic
  const activeMembersData = useMemo(() => {
    return members
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({
        member: m,
        mealType: mealType, // We assume same meal type for everyone for this "pot"
      }));
  }, [members, selectedIds, mealType]);

  // 2. Computed Results - Raw ingredients for the pot
  const rawIngredients = useMemo(
    () => calculateRawIngredients(recipe, ingredients, activeMembersData),
    [recipe, ingredients, activeMembersData],
  );

  // 3. Detailed cooked portions per person with ingredient breakdown
  const detailedPortions = useMemo(
    () => calculateDetailedCookedPortions(recipe, ingredients, activeMembersData),
    [recipe, ingredients, activeMembersData],
  );

  const totalRawWeight = rawIngredients.reduce(
    (sum, i) => sum + i.totalRawPayload,
    0,
  );

  const totalCookedExpected = detailedPortions.reduce(
    (sum, p) => sum + p.totalCookedG,
    0,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet" // Nice on iOS
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View
          className="bg-white border-b border-gray-200 px-4 pb-4 shadow-sm"
          style={{ paddingTop: insets.top + 10 }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Modalità Cucina 👨‍🍳
            </Text>
            <Pressable
              onPress={onClose}
              className="p-2 bg-gray-100 rounded-full"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>
          <Text className="text-gray-500 text-sm mt-1 truncate">
            {recipe.nameIt}
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* 1. SELETTORE MEMBRI */}
          <Text className="text-sm font-bold text-gray-500 uppercase mb-3">
            Chi mangia? ({selectedIds.size})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row mb-6 pl-1"
          >
            {members.map((member) => {
              const isSelected = selectedIds.has(member.id);
              return (
                <Pressable
                  key={member.id}
                  onPress={() => toggleMember(member.id)}
                  className={`mr-3 px-4 py-3 rounded-xl border ${isSelected
                    ? "bg-primary-500 border-primary-600"
                    : "bg-white border-gray-200"
                    }`}
                >
                  <Text
                    className={`font-semibold ${isSelected ? "text-white" : "text-gray-700"
                      }`}
                  >
                    {member.name}
                  </Text>
                  {isSelected && (
                    <Text className="text-xs text-primary-100 mt-1">
                      {calculateMealTarget(member, mealType)} kcal
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 2. IN PENTOLA (TOTALE CRUDO) */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-6 border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="bg-orange-100 p-2 rounded-lg mr-3">
                <Ionicons name="nutrition" size={24} color="#f97316" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Nel Carrello / In Pentola
                </Text>
                <Text className="text-gray-500 text-xs">
                  Ingredienti crudi totali
                </Text>
              </View>
            </View>

            <View className="space-y-3">
              {rawIngredients.map((ing, idx) => (
                <View
                  key={idx}
                  className="flex-row justify-between items-center border-b border-gray-50 pb-2 last:border-0"
                >
                  <Text className="flex-1 text-gray-700 font-medium">
                    {ing.name}
                  </Text>
                  <View className="flex-row items-baseline">
                    <Text className="text-xl font-bold text-gray-900 mr-1">
                      {ing.totalRawPayload}
                    </Text>
                    <Text className="text-gray-500 text-sm">{ing.unit}</Text>
                  </View>
                </View>
              ))}
              {rawIngredients.length === 0 && (
                <Text className="text-gray-400 italic">
                  Nessun ingrediente calcolato.
                </Text>
              )}
            </View>

            <View className="mt-4 pt-3 border-t border-gray-100 flex-row justify-between">
              <Text className="text-gray-500 font-medium">
                Peso Totale Crudo
              </Text>
              <Text className="text-gray-900 font-bold">
                ~{Math.round(totalRawWeight)}g
              </Text>
            </View>
          </View>

          {/* 3. NEL PIATTO (PORZIONI COTTE CON DETTAGLIO INGREDIENTI) */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <View className="bg-green-100 p-2 rounded-lg mr-3">
                <Ionicons name="restaurant" size={24} color="#22c55e" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  Nel Piatto (Cotto)
                </Text>
                <Text className="text-gray-500 text-xs">
                  Come distribuire il cibo preparato
                </Text>
              </View>
            </View>

            {detailedPortions.length === 0 ? (
              <Text className="text-gray-400 italic text-center py-4">
                Seleziona qualcuno sopra.
              </Text>
            ) : (
              detailedPortions.map((p) => (
                <View
                  key={p.member.id}
                  className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
                >
                  {/* Person Header */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                        <Text className="text-lg">👤</Text>
                      </View>
                      <View>
                        <Text className="font-bold text-gray-900 text-lg">
                          {p.member.name}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                          Target: {p.targetKcal} kcal
                        </Text>
                      </View>
                    </View>
                    <View className="items-end bg-green-50 px-3 py-2 rounded-lg">
                      <Text className="text-xl font-bold text-green-700">
                        {p.totalCookedG}g
                      </Text>
                      <Text className="text-green-600 text-[10px] bg-green-100 px-1 rounded">
                        TOTALE
                      </Text>
                    </View>
                  </View>

                  {/* Ingredient Breakdown (only if multiple main ingredients) */}
                  {p.mainIngredients.length > 1 && (
                    <View className="bg-green-50 rounded-lg p-3">
                      <Text className="text-xs font-semibold text-green-700 mb-2">
                        Componenti principali:
                      </Text>
                      {p.mainIngredients.map((ing, idx) => (
                        <View
                          key={idx}
                          className="flex-row justify-between items-center py-1"
                        >
                          <Text className="text-green-800">
                            {ing.name}
                          </Text>
                          <Text className="font-bold text-green-900">
                            {ing.cookedWeightG}g
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
            {detailedPortions.length > 0 && (
              <Text className="text-center text-gray-400 text-xs mt-2">
                Totale in pentola (cotto): ~{Math.round(totalCookedExpected)}g
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
