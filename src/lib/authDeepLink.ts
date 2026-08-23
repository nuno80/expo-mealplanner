const RECOVERY_SCHEME = "nutriplanit:";
const RECOVERY_HOST = "auth";
const RECOVERY_PATH = "/callback";
const RECOVERY_NEXT_PATH = "/auth/reset-password";

export interface PasswordRecoveryTokens {
	accessToken: string;
	refreshToken: string;
}

/**
 * Parse a Supabase password-recovery callback only when it targets the exact
 * custom-scheme endpoint registered by this app. This prevents unrelated deep
 * links containing token-shaped parameters from replacing the active session.
 */
export function parsePasswordRecoveryDeepLink(
	url: string,
): PasswordRecoveryTokens | null {
	let parsedUrl: URL;

	try {
		parsedUrl = new URL(url);
	} catch {
		return null;
	}

	if (
		parsedUrl.protocol !== RECOVERY_SCHEME ||
		parsedUrl.hostname !== RECOVERY_HOST ||
		parsedUrl.pathname !== RECOVERY_PATH ||
		parsedUrl.searchParams.get("next") !== RECOVERY_NEXT_PATH
	) {
		return null;
	}

	const fragment = new URLSearchParams(parsedUrl.hash.slice(1));
	if (fragment.get("type") !== "recovery") {
		return null;
	}

	const accessToken = fragment.get("access_token");
	const refreshToken = fragment.get("refresh_token");
	if (!accessToken || !refreshToken) {
		return null;
	}

	return { accessToken, refreshToken };
}
