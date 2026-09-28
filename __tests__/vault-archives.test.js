import { describe,it,expect } from 'vitest';
import { isCredentialFixturePath, forbiddenArchivePath, credentialShapesInText, hasProtectedLocation, EXPECTED_FOLDERS, ALLOWED_SANITISED } from '../scripts/verify-vault-archives.mjs';

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
  it('allows only the approved 18 sanitised historical versions',()=>{
    const expected=['v0.60.153','v0.60.157','v0.60.166','v0.60.172','v0.61.28','v0.61.76','v0.61.90','v0.61.116','v0.61.208','v0.61.308','v0.61.378','v0.62.37','v0.62.69','v0.62.76','v0.62.153','v0.62.302','v0.62.386','v0.62.504'];
    expect([...ALLOWED_SANITISED].sort()).toEqual(expected.sort());
    expect([...ALLOWED_SANITISED].every(v=>EXPECTED_FOLDERS.has(v))).toBe(true);
  });
  it('keeps nine historical originals and the current snapshot outside sanitisation',()=>{
    expect([...EXPECTED_FOLDERS].filter(v=>!ALLOWED_SANITISED.has(v)).sort()).toEqual(['v0.58.49','v0.58.55','v0.59.17','v0.59.53','v0.60.41','v0.60.106','v0.60.117','v0.60.130','v0.60.141'].sort());
    expect(ALLOWED_SANITISED.has('v0.62.937')).toBe(false);
    expect(ALLOWED_SANITISED.has('v0.62.655')).toBe(false);
  });
});
