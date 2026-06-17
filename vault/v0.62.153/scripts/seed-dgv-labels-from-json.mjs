#!/usr/bin/env node
// scripts/seed-dgv-labels-from-json.mjs — v0.61.282
//
// One-shot loader: takes the JSON outputs of the operator's `/ver →
// 🤖 Gemini verify` runs and writes each labelled venue's
// (placeId → {label, confidence, reason, verifiedAt}) into the
// Redis hash `dgv:labels:<mode>` used by the cuisine-search
// post-filter (index.js D703e, v0.61.275 + v0.61.282 inline).
//
// Why a separate script: the bot's `ownerDurianGeminiRun` already
// writes to the same hash when /ver is run AGAINST PROD. The seed
// script lets the operator import an existing verify run without
// burning another ~$1 of Gemini quota — useful right after the
// v0.61.275 → v0.61.282 redis-hash contract was finalised.
//
// Usage:
//   node scripts/seed-dgv-labels-from-json.mjs \
//        ~/Downloads/durian-gemini-verified-2026-05-30_1657.json \
//        ~/Downloads/durian-pastry-gemini-verified-2026-05-30_1659.json
//
// Requires REDIS_URL in the environment. Reads each file, detects
// the mode from the JSON's `mode` field (durian | durian-pastry),
// and bulk-hSet's the placeId → label JSON. 30-day TTL applied.
// Idempotent — re-running overwrites the same fields.

import { createRequire } from 'module';
import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';

const require = createRequire(import.meta.url);
const { createClient } = require('redis');

const TTL_S = 30 * 24 * 60 * 60; // 30 days, mirrors ownerDurianGeminiRun

async function main(argv) {
  const files = argv.slice(2);
  if (files.length === 0) {
    console.error('usage: seed-dgv-labels-from-json.mjs <file1.json> [<file2.json> …]');
    process.exit(2);
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    console.error('REDIS_URL not set in environment. Aborting.');
    process.exit(2);
  }
  const client = createClient({ url });
  client.on('error', (e) => console.error('[redis]', e.message));
  await client.connect();
  let grandTotal = 0;
  try {
    for (const f of files) {
      const abs = path.resolve(f);
      let raw;
      try { raw = await fs.readFile(abs, 'utf8'); }
      catch (err) {
        console.error(`✗ ${abs}: cannot read (${err.message})`);
        continue;
      }
      let report;
      try { report = JSON.parse(raw); }
      catch (err) {
        console.error(`✗ ${abs}: invalid JSON (${err.message})`);
        continue;
      }
      const mode = report.mode;
      if (mode !== 'durian' && mode !== 'durian-pastry') {
        console.error(`✗ ${abs}: unknown mode "${mode}" — expected "durian" or "durian-pastry"`);
        continue;
      }
      if (!Array.isArray(report.venues) || report.venues.length === 0) {
        console.error(`✗ ${abs}: report.venues is empty`);
        continue;
      }
      const key = `dgv:labels:${mode}`;
      const verifiedAt = new Date().toISOString();
      const entries = {};
      let imported = 0;
      let skipped = 0;
      const perRegion = {};
      for (const v of report.venues) {
        if (!v.placeId) { skipped++; continue; }
        entries[v.placeId] = JSON.stringify({
          label: v.label || 'unrelated',
          confidence: v.confidence || 'low',
          reason: (v.reason || '').slice(0, 120),
          verifiedAt,
          seededFrom: path.basename(abs),
          region: v.region || null
        });
        imported++;
        if (v.region) perRegion[v.region] = (perRegion[v.region] || 0) + 1;
      }
      if (imported === 0) {
        console.error(`✗ ${abs}: 0 venues with placeId — nothing to import`);
        continue;
      }
      await client.hSet(key, entries);
      await client.expire(key, TTL_S);
      grandTotal += imported;
      console.log(`✓ ${path.basename(abs)} → ${key}: ${imported} entries (skipped ${skipped} no-placeId)`);
      for (const [region, count] of Object.entries(perRegion)) {
        console.log(`    ${region}: ${count}`);
      }
    }
    console.log(`\nTotal imported: ${grandTotal} placeId → label entries (30d TTL each).`);
  } finally {
    await client.quit().catch(() => {});
  }
}

main(process.argv).catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
