// licence-notice.test.js - the repository carries one all-rights-reserved notice and no licence grant.
//
// Operator, 04-11 '26: "change the license in gia repo - to No License, aka don't allow copy", then chose
// "Keep notice, fix it": a single explicit LICENSE (no grant, keeps the no-AI-training clause), the
// duplicate LICENSE.md removed, the README owner line aligned. The AGPL v3 text added in #1444 was
// replaced in #1870; nothing here may bring a grant back, and the notice must not claim the repository
// is public (it went private on 17-10 '26).

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('licence notice', () => {
  it('has exactly one licence file at the root, LICENSE', () => {
    const files = fs.readdirSync(ROOT).filter((f) => /^(licen[cs]e|copying|unlicense)(\.|$)/i.test(f));
    expect(files).toEqual(['LICENSE']);
  });

  it('LICENSE reserves all rights and grants nothing', () => {
    const t = read('LICENSE');
    expect(t).toMatch(/^Copyright \(c\) 2026 .+\. All rights reserved\./);
    expect(t).toMatch(/No licence is granted/);
    for (const verb of ['copy', 'modify', 'distribute', 'publish', 'sublicense', 'sell', 'host', 'train AI systems on', 'create derivative works']) {
      expect(t).toContain(verb);
    }
    expect(t).toMatch(/prior written permission/);
  });

  it('LICENSE carries no open-source grant and no claim that the repository is public', () => {
    const t = read('LICENSE');
    expect(t).not.toMatch(/GNU|Affero|General Public License|MIT License|Apache License|Permission is hereby granted|Creative Commons/i);
    expect(t).not.toMatch(/\bpublic for viewing\b|\bis public\b/i);
  });

  it('package.json marks the package as not licensed for use', () => {
    expect(JSON.parse(read('package.json')).license).toBe('UNLICENSED');
  });

  it("the README's licence section names the same owner as LICENSE and points to it", () => {
    const owner = read('LICENSE').match(/^Copyright \(c\) 2026 (.+?)\. All rights reserved\./)[1];
    const readme = read('README.md');
    const section = readme.slice(readme.indexOf('\n## License\n'));
    expect(section).toContain(`Copyright (c) 2026 ${owner}. All rights reserved.`);
    expect(section).toContain('LICENSE');
    expect(section).not.toMatch(/soleat Development Team/);
  });
});
