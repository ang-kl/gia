// Vault parser — scans vault/*/VAULT_README.md and emits one record per
// snapshot. Pulls the headline blurb (the leading `**…**:` line, if any),
// the captured-date line, the file-count + size line, the "How to bring
// up a working copy" block, and the "arc table".

import { basename, dirname } from 'node:path';
import { glob, readMd, versionFromName, sortByVersionDesc } from '../util.mjs';

export function parseVault({ projectRoot, source }) {
  const pattern = source?.glob || 'vault/*/VAULT_README.md';
  const files = sortByVersionDesc(glob(projectRoot, pattern).map((p) => dirname(p) + '/'))
    .map((d) => d.replace(/\/$/, '') + '/VAULT_README.md');

  return files.map((f) => {
    const md = readMd(f);
    const dir = basename(dirname(f)); // e.g. "v0.60.172"
    const version = versionFromName(dir)?.raw || dir.replace(/^v/, '');
    const headline = pickHeadline(md);
    const captured = pickCaptured(md);
    const counts = pickCounts(md);
    const boot = pickBlock(md, '## How to bring up a working copy');
    const arc = pickBlock(md, '## v0.');
    return {
      type: 'vault',
      version,
      file: dir,
      headline,
      captured,
      counts,
      boot,
      arc
    };
  });
}

function pickHeadline(md) {
  // The first paragraph after the H1 heading.
  const lines = md.split('\n');
  let seenH1 = false;
  const buf = [];
  for (const line of lines) {
    if (!seenH1) {
      if (line.startsWith('# ')) seenH1 = true;
      continue;
    }
    if (line.startsWith('## ')) break;
    if (line.trim()) buf.push(line);
    else if (buf.length) break;
  }
  return buf.join(' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

function pickCaptured(md) {
  const m = md.match(/Captured:\s+([^\.]+)/);
  return m ? m[1].trim() : null;
}

function pickCounts(md) {
  const m = md.match(/~?(\d[\d,]*)\s*files? at\s*~?([\d.]+)\s*([KMG]?B)/i);
  if (!m) return null;
  return { files: Number(m[1].replace(/,/g, '')), size: `${m[2]} ${m[3]}` };
}

function pickBlock(md, headingPrefix) {
  const lines = md.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(headingPrefix));
  if (idx < 0) return null;
  const out = [];
  for (let i = idx; i < lines.length; i++) {
    if (i > idx && lines[i].startsWith('## ')) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}
