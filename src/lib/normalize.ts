/**
 * Normalizes text for case-insensitive search matching.
 * Bengali is caseless; this folds Latin input to lowercase and trims whitespace.
 */
export const normalizeText = (text: string): string => text.toLowerCase().trim();
