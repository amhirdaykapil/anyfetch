/**
 * Comprehensive HTML Entity Decoder
 * Decodes named HTML entities, decimal numeric entities (&#104;),
 * and hexadecimal numeric entities (&#x939;) into valid Unicode strings.
 */

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&middot;': '·',
  '&bull;': '•',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

export function decodeHtmlEntities(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let text = raw;

  // 1. Replace common named entities
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    text = text.replaceAll(entity, char);
  }

  // 2. Decode hexadecimal entities: &#x939; or &#X939;
  text = text.replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
    try {
      const code = parseInt(hex, 16);
      if (!isNaN(code) && code >= 0 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
    } catch {
      // Ignore invalid code point
    }
    return '';
  });

  // 3. Decode decimal entities: &#2340;
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    try {
      const code = parseInt(dec, 10);
      if (!isNaN(code) && code >= 0 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
    } catch {
      // Ignore invalid code point
    }
    return '';
  });

  return text.trim();
}

