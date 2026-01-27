import { createContext, useContext } from "react";

/**
 * Context for providing a CSP nonce value throughout the application.
 *
 * The nonce is used for Content Security Policy (CSP) to allow inline scripts
 * and styles that include the matching nonce attribute.
 */
export const NonceContext = createContext<string>("");

export const NonceProvider = NonceContext.Provider;

/**
 * Hook to access the CSP nonce value for inline scripts and styles.
 *
 * @returns The current nonce string, or empty string if not provided
 *
 * @example
 * ```tsx
 * const nonce = useNonce();
 * return <script nonce={nonce}>...</script>;
 * ```
 */
export function useNonce(): string {
	return useContext(NonceContext);
}
