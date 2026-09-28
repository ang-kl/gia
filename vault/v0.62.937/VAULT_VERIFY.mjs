// Vault verification v1.0 - 28 September 2026. Read-only; Node.js 20+ and Git.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const SOURCE_COMMIT = '439cf204312b5ad892ec8bd57f37a3d105212f7e';
export const SOURCE_TREE = 'e8cc36558cbfbb6f3325615625449082bb5cb5f9';
export const VAULT_PATH = 'vault/v0.62.937';
const METADATA = new Set(['VAULT_README.md', 'VAULT_MANIFEST.json', 'VAULT_VERIFY.mjs', 'VAULT_VERIFICATION.md']);

export function excluded(path) {
  const parts = path.split('/');
  const name = parts.at(-1);
  return parts.slice(0, -1).some(p => ['node_modules', '.git', 'vault', 'tmp'].includes(p))
    || (name === '.env' || (name.startsWith('.env.') && name !== '.env.example'))
    || name.endsWith('.log')
    || /(^|\/)\.claude\/settings\.local\.json$/.test(path)
    || /(^|\/)public\/[^/]+\/assets\//.test(path);
}

export function parseTree(text) {
  return text.split('\0').filter(Boolean).map(record => {
    const tab = record.indexOf('\t');
    if (tab < 0) throw new Error('Malformed git ls-tree record');
    const [mode, type, oid, size] = record.slice(0, tab).trim().split(/\s+/);
    if (!/^[0-7]{6}$/.test(mode) || !['blob', 'commit'].includes(type) || !/^[0-9a-f]{40}$/.test(oid)) {
      throw new Error('Unsupported git ls-tree metadata');
    }
    if (size !== '-' && !/^\d+$/.test(size || '')) throw new Error('Invalid object size');
    return { path: record.slice(tab + 1), mode, type, oid, size: size === '-' ? null : Number(size) };
  });
}

function unique(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (map.has(entry.path)) throw new Error(`Duplicate path: ${entry.path}`);
    map.set(entry.path, entry);
  }
  return map;
}

export function compareInventory(source, snapshot) {
  const sourceMap = unique(source);
  const actual = unique(snapshot.filter(e => !METADATA.has(e.path)));
  for (const name of METADATA) if (sourceMap.has(name)) throw new Error(`Source/metadata collision: ${name}`);
  const wanted = new Map(source.filter(e => !excluded(e.path)).map(e => [e.path, e]));
  const missing = [], different = [], unexpected = [];
  for (const [path, item] of wanted) {
    const got = actual.get(path);
    if (!got) missing.push(path);
    else if (['mode', 'type', 'oid', 'size'].some(k => item[k] !== got[k])) different.push(path);
  }
  for (const path of actual.keys()) if (!wanted.has(path)) unexpected.push(path);
  return {
    passed: missing.length === 0 && different.length === 0 && unexpected.length === 0,
    source_entries: source.length,
    included_entries: wanted.size,
    snapshot_source_entries: actual.size,
    included_blob_bytes: [...wanted.values()].reduce((n, e) => n + (e.size || 0), 0),
    excluded_paths: source.filter(e => excluded(e.path)).map(e => e.path),
    missing, different, unexpected,
    symlinks: [...wanted.values()].filter(e => e.mode === '120000').map(e => e.path),
    submodules: [...wanted.values()].filter(e => e.type === 'commit').map(e => e.path)
  };
}

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr.trim() || `git exited ${r.status}`);
  return r.stdout;
}

function main() {
  const sourceTree = git(['rev-parse', `${SOURCE_COMMIT}^{tree}`]).trim();
  if (sourceTree !== SOURCE_TREE) throw new Error('Source tree does not match the pinned baseline');
  const source = parseTree(git(['ls-tree', '-r', '-l', '-z', SOURCE_COMMIT]));
  const snapshot = parseTree(git(['ls-tree', '-r', '-l', '-z', `HEAD:${VAULT_PATH}`]));
  const result = compareInventory(source, snapshot);
  console.log(JSON.stringify({ source_commit: SOURCE_COMMIT, source_tree: sourceTree, ...result,
    limits: ['Git-object comparison only; no application or restore execution.', 'Gitlinks do not include external submodule repositories.', 'LFS pointers, if present, do not constitute downloaded LFS payloads.', 'No content-wide secret scan is claimed.']
  }, null, 2));
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(`Vault verification failed: ${error.message}`); process.exitCode = 2; }
}
