import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('Registros Históricos do Escudo usam fichário 3D e organização por assuntos',()=>{
  const js=read('js/master-shield.js');
  const css=read('css/master-shield.css');
  const data=read('js/master-history-data.js');
  for(const token of ['FICHÁRIO OPERACIONAL','FECHAR E ARQUIVAR','ECONOMIA &amp; GEOPOLÍTICA','ACONTECIMENTOS','GANCHOS','ms-history-drawer','ms-history-open-file']){
    assert.match(js,new RegExp(token));
  }
  for(const token of ['ms-history-cabinet','ms-history-drawer.is-selected','ms-history-drawer.is-open','ms-history-file-sheet','@keyframes msFileOut']){
    assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  for(const token of ['fileName:\'DOSSIE-A01-S1.reg\'','fileName:\'DOSSIE-A80-A100.reg\'','geopolitics:[','hooks:[']){
    assert.match(data,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
});
