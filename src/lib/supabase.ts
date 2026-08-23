import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

/**
 * Stable native callback registered by app.json (scheme "nutriplanit") and
 * allowlisted in the Supabase dashboard (Auth → URL Configuration).
 *
 * Do NOT use Linking.createURL() here: in a dev build with a custom scheme it
 * produces an empty-host URL ("nutriplanit:////auth/callback") that Supabase
 * refuses (not allowlisted) and silently falls back to the project Site URL
 * (http://localhost:3000) — the link then opens the browser, not the app.
 */
export const AUTH_REDIRECT_URL = "nutriplanit://auth/callback";

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
