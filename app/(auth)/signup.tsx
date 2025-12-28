import { Link } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignupScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-8">Registrati</Text>

			<Text className="text-gray-700 mb-2">Email</Text>
			<TextInput
				className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
				placeholder="email@esempio.com"
				keyboardType="email-address"
				autoCapitalize="none"
			/>

			<Text className="text-gray-700 mb-2">Password</Text>
			<TextInput
				className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
				placeholder="••••••••"
				secureTextEntry
			/>

			<Text className="text-gray-700 mb-2">Conferma Password</Text>
			<TextInput
				className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6"
				placeholder="••••••••"
				secureTextEntry
			/>

			<Pressable className="w-full bg-primary-500 py-4 rounded-xl mb-4">
				<Text className="text-white text-center text-lg font-semibold">
					Crea account
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
