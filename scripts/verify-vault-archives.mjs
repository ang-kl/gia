// Vault restoration v2.0 - 28 September 2026. Never prints matched private values.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

export const HISTORICAL_REF = '10ac96a7e412b42cde4a04d98e153befe0c3cdc4';
export const HISTORICAL_VAULT_TREE = '5468ceaa9b5262fed99b827d8131971db6688dbb';
export const CURRENT_SOURCE = '439cf204312b5ad892ec8bd57f37a3d105212f7e';
export const CURRENT_VAULT_TREE = 'f9941f040e4af3f39ea0e135ddf72a509aa41810';
export const EXPECTED_FOLDERS = new Set([
  'v0.58.49','v0.58.55','v0.59.17','v0.59.53','v0.60.41','v0.60.106','v0.60.117',
  'v0.60.130','v0.60.141','v0.60.153','v0.60.157','v0.60.166','v0.60.172',
  'v0.61.28','v0.61.76','v0.61.90','v0.61.116','v0.61.208','v0.61.308','v0.61.378',
  'v0.62.37','v0.62.69','v0.62.76','v0.62.153','v0.62.302','v0.62.386','v0.62.504'
]);
const ALLOWED_SANITISED = new Set(['v0.60.166','v0.60.172','v0.61.90','v0.61.116',
  'v0.61.208','v0.61.308','v0.61.378','v0.62.37','v0.62.69','v0.62.76',
  'v0.62.153','v0.62.302','v0.62.386','v0.62.504']);
const MANIFEST = 'vault/RESTORATION_MANIFEST.json';
// Same one-way identifier pins as the existing no-owner-chat-id.test.js guard.
// Stand-ins are the repository's existing synthetic pair, not real identities.
const IDENTIFIER_STANDINS = new Map([
  ['276f603bf62a5e7555f09e8532be2eeb04ec14edf7afb652577c8d2c3ca35599','100000001'],
  ['0d49e12de4c4e8e56427c0921abe16fe149001440250983717c945492de8f957','1000000019']
]);
export const CREDENTIAL_PATTERNS = {
  google_api_key: 'AIza[0-9A-Za-z_-]{35}', openai_key: 'sk-[A-Za-z0-9]{32,}',
  anthropic_key: 'sk-ant-[A-Za-z0-9_-]{20,}', github_token: 'gh[pousr]_[A-Za-z0-9]{36}',
  google_oauth_token: 'ya29\\.[A-Za-z0-9_-]{20,}', aws_access_key: 'AKIA[0-9A-Z]{16}',
  slack_token: 'xox[baprs]-[A-Za-z0-9-]{10,}', private_key_block: '-----BEGIN [A-Z ]*PRIVATE KEY-----',
  telegram_bot_token: '[0-9]{8,10}:AA[A-Za-z0-9_-]{33}'
};
const locationRE = () => /(\[set-location\][^\r\n]{0,110}?)(-?\d+\.\d{3,}\s*,\s*-?\d+\.\d{3,})/g;
export const isCredentialFixturePath = p => /(^|\/)__tests__\//.test(p);
export const credentialShapesInText = text => Object.entries(CREDENTIAL_PATTERNS)
  .filter(([,p]) => new RegExp(p).test(text)).map(([name])=>name);
