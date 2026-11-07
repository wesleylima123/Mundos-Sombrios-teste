import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
function walk(dir){return readdirSync(dir).flatMap(name=>{const p=join(dir,name);return statSync(p).isDirectory()?walk(p):[p]});}
const files=walk(join(root,'js')).filter(f=>f.endsWith('.js'));
let failed=0;
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0){failed++;console.error(`\n[syntax] ${relative(root,file)}\n${r.stderr||r.stdout}`)}}
if(failed){console.error(`\n${failed}/${files.length} arquivo(s) JavaScript com erro.`);process.exit(1)}
console.log(`[syntax] ${files.length} arquivos JavaScript válidos.`);
