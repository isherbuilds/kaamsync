#!/usr/bin/env tsx
/**
 * Simple image optimization script
 * For now, just logs potential optimizations
 * WebP conversion would require additional dependencies
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ImageInfo {
	path: string;
	size: number;
	format: string;
}

async function analyzeImages(dir: string): Promise<ImageInfo[]> {
	const images: ImageInfo[] = [];
	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			// Recursively scan subdirectories
			const subImages = await analyzeImages(fullPath);
			images.push(...subImages);
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase();

			if ([".png", ".jpg", ".jpeg", ".webp", ".ico"].includes(ext)) {
				const stats = await fs.stat(fullPath);
				images.push({
					path: fullPath,
					size: stats.size,
					format: ext.substring(1), // Remove dot
				});
			}
		}
	}

	return images;
}

async function main() {
	const publicDir = path.join(__dirname, "..", "public");

	console.log("🔍 Analyzing images for optimization opportunities...");
	const images = await analyzeImages(publicDir);

	if (images.length === 0) {
		console.log("✅ No images found");
		return;
	}

	let totalSize = 0;
	const sizeByFormat = new Map<string, number>();

	for (const image of images) {
		totalSize += image.size;
		const current = sizeByFormat.get(image.format) || 0;
		sizeByFormat.set(image.format, current + image.size);
	}

	console.log("\n📊 Image Analysis:");
	console.log(`   Total images: ${images.length}`);
	console.log(`   Total size: ${(totalSize / 1024).toFixed(1)}KB`);

	for (const [format, size] of sizeByFormat) {
		const percentage = ((size / totalSize) * 100).toFixed(1);
		console.log(`   ${format}: ${(size / 1024).toFixed(1)}KB (${percentage}%)`);
	}

	// Log optimization recommendations
	console.log("\n💡 Optimization Recommendations:");

	const pngSize = sizeByFormat.get("png") || 0;
	const jpgSize = sizeByFormat.get("jpg") || 0;
	const jpegSize = sizeByFormat.get("jpeg") || 0;
	const icoSize = sizeByFormat.get("ico") || 0;

	if (pngSize > 0 || jpgSize > 0 || jpegSize > 0) {
		console.log("   ✓ Convert PNG/JPG to WebP for 25-35% size reduction");
		console.log("   ✓ Install sharp package: npm install --save-dev sharp");
	}

	if (icoSize > 1024 * 10) {
		// 10KB
		console.log("   ✓ Consider using PNG for favicon instead of ICO");
	}

	if (totalSize > 1024 * 100) {
		// 100KB
		console.log("   ✓ Implement lazy loading for images");
		console.log("   ✓ Use image CDN for better compression");
	}

	// Create optimization report
	const report = {
		analyzed: new Date().toISOString(),
		totalImages: images.length,
		totalSize,
		sizeByFormat: Object.fromEntries(sizeByFormat),
		recommendations: [
			...(pngSize > 0 || jpgSize > 0 || jpegSize > 0
				? ["Convert to WebP"]
				: []),
			...(icoSize > 1024 * 10 ? ["Use PNG for favicon"] : []),
			...(totalSize > 1024 * 100
				? ["Implement lazy loading", "Use image CDN"]
				: []),
		],
		images: images.map((img) => ({
			...img,
			sizeKB: Math.round((img.size / 1024) * 10) / 10,
		})),
	};

	await fs.writeFile(
		path.join(__dirname, "..", "image-optimization-report.json"),
		JSON.stringify(report, null, 2),
	);

	console.log("\n📄 Created image-optimization-report.json");
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
