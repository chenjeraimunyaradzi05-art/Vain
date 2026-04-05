// @ts-nocheck
'use strict';

// Simple, deterministic content moderation helper.
// This intentionally avoids external dependencies/services to keep dev + E2E stable.

const DEFAULT_BLOCKLIST = [
  'kill',
  'suicide',
  'rape',
  'nazi',
];

function normalizeText(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface ModerationOptions {
  blocklist?: string[];
}

export function moderateText(text: string, options: ModerationOptions = {}) {
  const normalized = normalizeText(text);
  const blocklist = Array.isArray(options.blocklist) ? options.blocklist : DEFAULT_BLOCKLIST;

  const matched = [];
  for (const term of blocklist) {
    const t = String(term || '').toLowerCase().trim();
    if (!t) continue;
    if (normalized.includes(t)) matched.push(t);
  }

  const flagged = matched.length > 0;
  return {
    flagged,
    matched,
    reason: flagged ? 'BLOCKLIST_MATCH' : null,
    score: flagged ? Math.min(1, matched.length / 3) : 0,
  };
}
