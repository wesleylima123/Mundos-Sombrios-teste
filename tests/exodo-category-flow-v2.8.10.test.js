import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('js/forja-overhaul-v2.8.10.js');
const css=read('css/forja-overhaul-v2.8.10.css');

test('Êxodo remove somente o seletor antecipado de categoria',()=>{
  assert.match(js,/if\(isExodo\(\)\)\{\s*byId\('ms-category-strip'\)\?\.remove\(\)/s);
  assert.match(css,/#screen-builder\[data-mode="exodo"\] #ms-category-strip\{display:none!important\}/);
  assert.match(js,/else if\(!byId\('ms-category-strip'\)\)/); // outros modos preservam o seletor
});

test('Êxodo infere categoria da escolha posterior de classe/especialização',()=>{
  for(const pair of [
    "'Combatente':'combatente'","'Sobrevivente':'sobrevivente'","'Especialista':'especialista'",
    "'Engenheiro Biológico':'especialista'","'IA Virtudes':'sobrevivente'","'IA Domínios':'combatente'",
    "'IA Principados':'especialista'","'Velocitus Bellator':'combatente'","'Aeternus Vitalis':'sobrevivente'","'Mentis Aurorae':'especialista'"
  ]) assert.ok(js.includes(pair),pair);
  assert.match(js,/const inferred=inferExodoCategory\(name\)/);
  assert.match(js,/setCategory\(inferred,\{apply:false\}\)/);
});

test('benefícios da categoria continuam aplicados e persistidos',()=>{
  assert.match(js,/applyCategoryPreset\(cat,\{previous:'',attributes:true,skills:true\}\)/);
  assert.match(js,/p\.categoryPreset=/);
  assert.match(js,/equipmentBonusPE/);
  assert.match(js,/renderCategorySkillBenefits/);
  assert.match(js,/renderCategorySheetSummary/);
});

test('Êxodo pode escolher expansão antes da categoria enquanto outros modos continuam exigindo categoria',()=>{
  assert.match(js,/if\(!isExodo\(\)&&!category\(\)\)/);
  assert.match(js,/if\(isExodo\(\)\)\{window\.currentCategory='';ensureCategoryInput\(\)\.value='';\}/);
});
