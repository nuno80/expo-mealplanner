import { Redirect } from "expo-router";

export default function Index() {
	// TODO: Check auth state and redirect accordingly
	// For now, redirect to welcome screen
	return <Redirect href="/(auth)/welcome" />;
}