export const hasProtectedLocation = text => locationRE().test(text);
export function forbiddenArchivePath(p) {
  const parts=p.replace(/^v[^/]+\//,'').split('/'), name=parts.at(-1)||'';
  return parts.slice(0,-1).some(x=>['node_modules','.git','vault','tmp'].includes(x)) ||
    name==='migration_audit.log' || name==='.env' ||
    (name.startsWith('.env.') && name!=='.env.example') || name.endsWith('.log') ||
    /(^|\/)\.claude\/settings\.local\.json$/.test(p) || /(^|\/)public\/[^/]+\/assets\//.test(p);
}
const identifierCache = new Map();
function standin(run) {
  if (!identifierCache.has(run)) identifierCache.set(run,
    IDENTIFIER_STANDINS.get(createHash('sha256').update(run).digest('hex')) || null);
  return identifierCache.get(run);
}
export function redactProtectedData(data, identify=standin) {
  // latin1 is an exact byte-to-codepoint mapping. Unrelated UTF-8 bytes stay identical.
  const original=Buffer.isBuffer(data)?data:Buffer.from(data), text=original.toString('latin1');
  let locations=0, identifiers=0;
  // Preserve each coordinate span's length so another pair cannot move inside
  // the 110-character window merely because the first pair was shortened.
  let transformed=text;
  for(let pass=0;hasProtectedLocation(transformed)&&pass<32;pass++){
    transformed=transformed.replace(locationRE(), (_m,prefix,pair)=>{
      locations++; return prefix+'<redacted>'.padEnd(pair.length,' ');
    });
  }
  transformed=transformed.replace(/\d{8,12}/g, run=>{const replacement=identify(run); if(!replacement)return run; identifiers++; return replacement;});
  if ((locations||identifiers) && original.includes(0)) throw new Error('Protected data found in a binary blob; no automatic modification');
  if(hasProtectedLocation(transformed)) throw new Error('Additional protected location remains; fail closed');
  return {data:Buffer.from(transformed,'latin1'),locations,identifiers};
}
function git(args, options={}) {
  return execFileSync('git', args, {maxBuffer:256*1024*1024, ...options});
}
const gitText=(args,options={})=>git(args,options).toString('utf8').trim();
function entries(ref) {
  return git(['ls-tree','-r','-l','-z',ref]).toString('utf8').split('\0').filter(Boolean).map(s=>{
    const k=s.indexOf('\t'), [mode,type,oid,size]=s.slice(0,k).trim().split(/\s+/);
    if(type!=='blob')throw new Error('External gitlink payload not archived: '+s.slice(k+1));
    return {path:s.slice(k+1),mode,type,oid,size:Number(size)};
  });
}
function trees(ref) {
  return git(['ls-tree','-z',ref]).toString('utf8').split('\0').filter(Boolean).map(s=>{
    const k=s.indexOf('\t'), [mode,type,oid]=s.slice(0,k).split(' ');
    return {name:s.slice(k+1),mode,type,oid};
  });
}
async function reader() {
  const child=spawn('git',['cat-file','--batch'],{stdio:['pipe','pipe','inherit']});
  const it=child.stdout[Symbol.asyncIterator](); let chunks=[], available=0;
  async function fill(n){while(available<n){const {value,done}=await it.next();if(done)throw new Error('cat-file ended early');chunks.push(value);available+=value.length;}}
  async function take(n){await fill(n);const out=Buffer.allocUnsafe(n);let at=0;while(at<n){const c=chunks[0],count=Math.min(n-at,c.length);c.copy(out,at,0,count);at+=count;available-=count;if(count===c.length)chunks.shift();else chunks[0]=c.subarray(count);}return out;}
  async function line(){const out=[];for(;;){const c=await take(1);if(c[0]===10)return Buffer.concat(out).toString();out.push(c);if(out.length>200)throw new Error('Invalid cat-file header');}}
  return {async get(oid){assert.match(oid,/^[0-9a-f]{40}$/);child.stdin.write(oid+'\n');const header=await line();const [got,type,len]=header.split(' ');assert.equal(got,oid);assert.equal(type,'blob');const data=await take(Number(len));assert.equal((await take(1))[0],10);return data;},close(){child.stdin.end();}};
}
function indexEnv(file){return {...process.env,GIT_INDEX_FILE:file};}
function updateIndex(index,list){git(['update-index','-z','--index-info'],{env:indexEnv(index),input:Buffer.from(list.map(e=>`${e.mode} blob ${e.oid}\t${e.path}\0`).join(''))});}
function hash(data){return gitText(['hash-object','-w','--stdin'],{input:data});}
const sortVersions=a=>a.sort((x,y)=>x.localeCompare(y,undefined,{numeric:true}));
function emitOutput(name,value){if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`${name}=${value}\n`);}

