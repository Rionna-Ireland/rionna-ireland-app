export interface OrganizationMetadata {
	brand?: {
		primaryColor?: string;
		logoUrl?: string;
		fontFamily?: string;
	};
	racing?: {
		provider: "timeform" | "racing_api" | "manual";
		providerConfig?: {
			subscriptionTier?: "core" | "standard" | "premium";
		};
	};
	circle?: {
		communityId?: string;
		communityDomain?: string;
		trainerUpdatesSpaceId?: string;
		webhookSecretRef?: string;
	};
	billing?: {
		stripeProductId?: string;
		stripePriceId?: string;
		gracePeriodDays?: number;
	};
	contact?: {
		aboutText?: string;
		contactEmail?: string;
		phone?: string;
		address?: string;
		socialLinks?: {
			website?: string;
			instagram?: string;
			twitter?: string;
			facebook?: string;
		};
	};
	features?: Record<string, boolean>;
}

export function parseOrgMetadata(raw: string | null): OrganizationMetadata {
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}
