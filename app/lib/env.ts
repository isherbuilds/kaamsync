/**
 * Safely access environment variables in both client and server environments.
 * Prevents "ReferenceError: process is not defined" in the browser.
 */
export function getEnv(key: string): string | undefined {
	// Check if process is defined (server-side or limited client environments with polyfills)
	if (typeof process !== "undefined" && process.env) {
		return process.env[key];
	}

	// On client side without process.env, we can't access secret server env vars.
	// If you have public env vars exposed via window.ENV or import.meta.env, handle them here if needed.
	// For now, this simply prevents the crash by returning undefined.
	return undefined;
}
