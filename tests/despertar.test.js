import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('js/immersive-experience.js','utf8');
test('Arquivista alterna orientação sem alterar escolhas e identifica a etapa atual',()=>{
 const node=()=>({textContent:'',hidden:false,disabled:false,dataset:{},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}});
 const screen=node(),root=node(),parts=new Map(),buttons=['concept','nature','review'].map(key=>({...node(),dataset:{journey:key}}));
 const c={state:{fast:false,journeyStep:'nature'},$:selector=>selector==='#screen-builder'?screen:selector==='#ms-archivist'?root:(parts.has(selector)?parts.get(selector):(parts.set(selector,node()),parts.get(selector))),$$:()=>buttons};vm.createContext(c);
 const constants=source.slice(source.indexOf('  const ARCHIVIST='),source.indexOf('  function installArchivist'));
 const fn=source.slice(source.indexOf('  function updateArchivist()'),source.indexOf('  function showJourneyReview()'));
 vm.runInContext(constants+fn+';updateArchivist();',c);
 assert.equal(root.hidden,false);assert.equal(buttons[1]['aria-current'],'step');assert.match(parts.get('h3').textContent,/singularidade/);
 c.state.fast=true;vm.runInContext('updateArchivist()',c);assert.equal(root.hidden,true);assert.equal(c.state.journeyStep,'nature');
 c.state.fast=false;c.state.journeyStep='review';vm.runInContext('updateArchivist()',c);assert.equal(parts.get('[data-guide-next]').disabled,true);assert.equal(buttons[1]['aria-current'],undefined);
});

test('favoritos estáveis não reescrevem classes observadas pelo criador',()=>{
 let writes=0;const button={dataset:{},classList:{contains:()=>true,toggle:()=>writes++}},item={dataset:{power:JSON.stringify({favorite:true})}};
 const c={$$:()=>[item],$:()=>button};vm.createContext(c);
 const fn=source.slice(source.indexOf('  function enhancePowerFavorites(){'),source.indexOf('  function guideFor('));
 vm.runInContext(fn+';for(let i=0;i<50;i++)enhancePowerFavorites();',c);assert.equal(writes,0);
});
