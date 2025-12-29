import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FamilyMemberSelector } from "@/components/FamilyMemberSelector";
import { WeightChart } from "@/components/WeightChart";
import { useFamilyMember } from "@/hooks/useFamilyMembers";
import { useWeightChange, useWeightHistory } from "@/hooks/useWeightLogs";
import { useFamilyStore } from "@/stores/familyStore";

export default function ProgressScreen() {
	const insets = useSafeAreaInsets();
	const { selectedMemberId } = useFamilyStore();
	const { data: member } = useFamilyMember(selectedMemberId ?? "");
	const { data: history = [] } = useWeightHistory(selectedMemberId);
	const { data: weightChange } = useWeightChange(selectedMemberId);

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
				{/* Summary Card */}
				<View className="m-6 bg-white rounded-2xl p-6 shadow-sm">
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
