import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { supabase } from "@/lib/supabase";

const signupSchema = z
	.object({
		email: z.string().email("Email non valida"),
		password: z
			.string()
			.min(6, "La password deve essere di almeno 6 caratteri"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Le password non coincidono",
		path: ["confirmPassword"],
	});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<SignupFormData>({
		resolver: zodResolver(signupSchema),
	});

	const onSubmit = async (data: SignupFormData) => {
		setLoading(true);
		// Retry once on transient network failures (first TLS handshake can drop)
		let result;
		let thrownError: Error | null = null;
		for (let attempt = 1; attempt <= 2; attempt++) {
			try {
				result = await supabase.auth.signUp({
					email: data.email,
					password: data.password,
				});
				thrownError = null;
			} catch (e) {
				thrownError = e instanceof Error ? e : new Error(String(e));
				console.warn("[Signup] Network exception, retry", attempt, ":", thrownError.message);
			}
			if (!thrownError && !result?.error) break; // success
			if (attempt === 2) break;
		}
		setLoading(false);

		const { error, data: authData } = result ?? { error: thrownError, data: { session: null } };

		if (error) {
			Alert.alert("Errore", error.message);
		} else if (authData.session) {
			// User signed up and is logged in, go to onboarding
			router.replace("/(onboarding)/goal");
		} else {
			// Email confirmation required
			Alert.alert(
				"Controlla la tua email",
				"Abbiamo inviato un link di conferma. Clicca il link e poi effettua il login.",
			);
			router.replace("/(auth)/login");
		}
	};

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-8">Registrati</Text>

			<Text className="text-gray-700 mb-2">Email</Text>
			<Controller
				control={control}
				name="email"
				render={({ field: { onChange, onBlur, value } }) => (
					<TextInput
						className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1 text-gray-900 bg-white"
						placeholder="email@esempio.com"
						keyboardType="email-address"
						autoCapitalize="none"
						onBlur={onBlur}
						onChangeText={onChange}
						value={value}
					/>
				)}
			/>
			{errors.email && (
				<Text className="text-red-500 text-sm mb-3">
					{errors.email.message}
				</Text>
			)}

			<Text className="text-gray-700 mb-2 mt-2">Password</Text>
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

			<Text className="text-gray-700 mb-2 mt-2">Conferma Password</Text>
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
				className={`w-full bg-primary-500 py-4 rounded-xl mb-4 mt-4 ${
					loading ? "opacity-70" : ""
				}`}
				onPress={handleSubmit(onSubmit)}
				disabled={loading}
			>
				<Text className="text-white text-center text-lg font-semibold">
					{loading ? "Creazione account..." : "Crea account"}
				</Text>
			</Pressable>

			<Link href="/(auth)/login" asChild>
				<Pressable>
					<Text className="text-primary-600 text-center">
						Hai già un account? Accedi
					</Text>
				</Pressable>
			</Link>
		</View>
	);
}
