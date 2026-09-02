/**
 * Offensive-word filter for store slugs.
 * Covers English, Russian (transliterated), and Kazakh (transliterated) slurs.
 * Words are checked as substrings of the slug after normalisation.
 */

const BLOCKED_WORDS: string[] = [
  // ── English ──
  "fuck", "shit", "ass", "bitch", "dick", "cock", "pussy", "cunt",
  "nigger", "nigga", "faggot", "whore", "slut", "bastard", "damn",
  "porn", "xxx", "sex", "nude", "naked", "penis", "vagina",
  "rape", "molest", "pedo", "nazi", "hitler", "terrorist",

  // ── Russian (transliterated) ──
  "blyad", "blya", "suka", "hui", "huy", "pizd", "ebat", "ebal",
  "mudak", "mudilo", "pidar", "pidor", "gandon", "zalupa",
  "dermo", "zhopa", "nahui", "nahuy", "ebanat",
  "dolboeb", "urod", "debil", "padla",

  // ── Kazakh (transliterated) ──
  "kotaq", "kotak", "siyk", "siik", "bokta", "taspak",
  "qoqys", "mambet", "mambetai",

  // ── Brand protection ──
  "dokan", "admin", "support", "help", "login", "signup",
  "dashboard", "api", "auth", "settings", "account",
];

/**
 * Returns true if the slug contains any blocked word.
 */
export const isSlugOffensive = (slug: string): boolean => {
  const normalised = slug.toLowerCase().replace(/[-_.\s]/g, "");
  return BLOCKED_WORDS.some((word) => normalised.includes(word));
};

/**
 * Slugs that collide with static app routes (App.tsx). A store at one of these
 * slugs would be shadowed by the real page now that storefronts live at /:slug.
 * Exact match only — "my-dashboard" is fine, "dashboard" is not.
 */
const RESERVED_SLUGS: string[] = [
  "auth", "dashboard", "success", "update-password", "settings",
  "admin", "privacy", "terms", "test-performance",
];

/**
 * Returns true if the slug exactly matches a reserved app route.
 */
export const isSlugReserved = (slug: string): boolean =>
  RESERVED_SLUGS.includes(slug.toLowerCase());
