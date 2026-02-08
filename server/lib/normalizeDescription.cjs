// CommonJS wrapper for normalizeDescription
// Used by tools/*.js scripts that run directly with Node.js
// Source of truth: server/lib/normalizeDescription.ts

/** @param {string|null|undefined} raw */
function normalizeDescription(raw) {
  if (raw === undefined || raw === null) return null;
  let s = raw.trim();
  s = s.normalize('NFC');
  s = s.replace(/\s+/g, ' ');
  s = s.toLowerCase();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return s;
}

module.exports = { normalizeDescription };
