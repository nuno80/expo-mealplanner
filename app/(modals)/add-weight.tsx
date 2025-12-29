import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { type AddWeightInput, AddWeightSchema } from "@/schemas/weightLog";
import { addWeight } from "@/services/weightLog.service";
import { useAuthStore } from "@/stores/authStore";
import { useFamilyStore } from "@/stores/familyStore";

export default function AddWeightModal() {
	const router = useRouter();
	const { user } = useAuthStore();
	const { selectedMemberId } = useFamilyStore();
	const queryClient = useQueryClient();

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<AddWeightInput>({
		resolver: zodResolver(AddWeightSchema) as any,
		defaultValues: {
			familyMemberId: selectedMemberId ?? "",
			date: new Date(),
			weightKg: 0,
		},
	});

	const mutation = useMutation({
		mutationFn: async (data: AddWeightInput) => {
			if (!user?.id) throw new Error("No user ID");
			if (!selectedMemberId) throw new Error("No member selected");
			// Ensure familyMemberId is set
			return addWeight(user.id, { ...data, familyMemberId: selectedMemberId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["weightLogs"] });
			queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
			router.back();
		},
		onError: (error) => {
			Alert.alert("Errore", "Impossibile salvare il peso: " + error.message);
		},
	});

	const onSubmit = (data: AddWeightInput) => {
		if (!selectedMemberId) {
			Alert.alert("Errore", "Seleziona prima un membro della famiglia");
			return;
		}
		mutation.mutate(data);
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-white p-6"
		>
			<View className="flex-row justify-between items-center mb-6">
				<Pressable onPress={() => router.back()}>
					<Text className="text-primary-600 font-semibold text-lg">
						Annulla
					</Text>
				</Pressable>
				<Text className="text-xl font-bold">Registra Peso</Text>
				<View className="w-16" />
			</View>

			<View className="space-y-6">
				<View>
					<Text className="text-gray-600 mb-2 font-medium">Peso (kg)</Text>
					<Controller
						control={control}
						name="weightKg"
						render={({ field: { onChange, value } }) => (
							<TextInput
								className="bg-gray-50 p-6 rounded-2xl text-4xl text-center font-bold text-gray-900 border border-gray-200"
								keyboardType="decimal-pad"
								placeholder="0.0"
								autoFocus
								value={value ? String(value) : ""}
								onChangeText={(t) => onChange(Number(t))}
							/>
						)}
					/>
					{errors.weightKg && (
						<Text className="text-red-500 mt-1 text-center">
							{errors.weightKg.message}
						</Text>
					)}
				</View>

				<View>
					<Text className="text-gray-600 mb-2 font-medium">
						Note (opzionale)
					</Text>
					<Controller
						control={control}
						name="notes"
						render={({ field: { onChange, value } }) => (
							<TextInput
								className="bg-gray-50 p-4 rounded-xl text-lg border border-gray-200 min-h-[100px]"
								multiline
								textAlignVertical="top"
								placeholder="Es. Mattina a digiuno..."
								value={value ?? ""}
								onChangeText={onChange}
							/>
						)}
					/>
				</View>

				<Pressable
					className="bg-primary-600 py-4 rounded-2xl shadow-sm mt-4 active:bg-primary-700"
					onPress={handleSubmit(onSubmit as any)}
					disabled={mutation.isPending}
				>
					{mutation.isPending ? (
						<ActivityIndicator color="white" />
					) : (
						<Text className="text-white text-center font-bold text-lg">
							Salva Peso
						</Text>
					)}
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}
