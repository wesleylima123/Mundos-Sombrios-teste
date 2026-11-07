import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function node(id=''){
 const events={},queries=new Map(),classes=new Set(),attributes={};
 return {id,events,attributes,style:{},dataset:{},hidden:false,offsetWidth:310,offsetHeight:260,innerHTML:'',textContent:'',value:'',
 classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},contains:x=>classes.has(x),toggle(x,state){if(state??!classes.has(x))classes.add(x);else classes.delete(x);}},
 setAttribute(k,v){attributes[k]=v;},toggleAttribute(k,v){attributes[k]=v;},addEventListener(k,fn){(events[k]??=[]).push(fn);},
 fire(k,e={}){for(const fn of events[k]||[])fn({button:0,pointerId:1,clientX:300,clientY:400,preventDefault(){},...e});},focus(){this.focused=true;},setPointerCapture(){},
 querySelector(k){if(!queries.has(k))queries.set(k,node());return queries.get(k);},querySelectorAll:()=>[],children:[],appendChild(child){this.children.push(child);},replaceChildren(){this.innerHTML='';},
 getBoundingClientRect(){return {left:parseFloat(this.style.left)||0,top:parseFloat(this.style.top)||0,width:parseFloat(this.style.width)||310,height:parseFloat(this.style.height)||260,right:(parseFloat(this.style.left)||0)+(parseFloat(this.style.width)||310),bottom:(parseFloat(this.style.top)||0)+(parseFloat(this.style.height)||260)};}};
}
function runtime(){
 const ids=new Map(),handlers={};const c={console,innerWidth:1280,innerHeight:800,setTimeout,clearTimeout,requestAnimationFrame(){},addEventListener(){},currentUser:{id:'gm',username:'Mestre'},document:{readyState:'loading',body:node('body'),getElementById:id=>ids.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>node(),addEventListener(){}},MS_PLATFORM:{on:(name,fn)=>handlers[name]=fn,toast(){}},MS_FEATURES:{ensureOperational:async()=>{}},MS_OPERATIONAL_CONTROL:{mountEvolutionWorkspace:async()=>{}},msResizeVttGrid(){},initVttGrid:async()=>true};c.window=c;vm.createContext(c);return {c,ids,handlers};
}
function room(){const r=runtime(),panels=['salon','grid','peg'].map(name=>{const el=node(name);el.dataset.roomWindow=name;return el;}),buttons=['salon','grid','peg'].map(name=>{const el=node();el.dataset.roomOpen=name;return el;});
 for(const id of ['screen-vtt','ms-table-room','vtt-table-name','ms-room-peg-content','vtt-chat-box','vtt-dice-box'])r.ids.set(id,node(id));
 r.c.document.querySelectorAll=s=>s==='[data-room-window]'?panels:s==='[data-room-open]'?buttons:[];
 vm.runInContext(read('js/table-room.js'),r.c);return {...r,panels,buttons};
}
test('somente uma janela principal é exibida, preservando chat e dados',async()=>{
 const r=room(),chat=r.ids.get('vtt-chat-box'),dice=r.ids.get('vtt-dice-box');chat.value='Mensagem em digitação';dice.textContent='Resultado: 17';
 for(const next of ['salon','grid','peg','salon']){await r.c.MS_TABLE_SHELL.openWindow(next);assert.deepEqual(r.panels.filter(x=>!x.hidden).map(x=>x.dataset.roomWindow),[next]);assert.equal(r.buttons.find(x=>x.dataset.roomOpen===next).attributes['aria-pressed'],'true');}
 assert.equal(chat.value,'Mensagem em digitação');assert.equal(dice.textContent,'Resultado: 17');assert.equal(chat.hidden,false);assert.equal(dice.hidden,false);
});
test('cada entrada na Mesa abre pelo Salão',async()=>{
 const r=room();await r.c.MS_TABLE_SHELL.openWindow('grid');r.c.MS_TABLE_SHELL.mount({id:'t1',name:'Teste'},true);assert.equal(r.c.MS_TABLE_SHELL.getActiveWindow(),'salon');assert.equal(r.panels[0].hidden,false);
});
test('trocar de janela não reinicializa o canvas nem restaura o mapa salvo repetidamente',async()=>{
 const r=room();let calls=0;r.c.initVttGrid=async()=>{calls++;return true;};
 await r.c.MS_TABLE_SHELL.openWindow('grid');await r.c.MS_TABLE_SHELL.openWindow('salon');await r.c.MS_TABLE_SHELL.openWindow('grid');assert.equal(calls,1);
});
test('PEG carregado com atraso não toma o lugar da janela escolhida depois',async()=>{
 const r=room();let release,mounts=0;r.c.MS_FEATURES.ensureOperational=()=>new Promise(resolve=>release=resolve);r.c.MS_OPERATIONAL_CONTROL.mountEvolutionWorkspace=async()=>mounts++;
 const pending=r.c.MS_TABLE_SHELL.openWindow('peg');await r.c.MS_TABLE_SHELL.openWindow('salon');release();await pending;assert.equal(mounts,0);assert.equal(r.panels[0].hidden,false);
});
test('restaurar janelas não muda a janela principal nem os dados da sessão',async()=>{
 const r=room(),calls=[];r.c.MS_TABLE_WINDOWS={restore:()=>calls.push('communication')};r.c.MS_TABLE_SHEETS={restore:()=>calls.push('miniatures')};await r.c.MS_TABLE_SHELL.openWindow('grid');r.c.MS_TABLE_SHELL.restoreWindows();assert.equal(r.c.MS_TABLE_SHELL.getActiveWindow(),'grid');assert.deepEqual(calls,['communication','miniatures']);
});
function floats(){const r=runtime(),mem=new Map();let table='a';r.c.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};r.c.MS_TABLE_SHELL={workspaceBounds:()=>({left:0,top:120,right:1280,bottom:800,width:1280,height:680})};for(const id of ['vtt-chat-box','vtt-dice-box','ms-room-communications'])r.ids.set(id,node(id));vm.runInContext(read('js/table-windows.js'),r.c);return {...r,mem};}
test('chat e dados aceitam arraste, teclado e recolhimento com um único listener por janela',()=>{
 const r=floats();r.c.MS_TABLE_WINDOWS.mount({id:'t1'});r.c.MS_TABLE_WINDOWS.mount({id:'t1'});r.c.MS_TABLE_WINDOWS.expand('vtt-chat-box');const chat=r.ids.get('vtt-chat-box'),grip=chat.querySelector('.ms-float-grip'),button=chat.querySelector('[data-float-collapse]');
 assert.equal(grip.events.pointerdown.length,1);const left=parseFloat(chat.style.left);grip.fire('pointerdown');grip.fire('pointermove',{clientX:250,clientY:350});grip.fire('pointerup');assert.equal(parseFloat(chat.style.left),left-50);
 grip.fire('keydown',{altKey:true,key:'ArrowLeft'});assert.equal(parseFloat(chat.style.left),left-70);
 button.fire('click');assert.equal(button.attributes['aria-expanded'],'false');assert.equal(chat.hidden,true);button.fire('click');assert.equal(button.attributes['aria-expanded'],'true');assert.equal(chat.hidden,false);assert.equal(chat.style.height,'440px');
});
test('posições persistem por conta e mesa, sem transferir configuração entre mesas',()=>{
 const r=floats();r.c.MS_TABLE_WINDOWS.mount({id:'a'});const chat=r.ids.get('vtt-chat-box');chat.querySelector('.ms-float-grip').fire('keydown',{altKey:true,key:'ArrowLeft'});const x=chat.style.left;r.c.MS_TABLE_WINDOWS.mount({id:'b'});assert.notEqual(chat.style.left,x);r.c.MS_TABLE_WINDOWS.mount({id:'a'});assert.equal(chat.style.left,x);assert.ok(r.mem.has('ms-room-icons-v1:gm:a'));
});
test('janelas são recuperáveis em telas pequenas e coordenadas inválidas',()=>{
 const r=floats();for(const width of [320,390,700,1024,1920]){const area={left:0,top:140,right:width,bottom:780,width,height:640};for(const rect of [{x:-999,y:-20,width:600,height:900},{x:9999,y:9999,width:310,height:260},{x:NaN,y:Infinity,width:NaN,height:NaN}]){const p=r.c.MS_TABLE_WINDOWS.constrain(rect,area);assert.ok(p.x>=0&&p.y>=140);assert.ok(p.x+p.width<=width&&p.y+p.height<=780);}}
});
test('Salão mantém duas alas de cinco sem descartar participantes adicionais',()=>{
 const r=runtime();vm.runInContext(read('js/table-sheets.js'),r.c);for(const n of [0,1,5,10,11,23]){const players=Array.from({length:n},(_,i)=>({id:String(i)})),pages=r.c.MS_TABLE_SHEETS.formationSlots(players);assert.ok(pages.every(x=>x.length===10));assert.equal(pages.flat().filter(Boolean).length,n);assert.equal(pages.flat().filter(Boolean).map(x=>x.id).join(','),players.map(x=>x.id).join(','));}
});
test('árvore publicada não contém o shell, os cards e o painel PEG antigos',()=>{
 assert.equal(fs.existsSync(new URL('../js/table-shell-v3.js',import.meta.url)),false);assert.equal(fs.existsSync(new URL('../css/table-shell-v3.css',import.meta.url)),false);
 for(const file of ['index.html','js/script.js','js/table-room.js','js/table-sheets.js','js/progression-v2.8.9.js','css/table-room.css','css/table-sheets.css','css/style.css'])assert.doesNotMatch(read(file),/ms-table-v3|vtt-cards-container|vtt-active-cards-container|ms-progression-panel|ms-evolution-orb|ms-participant-window/,file);
});

