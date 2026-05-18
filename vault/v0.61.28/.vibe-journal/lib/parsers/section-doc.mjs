// Shared parser for doc-system files that follow the section pattern:
// preamble + ## §sections + optional §7 Amendments table + optional
// Removed/Deprecated tail table. Used by feature / technical / legal /
// register / builder / persona parsers below.

import { basename } from 'node:path';
import { glob, versionFromName, sortByVersionDesc, readMd, splitSections, stripSerial } from '../util.mjs';

// Parse ALL versioned files matching `pattern` and emit one record per
// file, with sections embedded. The render layer decides what to show
// (latest only vs full history vs amendment-tracked).
export function parseSectionDoc(typeName, { projectRoot, source }) {
  if (!source || !source.glob) return [];
  const files = sortByVersionDesc(glob(projectRoot, source.glob));
  const records = [];
  for (const f of files) {
    const md = readMd(f);
    const version = versionFromName(basename(f))?.raw || null;
    const stripped = stripSerial(md);
    const sections = splitSections(stripped);
    const preamble = sections.find((s) => s.heading === null)?.body || '';
    const named = sections.filter((s) => s.heading !== null);
    records.push({
      type: typeName,
      version,
      file: basename(f),
      preamble: preamble.slice(0, 3000),
      sections: named.map((s) => ({
        heading: s.heading,
        body: s.body.slice(0, 5000)
      }))
    });
  }
  return records;
}
