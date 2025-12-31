import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { MealCard } from "@/components/MealCard";
import { ProgressBar, ProgressRing } from "@/components/ProgressRing";
import { getCurrentWeekStart, useMealPlan } from "@/hooks/useMealPlan";
import { useAuthStore } from "@/stores/authStore";
import { useFamilyStore } from "@/stores/familyStore";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { user } = useAuthStore();
	const { selectedMemberId } = useFamilyStore();

	const weekStart = getCurrentWeekStart();
	const { data: mealPlan } = useMealPlan(
		selectedMemberId ?? undefined,
		weekStart,
	);

	const today = new Date().getDay();
	const dayNumber = today === 0 ? 7 : today;
	const todaysMeals = mealPlan?.meals.filter((m) => m.day === dayNumber) ?? [];
	const completedKcal = todaysMeals
		.filter((m) => m.isCompleted)
		.reduce((sum, m) => sum + m.portionKcal, 0);

	const nextMeal = todaysMeals.find((m) => !m.isCompleted);
	const weeklyActual = mealPlan?.actualKcalWeekly ?? 0;
	const weeklyTarget = mealPlan?.targetKcalWeekly ?? 14000;
	const dailyTarget = Math.round(weeklyTarget / 7);

	const userName = user?.user_metadata?.name ?? "!";

	return (
		<View className="flex-1 bg-ui-50">
			{/* Dynamic Header */}
			<View
				className="bg-white px-6 pb-6 rounded-b-[40px] shadow-sm shadow-ui-200 z-10"
				style={{ paddingTop: insets.top + 20 }}
			>
				<View className="flex-row justify-between items-start mb-4">
					<View>
						<Text className="text-ui-500 font-medium text-sm">Bentornato,</Text>
						<Text className="text-3xl font-bold text-ui-900 mt-1">
							{userName.split(" ")[0]}
						</Text>
					</View>
					<View className="w-10 h-10 bg-brand-100 rounded-full items-center justify-center">
						<Text className="text-xl">🧑‍🍳</Text>
					</View>
				</View>

				{/* Weekly Progress Mini-Summary */}
				<View className="flex-row gap-4 mt-2">
					<View className="flex-1 bg-ui-50 p-3 rounded-2xl flex-row items-center gap-3">
						<View className="w-10 h-10 rounded-full bg-white items-center justify-center">
							<Text className="text-lg">🔥</Text>
						</View>
						<View>
							<Text className="text-xs text-ui-500 font-medium">Kcal Oggi</Text>
							<Text className="text-lg font-bold text-ui-900">
								{completedKcal}
							</Text>
						</View>
					</View>
					<View className="flex-1 bg-ui-50 p-3 rounded-2xl flex-row items-center gap-3">
						<View className="w-10 h-10 rounded-full bg-white items-center justify-center">
							<Text className="text-lg">⚖️</Text>
						</View>
						<View>
							<Text className="text-xs text-ui-500 font-medium">Peso</Text>
							<Text className="text-lg font-bold text-ui-900">--</Text>
						</View>
					</View>
				</View>
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					paddingTop: 24,
					paddingHorizontal: 20,
					paddingBottom: insets.bottom + 100,
				}}
			>
				{/* Next Meal Highlight */}
				<Text className="text-lg font-bold text-ui-900 mb-4 px-1">
					Prossimo Pasto
				</Text>

				{nextMeal ? (
					<MealCard
						meal={nextMeal}
						onPress={() =>
							router.push({
								pathname: "/(modals)/recipe-detail",
								params: { id: nextMeal.recipeId },
							})
						}
						onSwap={() =>
							router.push({
								pathname: "/meal-swap",
								params: { mealId: nextMeal.id },
							})
						}
					/>
				) : (
					<Card
						className="items-center py-8 border-dashed border-2 border-ui-200 bg-transparent shadow-none"
						variant="flat"
					>
						<Text className="text-4xl mb-2">🎉</Text>
						<Text className="text-ui-500 font-medium">
							Tutto fatto per oggi!
						</Text>
					</Card>
				)}

				{/* Weekly Overview */}
				<View className="flex-row justify-between items-end mt-8 mb-4 px-1">
					<Text className="text-lg font-bold text-ui-900">
						Riepilogo Settimana
					</Text>
					<Pressable onPress={() => router.push("/plan")}>
						<Text className="text-brand-600 font-bold text-sm">Vedi piano</Text>
					</Pressable>
				</View>

				<Card className="flex-row items-center gap-6">
					<ProgressRing
						current={completedKcal}
						target={dailyTarget}
						size={100}
						label="OGGI"
					/>
					<View className="flex-1 gap-4">
						<View>
							<Text className="text-xs font-bold text-ui-400 uppercase tracking-widest mb-1">
								Target Giornaliero
							</Text>
							<ProgressBar current={completedKcal} target={dailyTarget} />
						</View>
						<View>
							<Text className="text-xs font-bold text-ui-400 uppercase tracking-widest mb-1">
								Progresso Week
							</Text>
							<ProgressBar
								current={weeklyActual}
								target={weeklyTarget}
								color="#22c55e"
							/>
						</View>
					</View>
				</Card>

				{/* Inspiration / Blog */}
				<Text className="text-lg font-bold text-ui-900 mt-8 mb-4 px-1">
					Ispirazione
				</Text>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					className="-mx-5 px-5"
					contentContainerStyle={{ gap: 16, paddingRight: 20 }}
				>
					<Pressable className="w-64 h-36 bg-brand-500 rounded-3xl p-5 justify-between shadow-lg shadow-brand-500/30">
						<View className="bg-white/20 self-start px-3 py-1 rounded-full">
							<Text className="text-white text-xs font-bold">Consiglio</Text>
						</View>
						<Text className="text-white text-xl font-bold">
							5 trucchi per la meal prep perfetta
						</Text>
					</Pressable>
					<Pressable className="w-64 h-36 bg-ui-800 rounded-3xl p-5 justify-between shadow-lg shadow-ui-900/20">
						<View className="bg-white/20 self-start px-3 py-1 rounded-full">
							<Text className="text-white text-xs font-bold">Community</Text>
						</View>
						<Text className="text-white text-xl font-bold">
							Le ricette più votate di Dicembre
						</Text>
					</Pressable>
				</ScrollView>
			</ScrollView>
		</View>
	);
}
