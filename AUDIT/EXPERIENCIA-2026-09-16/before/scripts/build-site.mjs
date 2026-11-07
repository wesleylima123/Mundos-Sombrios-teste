import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of ['index.html', '.nojekyll', 'VERSION.txt', 'assets', 'css', 'js', 'codex-files']) {
  const src=join(root,entry); if(existsSync(src)) cpSync(src, join(out, entry), { recursive: true });
}
if (existsSync(join(root, 'CNAME'))) cpSync(join(root, 'CNAME'), join(out, 'CNAME'));
console.log('Site V2.10.1 preparado em dist/; sandbox, SQL, testes e auditorias ficam fora da publicação.');
