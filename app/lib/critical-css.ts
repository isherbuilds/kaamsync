/**
 * Critical CSS for Marketing Pages
 *
 * This module provides critical above-the-fold CSS for marketing pages
 * to be inlined in the HTML head, reducing render-blocking requests.
 *
 * To use: Import and inline these styles in the HTML head before other CSS.
 */

export const marketingCriticalCSS = `
/* Critical layout styles for above-the-fold content */
*,
*::before,
*::after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

html {
	line-height: 1.5;
	-webkit-text-size-adjust: 100%;
	-moz-tab-size: 4;
	-o-tab-size: 4;
	tab-size: 4;
}

body {
	font-family: "Inter", system-ui, -apple-system, sans-serif;
	background-color: hsl(var(--background));
	color: hsl(var(--foreground));
}

/* Header - fixed at top */
header {
	position: fixed;
	inset: 0 0 auto 0;
	z-index: 50;
	border-bottom: 1px solid hsl(var(--border) / 0.4);
	background-color: hsl(var(--background));
}

header nav {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem;
}

header .logo {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

header .logo img {
	width: 1.5rem;
	height: 1.5rem;
	filter: invert(1);
}

/* Hero section - above the fold */
.hero {
	position: relative;
	border-bottom: 1px solid hsl(var(--border) / 0.4);
	padding-top: 6rem;
	padding-bottom: 8rem;
	text-align: center;
}

.hero h1 {
	max-width: 64rem;
	margin: 0 auto;
	font-size: 3rem;
	font-weight: 700;
	line-height: 1;
	letter-spacing: -0.025em;
}

@media (min-width: 768px) {
	.hero h1 {
		font-size: 3.75rem;
	}
}

.hero p {
	max-width: 42rem;
	margin: 0 auto;
	margin-bottom: 2.5rem;
	font-size: 1.125rem;
	color: hsl(var(--muted-foreground));
	line-height: 1.625;
}

@media (min-width: 768px) {
	.hero p {
		font-size: 1.25rem;
	}
}

/* Container utility */
.container {
	width: 100%;
	max-width: 80rem;
	margin: 0 auto;
	padding: 0 1rem;
}

@media (min-width: 768px) {
	.container {
		padding: 0 1.5rem;
	}
}

/* Button styles - critical for CTA */
.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.75rem 2rem;
	font-size: 1.125rem;
	font-weight: 500;
	line-height: 1;
	border-radius: 0;
	transition: all 0.2s;
	cursor: pointer;
	text-decoration: none;
}

.btn-primary {
	background-color: hsl(var(--foreground));
	color: hsl(var(--background));
	box-shadow: 4px 4px 0 0 rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
	box-shadow: none;
}

/* Dashboard preview - LCP element */
.dashboard-preview {
	margin-top: -5rem;
	border-radius: 1.5rem;
	border: 1px solid hsl(var(--border) / 0.6);
	background-color: hsl(var(--background));
	box-shadow: 0 30px 80px rgba(0, 0, 0, 0.12);
	overflow: hidden;
}

.dashboard-preview img {
	width: 100%;
	height: auto;
}

/* Color scheme variables - must be defined early */
:root {
	--background: 0 0% 100%;
	--foreground: 240 10% 3.9%;
	--muted-foreground: 240 3.8% 46.1%;
	--border: 240 5.9% 90%;
	--primary: 240 5.9% 10%;
}

.dark {
	--background: 240 10% 3.9%;
	--foreground: 0 0% 98%;
	--muted-foreground: 240 5% 64.9%;
	--border: 240 3.7% 15.9%;
	--primary: 0 0% 98%;
}
`;

export const getMarketingCriticalCSS = () => marketingCriticalCSS;

export default marketingCriticalCSS;