async function prepare() {
  if(existsSync(MANIFEST)){await verify();emitOutput('changed','false');return;}
  const parent=gitText(['rev-parse','HEAD']);
  assert.equal(gitText(['rev-parse',`${HISTORICAL_REF}:vault`]),HISTORICAL_VAULT_TREE);
  assert.equal(gitText(['rev-parse','HEAD:vault/v0.62.937']),CURRENT_VAULT_TREE);
  const source=entries(`${HISTORICAL_REF}:vault`), versions=trees(`${HISTORICAL_REF}:vault`);
  assert.deepEqual(sortVersions(versions.map(x=>x.name)),sortVersions([...EXPECTED_FOLDERS]));
  const forbidden=source.filter(e=>forbiddenArchivePath(e.path));
  if(forbidden.length)throw new Error('Excluded archive paths: '+forbidden.map(e=>e.path).join(', '));
  const r=await reader(), cache=new Map(), candidates=new Map(), issues=[];
  try {
    for(const e of source){
      if(cache.has(e.oid))continue;
      const original=await r.get(e.oid), result=redactProtectedData(original);
      const shapes=credentialShapesInText(result.data.toString('latin1'));
      if(shapes.length)issues.push({path:e.path,shapes}); // No historical fixture exemptions.
      const oid=result.locations||result.identifiers?hash(result.data):e.oid;
      if(oid!==e.oid && !original.includes(0)){
        // A privacy scrub must not corrupt any previously valid JSON file.
        if(/\.json$/i.test(e.path)){let valid=false;try{JSON.parse(original.toString('utf8'));valid=true;}catch{}if(valid)JSON.parse(result.data.toString('utf8'));}
      }
      cache.set(e.oid,{oid,size:result.data.length,locations:result.locations,identifiers:result.identifiers});
    }
  } finally {r.close();}
  if(issues.length)throw new Error('Credential-shaped content blocks publication: '+JSON.stringify(issues));
  const changed=[];
  for(const e of source){const c=cache.get(e.oid);candidates.set(e.path,{...e,oid:c.oid,size:c.size});if(c.oid!==e.oid)changed.push({path:e.path,source_oid:e.oid,result_oid:c.oid,locations:c.locations,identifiers:c.identifiers});}
  const affected=sortVersions([...new Set(changed.map(x=>x.path.split('/')[0]))]);
  assert.deepEqual(affected,sortVersions([...ALLOWED_SANITISED]),'Additional archives require changed scope; original 13 must stay identical');
  const temp=mkdtempSync(join(tmpdir(),'vault-restore-')), hi=join(temp,'history-index'), ci=join(temp,'candidate-index');
  git(['read-tree',`${HISTORICAL_REF}:vault`],{env:indexEnv(hi)});
  updateIndex(hi,[...candidates.values()]);
  const historicalResult=gitText(['write-tree'],{env:indexEnv(hi)}), versionResults=new Map(trees(historicalResult).map(x=>[x.name,x.oid]));
  const manifest={version:'2.0',date:'2026-09-28',source_commit:HISTORICAL_REF,source_tree:HISTORICAL_VAULT_TREE,
    sanitised_historical_tree:historicalResult,current_source_commit:CURRENT_SOURCE,current_vault_tree:CURRENT_VAULT_TREE,
    policy:'Only protected set-location coordinate pairs and their digest-pinned private chat identifiers are replaced. No source file is removed. Thirteen historical version trees are unchanged.',
    historical_blob_count:source.length,historical_source_bytes:source.reduce((n,e)=>n+e.size,0),
    historical_result_bytes:[...candidates.values()].reduce((n,e)=>n+e.size,0),
    sanitised_version_count:affected.length,unchanged_version_count:27-affected.length,
    versions:versions.map(v=>({name:v.name,source_tree:v.oid,result_tree:versionResults.get(v.name),status:ALLOWED_SANITISED.has(v.name)?'sanitised derivative':'byte-identical original',historical_build:'not executed'})),
    changed_paths:changed,
    files:source.map(e=>({path:e.path,mode:e.mode,source_oid:e.oid,result_oid:candidates.get(e.path).oid,source_bytes:e.size,result_bytes:candidates.get(e.path).size})),
    security_scope:'All historical blob contents checked for the nine repository credential patterns, marker-associated coordinates, and two digest-pinned identifiers. No matched private values logged. This is not a universal personal-data or vulnerability audit.',
    exclusions:[],symlinks:source.filter(e=>e.mode==='120000').map(e=>e.path),submodules:[]};
  const readme=`# Soleat source vault\n\nVersion 2.0 - 28 September 2026.\n\nThis folder contains 28 source snapshots: 27 historical versions recovered from ${HISTORICAL_REF}, plus v0.62.937 from ${CURRENT_SOURCE}. These are source archives, not backups of Redis, credentials or production state.\n\n## Provenance and privacy\n\nThirteen historical folders retain their exact original Git trees. Fourteen are explicitly **sanitised derivatives**, not byte-identical originals: only protected location traces and their private chat identifiers were replaced. No source file was removed. Original objects remain in Git history. RESTORATION_MANIFEST.json lists every file's identity and size, every changed path and both tree identities. It never includes the removed private values. The v0.62.937 snapshot is unchanged.\n\n| Version | Status | Original tree | Restored tree |\n|---|---|---|---|\n${manifest.versions.map(v=>`| ${v.name} | ${v.status} | ${v.source_tree} | ${v.result_tree} |`).join('\n')}\n| v0.62.937 | Unchanged current snapshot | ${CURRENT_VAULT_TREE} | ${CURRENT_VAULT_TREE} |\n\n## Verify and restore\n\nRun \`node scripts/verify-vault-archives.mjs --verify\` from the repository root. The recorded original commits must be available locally. Export an individual version into an isolated directory with \`git archive HEAD:vault/<version>\`; install dependencies there with scripts disabled first. Do not start a historic bot with production credentials. Historical builds are not certified against today's dependencies; preserve the source rather than silently upgrading it.\n\nThe current v0.62.937 snapshot is separately checked and built in an isolated temporary directory by the vault verification workflow. See its actual run for results. The claimed v0.62.655 local archive was not recoverable and is not represented as an original folder here. Feature-map work remains deferred.\n`;
  git(['read-tree','HEAD'],{env:indexEnv(ci)});
  updateIndex(ci,[...[...candidates.values()].map(e=>({...e,path:'vault/'+e.path})),
    {path:MANIFEST,mode:'100644',oid:hash(Buffer.from(JSON.stringify(manifest,null,2)+'\n'))},
    {path:'vault/README.md',mode:'100644',oid:hash(Buffer.from(readme))}]);
  const tree=gitText(['write-tree'],{env:indexEnv(ci)});
  const env={...process.env,GIT_AUTHOR_NAME:'github-actions[bot]',GIT_AUTHOR_EMAIL:'41898282+github-actions[bot]@users.noreply.github.com',GIT_COMMITTER_NAME:'github-actions[bot]',GIT_COMMITTER_EMAIL:'41898282+github-actions[bot]@users.noreply.github.com'};
  const commit=gitText(['commit-tree',tree,'-p',parent,'-m','chore(vault): restore 27 historical snapshots with audited privacy sanitisation'],{env});
  git(['checkout','--detach',commit]);
  await verify();
  // Export only sanitised new blobs and path/OID metadata, never the original Git
  // object database or a bundle that might carry an unsafe historical delta base.
  const exportOids=new Set(changed.map(e=>e.result_oid));
  exportOids.add(gitText(['rev-parse',`HEAD:${MANIFEST}`]));
  exportOids.add(gitText(['rev-parse','HEAD:vault/README.md']));
  const transfer={version:1,parent,parent_tree:gitText(['rev-parse',`${parent}^{tree}`]),tree,
    historical_source_tree:HISTORICAL_VAULT_TREE,historical_result_tree:historicalResult,
    blobs:[...exportOids].map(oid=>({oid,content:git(['cat-file','blob',oid]).toString('base64')})),
    history_changes:changed.map(e=>({path:e.path,mode:candidates.get(e.path).mode,type:'blob',sha:e.result_oid})),
    root_entries:[...manifest.versions.map(v=>({path:'vault/'+v.name,mode:'040000',type:'tree',sha:v.result_tree})),
      {path:MANIFEST,mode:'100644',type:'blob',sha:gitText(['rev-parse',`HEAD:${MANIFEST}`])},
      {path:'vault/README.md',mode:'100644',type:'blob',sha:gitText(['rev-parse','HEAD:vault/README.md'])}]};
  assert.ok(process.env.VAULT_TRANSFER,'VAULT_TRANSFER is required');
  writeFileSync(process.env.VAULT_TRANSFER,JSON.stringify(transfer));
  emitOutput('changed','true');emitOutput('candidate',commit);emitOutput('parent',parent);
  console.log(JSON.stringify({prepared:true,parent,candidate:commit,historical_files:source.length,sanitised_versions:affected.length,changed_paths:changed.length,coordinate_replacements:changed.reduce((n,x)=>n+x.locations,0),identifier_replacements:changed.reduce((n,x)=>n+x.identifiers,0)}));
}

