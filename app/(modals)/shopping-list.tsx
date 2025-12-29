import { getWeekStart } from "@/hooks/useMealPlan";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useFamilyStore } from "@/stores/familyStore";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PeriodOption = "week" | "days";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

// Mock data as fallback when no real ingredients
const MOCK_ITEMS = [
  { ingredientId: "1", name: "Pasta di semola", quantity: 500, unit: "g", category: "Cereali" },
  { ingredientId: "2", name: "Riso basmati", quantity: 400, unit: "g", category: "Cereali" },
  { ingredientId: "3", name: "Fiocchi d'avena", quantity: 300, unit: "g", category: "Cereali" },
  { ingredientId: "4", name: "Pomodori pelati", quantity: 800, unit: "g", category: "Verdure" },
  { ingredientId: "5", name: "Zucchine", quantity: 400, unit: "g", category: "Verdure" },
  { ingredientId: "6", name: "Spinaci", quantity: 200, unit: "g", category: "Verdure" },
  { ingredientId: "7", name: "Carote", quantity: 300, unit: "g", category: "Verdure" },
  { ingredientId: "8", name: "Petto di pollo", quantity: 600, unit: "g", category: "Carne" },
  { ingredientId: "9", name: "Tacchino macinato", quantity: 400, unit: "g", category: "Carne" },
  { ingredientId: "10", name: "Salmone fresco", quantity: 400, unit: "g", category: "Pesce" },
  { ingredientId: "11", name: "Tonno in scatola", quantity: 240, unit: "g", category: "Pesce" },
  { ingredientId: "12", name: "Yogurt greco", quantity: 500, unit: "g", category: "Latticini" },
  { ingredientId: "13", name: "Parmigiano", quantity: 100, unit: "g", category: "Latticini" },
  { ingredientId: "14", name: "Uova", quantity: 12, unit: "pz", category: "Latticini" },
  { ingredientId: "15", name: "Olio EVO", quantity: 200, unit: "ml", category: "Condimenti" },
  { ingredientId: "16", name: "Mandorle", quantity: 150, unit: "g", category: "Frutta Secca" },
];

export default function ShoppingListModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ weekOffset?: string }>();
  const weekOffset = params.weekOffset ? Number.parseInt(params.weekOffset, 10) : 0;
  const weekStart = getWeekStart(weekOffset);

  const { selectedMemberId } = useFamilyStore();
  const [periodOption, setPeriodOption] = useState<PeriodOption>("week");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const daysToFetch = periodOption === "week" ? [] : selectedDays;
  const { data: realItems = [], isLoading } = useShoppingList(selectedMemberId, weekStart, daysToFetch);

  // Use real items if available, otherwise mock data based on selected days
  const items = realItems.length > 0
    ? realItems
    : MOCK_ITEMS.filter((_, i) => periodOption === "week" || selectedDays.includes((i % 7) + 1));

  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const selectAllDays = () => setSelectedDays([1, 2, 3, 4, 5, 6, 7]);

  const getPeriodLabel = () => {
    if (periodOption === "week") return "Tutta la settimana";
    if (selectedDays.length === 7) return "Tutti i giorni";
    if (selectedDays.length === 0) return "Nessun giorno";
    return selectedDays.map((d) => DAY_NAMES[d - 1]).join(", ");
  };

  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.getDate()} - ${end.getDate()} ${end.toLocaleDateString("it-IT", { month: "short" })}`;
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
          paddingTop: insets.top + 10,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 20, color: "#6b7280" }}>←</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>Lista della spesa</Text>
          <Text style={{ fontSize: 12, color: "#6b7280" }}>{formatWeekRange()}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <Pressable
        onPress={() => setShowPeriodPicker(!showPeriodPicker)}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: "#f9fafb",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: "#4b5563" }}>Periodo:</Text>
          <Text style={{ fontWeight: "600", color: "#111827" }}>{getPeriodLabel()}</Text>
        </View>
        <Text style={{ color: "#9ca3af" }}>{showPeriodPicker ? "▲" : "▼"}</Text>
      </Pressable>

      {showPeriodPicker ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {(["week", "days"] as PeriodOption[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => { setPeriodOption(option); if (option === "week") selectAllDays(); }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: "center",
                  backgroundColor: periodOption === option ? "#f97316" : "#ffffff",
                  borderWidth: 1,
                  borderColor: periodOption === option ? "#f97316" : "#e5e7eb",
                }}
              >
                <Text style={{ fontWeight: "600", color: periodOption === option ? "#ffffff" : "#374151" }}>
                  {option === "week" ? "Settimana" : "Giorni"}
                </Text>
              </Pressable>
            ))}
          </View>

          {periodOption === "days" ? (
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#6b7280" }}>Seleziona i giorni:</Text>
                <Pressable onPress={selectAllDays}>
                  <Text style={{ fontSize: 12, color: "#f97316", fontWeight: "600" }}>Seleziona tutti</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DAY_NAMES.map((name, index) => {
                  const day = index + 1;
                  const isSelected = selectedDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleDay(day)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: isSelected ? "#22c55e" : "#ffffff",
                        borderWidth: 1,
                        borderColor: isSelected ? "#22c55e" : "#e5e7eb",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: isSelected ? "#ffffff" : "#6b7280" }}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: "#ffffff", flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <Text style={{ color: "#6b7280", fontSize: 14 }}>{checkedCount}/{items.length} completati</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={{ color: "#6b7280", marginTop: 8 }}>Caricamento...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🛒</Text>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827", textAlign: "center", marginBottom: 8 }}>Nessun ingrediente</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>
            {selectedMemberId ? "Genera un piano settimanale per vedere la lista della spesa." : "Seleziona un membro della famiglia."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 16 }}
        >
          {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
            <View key={category} style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>{category}</Text>
              {categoryItems.map((item) => {
                const isChecked = checkedItems[item.ingredientId] ?? false;
                return (
                  <Pressable
                    key={item.ingredientId}
                    onPress={() => toggleItem(item.ingredientId)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        marginRight: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isChecked ? "#22c55e" : "transparent",
                        borderWidth: isChecked ? 0 : 2,
                        borderColor: "#d1d5db",
                      }}
                    >
                      {isChecked ? <Text style={{ color: "#ffffff", fontSize: 12 }}>✓</Text> : null}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color: isChecked ? "#9ca3af" : "#1f2937",
                        textDecorationLine: isChecked ? "line-through" : "none",
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text style={{ color: "#6b7280" }}>{Math.round(item.quantity)} {item.unit}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingBottom: insets.bottom + 10, paddingTop: 10 }}>
        <Pressable style={{ backgroundColor: "#f97316", paddingVertical: 16, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
          <Text style={{ fontSize: 18 }}>📤</Text>
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Condividi lista</Text>
        </Pressable>
      </View>
    </View>
  );
}
