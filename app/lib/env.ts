const get = (key: string) =>
	typeof process !== "undefined" ? process.env[key] : undefined;

const required = <T extends string>(key: T) => {
	const val = get(key);
	if (!val) throw new Error(`Missing required env: ${key}`);
	return val;
};

// Server-only required env vars (validated on first access)
export const env = {
	// Database
	get ZERO_UPSTREAM_DB() {
		return required("ZERO_UPSTREAM_DB");
	},

	// Auth
	get USESEND_API_KEY() {
		return required("USESEND_API_KEY");
	},
	get USESEND_SELF_HOSTED_URL() {
		return get("USESEND_SELF_HOSTED_URL");
	},
	get GOOGLE_CLIENT_ID() {
		return required("GOOGLE_CLIENT_ID");
	},
	get GOOGLE_CLIENT_SECRET() {
		return required("GOOGLE_CLIENT_SECRET");
	},

	// Payments
	get DODO_PAYMENTS_API_KEY() {
		return required("DODO_PAYMENTS_API_KEY");
	},
	get DODO_PAYMENTS_WEBHOOK_SECRET() {
		return required("DODO_PAYMENTS_WEBHOOK_SECRET");
	},
	get DODO_PRODUCT_PRO_MONTHLY() {
		return required("DODO_PRODUCT_PRO_MONTHLY");
	},
	get DODO_PRODUCT_PRO_YEARLY() {
		return required("DODO_PRODUCT_PRO_YEARLY");
	},
	get DODO_PRODUCT_BUSINESS_MONTHLY() {
		return required("DODO_PRODUCT_BUSINESS_MONTHLY");
	},
	get DODO_PRODUCT_BUSINESS_YEARLY() {
		return required("DODO_PRODUCT_BUSINESS_YEARLY");
	},

	// App
	get SITE_URL() {
		return required("SITE_URL");
	},
	get NODE_ENV() {
		return get("NODE_ENV") ?? "development";
	},
	get isProduction() {
		return this.NODE_ENV === "production";
	},
	get isDevelopment() {
		return this.NODE_ENV === "development";
	},

	// Dev-only
	get DEV_PG_ADDRESS() {
		return get("DEV_PG_ADDRESS");
	},
	get DEV_PG_PASSWORD() {
		return get("DEV_PG_PASSWORD");
	},
};
