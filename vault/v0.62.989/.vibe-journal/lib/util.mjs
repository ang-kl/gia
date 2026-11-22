// Shared utilities — file globbing, version parsing, markdown chunking.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, basename, resolve, isAbsolute } from 'node:path';

// Tiny glob: supports `*` and `?` (no `**` recursion). Patterns may be
// absolute (`/home/user/…`) or relative-to-root (resolved via
// `path.resolve(root, pattern)` so `../` works correctly). Returns
// absolute paths.
export function glob(root, pattern) {
  const absPattern = isAbsolute(pattern) ? pattern : resolve(root, pattern);
  const parts = absPattern.split('/').filter(Boolean);
  const results = [];
  walk('/', parts, 0, results);
  return results;
}

function walk(dir, parts, idx, out) {
  if (idx >= parts.length) return;
  const part = parts[idx];
  const isLast = idx === parts.length - 1;
  const rx = globToRegex(part);
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (!rx.test(name)) continue;
    const full = join(dir, name);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (isLast) {
      if (stat.isFile()) out.push(full);
    } else if (stat.isDirectory()) {
      walk(full, parts, idx + 1, out);
    }
  }
}

function globToRegex(g) {
  const esc = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp('^' + esc + '$');
}

// Parse a version like "v0.60.172" or "0_60_172" from a filename.
// Returns { major, minor, patch, raw } or null.
export function versionFromName(s) {
  const m = s.match(/(\d+)[._](\d+)[._](\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], raw: `${m[1]}.${m[2]}.${m[3]}` };
}

// Sort filenames newest-first by embedded version (descending).
export function sortByVersionDesc(paths) {
  return [...paths].sort((a, b) => {
    const va = versionFromName(basename(a));
    const vb = versionFromName(basename(b));
    if (!va || !vb) return 0;
    if (va.major !== vb.major) return vb.major - va.major;
    if (va.minor !== vb.minor) return vb.minor - va.minor;
    return vb.patch - va.patch;
  });
}

// Read a Markdown file and split into top-level sections by `## ` heading.
// Returns [{ heading, body }] in source order. The leading content before
// the first `## ` is keyed as heading: null (preamble).
export function splitSections(md) {
  const sections = [];
  const lines = md.split('\n');
  let curHeading = null;
  let curBody = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      sections.push({ heading: curHeading, body: curBody.join('\n').trim() });
      curHeading = m[1].trim();
      curBody = [];
    } else {
      curBody.push(line);
    }
  }
  sections.push({ heading: curHeading, body: curBody.join('\n').trim() });
  return sections;
}

// Strip the leading serial-number stamp `(№ N - DD-MM 'YY HH:MM TZ)`
// that every doc-system file opens with, for clean rendering.
export function stripSerial(md) {
  return md.replace(/^\(№[^)]+\)\s*\n+/, '');
}

export function readMd(path) {
  return readFileSync(path, 'utf8');
}
