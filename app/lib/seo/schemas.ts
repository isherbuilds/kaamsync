import { SITE_URL } from "./marketing-meta";

export interface FAQItem {
	q: string;
	a: string;
}

export function createOrganizationSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "KaamSync",
		url: SITE_URL,
		logo: `${SITE_URL}/static/kaamsync-logo.png`,
		description: "Clear, trackable work.",
	};
}

export function createSoftwareApplicationSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "KaamSync",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web, iOS, Android",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "USD",
			description: "Free for up to 3 team members",
		},
		description: "Operations management for teams",
		featureList: [
			"Offline mode",
			"Request tracking",
			"Approval workflows",
			"Team coordination",
		].join(", "),
		softwareVersion: "1.0",
	};
}

export function createFAQPageSchema(items: FAQItem[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((faq) => ({
			"@type": "Question",
			name: faq.q,
			acceptedAnswer: {
				"@type": "Answer",
				text: faq.a,
			},
		})),
	};
}

export function createContactPageSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "ContactPage",
		name: "Contact KaamSync",
		description: "Contact page for KaamSync",
		url: `${SITE_URL}/contact`,
		mainEntity: {
			"@type": "Organization",
			name: "KaamSync",
			url: SITE_URL,
			email: "hello@kaamsync.com",
			contactPoint: {
				"@type": "ContactPoint",
				contactType: "Customer Support",
				availableLanguage: "English",
			},
		},
	};
}
