import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const { signOut, user } = useAuthStore();

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20 }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-4">Profilo</Text>

			<View className="mb-8 p-4 bg-gray-50 rounded-xl">
				<Text className="text-gray-500">Email:</Text>
				<Text className="text-lg font-semibold">{user?.email}</Text>
			</View>

			<Pressable
				className="w-full bg-red-50 py-4 rounded-xl border border-red-200"
				onPress={signOut}
			>
				<Text className="text-red-600 text-center text-lg font-semibold">
					Esci
				</Text>
			</Pressable>
		</View>
	);
}
