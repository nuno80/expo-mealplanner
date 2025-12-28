import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProgressScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20 }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-4">Progressi</Text>
			<Text className="text-gray-600">Traccia il tuo peso e le misure.</Text>
		</View>
	);
}
