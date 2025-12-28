import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { z } from "zod";
import {
	type ActivityLevelSchema,
	type OnboardingProfileInput,
	OnboardingProfileSchema,
} from "@/schemas/auth";
import { useAuthStore } from "@/stores/authStore";

const SEX_OPTIONS: { value: "male" | "female"; label: string }[] = [
	{ value: "male", label: "👨 Uomo" },
	{ value: "female", label: "👩 Donna" },
];

const ACTIVITY_OPTIONS: {
	value: z.infer<typeof ActivityLevelSchema>;
	label: string;
	description: string;
}[] = [
	{
		value: "sedentary",
		label: "Sedentario",
		description: "Lavoro d'ufficio, nessun esercizio",
	},
	{
		value: "light",
		label: "Leggero",
		description: "Esercizio 1-3 volte/settimana",
	},
	{
		value: "moderate",
		label: "Moderato",
		description: "Esercizio 3-5 volte/settimana",
	},
	{
		value: "active",
		label: "Attivo",
		description: "Esercizio 6-7 volte/settimana",
	},
	{
		value: "very_active",
		label: "Molto attivo",
		description: "Atleta o lavoro fisico intenso",
	},
];

export default function OnboardingProfileScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { setOnboardingProfile } = useAuthStore();

	const {
		control,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<OnboardingProfileInput>({
		resolver: zodResolver(OnboardingProfileSchema),
		defaultValues: {
			name: "",
			birthYear: undefined,
			heightCm: undefined,
			weightKg: undefined,
		},
	});

	const selectedSex = watch("sex");
	const selectedActivity = watch("activityLevel");

	const onSubmit = (data: OnboardingProfileInput) => {
		setOnboardingProfile(data);
		router.push("/(onboarding)/tdee");
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-white"
		>
			<ScrollView
				className="flex-1 px-6"
				contentContainerStyle={{
					paddingTop: insets.top + 20,
					paddingBottom: insets.bottom + 100,
				}}
				keyboardShouldPersistTaps="handled"
			>
				<Text className="text-2xl font-bold text-gray-900 mb-6">
					Parliamo di te
				</Text>

				{/* Name */}
				<Text className="text-gray-700 font-medium mb-2">Come ti chiami?</Text>
				<Controller
					control={control}
					name="name"
					render={({ field: { onChange, onBlur, value } }) => (
						<TextInput
							className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1"
							placeholder="Il tuo nome"
							onBlur={onBlur}
							onChangeText={onChange}
							value={value}
						/>
					)}
				/>
				{errors.name && (
					<Text className="text-red-500 text-sm mb-3">
						{errors.name.message}
					</Text>
				)}

				{/* Sex */}
				<Text className="text-gray-700 font-medium mb-2 mt-4">Sesso</Text>
				<Controller
					control={control}
					name="sex"
					render={({ field: { onChange } }) => (
						<View className="flex-row gap-3 mb-4">
							{SEX_OPTIONS.map((opt) => (
								<Pressable
									key={opt.value}
									className={`flex-1 py-3 rounded-xl border ${
										selectedSex === opt.value
											? "bg-primary-100 border-primary-500"
											: "bg-gray-50 border-gray-200"
									}`}
									onPress={() => onChange(opt.value)}
								>
									<Text className="text-center text-lg">{opt.label}</Text>
								</Pressable>
							))}
						</View>
					)}
				/>
				{errors.sex && (
					<Text className="text-red-500 text-sm mb-3">
						{errors.sex.message}
					</Text>
				)}

				{/* Birth Year */}
				<Text className="text-gray-700 font-medium mb-2">Anno di nascita</Text>
				<Controller
					control={control}
					name="birthYear"
					render={({ field: { onChange, onBlur, value } }) => (
						<TextInput
							className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1"
							placeholder="es. 1990"
							keyboardType="number-pad"
							onBlur={onBlur}
							onChangeText={(t) =>
								onChange(t ? Number.parseInt(t, 10) : undefined)
							}
							value={value?.toString() ?? ""}
						/>
					)}
				/>
				{errors.birthYear && (
					<Text className="text-red-500 text-sm mb-3">
						{errors.birthYear.message}
					</Text>
				)}

				{/* Height */}
				<Text className="text-gray-700 font-medium mb-2 mt-2">
					Altezza (cm)
				</Text>
				<Controller
					control={control}
					name="heightCm"
					render={({ field: { onChange, onBlur, value } }) => (
						<TextInput
							className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1"
							placeholder="es. 175"
							keyboardType="number-pad"
							onBlur={onBlur}
							onChangeText={(t) =>
								onChange(t ? Number.parseInt(t, 10) : undefined)
							}
							value={value?.toString() ?? ""}
						/>
					)}
				/>
				{errors.heightCm && (
					<Text className="text-red-500 text-sm mb-3">
						{errors.heightCm.message}
					</Text>
				)}

				{/* Weight */}
				<Text className="text-gray-700 font-medium mb-2 mt-2">Peso (kg)</Text>
				<Controller
					control={control}
					name="weightKg"
					render={({ field: { onChange, onBlur, value } }) => (
						<TextInput
							className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1"
							placeholder="es. 70.5"
							keyboardType="decimal-pad"
							onBlur={onBlur}
							onChangeText={(t) =>
								onChange(t ? Number.parseFloat(t) : undefined)
							}
							value={value?.toString() ?? ""}
						/>
					)}
				/>
				{errors.weightKg && (
					<Text className="text-red-500 text-sm mb-3">
						{errors.weightKg.message}
					</Text>
				)}

				{/* Activity Level */}
				<Text className="text-gray-700 font-medium mb-2 mt-4">
					Livello di attività
				</Text>
				<Controller
					control={control}
					name="activityLevel"
					render={({ field: { onChange } }) => (
						<View className="gap-2">
							{ACTIVITY_OPTIONS.map((opt) => (
								<Pressable
									key={opt.value}
									className={`py-3 px-4 rounded-xl border ${
										selectedActivity === opt.value
											? "bg-primary-100 border-primary-500"
											: "bg-gray-50 border-gray-200"
									}`}
									onPress={() => onChange(opt.value)}
								>
									<Text className="font-medium text-gray-900">{opt.label}</Text>
									<Text className="text-gray-600 text-sm">
										{opt.description}
									</Text>
								</Pressable>
							))}
						</View>
					)}
				/>
				{errors.activityLevel && (
					<Text className="text-red-500 text-sm mt-2">
						{errors.activityLevel.message}
					</Text>
				)}
			</ScrollView>

			{/* Fixed button at bottom */}
			<View
				className="px-6 bg-white border-t border-gray-100"
				style={{ paddingBottom: insets.bottom + 10, paddingTop: 10 }}
			>
				<Pressable
					className="w-full bg-primary-500 py-4 rounded-xl"
					onPress={handleSubmit(onSubmit)}
				>
					<Text className="text-white text-center text-lg font-semibold">
						Continua →
					</Text>
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}
