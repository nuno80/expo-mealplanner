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

// Mock data - will be replaced with actual aggregation
const MOCK_ITEMS: ShoppingItem[] = [
	{
		id: "1",
		name: "Pasta di semola",
		quantity: 500,
		unit: "g",
		category: "Cereali",
		isChecked: false,
	},
	{
		id: "2",
		name: "Riso basmati",
		quantity: 400,
		unit: "g",
		category: "Cereali",
		isChecked: false,
	},
	{
		id: "3",
		name: "Pomodori pelati",
		quantity: 800,
		unit: "g",
		category: "Verdure",
		isChecked: false,
	},
	{
		id: "4",
		name: "Zucchine",
		quantity: 400,
		unit: "g",
		category: "Verdure",
		isChecked: false,
	},
	{
		id: "5",
		name: "Petto di pollo",
		quantity: 600,
		unit: "g",
		category: "Carne",
		isChecked: false,
	},
	{
		id: "6",
		name: "Tonno sott'olio",
		quantity: 160,
		unit: "g",
		category: "Pesce",
		isChecked: false,
	},
	{
		id: "7",
		name: "Yogurt greco",
		quantity: 500,
		unit: "g",
		category: "Latticini",
		isChecked: false,
	},
	{
		id: "8",
		name: "Parmigiano",
		quantity: 100,
		unit: "g",
		category: "Latticini",
		isChecked: false,
	},
];

/**
 * Shopping List Modal - Aggregated ingredients from meal plan.
 */
export default function ShoppingListModal() {
	const insets = useSafeAreaInsets();
	const [items, setItems] = useState(MOCK_ITEMS);

	// Group by category
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

	const checkedCount = items.filter((i) => i.isChecked).length;

	return (
		<View className="flex-1 bg-white">
			{/* Header */}
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

			{/* Summary */}
			<View className="px-5 py-3 bg-gray-50 flex-row justify-between items-center">
				<Text className="text-gray-600">Per: Tutta la famiglia</Text>
				<Text className="text-gray-500 text-sm">
					{checkedCount}/{items.length} completati
				</Text>
			</View>

			{/* Items by category */}
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
									className={`w-6 h-6 rounded-md mr-3 items-center justify-center ${
										item.isChecked ? "bg-green-500" : "border-2 border-gray-300"
									}`}
								>
									{item.isChecked && (
										<Text className="text-white text-xs">✓</Text>
									)}
								</View>
								<Text
									className={`flex-1 ${
										item.isChecked
											? "text-gray-400 line-through"
											: "text-gray-800"
									}`}
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

			{/* Bottom button */}
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
