import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('Imortalizar exige Nome, Categoria, Expansão e Classe nos dois modos',()=>{
  const platform=read('js/ms-platform.js');
  assert.match(platform,/Categoria torna-se etapa obrigatória antes de Expansão \+ Classe/);
  assert.match(platform,/Informe o nome do personagem antes de imortalizar/);
  assert.match(platform,/Escolha Combatente, Sobrevivente ou Especialista antes de imortalizar/);
  assert.match(platform,/Escolha uma expansão\/origem antes de imortalizar/);
  assert.match(platform,/Escolha uma classe antes de imortalizar/);
  assert.doesNotMatch(platform,/errors\.push\(`Atributo/);
  assert.doesNotMatch(platform,/errors\.push\('Há um poder estruturado sem nome/);
  assert.doesNotMatch(platform,/modo de jogo precisa ser definido/i);
});

test('Interface declara claramente os quatro pré-requisitos e deixa demais campos opcionais',()=>{
  const html=read('index.html');
  assert.match(html,/PRÉ-REQUISITOS PARA IMORTALIZAR/);
  assert.match(html,/Nome · Categoria · Expansão · Classe/);
  assert.match(html,/Todos os demais campos são opcionais/);
  assert.doesNotMatch(html,/id="char-nature" required/);
  assert.doesNotMatch(html,/id="char-class" required/);
});

test('Backend atual aplica os quatro pré-requisitos e preserva Soul Economy',()=>{
  const sql=read('supabase-v2.8.8-category-required.sql');
  for(const guard of ['CHARACTER_NAME_REQUIRED','CHARACTER_CATEGORY_REQUIRED','CHARACTER_EXPANSION_REQUIRED','CHARACTER_CLASS_REQUIRED']) assert.match(sql,new RegExp(guard));
  assert.match(sql,/soul_character_capacity/);
  assert.match(sql,/soul_has_expansion/);
  assert.match(sql,/CHARACTER_SLOT_LIMIT/);
  assert.match(sql,/EXPANSION_LOCKED/);
  assert.doesNotMatch(sql,/ATTRIBUTE_REQUIRED|POWER_REQUIRED|SKILL_REQUIRED|EQUIPMENT_REQUIRED/);
});
