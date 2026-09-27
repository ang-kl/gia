// Minimal static-file server for local preview.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import yaml from 'js-yaml';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ndjson': 'application/x-ndjson; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

export async function serve(cfgPath, { port = 5478 } = {}) {
  const cfg = yaml.load(readFileSync(cfgPath, 'utf8'));
  const projectRoot = dirname(cfgPath);
  const outDir = resolve(projectRoot, cfg.output || 'dist/vibe-journal/');
  if (!existsSync(outDir)) {
    console.error(`[vibe-journal] output dir missing: ${outDir} — run \`vibe-journal regen\` first.`);
    process.exit(1);
  }
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p === '/') p = '/index.html';
    const full = resolve(outDir, '.' + p);
    if (!full.startsWith(outDir)) { res.statusCode = 403; return res.end('forbidden'); }
    if (!existsSync(full) || !statSync(full).isFile()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', MIME[extname(full)] || 'application/octet-stream');
    res.end(readFileSync(full));
  });
  server.listen(port, () => {
    console.log(`[vibe-journal] serving ${outDir} at http://localhost:${port}`);
    console.log('[vibe-journal] Ctrl-C to stop.');
  });
}
