import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-white items-center justify-center px-6"
			style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
		>
			{/* Logo placeholder */}
			<View className="w-24 h-24 bg-primary-500 rounded-3xl items-center justify-center mb-8">
				<Text className="text-white text-4xl">🥗</Text>
			</View>

			<Text className="text-3xl font-bold text-gray-900 text-center mb-2">
				NutriPlanIT
			</Text>
			<Text className="text-lg text-gray-600 text-center mb-12">
				Piani alimentari per tutta la famiglia
			</Text>

			<Link href="/(auth)/signup" asChild>
				<Pressable className="w-full bg-primary-500 py-4 rounded-xl mb-4">
					<Text className="text-white text-center text-lg font-semibold">
						Inizia ora
					</Text>
				</Pressable>
			</Link>

			<Link href="/(auth)/login" asChild>
				<Pressable className="w-full border border-gray-300 py-4 rounded-xl">
					<Text className="text-gray-700 text-center text-lg font-semibold">
						Ho già un account
					</Text>
				</Pressable>
			</Link>
		</View>
	);
}
