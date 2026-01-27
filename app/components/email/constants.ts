export const baseUrl =
	process.env.SITE_URL ||
	(process.env.NODE_ENV === "development"
		? "http://localhost:3000"
		: "https://kaamsync.com");
