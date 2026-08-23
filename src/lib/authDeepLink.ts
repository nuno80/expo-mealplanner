import * as Linking from "expo-linking";

const NATIVE_CALLBACK_URL = "nutriplanit://auth/callback";

export interface PasswordRecoveryTokens {
	accessToken: string;
	refreshToken: string;
}

function normalizeBaseUrl(url: string): string {
	return url.replace(/\/$/, "");
}

function isAllowedCallback(url: string): boolean {
	const baseUrl = normalizeBaseUrl(url.split("#", 1)[0]);
	const expoGoCallback = normalizeBaseUrl(Linking.createURL("auth/callback"));
	return baseUrl === NATIVE_CALLBACK_URL || baseUrl === expoGoCallback;
}

/** Accept only the callback URL generated for this app/runtime. */
export function parsePasswordRecoveryDeepLink(
	url: string,
): PasswordRecoveryTokens | null {
	if (!isAllowedCallback(url)) return null;

	const hash = url.split("#", 2)[1];
	if (!hash) return null;

	const fragment = new URLSearchParams(hash);
	if (fragment.get("type") !== "recovery") return null;

	const accessToken = fragment.get("access_token");
	const refreshToken = fragment.get("refresh_token");
	if (!accessToken || !refreshToken) return null;

	return { accessToken, refreshToken };
}
