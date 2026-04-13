import type { I18nConfig } from "./types";

export const config = {
	locales: {
		en: {
			label: "English",
			currency: "EUR",
		},
	},
	defaultLocale: "en",
	defaultCurrency: "EUR",
	localeCookieName: "NEXT_LOCALE",
} as const satisfies I18nConfig;

export type Locale = keyof typeof config.locales;
