// Historical vault verifier v1.0 - 28 September 2026.
// Read-only. Reports paths and finding types, never matched values.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const HISTORICAL_REF = '10ac96a7e412b42cde4a04d98e153befe0c3cdc4';
export const HISTORICAL_VAULT_TREE = '5468ceaa9b5262fed99b827d8131971db6688dbb';
export const EXPECTED_FOLDERS = new Set([
  'v0.58.49','v0.58.55','v0.59.17','v0.59.53','v0.60.41','v0.60.106','v0.60.117',
  'v0.60.130','v0.60.141','v0.60.153','v0.60.157','v0.60.166','v0.60.172',
  'v0.61.28','v0.61.76','v0.61.90','v0.61.116','v0.61.208','v0.61.308','v0.61.378',
  'v0.62.37','v0.62.69','v0.62.76','v0.62.153','v0.62.302','v0.62.386','v0.62.504'
]);

export const CREDENTIAL_PATTERNS = {
  google_api_key: 'AIza[0-9A-Za-z_-]{35}',
  openai_key: 'sk-[A-Za-z0-9]{32,}',
  anthropic_key: 'sk-ant-[A-Za-z0-9_-]{20,}',
  github_token: 'gh[pousr]_[A-Za-z0-9]{36}',
  google_oauth_token: 'ya29\\.[A-Za-z0-9_-]{20,}',
  aws_access_key: 'AKIA[0-9A-Z]{16}',
  slack_token: 'xox[baprs]-[A-Za-z0-9-]{10,}',
  private_key_block: '-----BEGIN [A-Z ]*PRIVATE KEY-----',
  telegram_bot_token: '[0-9]{8,10}:AA[A-Za-z0-9_-]{33}'
};

export function isCredentialFixturePath(p) {
  return /(^|\/)__tests__\//.test(p);
}
export function forbiddenArchivePath(p) {
  const rel = p.replace(/^v[^/]+\//, '');
  const parts = rel.split('/');
  const name = parts.at(-1) || '';
  return parts.includes('node_modules') || parts.includes('.git') || parts.includes('vault') ||
    parts.includes('tmp') || name === 'migration_audit.log' ||
    name === '.env' || (name.startsWith('.env.') && name !== '.env.example') ||
    name.endsWith('.log') || /(^|\/)\.claude\/settings\.local\.json$/.test(rel) ||
    /(^|\/)public\/[^/]+\/assets\//.test(rel);
}
export function credentialShapesInText(text) {
  return Object.entries(CREDENTIAL_PATTERNS).filter(([,p]) => new RegExp(p).test(text)).map(([k]) => k);
}
export function hasProtectedLocation(text) {
  return /\[set-location\][^\n]{0,110}-?\d+\.\d{3,}\s*,\s*-?\d+\.\d{3,}/.test(text);
}

function git(args, allowOne=false) {
  const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:512*1024*1024});
  if(r.error) throw r.error;
  if(r.status!==0 && !(allowOne && r.status===1)) throw new Error(r.stderr.trim()||`git exited ${r.status}`);
  return {status:r.status,stdout:r.stdout};
}
function parseZ(text){ return text.split('\0').filter(Boolean); }
function grepPaths(ref,path,pattern){
  const r=git(['grep','-I','-l','-E','-e',pattern,ref,'--',path],true);
  if(r.status===1) return [];
  return r.stdout.split('\n').filter(Boolean).map(x=>x.slice(x.indexOf(':')+1));
}
function main(){
  const ref=process.argv.includes('--ref') ? process.argv[process.argv.indexOf('--ref')+1] : HISTORICAL_REF;
  const root=process.argv.includes('--path') ? process.argv[process.argv.indexOf('--path')+1] : 'vault';
  const tree=git(['rev-parse',`${ref}:${root}`]).stdout.trim();
  const direct=parseZ(git(['ls-tree','-z',`${ref}:${root}`]).stdout);
  const folders=direct.map(x=>x.slice(x.indexOf('\t')+1)).sort();
  const expected=[...EXPECTED_FOLDERS].sort();
  const folderSetOk=folders.length===expected.length && folders.every((x,i)=>x===expected[i]);
  const inv=parseZ(git(['ls-tree','-r','-l','-z',`${ref}:${root}`]).stdout);
  const forbidden=[];
  let bytes=0, blobs=0;
  for(const rec of inv){
    const tab=rec.indexOf('\t'); const meta=rec.slice(0,tab).trim().split(/\s+/); const p=rec.slice(tab+1);
    if(meta[1]==='blob'){blobs++; if(/^\d+$/.test(meta[3]||'')) bytes+=Number(meta[3]);}
    if(forbiddenArchivePath(p)) forbidden.push(p);
  }
  const credentialFindings=[];
  for(const [shape,pattern] of Object.entries(CREDENTIAL_PATTERNS)){
    for(const p of grepPaths(ref,root,pattern)) if(!isCredentialFixturePath(p)) credentialFindings.push({path:p,shape});
  }
  const locationPaths=grepPaths(ref,root,'\\[set-location\\].{0,110}-?[0-9]+\\.[0-9]{3,}[[:space:]]*,[[:space:]]*-?[0-9]+\\.[0-9]{3,}');
  const passed=tree===HISTORICAL_VAULT_TREE && folderSetOk && forbidden.length===0 && credentialFindings.length===0 && locationPaths.length===0;
  console.log(JSON.stringify({passed,ref,root,tree,tree_expected:HISTORICAL_VAULT_TREE,folder_count:folders.length,folder_set_ok:folderSetOk,blob_count:blobs,blob_bytes:bytes,forbidden_paths:forbidden,credential_findings:credentialFindings,protected_location_paths:locationPaths,limits:['Credential fixtures under __tests__ are excluded from credential-shape findings only.','Protected-location scan has no test-fixture exemption.','Historical application builds are not executed by this verifier.']},null,2));
  if(!passed) process.exitCode=1;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){try{main();}catch(e){console.error('Historical vault verification failed: '+e.message);process.exitCode=2;}}
