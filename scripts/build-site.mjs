import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const {version}=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of ['index.html', '.nojekyll', 'VERSION.txt', 'assets', 'css', 'js', 'data', 'codex-files']) {
  const src=join(root,entry); if(existsSync(src)) cpSync(src, join(out, entry), { recursive: true });
}
if (existsSync(join(root, 'CNAME'))) cpSync(join(root, 'CNAME'), join(out, 'CNAME'));

// Minificação conservadora de CSS somente no artefato publicado. A árvore-fonte permanece legível.
function walk(dir, visit){
  for(const name of readdirSync(dir)){
    const full=join(dir,name), st=statSync(full);
    if(st.isDirectory()) walk(full,visit); else visit(full);
  }
}
function minifyCss(source){
  return source
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\s+/g,' ')
    .replace(/\s*([{};,>~])\s*/g,'$1')
    .replace(/;}/g,'}')
    .trim();
}
const cssRoot=join(out,'css');
if(existsSync(cssRoot)) walk(cssRoot,file=>{if(file.endsWith('.css'))writeFileSync(file,minifyCss(readFileSync(file,'utf8')));});

const html=readFileSync(join(out,'index.html'),'utf8');
const localCss=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x));
const localJs=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x));
const bytes=list=>list.reduce((sum,rel)=>{try{return sum+statSync(join(out,rel)).size}catch{return sum}},0);
console.log(`Site V${version} preparado em dist/; SQL, testes e auditorias ficam fora da publicação.`);
console.log(`Boot local: ${localCss.length} CSS (${Math.round(bytes(localCss)/1024)} KiB) + ${localJs.length} JS (${Math.round(bytes(localJs)/1024)} KiB), além de vendors remotos.`);
