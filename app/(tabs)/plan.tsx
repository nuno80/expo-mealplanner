import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MealCard } from "@/components/MealCard";
import { ProgressBar } from "@/components/ProgressRing";
import {
	getWeekStart,
	useGenerateMealPlan,
	useMealPlan,
} from "@/hooks/useMealPlan";
import type { MealType, PlannedMealWithRecipe } from "@/schemas/mealPlan";
import { useFamilyStore } from "@/stores/familyStore";

const DAY_NAMES = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const MEAL_ORDER: MealType[] = [
	"breakfast",
	"lunch",
	"dinner",
	"snack_am",
	"snack_pm",
];

function formatWeekRange(weekStart: Date): string {
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 6);

	const startDay = weekStart.getDate();
	const endDay = weekEnd.getDate();
	const startMonth = weekStart.toLocaleDateString("it-IT", { month: "short" });
	const endMonth = weekEnd.toLocaleDateString("it-IT", { month: "short" });

	if (startMonth === endMonth) {
		return `${startDay} - ${endDay} ${startMonth}`;
	}
	return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

export default function PlanScreen() {
	// router is imported directly from expo-router (not useRouter hook)
	const insets = useSafeAreaInsets();
	const [weekOffset, setWeekOffset] = useState(0);
	const weekStart = getWeekStart(weekOffset);
	const { selectedMemberId } = useFamilyStore();

	const { data: mealPlan, isLoading } = useMealPlan(
		selectedMemberId ?? undefined,
		weekStart,
	);
	const generatePlan = useGenerateMealPlan();

	// Memoize meals grouped by day to avoid recalculating on every render
	const mealsByDay = useMemo(() => {
		const grouped: Record<number, PlannedMealWithRecipe[]> = {};
		mealPlan?.meals.forEach((meal) => {
			if (!grouped[meal.day]) grouped[meal.day] = [];
			grouped[meal.day].push(meal);
		});

		// Sort each day's meals by meal type order
		for (const day of Object.keys(grouped)) {
			grouped[Number(day)].sort(
				(a, b) =>
					MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType),
			);
		}
		return grouped;
	}, [mealPlan?.meals]);

	// Memoize getDayKcal callback
	const getDayKcal = useCallback(
		(day: number) =>
			mealsByDay[day]?.reduce((sum, m) => sum + m.portionKcal, 0) ?? 0,
		[mealsByDay],
	);

	const dailyTarget = mealPlan
		? Math.round(mealPlan.targetKcalWeekly / 7)
		: 2000;

	return (
		<View className="flex-1 bg-ui-50" style={{ paddingTop: insets.top }}>
			{/* Sticky Header */}
			<View className="bg-white rounded-b-[30px] shadow-sm shadow-ui-200 z-20 pb-4 px-5 pt-2">
				<Text className="text-2xl font-bold text-ui-900 mb-4">
					Piano Settimanale
				</Text>

				<View className="bg-ui-50 rounded-2xl p-1.5 flex-row items-center justify-between border border-ui-100">
					<Pressable
						onPress={() => setWeekOffset((o) => o - 1)}
						className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"
					>
						<Text className="text-ui-600 font-bold">←</Text>
					</Pressable>

					<View className="items-center">
						<Text className="text-xs font-bold text-ui-400 uppercase tracking-widest mb-0.5">
							SETTIMANA
						</Text>
						<Text className="text-base font-bold text-ui-900">
							{formatWeekRange(weekStart)}
						</Text>
					</View>

					<Pressable
						onPress={() => setWeekOffset((o) => o + 1)}
						className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"
					>
						<Text className="text-ui-600 font-bold">→</Text>
					</Pressable>
				</View>
			</View>

			<ScrollView
				className="flex-1 px-5 pt-6"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
			>
				{!mealPlan && !isLoading ? (
					<View className="items-center py-10 bg-white rounded-3xl p-6 shadow-sm border border-ui-100 mt-4">
						<View className="w-20 h-20 bg-brand-50 rounded-full items-center justify-center mb-4">
							<Text className="text-3xl">📅</Text>
						</View>
						<Text className="text-xl font-bold text-ui-900 text-center mb-2">
							Pianifica la tua settimana
						</Text>
						<Text className="text-ui-500 text-center mb-6 px-4">
							Genera un menu bilanciato basato sui tuoi macro e preferenze con
							un solo tocco.
						</Text>
						<Pressable
							onPress={() => {
								if (selectedMemberId)
									generatePlan.mutate({
										familyMemberId: selectedMemberId,
										weekStart,
									});
							}}
							disabled={generatePlan.isPending || !selectedMemberId}
							className="bg-brand-500 w-full py-4 rounded-xl shadow-lg shadow-brand-500/30 active:bg-brand-600"
						>
							<Text className="text-white font-bold text-center text-lg">
								{generatePlan.isPending
									? "Generazione in corso..."
									: "✨ Genera Piano Magic"}
							</Text>
						</Pressable>
					</View>
				) : (
					<View className="gap-6">
						{[1, 2, 3, 4, 5, 6, 7].map((day) => {
							const meals = mealsByDay[day] ?? [];
							const dayKcal = getDayKcal(day);
							const dayDate = new Date(weekStart);
							dayDate.setDate(dayDate.getDate() + day - 1);
							const isOver = dayKcal > dailyTarget;

							return (
								<View key={day}>
									{/* Day Date Header */}
									<View className="flex-row items-end gap-3 mb-3 ml-1">
										<Text className="text-3xl font-bold text-ui-900 leading-none">
											{dayDate.getDate()}
										</Text>
										<View>
											<Text className="text-xs font-bold text-ui-400 uppercase leading-none mb-1">
												{DAY_NAMES[day - 1]}
											</Text>
											<Text className="text-sm font-medium text-ui-500 leading-none">
												{dayDate.toLocaleDateString("it-IT", { month: "long" })}
											</Text>
										</View>
										<View className="flex-1" />
										<View className="items-end">
											<Text
												className={`text-xs font-bold ${isOver ? "text-red-500" : "text-brand-600"}`}
											>
												{dayKcal} / {dailyTarget} kcal
											</Text>
											<View className="w-24 mt-1">
												<ProgressBar
													current={dayKcal}
													target={dailyTarget}
													height={4}
													showLabel={false}
												/>
											</View>
										</View>
									</View>

									{/* Meals List */}
									<View className="gap-0">
										{meals.map((meal) => (
											<MealCard
												key={meal.id}
												meal={meal}
												onPress={() =>
													router.push({
														pathname: "/(modals)/recipe-detail",
														params: { id: meal.recipeId },
													})
												}
												onSwap={() =>
													router.push({
														pathname: "/(modals)/meal-swap",
														params: { mealId: meal.id },
													})
												}
											/>
										))}
										{meals.length === 0 && (
											<View className="bg-ui-50 border-2 border-dashed border-ui-200 rounded-xl p-4 items-center">
												<Text className="text-ui-400 font-medium">
													Riposo (o digiuno?)
												</Text>
											</View>
										)}
									</View>
								</View>
							);
						})}
					</View>
				)}
			</ScrollView>

			{/* Floating Action Bar */}
			{mealPlan && (
				<View className="absolute bottom-8 self-center flex-row gap-4 shadow-xl shadow-brand-900/10">
					<Pressable
						onPress={() => router.push("/(modals)/shopping-list")}
						className="bg-brand-500 px-6 py-3.5 rounded-full flex-row items-center gap-2"
					>
						<Text className="text-white font-bold">🛒 Lista Spesa</Text>
					</Pressable>
					<Pressable
						className="bg-white px-4 py-3.5 rounded-full border border-ui-200"
						onPress={() => {
							if (selectedMemberId)
								generatePlan.mutate({
									familyMemberId: selectedMemberId,
									weekStart,
								});
						}}
					>
						<Text className="text-xl">🔄</Text>
					</Pressable>
				</View>
			)}
		</View>
	);
}
