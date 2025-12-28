import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RecipesScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20 }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-4">Ricette</Text>
			<Text className="text-gray-600">Esplora il catalogo delle ricette.</Text>
		</View>
	);
}
