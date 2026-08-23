import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FamilyMemberSelector } from "@/components/FamilyMemberSelector";
import { MacroProgressChart } from "@/components/MacroProgressChart";
import { WeeklyKcalRing } from "@/components/WeeklyKcalRing";
import { WeightChart } from "@/components/WeightChart";
import { useFamilyMember } from "@/hooks/useFamilyMembers";
import { getWeekStart, useWeeklyProgress } from "@/hooks/useMealPlan";
import { useWeightChange, useWeightHistory } from "@/hooks/useWeightLogs";
import { useFamilyStore } from "@/stores/familyStore";

export default function ProgressScreen() {
	const insets = useSafeAreaInsets();
	const { selectedMemberId } = useFamilyStore();
	const { data: member } = useFamilyMember(selectedMemberId ?? "");
	const { data: history = [] } = useWeightHistory(selectedMemberId);
	const { data: weightChange } = useWeightChange(selectedMemberId);

	// Weekly progress data
	const weekStart = getWeekStart(0);
	const { data: weeklyProgress } = useWeeklyProgress(
		selectedMemberId ?? undefined,
		weekStart,
	);

	const chartData = history.map((h) => ({
		date: new Date(h.date),
		weightKg: h.weightKg,
	}));

	const isGain = (weightChange?.change ?? 0) > 0;
	// Use static classes to ensure NativeWind generates them
	const badgeBg = isGain ? "bg-red-100" : "bg-green-100";
	const badgeText = isGain ? "text-red-700" : "text-green-700";

	return (
		<View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
			<View className="px-6 py-4 bg-white border-b border-gray-100 flex-row justify-between items-center z-10">
				<Text className="text-2xl font-bold text-gray-900">Progressi</Text>
				<FamilyMemberSelector variant="header" />
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
			>
				{/* Weekly Macro Progress Section */}
				{weeklyProgress && (
					<View className="m-6 gap-4">
						<Text className="text-lg font-bold text-gray-900 mb-1">
							Questa Settimana
						</Text>

						{/* Weekly Kcal Ring */}
						<WeeklyKcalRing
							current={weeklyProgress.totals.kcal}
							target={weeklyProgress.targets.kcalWeekly}
							completedMeals={weeklyProgress.totals.completedMeals}
							totalMeals={weeklyProgress.totals.totalMeals}
						/>

						{/* Daily Macro Chart */}
						<MacroProgressChart
							daily={weeklyProgress.daily}
							targetKcalDaily={weeklyProgress.targets.kcalDaily}
						/>

						{/* Macro Summary */}
						<View className="bg-white rounded-2xl p-4 shadow-sm border border-ui-100">
							<Text className="text-base font-bold text-ui-900 mb-3">
								Macro Totali (completati)
							</Text>
							<View className="flex-row justify-between">
								<View className="items-center">
									<Text className="text-2xl font-bold text-green-500">
										{weeklyProgress.totals.protein}g
									</Text>
									<Text className="text-xs text-ui-500">Proteine</Text>
								</View>
								<View className="items-center">
									<Text className="text-2xl font-bold text-amber-500">
										{weeklyProgress.totals.carbs}g
									</Text>
									<Text className="text-xs text-ui-500">Carboidrati</Text>
								</View>
								<View className="items-center">
									<Text className="text-2xl font-bold text-red-500">
										{weeklyProgress.totals.fat}g
									</Text>
									<Text className="text-xs text-ui-500">Grassi</Text>
								</View>
							</View>
						</View>
					</View>
				)}

				{/* Weight Summary Card */}
				<View className="mx-6 mb-6 bg-white rounded-2xl p-6 shadow-sm">
					<Text className="text-gray-500 font-medium mb-1">Peso attuale</Text>
					<View className="flex-row items-end space-x-3 mb-4">
						<Text className="text-4xl font-bold text-gray-900">
							{member?.weightKg ?? "--"}
							<Text className="text-xl font-medium text-gray-500"> kg</Text>
						</Text>

						{weightChange && (
							<View className={`${badgeBg} px-2 py-1 rounded-lg mb-2`}>
								<Text className={`${badgeText} font-bold text-xs`}>
									{isGain ? "+" : ""}
									{weightChange.change} kg (30gg)
								</Text>
							</View>
						)}
					</View>

					<WeightChart data={chartData} />
				</View>

				{/* History List */}
				<View className="px-6 mb-4">
					<Text className="text-lg font-bold text-gray-900 mb-2">Storico</Text>
					<View className="bg-white rounded-2xl overflow-hidden shadow-sm">
						{history.length === 0 ? (
							<View className="p-8 items-center">
								<Text className="text-gray-400">Nessuna misurazione</Text>
							</View>
						) : (
							history.map((log, index) => (
								<View
									key={log.id}
									className={`p-4 flex-row justify-between items-center ${
										index < history.length - 1 ? "border-b border-gray-100" : ""
									}`}
								>
									<Text className="font-medium text-gray-600">
										{new Date(log.date).toLocaleDateString("it-IT", {
											day: "numeric",
											month: "long",
										})}
									</Text>
									<Text className="font-bold text-gray-900">
										{log.weightKg} kg
									</Text>
								</View>
							))
						)}
					</View>
				</View>
			</ScrollView>

			{/* FAB */}
			<View className="absolute bottom-6 right-6">
				<Link href="/(modals)/add-weight" asChild>
					<Pressable className="bg-primary-600 w-14 h-14 rounded-full items-center justify-center shadow-lg active:bg-primary-700">
						<Text className="text-white text-3xl font-light mb-1">+</Text>
					</Pressable>
				</Link>
			</View>
		</View>
	);
}
