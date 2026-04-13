import type { StorageConfig } from "./types";

export const config = {
	bucketNames: {
		avatars: process.env.NEXT_PUBLIC_AVATARS_BUCKET_NAME ?? "avatars",
		media: process.env.NEXT_PUBLIC_MEDIA_BUCKET_NAME ?? "media",
	},
} as const satisfies StorageConfig;
