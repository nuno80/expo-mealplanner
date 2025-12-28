import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PlanScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-white px-6"
			style={{ paddingTop: insets.top + 20 }}
		>
			<Text className="text-2xl font-bold text-gray-900 mb-4">
				Piano Settimanale
			</Text>
			<Text className="text-gray-600">
				Il tuo piano alimentare apparirà qui.
			</Text>
		</View>
	);
}