async function verify() {
  const m=JSON.parse(git(['show',`HEAD:${MANIFEST}`]).toString('utf8'));
  assert.equal(m.source_commit,HISTORICAL_REF);assert.equal(m.source_tree,HISTORICAL_VAULT_TREE);
  assert.equal(gitText(['rev-parse',`${HISTORICAL_REF}:vault`]),HISTORICAL_VAULT_TREE);
  assert.equal(gitText(['rev-parse','HEAD:vault/v0.62.937']),CURRENT_VAULT_TREE);
  const source=entries(`${HISTORICAL_REF}:vault`), all=entries('HEAD:vault');
  const actual=new Map(all.filter(e=>EXPECTED_FOLDERS.has(e.path.split('/')[0])).map(e=>[e.path,e]));
  assert.equal(actual.size,source.length);assert.equal(m.files.length,source.length);
  assert.deepEqual(sortVersions(trees('HEAD:vault').filter(x=>x.type==='tree').map(x=>x.name)),sortVersions([...EXPECTED_FOLDERS,'v0.62.937']));
  const records=new Map(m.files.map(e=>[e.path,e]));assert.equal(records.size,source.length);
  const r=await reader(), cache=new Map();let locs=0,ids=0,changed=0,sourceBytes=0,resultBytes=0;
  try{
    for(const e of source){
      assert.equal(forbiddenArchivePath(e.path),false,e.path);
      if(!cache.has(e.oid)){
        const original=await r.get(e.oid), expected=redactProtectedData(original);
        const oid=createHash('sha1').update(Buffer.from(`blob ${expected.data.length}\0`)).update(expected.data).digest('hex');
        assert.deepEqual(credentialShapesInText(expected.data.toString('latin1')),[],`Credential pattern in ${e.path}`);
        cache.set(e.oid,{oid,size:expected.data.length,locations:expected.locations,identifiers:expected.identifiers});
      }
      const c=cache.get(e.oid), a=actual.get(e.path), record=records.get(e.path);
      assert.ok(a,e.path);assert.equal(a.mode,e.mode,e.path);assert.equal(a.oid,c.oid,e.path);assert.equal(a.size,c.size,e.path);
      assert.deepEqual(record,{path:e.path,mode:e.mode,source_oid:e.oid,result_oid:c.oid,source_bytes:e.size,result_bytes:c.size});
      sourceBytes+=e.size;resultBytes+=a.size;locs+=c.locations;ids+=c.identifiers;if(c.oid!==e.oid)changed++;
    }
  }finally{r.close();}
  const expectedChanged=source.filter(e=>actual.get(e.path).oid!==e.oid).map(e=>e.path).sort();
  assert.deepEqual(m.changed_paths.map(e=>e.path).sort(),expectedChanged);
  const affected=sortVersions([...new Set(expectedChanged.map(x=>x.split('/')[0]))]);
  assert.deepEqual(affected,sortVersions([...ALLOWED_SANITISED]));
  for(const v of m.versions){
    assert.equal(gitText(['rev-parse',`HEAD:vault/${v.name}`]),v.result_tree);
    assert.equal(gitText(['rev-parse',`${HISTORICAL_REF}:vault/${v.name}`]),v.source_tree);
    if(!ALLOWED_SANITISED.has(v.name))assert.equal(v.result_tree,v.source_tree);
  }
  const result={passed:true,version_folders:28,historical_source_entries:source.length,historical_source_bytes:sourceBytes,historical_restored_bytes:resultBytes,unchanged_historical_trees:13,sanitised_historical_trees:14,changed_paths:changed,coordinate_replacements:locs,identifier_replacements:ids,remaining_scanned_credentials:0,remaining_scanned_locations:0,remaining_pinned_identifiers:0,missing:0,unexpected:0,unapproved_differences:0,historical_builds:'not executed'};
  console.log(JSON.stringify(result,null,2));
  if(process.env.VAULT_REPORT)writeFileSync(process.env.VAULT_REPORT,JSON.stringify(result,null,2)+'\n');
  return result;
}

