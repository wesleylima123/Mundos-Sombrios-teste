import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('acervo integral do Escudo fica fora do pacote de abertura',()=>{
  const data=read('js/master-shield-data.js'),docs=read('js/master-shield-docs.js'),shield=read('js/master-shield.js');
  assert.doesNotMatch(data,/const DOCS\s*=/);
  assert.ok(data.length<200000,'master-shield-data.js deve continuar leve');
  assert.match(docs,/^[\s\S]*window\.MS_SHIELD_DOCS\s*=\s*\[/);
  assert.doesNotMatch(shield,/[^_.]\bDOCS\b/);
  assert.match(shield,/MS_ASSETS\.script\('js\/master-shield-docs\.js'/);
  assert.match(shield,/if\(v==='arquivos'\)window\.__msShieldDocsDraw/);
});

test('acervo integral continua com todos os documentos',()=>{
  const ctx={window:{}};
  new Function('window',read('js/master-shield-docs.js'))(ctx.window);
  assert.ok(Array.isArray(ctx.window.MS_SHIELD_DOCS));
  assert.ok(ctx.window.MS_SHIELD_DOCS.length>=16);
  for(const d of ctx.window.MS_SHIELD_DOCS){assert.ok(d.id&&d.titulo&&typeof d.texto==='string');}
});
