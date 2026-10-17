// Journal parser — walks doc/Journal/journal-*.md and emits one record
// per [HDR] block. Records are flattened across all files; newest first.
import { basename } from 'node:path';
import { glob, versionFromName, sortByVersionDesc, readMd } from '../util.mjs';

export function parseJournal({ projectRoot, source }) {
  const pattern = source.glob || 'doc/Journal/journal-*.md';
  const hdrTag = source.hdr_format || '[HDR]';
  const files = sortByVersionDesc(glob(projectRoot, pattern));
  const records = [];
  for (const f of files) {
    const version = versionFromName(basename(f))?.raw || null;
    const md = readMd(f);
    const blocks = extractHdrBlocks(md, hdrTag);
    if (blocks.length === 0) {
      records.push({
        type: 'journal',
        version,
        file: basename(f),
        hdr_index: null,
        title: deriveTitle(md, version),
        body: md.trim().slice(0, 2000),
        is_hdr: false
      });
      continue;
    }
    for (const b of blocks) {
      records.push({
        type: 'journal',
        version,
        file: basename(f),
        hdr_index: b.idx,
        title: b.title,
        body: b.body,
        is_hdr: true
      });
    }
  }
  return records;
}

function extractHdrBlocks(md, tag) {
  // The Soleat convention writes `### [HDR] #N | <time> | <title> | <files> | <PR>`
  // followed by `- **[INTENT]** …`, `- **[DELTA]** …`, etc. We split on the
  // heading line and capture each block until the next `### [HDR]` or `## ` or EOF.
  const lines = md.split('\n');
  const out = [];
  let inBlock = null;
  let buf = [];
  for (const line of lines) {
    if (line.includes(tag) && /^###\s+/.test(line)) {
      if (inBlock) out.push({ ...inBlock, body: buf.join('\n').trim() });
      inBlock = { idx: out.length + 1, title: line.replace(/^###\s+/, '').trim() };
      buf = [];
      continue;
    }
    if (inBlock && /^##\s+/.test(line)) {
      // Next top-level section ends the block.
      out.push({ ...inBlock, body: buf.join('\n').trim() });
      inBlock = null;
      buf = [];
      continue;
    }
    if (inBlock) buf.push(line);
  }
  if (inBlock) out.push({ ...inBlock, body: buf.join('\n').trim() });
  return out;
}

function deriveTitle(md, version) {
  const m = md.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return version ? `Journal ${version}` : 'Journal entry';
}
