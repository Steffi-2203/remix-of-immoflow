/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * Applied to all user-provided text inputs before storage.
 */

// Strip HTML tags to prevent stored XSS
const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;

// Remove null bytes and control characters (except newline/tab)
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitize a single string value:
 * - Trim whitespace
 * - Strip HTML tags
 * - Remove control characters
 * - Normalize unicode
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(HTML_TAG_RE, "")
    .replace(CONTROL_CHAR_RE, "")
    .normalize("NFC");
}

/**
 * Recursively sanitize all string values in an object or array.
 * Non-string values are passed through unchanged.
 * Useful for sanitizing entire request bodies.
 */
export function sanitizeInput<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item)) as unknown as T;
  }

  if (typeof data === "object" && data !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeInput(value);
    }
    return result as T;
  }

  return data;
}
