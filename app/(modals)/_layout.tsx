import { Stack } from "expo-router";

/**
 * Modals layout - presents screens as modals over the tabs.
 */
export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="recipe-detail" />
      <Stack.Screen name="meal-swap" />
      <Stack.Screen name="add-weight" />
      <Stack.Screen name="shopping-list" />
      <Stack.Screen name="member-detail" />
    </Stack>
  );
}
