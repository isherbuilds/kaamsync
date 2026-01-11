/**
 * Utility functions for error handling and normalization
 */

/**
 * Normalize any error to an Error instance
 * Handles cases where catch blocks receive non-Error values
 *
 * @param err - The error to normalize (may be any type)
 * @returns An Error instance
 *
 * @example
 * try {
 *   // some operation
 * } catch (err) {
 *   throw normalizeError(err);
 * }
 */
export function normalizeError(err: unknown): Error {
	if (err instanceof Error) {
		return err;
	}
	if (typeof err === "string") {
		return new Error(err);
	}
	return new Error(String(err));
}

/**
 * Normalize error and extract message for logging
 *
 * @param err - The error to normalize
 * @returns Error message string
 *
 * @example
 * try {
 *   // some operation
 * } catch (err) {
 *   logger.error("Operation failed:", getErrorMessage(err));
 * }
 */
export function getErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	return String(err);
}
