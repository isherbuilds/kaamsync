/**
 * Standardized error handling system for consistent API responses.
 * Provides security-conscious error messages and proper logging.
 */

// ============================================================================
// Error Codes
// ============================================================================

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

// ============================================================================
// Types
// ============================================================================

export interface ApiErrorResponse {
	code: ErrorCode;
	message: string;
	details?: Record<string, unknown>;
	statusCode: number;
}

// ============================================================================
// AppError Class
// ============================================================================

export class AppError extends Error {
	public readonly code: ErrorCode;
	public readonly statusCode: number;
	public readonly details?: Record<string, unknown>;
	public readonly isOperational: boolean;

	constructor(
		code: ErrorCode,
		message: string,
		statusCode = 500,
		details?: Record<string, unknown>,
		isOperational = true,
	) {
		super(message);
		this.name = "AppError";
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
		this.isOperational = isOperational;
		Error.captureStackTrace(this, AppError);
	}
}

// ============================================================================
// Error Factories
// ============================================================================

export const createUnauthorizedError = (message = "Authentication required") =>
	new AppError(ErrorCode.UNAUTHORIZED, message, 401);

export const createForbiddenError = (message = "Access denied") =>
	new AppError(ErrorCode.FORBIDDEN, message, 403);

export const createNotFoundError = (resource = "Resource", id?: string) =>
	new AppError(
		ErrorCode.RESOURCE_NOT_FOUND,
		`${resource} not found${id ? ` (ID: ${id})` : ""}`,
		404,
	);

export const createValidationError = (
	message: string,
	details?: Record<string, unknown>,
) => new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);

export const createRateLimitError = (retryAfter?: number) =>
	new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, "Rate limit exceeded", 429, {
		retryAfter,
	});

export const createBillingError = (
	message: string,
	details?: Record<string, unknown>,
) => new AppError(ErrorCode.BILLING_ERROR, message, 402, details);

export const createSubscriptionRequiredError = (feature?: string) =>
	new AppError(
		ErrorCode.SUBSCRIPTION_REQUIRED,
		`Active subscription required${feature ? ` for ${feature}` : ""}`,
		402,
	);

export const createInternalError = (
	message = "Internal server error",
	details?: Record<string, unknown>,
) => new AppError(ErrorCode.INTERNAL_ERROR, message, 500, details, false);

export const ErrorFactory = {
	unauthorized: createUnauthorizedError,
	forbidden: createForbiddenError,
	notFound: createNotFoundError,
	validation: createValidationError,
	rateLimitExceeded: createRateLimitError,
	billingError: createBillingError,
	subscriptionRequired: createSubscriptionRequiredError,
	internal: createInternalError,
};

// ============================================================================
// Response Conversion
// ============================================================================

export function errorToResponse(error: unknown): Response {
	let apiError: ApiErrorResponse;

	if (error instanceof AppError) {
		apiError = {
			code: error.code,
			message: error.message,
			details: error.details,
			statusCode: error.statusCode,
		};

		if (error.isOperational) {
			console.warn(
				`[API Error] ${error.code}: ${error.message}`,
				error.details,
			);
		} else {
			console.error(`[System Error] ${error.code}: ${error.message}`, {
				details: error.details,
				stack: error.stack,
			});
		}
	} else if (error instanceof Error) {
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
		console.error("[Unknown Error]", error);

		apiError = {
			code: ErrorCode.INTERNAL_ERROR,
			message: "An unexpected error occurred",
			statusCode: 500,
		};
	}

	if (process.env.NODE_ENV === "production" && apiError.statusCode >= 500) {
		delete apiError.details;
	}

	return new Response(JSON.stringify(apiError), {
		status: apiError.statusCode,
		headers: { "Content-Type": "application/json" },
	});
}

// ============================================================================
// Handler Wrapper
// ============================================================================

export function withErrorHandler<T extends unknown[], R>(
	handler: (...args: T) => Promise<R>,
) {
	return async (...args: T): Promise<R | Response> => {
		try {
			return await handler(...args);
		} catch (error) {
			return errorToResponse(error);
		}
	};
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateRequired<T>(
	value: T | null | undefined,
	fieldName: string,
): T {
	if (value === null || value === undefined) {
		throw createValidationError(`${fieldName} is required`);
	}
	return value;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export function assertAuthenticated(
	user: unknown,
	message = "Authentication required",
): asserts user {
	if (!user) {
		throw createUnauthorizedError(message);
	}
}

export function assertAuthorized(
	condition: boolean,
	message = "Access denied",
): asserts condition {
	if (!condition) {
		throw createForbiddenError(message);
	}
}

// ============================================================================
// Database Error Handler
// ============================================================================

export function handleDatabaseError(error: unknown): never {
	console.error("[Database Error]", error);

	if (error instanceof Error) {
		if (error.message.includes("unique constraint")) {
			throw createValidationError("Resource already exists");
		}
		if (error.message.includes("foreign key constraint")) {
			throw createValidationError("Invalid reference");
		}
		if (error.message.includes("not null constraint")) {
			throw createValidationError("Required field missing");
		}
	}

	throw createInternalError("Database operation failed");
}
