#!/usr/bin/env node
// vibe-journal CLI — entry point for `init`, `regen`, `serve`.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

const [, , cmd, ...rest] = process.argv;
const flags = parseFlags(rest);

function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v ?? (args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true);
    }
  }
  return out;
}

function fail(msg, code = 1) { console.error(`[vibe-journal] ${msg}`); process.exit(code); }

const COMMANDS = {
  async init() {
    const target = resolve(process.cwd(), 'vibe-journal.config.yaml');
    if (existsSync(target) && !flags.force) fail(`Config already exists at ${target} — re-run with --force to overwrite.`);
    const template = readFileSync(resolve(PKG_ROOT, 'templates', 'config.template.yaml'), 'utf8');
    writeFileSync(target, template);
    console.log(`[vibe-journal] wrote ${target}`);
    console.log('[vibe-journal] edit the config, then run `vibe-journal regen`.');
  },
  async regen() {
    const cfgPath = resolve(process.cwd(), flags.config || 'vibe-journal.config.yaml');
    if (!existsSync(cfgPath)) fail(`Config not found: ${cfgPath} — run \`vibe-journal init\` first.`);
    const { regen } = await import(resolve(PKG_ROOT, 'lib', 'render.mjs'));
    await regen(cfgPath, PKG_ROOT);
  },
  async serve() {
    const cfgPath = resolve(process.cwd(), flags.config || 'vibe-journal.config.yaml');
    if (!existsSync(cfgPath)) fail(`Config not found: ${cfgPath} — run \`vibe-journal init\` first.`);
    const { serve } = await import(resolve(PKG_ROOT, 'lib', 'serve.mjs'));
    await serve(cfgPath, { port: Number(flags.port) || 5478 });
  },
  async help() {
    console.log(`vibe-journal — knowledge-surface generator
Usage:
  vibe-journal init                          scaffold vibe-journal.config.yaml
  vibe-journal regen [--config <path>]       parse doc/ + vault/ → emit static site
  vibe-journal serve [--config <path>] [--port <n>]
                                             local preview (default port 5478)
  vibe-journal help                          this text
`);
  }
};

const fn = COMMANDS[cmd] || COMMANDS.help;
fn().catch((err) => { console.error('[vibe-journal] failed:', err.stack || err.message); process.exit(1); });
