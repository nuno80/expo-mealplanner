import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const ExpoSecureStoreAdapter = {
	getItem: (key: string) => {
		return SecureStore.getItemAsync(key);
	},
	setItem: (key: string, value: string) => {
		return SecureStore.setItemAsync(key, value);
	},
	removeItem: (key: string) => {
		return SecureStore.deleteItemAsync(key);
	},
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn(
		"Supabase keys are missing! Check your .env setup. Auth will fail.",
	);
}

console.log("Supabase URL initialized:", supabaseUrl);

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
	auth: {
		storage: ExpoSecureStoreAdapter,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
