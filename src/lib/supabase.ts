import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

/**
 * Deep-link URL base used as the Supabase redirect for auth emails
 * (password recovery). For a local dev build on a phone: the custom
 * scheme that the dev client is registered to handle.
 *
 * A relative path (e.g. "auth/callback") does NOT work here: Supabase
 * must receive an absolute URL, and it refuses non-allowlisted redirect
 * targets — when we pass one, it silently falls back to the project's
 * default "Site URL" (http://localhost:3000), which the phone's browser
 * opens instead of our app. The custom scheme is always allowlisted for
 * the project's Expo app (app.json scheme, configured in Supabase
 * dashboard under Auth → URL Configuration).
 *
 * No query string on purpose: routing after recovery is event-driven
 * (PASSWORD_RECOVERY → reset-password), and a bare URL matches the
 * allowlist unambiguously.
 * ponytail: keep in sync with the "redirect URLs" list in the Supabase
 * dashboard for this project.
 */
export const AUTH_REDIRECT_URL = "nutriplanit://auth/callback?next=/auth/reset-password";

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
		// autoRefreshToken fires a silent session-refresh fetch ~10s after init
		// that fails with "Network request failed" on flaky links even when
		// there is no session yet. Disabled: refreshSession() is called on login.
		autoRefreshToken: false,
		persistSession: true,
		// Deep-link recovery tokens are handled by parsePasswordRecoveryDeepLink
		// in the root layout, so Supabase's web-only URL detection stays off.
		detectSessionInUrl: false,
	},
});

/**
 * Wipe the persisted session from SecureStore without any network call.
 * Used when supabase.auth.signOut() fails on a flaky link: the server-side
 * revoke is best-effort, but the local logout must always go through.
 */
export async function wipeStoredSession() {
	const host = supabaseUrl?.split("//")[1]?.split(".")[0];
	if (!host) return;
	const key = `sb-${host}-auth-token`;
	await ExpoSecureStoreAdapter.removeItem(key);
	await ExpoSecureStoreAdapter.removeItem(`${key}-code-verifier`);
	await ExpoSecureStoreAdapter.removeItem(`${key}-user`);
}

