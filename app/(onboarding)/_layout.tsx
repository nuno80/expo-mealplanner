import { Stack } from "expo-router";

export default function OnboardingLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="goal" />
			<Stack.Screen name="profile" />
			<Stack.Screen name="tdee" />
			<Stack.Screen name="family" />
		</Stack>
	);
}
