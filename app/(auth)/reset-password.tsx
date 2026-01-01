import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { supabase } from "@/lib/supabase";

const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(6, "La password deve essere di almeno 6 caratteri"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Le password non coincidono",
		path: ["confirmPassword"],
	});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [sessionChecked, setSessionChecked] = useState(false);

	useEffect(() => {
		// Verify we have a session (set by the deep link handler)
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session) {
				Alert.alert(
					"Link scaduto",
					"Il link di reset password è scaduto o non valido. Richiedine uno nuovo.",
					[
						{
							text: "OK",
							onPress: () => router.replace("/(auth)/forgot-password"),
						},
					],
				);
			} else {
				setSessionChecked(true);
			}
		});
	}, [router]);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<ResetPasswordFormData>({
		resolver: zodResolver(resetPasswordSchema),
	});

	const onSubmit = async (data: ResetPasswordFormData) => {
		setLoading(true);
		const { error } = await supabase.auth.updateUser({
			password: data.password,
		});
		setLoading(false);

		if (error) {
			Alert.alert("Errore", error.message);
		} else {
			Alert.alert(
				"Successo",
				"Password aggiornata correttamente. Verrai reindirizzato alla Home.",
				[
					{
						text: "OK",
						onPress: () => router.replace("/"), // Go to protected home
					},
				],
			);
		}
	};

	if (!sessionChecked) {
		return (
			<View className="flex-1 bg-white justify-center items-center">
				<Text>Verifica sessione in corso...</Text>
			</View>
		);
	}

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-8">
				Nuova Password
			</Text>

			<Text className="text-gray-500 mb-8">
				Inserisci la tua nuova password per accedere al tuo account.
			</Text>

			<Text className="text-gray-700 mb-2">Nuova Password</Text>
			<Controller
				control={control}
				name="password"
				render={({ field: { onChange, onBlur, value } }) => (
					<PasswordInput
						placeholder="••••••••"
						onBlur={onBlur}
						onChangeText={onChange}
						value={value}
					/>
				)}
			/>
			{errors.password && (
				<Text className="text-red-500 text-sm mb-4">
					{errors.password.message}
				</Text>
			)}

			<Text className="text-gray-700 mb-2">Conferma Password</Text>
			<Controller
				control={control}
				name="confirmPassword"
				render={({ field: { onChange, onBlur, value } }) => (
					<PasswordInput
						placeholder="••••••••"
						onBlur={onBlur}
						onChangeText={onChange}
						value={value}
					/>
				)}
			/>
			{errors.confirmPassword && (
				<Text className="text-red-500 text-sm mb-4">
					{errors.confirmPassword.message}
				</Text>
			)}

			<Pressable
				className={`w-full bg-primary-500 py-4 rounded-xl mb-4 mt-6 ${
					loading ? "opacity-70" : ""
				}`}
				onPress={handleSubmit(onSubmit)}
				disabled={loading}
			>
				<Text className="text-white text-center text-lg font-semibold">
					{loading ? "Aggiorna Password..." : "Aggiorna Password"}
				</Text>
			</Pressable>
		</View>
	);
}
