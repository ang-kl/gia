import { describe,it,expect } from 'vitest';
import { isCredentialFixturePath, forbiddenArchivePath, credentialShapesInText, hasProtectedLocation, EXPECTED_FOLDERS } from '../scripts/verify-vault-archives.mjs';

describe('historical vault verifier',()=>{
  it('pins the 27 located historical folders',()=>{ expect(EXPECTED_FOLDERS.size).toBe(27); expect(EXPECTED_FOLDERS.has('v0.62.504')).toBe(true); });
  it('permits credential-shaped fixtures only by test-path classification',()=>{
    expect(isCredentialFixturePath('v0.62.504/__tests__/wrong-log.test.js')).toBe(true);
    expect(isCredentialFixturePath('v0.62.504/src/leak.js')).toBe(false);
  });
  it('still detects credential shapes in ordinary archived source',()=>{
    const fake='AIza'+'B'.repeat(35);
    expect(credentialShapesInText(fake)).toContain('google_api_key');
  });
  it('never exempts protected set-location coordinates',()=>{
    const synthetic=['[set-location] chat=1 -> -5','.1234,110','.5678'].join('');
    expect(hasProtectedLocation(synthetic)).toBe(true);
  });
  it('enforces snapshot exclusions',()=>{
    expect(forbiddenArchivePath('v0.62.504/.env')).toBe(true);
    expect(forbiddenArchivePath('v0.62.504/public/cuisine/assets/x.js')).toBe(true);
    expect(forbiddenArchivePath('v0.62.504/.env.example')).toBe(false);
    expect(forbiddenArchivePath('v0.62.504/src/app.js')).toBe(false);
  });
});
