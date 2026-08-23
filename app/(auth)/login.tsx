import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { supabase } from "@/lib/supabase";
import { getPrimaryMember } from "@/services/user.service";

const loginSchema = z.object({
	email: z.string().trim().email("Email non valida"),
	password: z.string().min(1, "Password richiesta"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (data: LoginFormData) => {
		setLoading(true);
		let result;
		for (let attempt = 1; attempt <= 2; attempt++) {
			result = await supabase.auth.signInWithPassword({
				email: data.email.trim(),
				password: data.password,
			});
			if (!result.error || attempt === 2) break;
			const isNetwork = result.error.status === undefined || result.error.status >= 500;
			if (!isNetwork) break;
			console.warn("[Login] Retry", attempt, "after:", result.error.message);
		}

		if (result?.error) {
			setLoading(false);
			Alert.alert("Errore", result.error.message);
			return;
		}

		const userId = result.data.user?.id;
		if (!userId) {
			setLoading(false);
			Alert.alert("Errore", "Login completato ma sessione non disponibile. Riprova.");
			return;
		}

		// The root index can run before its async onboarding lookup completes.
		// Resolve the route here, after Supabase has returned the authenticated user,
		// so existing users never get stranded on the onboarding/auth stack.
		const primaryMember = await getPrimaryMember(userId);
		setLoading(false);
		router.replace(primaryMember ? "/(tabs)" : "/(onboarding)/goal");
	};

	return (
		<View className="flex-1 bg-white px-6" style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}>
			<Text className="text-2xl font-bold text-gray-900 mb-8">Accedi</Text>
			<Text className="text-gray-700 mb-2">Email</Text>
			<Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
				<TextInput className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-1 text-gray-900 bg-white" placeholder="email@esempio.com" keyboardType="email-address" autoCapitalize="none" onBlur={onBlur} onChangeText={onChange} value={value} />
			)} />
			{errors.email && <Text className="text-red-500 text-sm mb-3">{errors.email.message}</Text>}
			<Text className="text-gray-700 mb-2 mt-2">Password</Text>
			<Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
				<PasswordInput placeholder="••••••••" onBlur={onBlur} onChangeText={onChange} value={value} />
			)} />
			{errors.password && <Text className="text-red-500 text-sm mb-4">{errors.password.message}</Text>}
			<View className="flex-row justify-end mb-4"><Link href="/(auth)/forgot-password" asChild><Pressable><Text className="text-primary-600 text-sm font-medium">Password dimenticata?</Text></Pressable></Link></View>
			<Pressable className={`w-full bg-primary-500 py-4 rounded-xl mb-4 mt-4 ${loading ? "opacity-70" : ""}`} onPress={handleSubmit(onSubmit)} disabled={loading}>
				<Text className="text-white text-center text-lg font-semibold">{loading ? "Accesso in corso..." : "Accedi"}</Text>
			</Pressable>
			<Link href="/(auth)/signup" asChild><Pressable><Text className="text-primary-600 text-center">Non hai un account? Registrati</Text></Pressable></Link>
		</View>
	);
}
