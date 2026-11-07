import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('V2 não reintroduz camadas de cards e Mercado já substituídas',()=>{
  const script=read('js/script.js');
  const updates=read('js/mundos-updates.js');
  const css=read('css/style.css');
  for(const token of ['card-3d-icon-wrapper','cube-icon','cube-face','class-symbol-float']){
    assert.doesNotMatch(script,new RegExp(token));
    assert.doesNotMatch(updates,new RegExp(token));
    assert.doesNotMatch(css,new RegExp(token));
  }
  assert.doesNotMatch(updates,/forceTaskSvg/);
  assert.doesNotMatch(updates,/v14-death-module|v16-death-module/);
  assert.doesNotMatch(script,/#v15-rank-select|#mm-rank/);
  assert.doesNotMatch(css,/\.v14-|\.v15-/);
  assert.match(updates,/v16-card-symbol-layer/);
  assert.match(updates,/renderMerc16/);
});

test('V2 remove helpers sem consumidor e preserva adaptadores ativos',()=>{
  const script=read('js/script.js');
  const db=read('js/supabase-db.js');
  const power=read('js/power-registry.js');
  const aprim=read('js/aprimorador-engenharia.js');
  for(const token of ['msSyncRepoStore','msFindCharacterByRef','msResolveCurrentUserCharSelection','msPersistJoinedTableRepo','msRemoveJoinedTableRepo','msLinkParticipantToTable','msUnlinkParticipantFromTable','setupDraggables','MS_JOINED_KEY','specDescDict']){
    assert.doesNotMatch(script,new RegExp(`\\b${token}\\b`));
  }
  assert.doesNotMatch(db,/normalizeUserPayload/);
  assert.doesNotMatch(power,/function fillPowerSelect/);
  assert.doesNotMatch(aprim,/function (getVig|masteryName|isUnlocked)/);
  assert.match(script,/function msPersistCharacterToRepo/);
  assert.match(db,/function normalizeTablePayload/);
  assert.match(db,/function normalizeCharacterPayload/);
});

test('V2 não mantém folha de arquétipos previamente aposentada',()=>{
  assert.equal(existsSync(join(root,'css/archetype-selection.css')),false);
  assert.ok(existsSync(join(root,'css/archetype-art-direction-v0.63.css')));
});

test('rotas literais e referências locais do HTML continuam resolvidas',()=>{
  const html=read('index.html');
  const ids=new Set([...html.matchAll(/\bid=["']([^"']+)/g)].map(m=>m[1]));
  const allIds=[...html.matchAll(/\bid=["']([^"']+)/g)].map(m=>m[1]);
  assert.equal(ids.size,allIds.length,'IDs HTML duplicados');
  for(const m of html.matchAll(/\b(?:src|href)=["']([^"']+)/g)){
    const value=m[1];
    if(/^(?:https?:|\/\/|#|data:|mailto:|javascript:)/.test(value)) continue;
    const clean=value.split(/[?#]/)[0];
    if(clean) assert.ok(existsSync(join(root,clean)),`referência ausente: ${clean}`);
  }
  const corpus=[read('js/script.js'),read('js/mundos-updates.js'),read('js/master-room.js'),read('js/world-codices.js')].join('\n');
  for(const m of corpus.matchAll(/showScreen\(\s*["']([^"']+)/g)){
    assert.ok(ids.has(m[1])||ids.has(`screen-${m[1]}`),`rota/tela ausente: ${m[1]}`);
  }
});
