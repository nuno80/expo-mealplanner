import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

/**
 * Expo Go needs its runtime URL; standalone/dev builds use the native scheme.
 * Add the URL produced by the build to Supabase Auth Redirect URLs.
 */
export const AUTH_REDIRECT_URL = __DEV__
	? Linking.createURL("auth/callback")
	: "nutriplanit://auth/callback";

const ExpoSecureStoreAdapter = {
	getItem: (key: string) => SecureStore.getItemAsync(key),
	setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
	removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn(
		"Supabase keys are missing! Check your .env setup. Auth will fail.",
	);
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
	auth: {
		storage: ExpoSecureStoreAdapter,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

/** Wipe the persisted session without requiring a network request. */
export async function wipeStoredSession() {
	const host = supabaseUrl?.split("//")[1]?.split(".")[0];
	if (!host) return;
	const key = `sb-${host}-auth-token`;
	await ExpoSecureStoreAdapter.removeItem(key);
	await ExpoSecureStoreAdapter.removeItem(`${key}-code-verifier`);
	await ExpoSecureStoreAdapter.removeItem(`${key}-user`);
}
