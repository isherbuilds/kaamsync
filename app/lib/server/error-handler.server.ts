/**
 * Standardized error handling system for consistent API responses
 * Provides security-conscious error messages and proper logging
 */

export enum ErrorCode {
	// Authentication & Authorization
	UNAUTHORIZED = "UNAUTHORIZED",
	FORBIDDEN = "FORBIDDEN",
	INVALID_SESSION = "INVALID_SESSION",
	
	// Validation
	VALIDATION_ERROR = "VALIDATION_ERROR",
	INVALID_INPUT = "INVALID_INPUT",
	MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
	
	// Business Logic
	RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
	RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
	OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",
	LIMIT_EXCEEDED = "LIMIT_EXCEEDED",
	
	// Billing
	BILLING_ERROR = "BILLING_ERROR",
	SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED",
	PAYMENT_FAILED = "PAYMENT_FAILED",
	
	// System
	INTERNAL_ERROR = "INTERNAL_ERROR",
	DATABASE_ERROR = "DATABASE_ERROR",
	EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
	RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

export interface ApiError {
	code: ErrorCode;
	message: string;
	details?: Record<string, unknown>;
	statusCode: number;
}

export class AppError extends Error {
	public readonly code: ErrorCode;
	public readonly statusCode: number;
	public readonly details?: Record<string, unknown>;
	public readonly isOperational: boolean;

	constructor(
		code: ErrorCode,
		message: string,
		statusCode: number = 500,
		details?: Record<string, unknown>,
		isOperational: boolean = true
	) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
		this.isOperational = isOperational;

		// Maintain proper stack trace
		Error.captureStackTrace(this, AppError);
	}
}

/**
 * Pre-defined error factories for common scenarios
 */
export const ErrorFactory = {
	unauthorized: (message = "Authentication required") =>
		new AppError(ErrorCode.UNAUTHORIZED, message, 401),

	forbidden: (message = "Access denied") =>
		new AppError(ErrorCode.FORBIDDEN, message, 403),

	notFound: (resource = "Resource", id?: string) =>
		new AppError(
			ErrorCode.RESOURCE_NOT_FOUND,
			`${resource} not found${id ? ` (ID: ${id})` : ""}`,
			404
		),

	validation: (message: string, details?: Record<string, unknown>) =>
		new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),

	rateLimitExceeded: (retryAfter?: number) =>
		new AppError(
			ErrorCode.RATE_LIMIT_EXCEEDED,
			"Rate limit exceeded",
			429,
			{ retryAfter }
		),

	billingError: (message: string, details?: Record<string, unknown>) =>
		new AppError(ErrorCode.BILLING_ERROR, message, 402, details),

	subscriptionRequired: (feature?: string) =>
		new AppError(
			ErrorCode.SUBSCRIPTION_REQUIRED,
			`Active subscription required${feature ? ` for ${feature}` : ""}`,
			402
		),

	internal: (message = "Internal server error", details?: Record<string, unknown>) =>
		new AppError(ErrorCode.INTERNAL_ERROR, message, 500, details, false),
};

/**
 * Convert error to API response format
 */
export function errorToResponse(error: unknown): Response {
	let apiError: ApiError;

	if (error instanceof AppError) {
		apiError = {
			code: error.code,
			message: error.message,
			details: error.details,
			statusCode: error.statusCode,
		};

		// Log operational errors as warnings, non-operational as errors
		if (error.isOperational) {
			console.warn(`[API Error] ${error.code}: ${error.message}`, error.details);
		} else {
			console.error(`[System Error] ${error.code}: ${error.message}`, {
				details: error.details,
				stack: error.stack,
			});
		}
	} else if (error instanceof Error) {
		// Unknown error - log full details but return generic message
		console.error("[Unexpected Error]", {
			message: error.message,
			stack: error.stack,
		});

		apiError = {
			code: ErrorCode.INTERNAL_ERROR,
			message: "An unexpected error occurred",
			statusCode: 500,
		};
	} else {
		// Non-Error object
		console.error("[Unknown Error]", error);

		apiError = {
			code: ErrorCode.INTERNAL_ERROR,
			message: "An unexpected error occurred",
			statusCode: 500,
		};
	}

	// Remove sensitive details in production
	if (process.env.NODE_ENV === "production" && apiError.statusCode >= 500) {
		delete apiError.details;
	}

	return new Response(JSON.stringify(apiError), {
		status: apiError.statusCode,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

/**
 * Async error handler wrapper for route handlers
 */
export function withErrorHandler<T extends unknown[], R>(
	handler: (...args: T) => Promise<R>
) {
	return async (...args: T): Promise<R | Response> => {
		try {
			return await handler(...args);
		} catch (error) {
			return errorToResponse(error);
		}
	};
}

/**
 * Validation helper that throws standardized errors
 */
export function validateRequired<T>(
	value: T | null | undefined,
	fieldName: string
): T {
	if (value === null || value === undefined) {
		throw ErrorFactory.validation(`${fieldName} is required`);
	}
	return value;
}

/**
 * Assert user authentication
 */
export function assertAuthenticated(
	user: unknown,
	message = "Authentication required"
): asserts user {
	if (!user) {
		throw ErrorFactory.unauthorized(message);
	}
}

/**
 * Assert user authorization
 */
export function assertAuthorized(
	condition: boolean,
	message = "Access denied"
): asserts condition {
	if (!condition) {
		throw ErrorFactory.forbidden(message);
	}
}

/**
 * Database error handler
 */
export function handleDatabaseError(error: unknown): never {
	console.error("[Database Error]", error);
	
	// Check for common database errors
	if (error instanceof Error) {
		if (error.message.includes("unique constraint")) {
			throw ErrorFactory.validation("Resource already exists");
		}
		if (error.message.includes("foreign key constraint")) {
			throw ErrorFactory.validation("Invalid reference");
		}
		if (error.message.includes("not null constraint")) {
			throw ErrorFactory.validation("Required field missing");
		}
	}

	throw ErrorFactory.internal("Database operation failed");
}