test('entrada com participantes conecta sem recursão entre presença, Salão e saúde da sessão',async()=>{
 const r=runtime(),ready=[],events=[];let depth=0,reads=0;
 for(const id of ['ms-table-room','ms-lobby-cards','ms-lobby-count','chat-input'])r.ids.set(id,node(id));
 r.c.document.addEventListener=(event,fn)=>{if(event==='DOMContentLoaded')ready.push(fn);};
 r.c.msGetCurrentTableContext=()=>({table:{id:'mesa-regressao'},asGM:true,players:[{id:'p1',name:'Alma',userId:'jogador-1'},{id:'p2',name:'Outra alma',userId:'jogador-2'}]});
 r.c.MS_PLATFORM.emit=(event,payload)=>{events.push(event);if(++depth>20)throw new Error('Ciclo recursivo table:session-health → renderLobby → current');try{r.handlers[event]?.(payload);}finally{depth--;}};
 r.c.MS_REALTIME={current:()=>{reads++;return {presence:{'jogador-1':[{}]}};},disconnect(){},connect:async(id,handler,options)=>{options.status('SUBSCRIBED');return()=>{};}};
 r.c.MS_SERVICES={VTT:{state:async()=>({}),event:async()=>({id:1})}};
 r.c.MS_DB={fetchTableEventsAfter:async()=>({data:[]})};r.c.crypto={randomUUID:()=> 'event-1'};
 for(const file of ['js/table-session-engine.js','js/table-room.js','js/table-sheets.js'])vm.runInContext(read(file),r.c);
 ready[0](); // Liga o consumidor real de saúde do shell; não precisa montar miniaturas.
 await r.c.MS_TABLE_SESSION.connect('mesa-regressao',()=>{});
 assert.equal(r.c.MS_TABLE_SESSION.current().status,'synced');
 assert.match(r.ids.get('ms-lobby-cards').innerHTML,/Conectado/);
 assert.match(r.ids.get('ms-lobby-cards').innerHTML,/Presença não confirmada/);
 const count=events.length;
 for(let i=0;i<10;i++)r.c.MS_TABLE_SHEETS.renderLobby();
 assert.equal(events.length,count,'renderizar participantes não publica saúde novamente');
 await r.c.MS_TABLE_SESSION.send('chat',{message:'Teste'});
 assert.equal(r.c.MS_TABLE_SESSION.current().pending,0);
 await r.c.MS_TABLE_SESSION.disconnect();
 assert.equal(r.c.MS_TABLE_SESSION.current().status,'idle');
 assert.ok(reads<100,'leituras permanecem limitadas durante entrada, renderização, envio e saída');
});