function selfTest(){
  const decoy=['[set-location] chat=100000001 -> -5','.1234,110','.5678'].join('');
  const input=Buffer.from('unchanged 中文\n'+decoy+'\nvenue 1.3123,103.8456\n');
  const result=redactProtectedData(input,()=>null);
  assert.equal(result.locations,1);assert.equal(result.identifiers,0);assert.equal(hasProtectedLocation(result.data.toString()),false);
  assert.equal(result.data.toString(),'unchanged 中文\n[set-location] chat=100000001 -> '+ '<redacted>'.padEnd(16,' ')+'\nvenue 1.3123,103.8456\n');
  assert.deepEqual(redactProtectedData(result.data,()=>null).data,result.data);
  assert.deepEqual(redactProtectedData(Buffer.from([0,255,254,12]),()=>null).data,Buffer.from([0,255,254,12]));
  assert.equal(redactProtectedData('fixture 100000009',s=>s==='100000009'?'100000001':null).identifiers,1);
  assert.equal(forbiddenArchivePath('v0.62.504/.env'),true);assert.equal(forbiddenArchivePath('v0.62.504/.env.example'),false);
  assert.equal(forbiddenArchivePath('v0.62.504/public/cuisine/assets/x.js'),true);
  assert.equal(EXPECTED_FOLDERS.size,27);assert.equal(ALLOWED_SANITISED.size,14);
  assert.deepEqual(credentialShapesInText('AIza'+'B'.repeat(35)),['google_api_key']);
  assert.equal(isCredentialFixturePath('v0.62.504/__tests__/x.js'),true);
  const pair=['-5','.1234,110','.5678'].join('');
  const multi=redactProtectedData('[set-location] '+pair+' -> '+pair,()=>null);
  assert.equal(multi.locations,2);
  assert.equal(hasProtectedLocation(multi.data.toString()),false);
  const far='[set-location] '+pair+' '.repeat(115)+pair;
  const farResult=redactProtectedData(far,()=>null);
  assert.equal(farResult.locations,1);
  assert.ok(farResult.data.toString().endsWith(pair));
  console.log('18 local assertions passed: byte preservation, bounded multi-pair redaction, idempotence and exclusion policy');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{if(process.argv.includes('--self-test'))selfTest();else if(process.argv.includes('--prepare'))await prepare();else if(process.argv.includes('--verify'))await verify();else throw new Error('Use --prepare, --verify or --self-test');}
  catch(e){console.error('Vault operation failed: '+e.message);process.exitCode=1;}
}
