/**
 * Translates common color/variant names based on current language.
 * Falls back to the original value if no mapping found.
 */

const COLOR_MAP: Record<string, Record<string, string>> = {
  // English key (lowercase) → { bn }
  black:  { bn: "কালো" },
  white:  { bn: "সাদা" },
  red:    { bn: "লাল" },
  blue:   { bn: "নীল" },
  green:  { bn: "সবুজ" },
  yellow: { bn: "হলুদ" },
  grey:   { bn: "ধূসর" },
  gray:   { bn: "ধূসর" },
  gold:   { bn: "সোনালি" },
  silver: { bn: "রূপালি" },
};

const VARIANT_TYPE_MAP: Record<string, Record<string, string>> = {
  color:  { bn: "রং" },
  colour: { bn: "রং" },
  size:   { bn: "সাইজ" },
  box:    { bn: "বক্স" },
};

export const translateVariant = (value: string, language: string): string => {
  if (language === "en") return value;
  const mapped = COLOR_MAP[value.toLowerCase()];
  if (mapped && mapped[language]) return mapped[language];
  return value;
};

export const translateVariantType = (type: string, language: string): string => {
  if (language === "en") return type;
  const mapped = VARIANT_TYPE_MAP[type.toLowerCase()];
  if (mapped && mapped[language]) return mapped[language];
  return type;
};
