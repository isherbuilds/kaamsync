const SITE_URL = "https://kaamsync.com";
const DEFAULT_IMAGE = `${SITE_URL}/static/kaamsync-logo.png`;
const SITE_NAME = "KaamSync";

type MarketingMetaInput = {
	title: string;
	description: string;
	path: string;
	image?: string;
	twitterTitle?: string;
	twitterDescription?: string;
};

export function marketingMeta({
	title,
	description,
	path,
	image,
	twitterTitle,
	twitterDescription,
}: MarketingMetaInput) {
	const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
	const img = image ?? DEFAULT_IMAGE;

	return [
		{ title },
		{ name: "description", content: description },
		{ tagName: "link", rel: "canonical", href: url },

		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: url },
		{ property: "og:image", content: img },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:locale", content: "en_IN" },

		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: twitterTitle ?? title },
		{ name: "twitter:description", content: twitterDescription ?? description },
		{ name: "twitter:image", content: img },
	];
}

export { SITE_URL };