test('consultar a sessão não emite eventos e devolve presença isolada',()=>{
 const r=runtime(),events=[],presence={alice:[{user_id:'alice'}]};
 r.c.MS_PLATFORM.emit=(...args)=>events.push(args);
 r.c.MS_REALTIME={current:()=>({presence})};
 vm.runInContext(read('js/table-session-engine.js'),r.c);
 const snapshot=r.c.MS_TABLE_SESSION.current();snapshot.presence.alice[0].user_id='alterado';
 assert.equal(r.c.MS_TABLE_SESSION.current().presence.alice[0].user_id,'alice');
 assert.equal(events.length,0);
});


test('ícones quadrados alternam janelas e arrastar não aciona clique',()=>{
 const r=floats();r.c.MS_TABLE_WINDOWS.mount({id:'t1'});const icons=r.ids.get('ms-room-communications').children,chat=r.ids.get('vtt-chat-box'),icon=icons[0];
 assert.equal(icons.length,2);assert.equal(chat.hidden,true);icon.fire('click');assert.equal(chat.hidden,false);icon.fire('click');assert.equal(chat.hidden,true);
 const x=parseFloat(icon.style.left);icon.fire('pointerdown');icon.fire('pointermove',{clientX:250,clientY:350});icon.fire('pointerup');icon.fire('click');assert.equal(chat.hidden,true);assert.equal(parseFloat(icon.style.left),x-50);
 icon.fire('click');assert.equal(chat.hidden,false);icon.fire('keydown',{altKey:true,key:'ArrowLeft'});assert.equal(parseFloat(icon.style.left),x-70);
 r.c.MS_TABLE_WINDOWS.mount({id:'t1'});assert.equal(icons.length,2);assert.equal(icon.events.click.length,1);
});

test('presságios são exclusivos do 20 e 1 naturais no D20; d12 tem faces pentagonais',()=>{
 const r=runtime();vm.runInContext(read('js/dice-3d.js'),r.c);const dice=r.c.MS_DICE_3D;
 assert.equal(dice.outcome('d20',20),'ascension');assert.equal(dice.outcome('d20',1),'abyss');assert.equal(dice.outcome('d20',10),null);assert.equal(dice.outcome('d6',1),null);
 for(const type of dice.types){const mesh=dice.meshes[type];assert.equal(mesh.faces.length,Number(type.slice(1)));assert.ok(mesh.faces.every(f=>f.every(i=>mesh.vertices[i].every(Number.isFinite))));}
 assert.ok(dice.meshes.d12.faces.every(f=>f.length===5));
});
