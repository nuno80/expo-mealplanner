import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { calculateTargetKcal, calculateTDEE } from "@/lib/tdee";
import { useAuthStore } from "@/stores/authStore";

export default function OnboardingTdeeScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { onboardingData, setOnboardingTdee } = useAuthStore();

	const [tdee, setTdee] = useState(0);
	const [targetKcal, setTargetKcal] = useState(0);
	const [snacksEnabled, setSnacksEnabled] = useState(false);

	useEffect(() => {
		const { profile, goal } = onboardingData;
		if (!profile || !goal) {
			// Missing data, go back
			router.replace("/(onboarding)/goal");
			return;
		}

		const result = calculateTDEE({
			sex: profile.sex,
			weightKg: profile.weightKg,
			heightCm: profile.heightCm,
			birthYear: profile.birthYear,
			activityLevel: profile.activityLevel,
		});

		setTdee(result.tdee);
		setTargetKcal(calculateTargetKcal(result.tdee, goal.calorieAdjustment));
		setSnacksEnabled(goal.goal === "bulk"); // Default snacks ON for bulk
	}, [onboardingData, router]);

	const handleContinue = () => {
		setOnboardingTdee({
			tdee,
			targetKcal,
			macroProteinPct: 30,
			macroCarbPct: 40,
			macroFatPct: 30,
			snacksEnabled,
		});
		router.push("/(onboarding)/family");
	};

	const goal = onboardingData.goal;
	const goalLabel =
		goal?.goal === "cut"
			? "perdere peso"
			: goal?.goal === "bulk"
				? "aumentare massa"
				: "mantenere il peso";

	const adjustmentText =
		goal?.calorieAdjustment && goal.calorieAdjustment !== 0
			? `(${goal.calorieAdjustment > 0 ? "+" : ""}${goal.calorieAdjustment} kcal)`
			: "";

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-2">
				Il tuo fabbisogno
			</Text>
			<Text className="text-gray-600 mb-8">
				Abbiamo calcolato il tuo fabbisogno calorico giornaliero per{" "}
				<Text className="font-semibold text-primary-600">{goalLabel}</Text>.
			</Text>

			{/* TDEE Display */}
			<View className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-3xl p-6 mb-6 items-center border border-primary-200">
				<Text className="text-gray-600 mb-1">Il tuo TDEE</Text>
				<Text className="text-5xl font-bold text-primary-600">{tdee}</Text>
				<Text className="text-gray-500">kcal/giorno</Text>
			</View>

			{/* Target Display */}
			<View className="bg-gray-50 rounded-2xl p-5 mb-6 items-center border border-gray-200">
				<Text className="text-gray-600 mb-1">
					Target giornaliero {adjustmentText}
				</Text>
				<Text className="text-4xl font-bold text-gray-900">{targetKcal}</Text>
				<Text className="text-gray-500">kcal/giorno</Text>
			</View>

			{/* Macros Breakdown */}
			<View className="flex-row justify-between bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
				<View className="items-center flex-1">
					<Text className="text-2xl font-bold text-blue-600">
						{Math.round((targetKcal * 0.3) / 4)}g
					</Text>
					<Text className="text-gray-500 text-sm">Proteine</Text>
				</View>
				<View className="items-center flex-1 border-x border-gray-200">
					<Text className="text-2xl font-bold text-orange-500">
						{Math.round((targetKcal * 0.4) / 4)}g
					</Text>
					<Text className="text-gray-500 text-sm">Carboidrati</Text>
				</View>
				<View className="items-center flex-1">
					<Text className="text-2xl font-bold text-yellow-600">
						{Math.round((targetKcal * 0.3) / 9)}g
					</Text>
					<Text className="text-gray-500 text-sm">Grassi</Text>
				</View>
			</View>

			{/* Snacks Toggle */}
			<Pressable
				className={`flex-row items-center justify-between p-4 rounded-xl border ${
					snacksEnabled
						? "bg-primary-50 border-primary-400"
						: "bg-gray-50 border-gray-200"
				}`}
				onPress={() => setSnacksEnabled(!snacksEnabled)}
			>
				<View>
					<Text className="font-medium text-gray-900">Includi snack</Text>
					<Text className="text-gray-500 text-sm">
						Aggiungi 2 spuntini al piano giornaliero
					</Text>
				</View>
				<View
					className={`w-12 h-7 rounded-full p-1 ${
						snacksEnabled ? "bg-primary-500" : "bg-gray-300"
					}`}
				>
					<View
						className={`w-5 h-5 rounded-full bg-white ${
							snacksEnabled ? "ml-auto" : ""
						}`}
					/>
				</View>
			</Pressable>

			<View className="flex-1" />

			<Pressable
				className="w-full bg-primary-500 py-4 rounded-xl"
				onPress={handleContinue}
			>
				<Text className="text-white text-center text-lg font-semibold">
					Continua →
				</Text>
			</Pressable>
		</View>
	);
}
