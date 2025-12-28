import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
	const insets = useSafeAreaInsets();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					height: 60 + insets.bottom,
					paddingBottom: insets.bottom,
					paddingTop: 8,
				},
				tabBarActiveTintColor: "#22c55e",
				tabBarInactiveTintColor: "#9ca3af",
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color }) => (
						<Text style={{ color, fontSize: 24 }}>🏠</Text>
					),
				}}
			/>
			<Tabs.Screen
				name="recipes"
				options={{
					title: "Ricette",
					tabBarIcon: ({ color }) => (
						<Text style={{ color, fontSize: 24 }}>🍳</Text>
					),
				}}
			/>
			<Tabs.Screen
				name="plan"
				options={{
					title: "Piano",
					tabBarIcon: ({ color }) => (
						<Text style={{ color, fontSize: 24 }}>📅</Text>
					),
				}}
			/>
			<Tabs.Screen
				name="progress"
				options={{
					title: "Progressi",
					tabBarIcon: ({ color }) => (
						<Text style={{ color, fontSize: 24 }}>📈</Text>
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profilo",
					tabBarIcon: ({ color }) => (
						<Text style={{ color, fontSize: 24 }}>👤</Text>
					),
				}}
			/>
		</Tabs>
	);
}
