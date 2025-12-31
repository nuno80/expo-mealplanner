import { router } from "expo-router";
import { useState } from "react";
import {
	FlatList,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipeCard } from "@/components/RecipeCard";
import { useRecipes, useSearchRecipes } from "@/hooks/useRecipes";
import type { RecipeCategory } from "@/schemas/recipe";

const CATEGORIES: { key: RecipeCategory | "all"; label: string }[] = [
	{ key: "all", label: "Tutte" },
	{ key: "breakfast", label: "Colazione" },
	{ key: "lunch", label: "Pranzo" },
	{ key: "dinner", label: "Cena" },
	{ key: "snack", label: "Snack" },
];

export default function RecipesScreen() {
	const insets = useSafeAreaInsets();
	const [selectedCategory, setSelectedCategory] = useState<
		RecipeCategory | "all"
	>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const categoryFilter =
		selectedCategory === "all"
			? undefined
			: selectedCategory === "lunch" || selectedCategory === "dinner"
				? "main_course"
				: selectedCategory;
	const { data: recipes, isLoading } = useRecipes(categoryFilter);
	useSearchRecipes(); // Keep hook logic

	const filteredRecipes = searchQuery.trim()
		? recipes?.filter(
				(r) =>
					r.nameIt.toLowerCase().includes(searchQuery.toLowerCase()) ||
					r.nameEn.toLowerCase().includes(searchQuery.toLowerCase()),
			)
		: recipes;

	return (
		<View className="flex-1 bg-ui-50" style={{ paddingTop: insets.top }}>
			{/* Search Header */}
			<View className="px-5 pt-4 pb-2">
				<Text className="text-3xl font-bold text-ui-900 mb-4">Esplora</Text>

				<View className="bg-white rounded-2xl px-4 py-3.5 flex-row items-center shadow-sm shadow-ui-200 border border-ui-100">
					<Text className="text-ui-400 mr-3 text-lg">🔍</Text>
					<TextInput
						placeholder="Cerca ricetta (es. carbonara)..."
						placeholderTextColor="#94a3b8"
						value={searchQuery}
						onChangeText={setSearchQuery}
						className="flex-1 text-base text-ui-900 font-medium"
					/>
					{searchQuery.length > 0 && (
						<Pressable
							onPress={() => setSearchQuery("")}
							className="bg-ui-100 rounded-full w-6 h-6 items-center justify-center"
						>
							<Text className="text-ui-500 text-xs">✕</Text>
						</Pressable>
					)}
				</View>
			</View>

			{/* Category Tabs */}
			<View className="mt-4 mb-2">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
				>
					{CATEGORIES.map((cat) => {
						const isActive = selectedCategory === cat.key;
						return (
							<Pressable
								key={cat.key}
								onPress={() => setSelectedCategory(cat.key)}
								className="px-5 py-2.5 rounded-full border"
								style={{
									backgroundColor: isActive ? "#f97316" : "#ffffff",
									borderColor: isActive ? "#f97316" : "#e2e8f0",
								}}
							>
								<Text
									className="text-sm font-bold"
									style={{ color: isActive ? "#ffffff" : "#475569" }}
								>
									{cat.label}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>
			</View>

			{/* Recipe Grid */}
			<View className="flex-1 px-5 pt-2">
				{isLoading ? (
					<View className="flex-1 items-center justify-center">
						<Text className="text-ui-400 font-medium animate-pulse">
							Caricamento ricette...
						</Text>
					</View>
				) : !filteredRecipes || filteredRecipes.length === 0 ? (
					<View className="flex-1 items-center justify-center pb-20">
						<View className="w-24 h-24 bg-ui-100 rounded-full items-center justify-center mb-4">
							<Text className="text-5xl">🥕</Text>
						</View>
						<Text className="text-ui-900 text-lg font-bold mb-1">
							Nessun risultato
						</Text>
						<Text className="text-ui-500 text-center max-w-[200px]">
							{searchQuery
								? "Non abbiamo trovato ricette con questo nome."
								: "Il ricettario è vuoto."}
						</Text>
					</View>
				) : (
					<FlatList
						data={filteredRecipes}
						numColumns={2}
						keyExtractor={(item) => item.id}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{
							paddingBottom: insets.bottom + 100,
							paddingTop: 10,
						}}
						columnWrapperStyle={{ justifyContent: "space-between", gap: 12 }}
						ItemSeparatorComponent={() => <View className="h-3" />}
						renderItem={({ item }) => (
							<View className="w-[48%]">
								<RecipeCard
									recipe={item}
									onPress={() => {
										router.push({
											pathname: "/(modals)/recipe-detail",
											params: { id: item.id },
										});
									}}
								/>
							</View>
						)}
					/>
				)}
			</View>
		</View>
	);
}
