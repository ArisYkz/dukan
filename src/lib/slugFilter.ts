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
