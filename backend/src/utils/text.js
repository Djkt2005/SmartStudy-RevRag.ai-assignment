const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+(?=[A-Z0-9])/g;

export function splitIntoSentences(text) {
  if (!text) {
    return [];
  }

  return text
    .split(SENTENCE_SPLIT_REGEX)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function forceSentenceCase(text) {
  if (!text) {
    return '';
  }

  const trimmed = text.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function truncate(text, maxLength = 180) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

