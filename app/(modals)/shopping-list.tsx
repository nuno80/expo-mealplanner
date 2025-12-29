import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isChecked: boolean;
}

type PeriodOption = "week" | "days" | "meals";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

// Mock data - will be replaced with actual aggregation from meal plan
const MOCK_ITEMS: ShoppingItem[] = [
  { id: "1", name: "Pasta di semola", quantity: 500, unit: "g", category: "Cereali", isChecked: false },
  { id: "2", name: "Riso basmati", quantity: 400, unit: "g", category: "Cereali", isChecked: false },
  { id: "3", name: "Pomodori pelati", quantity: 800, unit: "g", category: "Verdure", isChecked: false },
  { id: "4", name: "Zucchine", quantity: 400, unit: "g", category: "Verdure", isChecked: false },
  { id: "5", name: "Petto di pollo", quantity: 600, unit: "g", category: "Carne", isChecked: false },
  { id: "6", name: "Tonno sott'olio", quantity: 160, unit: "g", category: "Pesce", isChecked: false },
  { id: "7", name: "Yogurt greco", quantity: 500, unit: "g", category: "Latticini", isChecked: false },
  { id: "8", name: "Parmigiano", quantity: 100, unit: "g", category: "Latticini", isChecked: false },
];

export default function ShoppingListModal() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(MOCK_ITEMS);
  const [periodOption, setPeriodOption] = useState<PeriodOption>("week");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const itemsByCategory = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ShoppingItem[]>,
  );

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item,
      ),
    );
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const selectAllDays = () => setSelectedDays([1, 2, 3, 4, 5, 6, 7]);

  const getPeriodLabel = () => {
    if (periodOption === "week") return "Tutta la settimana";
    if (periodOption === "days") {
      if (selectedDays.length === 7) return "Tutti i giorni";
      if (selectedDays.length === 0) return "Nessun giorno";
      return selectedDays.map((d) => DAY_NAMES[d - 1]).join(", ");
    }
    return "Seleziona pasti";
  };

  const checkedCount = items.filter((i) => i.isChecked).length;

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <Text className="text-xl text-gray-600">←</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-lg font-semibold text-gray-900">
            Lista della spesa
          </Text>
          <Text className="text-xs text-gray-500">30 Dic - 5 Gen</Text>
        </View>
        <View className="w-8" />
      </View>

      <Pressable
        onPress={() => setShowPeriodPicker(!showPeriodPicker)}
        className="px-5 py-3 bg-gray-50 flex-row justify-between items-center"
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-gray-600">Periodo:</Text>
          <Text className="font-semibold text-gray-900">{getPeriodLabel()}</Text>
        </View>
        <Text className="text-gray-400">{showPeriodPicker ? "▲" : "▼"}</Text>
      </Pressable>

      {showPeriodPicker ? (
        <View className="px-5 py-4 bg-gray-50 border-b border-gray-200">
          <View className="flex-row gap-2 mb-4">
            {(["week", "days"] as PeriodOption[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setPeriodOption(option);
                  if (option === "week") selectAllDays();
                }}
                className="flex-1 py-2.5 rounded-lg items-center"
                style={{
                  backgroundColor: periodOption === option ? "#f97316" : "#ffffff",
                  borderWidth: 1,
                  borderColor: periodOption === option ? "#f97316" : "#e5e7eb",
                }}
              >
                <Text
                  className="font-semibold"
                  style={{ color: periodOption === option ? "#ffffff" : "#374151" }}
                >
                  {option === "week" ? "Settimana" : "Giorni"}
                </Text>
              </Pressable>
            ))}
          </View>

          {periodOption === "days" ? (
            <View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-sm text-gray-500">Seleziona i giorni:</Text>
                <Pressable onPress={selectAllDays}>
                  <Text className="text-sm text-orange-500 font-semibold">Seleziona tutti</Text>
                </Pressable>
              </View>
              <View className="flex-row gap-2">
                {DAY_NAMES.map((name, index) => {
                  const day = index + 1;
                  const isSelected = selectedDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(day)}
                      className="flex-1 py-2 rounded-lg items-center"
                      style={{
                        backgroundColor: isSelected ? "#22c55e" : "#ffffff",
                        borderWidth: 1,
                        borderColor: isSelected ? "#22c55e" : "#e5e7eb",
                      }}
                    >
                      <Text
                        className="text-xs font-bold"
                        style={{ color: isSelected ? "#ffffff" : "#6b7280" }}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View className="px-5 py-2 bg-white flex-row justify-between items-center border-b border-gray-100">
        <Text className="text-gray-500 text-sm">
          {checkedCount}/{items.length} completati
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingTop: 16,
        }}
      >
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <View key={category} className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase mb-2">
              {category}
            </Text>
            {categoryItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleItem(item.id)}
                className="flex-row items-center py-3 border-b border-gray-100"
              >
                <View
                  className="w-6 h-6 rounded-md mr-3 items-center justify-center"
                  style={{
                    backgroundColor: item.isChecked ? "#22c55e" : "transparent",
                    borderWidth: item.isChecked ? 0 : 2,
                    borderColor: "#d1d5db",
                  }}
                >
                  {item.isChecked ? (
                    <Text className="text-white text-xs">✓</Text>
                  ) : null}
                </View>
                <Text
                  className="flex-1"
                  style={{
                    color: item.isChecked ? "#9ca3af" : "#1f2937",
                    textDecorationLine: item.isChecked ? "line-through" : "none",
                  }}
                >
                  {item.name}
                </Text>
                <Text className="text-gray-500">
                  {item.quantity} {item.unit}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      <View
        className="px-5 border-t border-gray-100"
        style={{ paddingBottom: insets.bottom + 10, paddingTop: 10 }}
      >
        <Pressable className="bg-orange-500 py-4 rounded-xl items-center flex-row justify-center gap-2">
          <Text className="text-lg">📤</Text>
          <Text className="text-white font-semibold">Condividi lista</Text>
        </Pressable>
      </View>
    </View>
  );
}
