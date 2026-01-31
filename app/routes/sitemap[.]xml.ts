import { env } from "~/lib/infra/env";

interface SitemapRoute {
	path: string;
	priority: string;
	changefreq:
		| "always"
		| "hourly"
		| "daily"
		| "weekly"
		| "monthly"
		| "yearly"
		| "never";
	lastmod?: string;
}

const routes: SitemapRoute[] = [
	{
		path: "/",
		priority: "1.0",
		changefreq: "weekly",
	},
	{
		path: "/pricing",
		priority: "0.9",
		changefreq: "weekly",
	},
	{
		path: "/about",
		priority: "0.8",
		changefreq: "monthly",
	},
	{
		path: "/contact",
		priority: "0.7",
		changefreq: "monthly",
	},
];

export async function loader() {
	const siteUrl = env.SITE_URL;
	const today = new Date().toISOString().split("T")[0];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
	.map(
		(route) => `\t<url>
\t\t<loc>${siteUrl}${route.path}</loc>
\t\t<priority>${route.priority}</priority>
\t\t<changefreq>${route.changefreq}</changefreq>
\t\t<lastmod>${today}</lastmod>
\t</url>`,
	)
	.join("\n")}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			"Content-Type": "application/xml",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
