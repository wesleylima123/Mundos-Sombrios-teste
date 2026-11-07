import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('V2.1 carrega a camada imersiva sem substituir os módulos consolidados',()=>{
  const html=read('index.html');
  assert.ok(existsSync(join(root,'js/immersive-experience.js')));
  assert.ok(existsSync(join(root,'css/immersive-experience.css')));
  const loader=read('js/feature-loader.js');
  assert.doesNotMatch(html,/css\/immersive-experience\.css/);
  assert.doesNotMatch(html,/js\/immersive-experience\.js/);
  assert.match(loader,/css\/immersive-experience\.css/);
  assert.match(loader,/js\/immersive-experience\.js/);
});

test('Portal oferece os quatro acessos primários da experiência',()=>{
  const p=read('js/portal/portal-core.js');
  for(const label of ['Conhecer os Mundos','Criar Personagem','Consultar Regras','Acessar Mesas']) assert.match(p,new RegExp(label));
  assert.match(p,/data-act="create"/);
  assert.match(p,/act==='create'/);
});

test('Forja V2.1 possui jornada narrativa, preview vivo e modos criar/evoluir/jogar',()=>{
  const js=read('js/immersive-experience.js');
  for(const token of ['ms-builder-journey','ms-character-live-preview','data-builder-mode="create"','data-builder-mode="evolve"','data-builder-mode="play"','ms-play-hud']) assert.match(js,new RegExp(token));
  for(const step of ['concept','nature','class','stats','skills','powers','equipment','review']) assert.ok(js.includes(`[\'${step}\'`) || js.includes(`,'${step}'`),step);
});

test('Todos os 31 arquétipos têm orientação de decisão na camada imersiva',()=>{
  const js=read('js/immersive-experience.js');
  const names=[
    'Nexo Padrão (Livro Base)','Arquiteto de Linhagem (Aprimorador)','Operador de Sistema (Proj. Player)','Classer (Linhagem Herdada)',
    'Agente de Carreira (Ocultatun)','Agente Designado (Ocultatun)','O Envolto (Horror Cósmico)','A Ordem dos Sete (Alta Glória)',
    'Combatente','Especialista','Sobrevivente','Engenheiro Biológico','IA Virtudes','IA Domínios','IA Principados','Velocitus Bellator','Aeternus Vitalis','Mentis Aurorae',
    'Mercador da Morte','Carrasco Cinzento','Alquerino','Taumatúrgico','Hermético','Esotérico','O Arauto','O Tocado','O Condenado','Inquisidor (A Lança)','Intérprete (Os Olhos)','Sentinela (A Parede)','Juízo (A Voz)'
  ];
  for(const name of names) assert.ok(js.includes(`'${name}':{`),name);
  for(const field of ['COMO JOGA','COMPLEXIDADE','Você será bom em','Você terá dificuldade com','Combina bem com','Evite se','Exemplo']) assert.match(js,new RegExp(field));
});

test('A interface reage a consequências e explica a composição das regras',()=>{
  const js=read('js/immersive-experience.js'),css=read('css/immersive-experience.css');
  for(const token of ['dataset.assimilation','dataset.corruption','dataset.recordation','resourceFormula','showAttributeRule','ms-rule-modal']) assert.ok(js.includes(token),token);
  assert.match(css,/data-assimilation="critical"/);
  assert.match(css,/data-recordation="transcendent"/);
});

test('Experiência inclui níveis visuais, áudio opcional, favoritos e memória de evolução',()=>{
  const js=read('js/immersive-experience.js');
  for(const token of ['functional','immersive','cinematic','ms-audio-toggle','AudioContext','favorite','ms-evolution-progress','ms-evolution-summary']) assert.match(js,new RegExp(token));
  assert.doesNotMatch(js,/autoplay/i);
});
