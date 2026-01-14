import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { env } from "~/lib/server/env-validation.server";

// Re-initialize S3 (should be shared but importing for isolation)
const BUCKET_NAME = env.S3_BUCKET_NAME || "kaamsync-attachments";
const S3_REGION = env.S3_REGION || "auto";
const S3_ENDPOINT = env.S3_ENDPOINT;
const S3_PUBLIC_URL = env.S3_PUBLIC_URL;

const s3 =
	env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
		? new S3Client({
				region: S3_REGION,
				endpoint: S3_ENDPOINT,
				credentials: {
					accessKeyId: env.S3_ACCESS_KEY_ID,
					secretAccessKey: env.S3_SECRET_ACCESS_KEY,
				},
				forcePathStyle: !!S3_ENDPOINT,
			})
		: null;

export async function loader({ params, request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const key = params["*"];

	if (!key || !s3) {
		throw new Response("Not Found", { status: 404 });
	}

	// If a public URL is configured, use it directly (if files are public)
	// But usually we want presigned URLs for private files
	// If S3_PUBLIC_URL is set, we might refer to a CDN that handles auth or is public
	// For this implementation, we assume private bucket and generate signed URL
	// UNLESS S3_PUBLIC_URL is set, in which case we redirect to it (assuming it's formatted correctly)

	if (S3_PUBLIC_URL) {
		return redirect(`${S3_PUBLIC_URL}/${key}`);
	}

	// Generate presigned GET URL
	const command = new GetObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		// Force download if requested
		ResponseContentDisposition: url.searchParams.get("download")
			? `attachment; filename="${key.split("/").pop()}"`
			: undefined,
	});

	try {
		const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
		return redirect(signedUrl);
	} catch (error) {
		console.error("Failed to sign URL:", error);
		throw new Response("Internal Server Error", { status: 500 });
	}
}
