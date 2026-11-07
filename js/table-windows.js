/* Posição e tamanho de chat/dados pertencem a este gerenciador, não às telas. */
(function(){
'use strict';
const entries=new Map();let scope='',saved={},serial=19000;
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
function bounds(){return window.MS_TABLE_SHELL?.workspaceBounds?.()||{left:8,top:60,right:innerWidth-8,bottom:innerHeight-8,width:innerWidth-16,height:innerHeight-68};}
function constrain(rect,area=bounds()){
 const width=Math.max(1,Math.min(Math.max(180,finite(rect.width,310)),area.width)),height=Math.max(1,Math.min(Math.max(52,finite(rect.height,250)),area.height));
 return {x:Math.max(area.left,Math.min(finite(rect.x,area.left),area.right-width)),y:Math.max(area.top,Math.min(finite(rect.y,area.top),area.bottom-height)),width,height,collapsed:!!rect.collapsed};
}
function persist(){if(!scope)return;try{localStorage.setItem('ms-room-icons-v1:'+scope,JSON.stringify(saved));}catch(_){}}
function defaults(index){const b=bounds(),small=b.width<700,width=small?Math.max(180,(b.width-12)/2):310,height=Math.min(small?360:440,b.height);return constrain({width,height,x:small?b.left+index*(width+8):b.right-(index+1)*(width+12),y:b.bottom-height-8,collapsed:true},b);}
function placeIcon(entry,x,y){const b=bounds(),size=64;entry.iconPosition={x:Math.max(b.left,Math.min(finite(x,b.right-76),b.right-size)),y:Math.max(b.top,Math.min(finite(y,b.bottom-76),b.bottom-size))};entry.icon.style.left=entry.iconPosition.x+'px';entry.icon.style.top=entry.iconPosition.y+'px';}
function apply(entry,rect){const p=constrain(rect);entry.rect=p;entry.el.hidden=p.collapsed;for(const [k,v] of Object.entries({left:p.x,top:p.y,width:p.width,height:p.height}))entry.el.style[k]=v+'px';entry.el.classList.toggle('is-collapsed',p.collapsed);entry.el.querySelector('[data-float-collapse]').setAttribute('aria-expanded',String(!p.collapsed));entry.el.querySelector('[data-float-collapse]').textContent='×';entry.icon.setAttribute('aria-expanded',String(!p.collapsed));saved[entry.el.id]={...p,icon:entry.iconPosition};}
function toggle(entry){apply(entry,{...entry.rect,collapsed:!entry.rect.collapsed});entry.el.style.zIndex=String(++serial);persist();if(!entry.rect.collapsed&&entry.index===1)window.MS_FEATURES?.ensureDice?.().catch(()=>{});}
function makeIcon(entry){const icon=document.createElement('button');icon.type='button';icon.className='ms-communication-icon';icon.id=entry.el.id+'-icon';icon.setAttribute('aria-controls',entry.el.id);icon.setAttribute('aria-label',entry.index?'Abrir ou recolher dados':'Abrir ou recolher chat');icon.title=(entry.index?'Dados':'Chat')+' · Clique para abrir/recolher · Arraste ou use Alt + setas';icon.innerHTML=entry.index?'<span aria-hidden="true">◇</span><small>DADOS</small>':'<span aria-hidden="true">▤</span><small>CHAT</small>';document.getElementById('ms-room-communications').appendChild(icon);entry.icon=icon;
 let drag=null,suppress=false;icon.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:entry.iconPosition.x,top:entry.iconPosition.y,moved:false};suppress=false;icon.setPointerCapture?.(e.pointerId);});
 icon.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){placeIcon(entry,drag.left+dx,drag.top+dy);saved[entry.el.id]={...entry.rect,icon:entry.iconPosition};e.preventDefault();}});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;suppress=drag.moved;drag=null;persist();};icon.addEventListener('pointerup',end);icon.addEventListener('pointercancel',end);
 icon.addEventListener('click',()=>{if(suppress){suppress=false;return;}toggle(entry);});
 icon.addEventListener('keydown',e=>{const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!e.altKey||!d)return;e.preventDefault();placeIcon(entry,entry.iconPosition.x+d[0],entry.iconPosition.y+d[1]);saved[entry.el.id]={...entry.rect,icon:entry.iconPosition};persist();});
}
function capture(entry){if(!scope||entry.el.offsetWidth===0)return;const r=entry.el.getBoundingClientRect();apply(entry,{...entry.rect,x:r.left,y:r.top,width:r.width,height:entry.rect.collapsed?entry.rect.height:r.height});persist();}
function bind(el,index){if(entries.has(el.id))return;const entry={el,index,rect:defaults(index)};entries.set(el.id,entry);makeIcon(entry);const grip=el.querySelector('.ms-float-grip');let drag=null;
 grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=el.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};grip.setPointerCapture?.(e.pointerId);el.style.zIndex=String(++serial);e.preventDefault();});
 grip.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;apply(entry,{...entry.rect,x:drag.left+e.clientX-drag.x,y:drag.top+e.clientY-drag.y});e.preventDefault();});
 const stop=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;persist();};grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);
 grip.addEventListener('keydown',e=>{const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!e.altKey||!d)return;e.preventDefault();apply(entry,{...entry.rect,x:entry.rect.x+d[0],y:entry.rect.y+d[1]});persist();});
 el.querySelector('[data-float-collapse]').addEventListener('click',()=>{toggle(entry);entry.icon.focus();});
 el.addEventListener('pointerdown',()=>el.style.zIndex=String(++serial));
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>capture(entry)).observe(el);
}
function mount(table){const next=String(window.currentUser?.id||'guest')+':'+String(table?.id||'draft');if(scope!==next){scope=next;try{saved=JSON.parse(localStorage.getItem('ms-room-icons-v1:'+scope)||'{}');}catch(_){saved={};}if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};}
 ['vtt-chat-box','vtt-dice-box'].forEach((id,i)=>{const el=document.getElementById(id);if(!el)return;bind(el,i);const entry=entries.get(id),value=saved[id]||defaults(i),b=bounds();placeIcon(entry,value.icon?.x??b.right-80-i*76,value.icon?.y??b.bottom-80);apply(entry,value);});
}
function reflow(){if(!scope)return;for(const entry of entries.values()){placeIcon(entry,entry.iconPosition.x,entry.iconPosition.y);apply(entry,entry.rect);}}
function restore(){for(const entry of entries.values()){const b=bounds();placeIcon(entry,b.right-80-entry.index*76,b.bottom-80);apply(entry,defaults(entry.index));}persist();}
function expand(id){const e=entries.get(id);if(!e)return;apply(e,{...e.rect,collapsed:false});e.el.style.zIndex=String(++serial);persist();}
function reset(){persist();scope='';saved={};}
window.MS_TABLE_WINDOWS=Object.freeze({mount,reflow,restore,expand,reset,constrain});
})();
