import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const IGNORADOS = new Set(['ms-runtime-config.example.js']);

function jsDoProjeto(dir, base = 'js') {
  const out = [];
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...jsDoProjeto(join(dir, e.name), base));
    else if (e.name.endsWith('.js')) out.push(join(dir, e.name));
  }
  return out;
}

test('nenhum JavaScript do site fica orfao (sem referencia no pacote)', () => {
  const fontes = [readFileSync(join(ROOT, 'index.html'), 'utf8')];
  for (const f of jsDoProjeto('js')) fontes.push(readFileSync(join(ROOT, f), 'utf8'));
  for (const f of jsDoProjeto('scripts')) fontes.push(readFileSync(join(ROOT, f), 'utf8'));
  const texto = fontes.join('\n');
  const orfaos = jsDoProjeto('js')
    .filter((f) => !IGNORADOS.has(basename(f)))
    .filter((f) => !texto.includes(f.replace(/\\/g, '/')))
    .filter((f) => !texto.includes(basename(f)));
  assert.deepEqual(orfaos, [], `JavaScript sem nenhuma referencia: ${orfaos.join(', ')}`);
});

test('bundle do dist nao publica codigo morto de versoes antigas', () => {
  const proibidos = ['forja-overhaul-v2.8.8.js', 'ms-consolidation-v2.10.0.js',
    'ms-consolidation-v2.9.0.js', 'operational-control-v2.10.0.js',
    'evolution-gradual-v2.10.0.js', 'evolution-backend-v2.10.0.js'];
  const presentes = proibidos.filter((f) => existsSync(join(ROOT, 'dist/js', f)));
  assert.deepEqual(presentes, [], `dist publica arquivos obsoletos: ${presentes.join(', ')}`);
});
