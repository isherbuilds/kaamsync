/**
 * @file Conditional logging system for development and production
 * @description Provides a centralized logger that replaces console.log/warn/error calls.
 * Only logs errors and warnings in production; all levels available in development/test.
 * Supports log levels, grouped logging, timing, and safe error logging with context.
 *
 * Key exports:
 * - logger.log() - General logging (dev only)
 * - logger.warn() - Warnings (always enabled)
 * - logger.error() - Errors (always enabled)
 * - logger.info() - Info logging (dev only)
 * - logger.debug() - Debug logging (dev only)
 * - logger.time(label) - Start performance timing
 * - logger.timeEnd(label) - End timing and log duration
 * - logger.group(label) - Start grouped logging
 * - logger.groupEnd() - End grouped logging
 * - logger.safeError() - Safe error logging with context
 *
 * @example
 * // Instead of console.log()
 * logger.log("User logged in", userId);
 * logger.error("Operation failed:", error);
 */

const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

type LogLevel = "log" | "warn" | "error" | "info" | "debug";

const IS_DEV_OR_TEST = isDevelopment || isTest;

class Logger {
	private shouldLog(level: LogLevel): boolean {
		if (IS_DEV_OR_TEST) {
			return true;
		}
		return level === "error" || level === "warn";
	}

	log(...args: unknown[]): void {
		if (this.shouldLog("log")) {
			console.log(...args);
		}
	}

	warn(...args: unknown[]): void {
		if (this.shouldLog("warn")) {
			console.warn(...args);
		}
	}

	error(...args: unknown[]): void {
		if (this.shouldLog("error")) {
			console.error(...args);
		}
	}

	info(...args: unknown[]): void {
		if (this.shouldLog("info")) {
			console.info(...args);
		}
	}

	debug(...args: unknown[]): void {
		if (this.shouldLog("debug")) {
			console.debug(...args);
		}
	}

	safeError(error: unknown, context?: string): void {
		if (!this.shouldLog("error")) return;

		if (error instanceof Error) {
			if (context) {
				console.error(`${context}: ${error.message}`, error);
			} else {
				console.error(error.message, error);
			}
		} else if (typeof error === "string") {
			console.error(context ? `${context}: ${error}` : error);
		} else {
			console.error(context ? `${context}:` : "", error);
		}
	}

	// Performance logging (always enabled in dev)
	time(label: string): void {
		if (this.shouldLog("log")) {
			console.time(label);
		}
	}

	timeEnd(label: string): void {
		if (this.shouldLog("log")) {
			console.timeEnd(label);
		}
	}

	// Group logging (dev only)
	group(label: string): void {
		if (this.shouldLog("log")) {
			console.group(label);
		}
	}

	groupEnd(): void {
		if (this.shouldLog("log")) {
			console.groupEnd();
		}
	}

	// Table logging (dev only)
	table(data: unknown[]): void {
		if (this.shouldLog("log")) {
			console.table(data);
		}
	}
}

export const logger = new Logger();

// Export individual methods for easier migration
export const log = logger.log.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const info = logger.info.bind(logger);
export const debug = logger.debug.bind(logger);
export const time = logger.time.bind(logger);
export const timeEnd = logger.timeEnd.bind(logger);
export const group = logger.group.bind(logger);
export const groupEnd = logger.groupEnd.bind(logger);
export const table = logger.table.bind(logger);
export const safeError = logger.safeError.bind(logger);
