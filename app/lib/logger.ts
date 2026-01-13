/**
 * Conditional logging system that can be disabled in production
 * Replaces all console.log/warn/error calls throughout the app
 */

import { isDevelopment, isTest } from "./server/env-validation.server";

type LogLevel = "log" | "warn" | "error" | "info" | "debug";

class Logger {
	private enabled: boolean;
	private level: LogLevel;

	constructor() {
		this.enabled = isDevelopment || isTest;
		this.level = "log";
	}

	private shouldLog(level: LogLevel): boolean {
		if (!this.enabled) return false;

		// In production, only allow error and warn
		if (!isDevelopment && !isTest) {
			return level === "error" || level === "warn";
		}

		return true;
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

	// Handle unknown errors safely
	safeError(error: unknown, context?: string): void {
		if (!this.shouldLog("error")) return;

		if (error instanceof Error) {
			console.error(
				context ? `${context}: ${error.message}` : error.message,
				error,
			);
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
