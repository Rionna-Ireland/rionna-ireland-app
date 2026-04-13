import type { AuthConfig } from "./types";

export const config = {
	enableSignup: true,
	enableMagicLink: true,
	enableSocialLogin: false,
	enablePasskeys: false,
	enablePasswordLogin: true,
	enableTwoFactor: false,
	sessionCookieMaxAge: 60 * 60 * 24 * 30,
	users: {
		enableOnboarding: true,
	},
	organizations: {
		enable: true,
		hideOrganization: true,
		enableUsersToCreateOrganizations: false,
		requireOrganization: true,
		forbiddenOrganizationSlugs: [
			"new-organization",
			"admin",
			"settings",
			"organization-invitation",
		],
	},
} as const satisfies AuthConfig;
