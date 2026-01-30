export type PresignedUploadResponse = {
	uploadUrl: string;
	storageKey: string;
	publicUrl: string;
	attachmentId: string;
};

export type PresignedUploadRequest = {
	contentType: string;
	fileName: string;
	fileSize: number;
};

export async function requestPresignedUpload(
	params: PresignedUploadRequest,
): Promise<PresignedUploadResponse> {
	const response = await fetch("/api/attachments/presign", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		const message =
			payload && typeof payload === "object" && "error" in payload
				? String(payload.error)
				: `Failed to request upload URL (${response.status})`;
		throw new Error(message);
	}

	return response.json();
}

export async function uploadAttachmentFile(
	file: File,
): Promise<PresignedUploadResponse> {
	const presign = await requestPresignedUpload({
		contentType: file.type || "application/octet-stream",
		fileName: file.name,
		fileSize: file.size,
	});

	const uploadResponse = await fetch(presign.uploadUrl, {
		method: "PUT",
		body: file,
		headers: {
			"Content-Type": file.type || "application/octet-stream",
		},
	});

	if (!uploadResponse.ok) {
		throw new Error(`Upload failed (${uploadResponse.status})`);
	}

	return presign;
}
