/**
 * Normalizes Kazakh Cyrillic characters to Latin equivalents for search.
 * This helps users find products when typing either Cyrillic or Latin letters.
 * Only maps characters specific to Kazakh alphabet; other Cyrillic letters remain unchanged.
 */
export const normalizeKazakh = (text: string): string => {
  const mapping: Record<string, string> = {
    // Kazakh-specific Cyrillic characters
    'ә': 'a', 'Ә': 'A',
    'ғ': 'g', 'Ғ': 'G',
    'қ': 'q', 'Қ': 'Q',
    'ң': 'n', 'Ң': 'N',
    'ө': 'o', 'Ө': 'O',
    'ұ': 'u', 'Ұ': 'U',
    'ү': 'u', 'Ү': 'U',
    'һ': 'h', 'Һ': 'H',
    'і': 'i', 'І': 'I',
    // Note: 'ң' is often transliterated as 'ng', but we use 'n' for simplicity
  };

  let normalized = '';
  for (const char of text) {
    normalized += char in mapping ? mapping[char] : char;
  }
  return normalized.toLowerCase();
};

/**
 * Normalizes both Kazakh and Russian Cyrillic characters to Latin approximations.
 * This is a more aggressive normalization that also handles common Russian letters.
 * Use with caution as it may produce collisions.
 */
export const normalizeCyrillic = (text: string): string => {
  const mapping: Record<string, string> = {
    // Kazakh-specific (as above)
    'ә': 'a', 'Ә': 'A',
    'ғ': 'g', 'Ғ': 'G',
    'қ': 'q', 'Қ': 'Q',
    'ң': 'n', 'Ң': 'N',
    'ө': 'o', 'Ө': 'O',
    'ұ': 'u', 'Ұ': 'U',
    'ү': 'u', 'Ү': 'U',
    'һ': 'h', 'Һ': 'H',
    'і': 'i', 'І': 'I',
    // Russian Cyrillic approximations (common transliteration)
    'а': 'a', 'А': 'A',
    'б': 'b', 'Б': 'B',
    'в': 'v', 'В': 'V',
    'г': 'g', 'Г': 'G',
    'д': 'd', 'Д': 'D',
    'е': 'e', 'Е': 'E',
    'ё': 'yo', 'Ё': 'Yo',
    'ж': 'zh', 'Ж': 'Zh',
    'з': 'z', 'З': 'Z',
    'и': 'i', 'И': 'I',
    'й': 'y', 'Й': 'Y',
    'к': 'k', 'К': 'K',
    'л': 'l', 'Л': 'L',
    'м': 'm', 'М': 'M',
    'н': 'n', 'Н': 'N',
    'о': 'o', 'О': 'O',
    'п': 'p', 'П': 'P',
    'р': 'r', 'Р': 'R',
    'с': 's', 'С': 'S',
    'т': 't', 'Т': 'T',
    'у': 'u', 'У': 'U',
    'ф': 'f', 'Ф': 'F',
    'х': 'kh', 'Х': 'Kh',
    'ц': 'ts', 'Ц': 'Ts',
    'ч': 'ch', 'Ч': 'Ch',
    'ш': 'sh', 'Ш': 'Sh',
    'щ': 'shch', 'Щ': 'Shch',
    'ъ': '', 'Ъ': '',
    'ы': 'y', 'Ы': 'Y',
    'ь': '', 'Ь': '',
    'э': 'e', 'Э': 'E',
    'ю': 'yu', 'Ю': 'Yu',
    'я': 'ya', 'Я': 'Ya',
  };

  let normalized = '';
  for (const char of text) {
    normalized += char in mapping ? mapping[char] : char;
  }
  return normalized.toLowerCase();
};