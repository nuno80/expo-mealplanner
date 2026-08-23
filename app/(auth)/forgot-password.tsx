import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { supabase, AUTH_REDIRECT_URL } from "@/lib/supabase";

const forgotPasswordSchema = z.object({
	email: z.string().email("Email non valida"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Supabase (free plan) rate-limits recovery emails to 4/hour per email
// address. The API answers 200 even when the quota is exhausted (or 429 on
// repeat calls), so the UI must throttle manually to make the limit visible
// instead of silently swallowing requests.
const RESET_EMAIL_MAX_PER_HOUR = 4;
const RESET_EMAIL_HOUR_MS = 60 * 60 * 1000;

export default function ForgotPasswordScreen() {
	const insets = useSafeAreaInsets();
	const [loading, setLoading] = useState(false);
	const [successArgs, setSuccessArgs] = useState<{ email: string } | null>(
		null,
	);
	const [sentCount, setSentCount] = useState(0);
	const [firstSentAt, setFirstSentAt] = useState<number | null>(null);

	// Emails allowed in the current rolling hour, clamped to [0, 4].
	// When the hour has rolled, the count is reset (fresh quota).
	const hourRolled = firstSentAt !== null && Date.now() - firstSentAt >= RESET_EMAIL_HOUR_MS;
	const effectiveCount = hourRolled ? 0 : sentCount;
	const emailsLeft = Math.max(0, RESET_EMAIL_MAX_PER_HOUR - effectiveCount);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(forgotPasswordSchema),
	});

	const onSubmit = async (data: ForgotPasswordFormData) => {
		setLoading(true);
		// Redirect URL allowlisted in the Supabase dashboard (Auth → URL
		// Configuration). Explicit redirectTo is required: without it Supabase
		// falls back to the project's Site URL (http://localhost:3000) and the
		// link opens the phone browser instead of the app.
		const redirectTo = AUTH_REDIRECT_URL;

		const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
			redirectTo,
		});
		setLoading(false);

		if (error) {
			Alert.alert("Errore", error.message);
		} else {
			// Track sends in a rolling hour so the rate limit is visible in UI.
			setSentCount((c) => c + 1);
			setFirstSentAt((t) => t ?? Date.now());
			setSuccessArgs({ email: data.email });
		}
	};

	if (successArgs) {
		return (
			<View
				className="flex-1 bg-white px-6 justify-center items-center"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				<View className="bg-green-100 p-4 rounded-full mb-6">
					<Text className="text-4xl">📧</Text>
				</View>
				<Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
					Controlla la tua email
				</Text>
				<Text className="text-gray-600 text-center mb-8 leading-6">
					Abbiamo inviato un link di reset password a{"\n"}
					<Text className="font-semibold text-gray-900">
						{successArgs.email}
					</Text>
					.{"\n"}Clicca sul link per impostare una nuova password.
				</Text>

				<Link href="/(auth)/login" asChild>
					<Pressable className="w-full bg-primary-500 py-4 rounded-xl">
						<Text className="text-white text-center text-lg font-semibold">
							Torna al Login
						</Text>
					</Pressable>
				</Link>
			</View>
		);
	}

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
		>
			<View className="mb-8">
				<Link href="/(auth)/login" asChild>
					<Pressable className="mb-4">
						<Text className="text-primary-600 font-medium">← Indietro</Text>
					</Pressable>
				</Link>
				<Text className="text-2xl font-bold text-gray-900">
					Password dimenticata?
				</Text>
				<Text className="text-gray-500 mt-2">
					Inserisci la tua email e ti invieremo le istruzioni per reimpostare la
					password.
				</Text>
			</View>

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

			<Pressable
				className={`w-full bg-primary-500 py-4 rounded-xl mb-4 mt-6 ${
					loading || emailsLeft <= 0 ? "opacity-70" : ""
				}`}
				onPress={handleSubmit(onSubmit)}
				disabled={loading || emailsLeft <= 0}
			>
				<Text className="text-white text-center text-lg font-semibold">
					{loading
						? "Invio in corso..."
						: emailsLeft <= 0
							? "Limite raggiunto"
							: "Invia Link Reset"}
				</Text>
			</Pressable>
			<Text className="text-gray-400 text-xs text-center mb-2">
				{emailsLeft <= 0
					? "Hai raggiunto il limite di 4 email di reset all'ora. Riprova più tardi."
					: `Puoi inviare fino a ${RESET_EMAIL_MAX_PER_HOUR} email di reset all'ora. Rimaste: ${emailsLeft}${hourRolled ? " · finestra resettata" : ""}`}
			</Text>
		</View>
	);
}
