/**
 * Translates common color/variant names based on current language.
 * Falls back to the original value if no mapping found.
 */

const COLOR_MAP: Record<string, Record<string, string>> = {
  // English key (lowercase) → { kk, ru }
  black:  { kk: "Қара",   ru: "Черный" },
  white:  { kk: "Ақ",     ru: "Белый" },
  red:    { kk: "Қызыл",  ru: "Красный" },
  blue:   { kk: "Көк",    ru: "Синий" },
  green:  { kk: "Жасыл",  ru: "Зеленый" },
  yellow: { kk: "Сары",   ru: "Желтый" },
  grey:   { kk: "Сұр",    ru: "Серый" },
  gray:   { kk: "Сұр",    ru: "Серый" },
  gold:   { kk: "Алтын",  ru: "Золотистый" },
  silver: { kk: "Күміс",  ru: "Серебристый" },
};

const VARIANT_TYPE_MAP: Record<string, Record<string, string>> = {
  color:  { kk: "Түс",    ru: "Цвет" },
  colour: { kk: "Түс",    ru: "Цвет" },
  size:   { kk: "Өлшем",  ru: "Размер" },
  box:    { kk: "Қорап",  ru: "Коробка" },
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
