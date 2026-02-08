// Deterministic normalization used by dry-run, persist and tests
export function normalizeDescription(raw?: string | null): string | null {
  if (raw === undefined || raw === null) return null;
  // 1) Trim
  let s = raw.trim();
  // 2) Unicode normalize to NFC
  s = s.normalize('NFC');
  // 3) Collapse whitespace (tabs, multiple spaces, newlines) to single space
  s = s.replace(/\s+/g, ' ');
  // 4) Lowercase for deterministic matching
  s = s.toLowerCase();
  // 5) Remove invisible characters
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return s;
}
