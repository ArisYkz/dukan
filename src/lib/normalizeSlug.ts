const cyrillicToLatin: Record<string, string> = {
  "а": "a", "ә": "a", "б": "b", "в": "v", "г": "g", "ғ": "g",
  "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i",
  "й": "i", "к": "k", "қ": "k", "л": "l", "м": "m", "н": "n",
  "ң": "n", "о": "o", "ө": "o", "п": "p", "р": "r", "с": "s",
  "т": "t", "у": "u", "ұ": "u", "ү": "u", "ф": "f", "х": "h",
  "һ": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "",
  "ы": "y", "і": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
};

export const normalizeSlug = (name: string): string => {
  const slug = name
    .toLowerCase()
    .trim()
    .split("")
    .map((c) => cyrillicToLatin[c] || c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

  return slug || "store";
};
