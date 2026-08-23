const RECOVERY_SCHEME = "nutriplanit:";
const RECOVERY_HOST = "auth";
const RECOVERY_PATH = "/callback";

export interface PasswordRecoveryTokens {
	accessToken: string;
	refreshToken: string;
}

/** Accept only the native recovery callback and never trust a redirect target. */
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
		parsedUrl.pathname !== RECOVERY_PATH
	) {
		return null;
	}

	const fragment = new URLSearchParams(parsedUrl.hash.slice(1));
	if (fragment.get("type") !== "recovery") return null;

	const accessToken = fragment.get("access_token");
	const refreshToken = fragment.get("refresh_token");
	if (!accessToken || !refreshToken) return null;

	return { accessToken, refreshToken };
}
