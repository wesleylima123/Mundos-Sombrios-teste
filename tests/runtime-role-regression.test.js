import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');
test('hidratação remota promove o snapshot antes de reconstruir a visão local',()=>{
  const s=read('js/script.js');
  const promote=s.indexOf('currentRepo.characters = characters.map(msClone)');
  const sync=s.indexOf('msSyncCurrentUserView();', promote);
  assert.ok(promote>=0 && sync>promote);
});
test('Mestre e ADM recebem acesso visual ao Escudo após autenticação',()=>{
  const s=read('js/script.js');
  assert.match(s,/btn-master-shield/);
  assert.match(s,/shieldButton\.style\.display=.*mestre.*admin/);
});
test('V0.45 não substitui o salvamento canônico moderno',()=>{
  const s=read('js/mundos-updates.js');
  assert.doesNotMatch(s,/window\.saveCharacter\s*=\s*function saveCharacterV045/);
  assert.doesNotMatch(s,/installV045CoreFix/);
  assert.match(s,/resíduo V0\.45 removido/);
});
test('Nexo não chama helper removido e fallback visual não monta rota vazia',()=>{
  assert.doesNotMatch(read('js/exodo-nexo.js'),/syncHiddenPower\(/);
  assert.match(read('js/archetype-art-direction.js'),/const image=artId\?\(\(type===/);
});
test('Envolto usa propriedade dataset válida para o binding de resize',()=>{
  const s=read('js/script.js');
  assert.doesNotMatch(s,/dataset\[['"]ef-resize-bound['"]\]/);
  assert.match(s,/dataset\.efResizeBound/);
});
