/* Pontos de evolução: um único formulário para os serviços já existentes. */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context=()=>window.msGetCurrentTableContext?.()||{};
const unwrap=v=>v?.data!==undefined?v.data:v;
let active=null;
function canManage(tableId){const c=context();return !!tableId&&String(c.table?.id)===String(tableId)&&(c.asGM||window.currentUser?.role==='admin');}
function reversible(state,characterId){const rows=state?.recentTransactions||state?.transactions||[];const reversed=new Set(rows.filter(t=>t.tx_type==='CHARACTER_GRANT_REVERSAL').map(t=>String(t.reference_id)));return rows.filter(t=>t.tx_type==='CHARACTER_GRANT'&&(!characterId||String(t.character_id)===String(characterId))&&!reversed.has(String(t.id))&&!t.reversed_at);}
function preview(action,amount,state,characterId){
 const reserve=Number(state?.wallet?.balance||0),balance=Number((state?.accounts||[]).find(a=>String(a.character_id)===String(characterId))?.balance||0),rate=Number(state?.config?.souldrakma_per_point||state?.config?.soul_cost_per_point||1000);
 if(action==='buy'&&amount>200)return {error:'Compre até 200 PEG por operação.'};
 if(!Number.isSafeInteger(amount)||amount<=0)return {error:'Informe uma quantidade inteira maior que zero.'};
 if(action==='grant'&&amount>reserve)return {error:'A reserva da mesa não tem pontos suficientes.'};
 if(action==='reverse'&&amount>balance)return {error:'Estes pontos já foram utilizados. Não é possível retirar esta concessão integralmente.'};
 return {reserve:reserve+(action==='grant'?-amount:amount),balance:balance+(action==='grant'?amount:action==='reverse'?-amount:0),cost:action==='buy'?amount*rate:0};
}
function errorText(e){const s=e?.message||String(e);const labels={POINTS_ALREADY_SPENT:'Os pontos já foram utilizados. Atualize os saldos antes de tentar novamente.',ALREADY_REVERSED:'Esta concessão já foi retirada.',INSUFFICIENT_FUNDS:'Saldo insuficiente.',GM_REQUIRED:'Somente quem gerencia esta mesa pode movimentar pontos.'};return labels[s]||s;}
async function open(action,options={}){
 if(!['buy','grant','reverse'].includes(action))return null;
 const tableId=options.tableId||context().table?.id;
 if(!canManage(tableId)){window.MS_PLATFORM?.toast?.('Entre na mesa como Mestre para gerenciar os pontos.','error');return null;}
 if(active){active.focus();return null;}
 const dialog=document.createElement('dialog');dialog.className='ms-points-dialog';dialog.setAttribute('aria-label','Gerenciar pontos de evolução');dialog.innerHTML='<p role="status">Consultando os saldos da mesa…</p>';document.body.appendChild(dialog);active=dialog;
 const previous=document.activeElement;let busy=false;
 return new Promise(resolve=>{
  const finish=value=>{if(active!==dialog)return;active=null;dialog.close?.();dialog.remove();previous?.focus?.();resolve(value);};
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)finish(null);});
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
  (async()=>{try{
   const service=window.MS_SERVICES.Progression,state=unwrap(await service.state(tableId))||{};
   if(active!==dialog)return;
   const characterId=options.characterId,name=options.name||'Personagem',titles={buy:'Abastecer a reserva',grant:'Conceder pontos',reverse:'Retirar pontos'};
   const grants=reversible(state,characterId),initial=grants.find(t=>String(t.id)===String(options.transactionId))||grants[0];
   dialog.innerHTML=`<form><header><div><small>EVOLUÇÃO · ${esc(context().table?.name||'MESA')}</small><h2>${titles[action]}</h2></div><button type="button" data-cancel aria-label="Fechar">×</button></header><p>${action==='buy'?'Compre PEG com SoulDrakma. Os pontos ficam na reserva até serem concedidos a um personagem.':action==='grant'?`Transfira pontos da reserva para <strong>${esc(name)}</strong>. Isso não aumenta atributos ou graduações automaticamente.`:'Devolva à reserva os pontos de uma concessão anterior. A retirada é integral e só é permitida se o personagem ainda tiver saldo suficiente.'}</p><div class="ms-points-balances"><span>Reserva da mesa <b>${Number(state.wallet?.balance||0)} PEG</b></span>${action!=='buy'?`<span>Destino <b>${esc(name)}</b></span>`:''}</div>${action==='reverse'?`<label>Concessão a retirar<select name="grant" ${grants.length?'':'disabled'}>${grants.map(t=>`<option value="${esc(t.id)}" ${t===initial?'selected':''}>${Number(t.amount)} PEG · ${esc(t.reason||'Sem motivo')} · ${esc(t.created_at?new Date(t.created_at).toLocaleDateString('pt-BR'):'')}</option>`).join('')}</select></label>${grants.length?'':'<p>Nenhuma concessão reversível foi encontrada no histórico disponível.</p>'}`:`<label>Quantidade de pontos (PEG)<input name="amount" type="number" min="1" step="1" max="${action==='buy'?200:Number(state.wallet?.balance||0)}" value="${Math.max(1,Math.min(action==='buy'?200:Number(state.wallet?.balance||0)||1,Number(options.amount)||3))}" required></label>`}${action!=='buy'?'<label>Motivo<textarea name="reason" required maxlength="500" placeholder="Ex.: recompensa pela sessão ou correção de uma concessão."></textarea></label>':''}<output class="ms-points-preview" aria-live="polite"></output><p role="alert" data-error></p><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">${action==='buy'?'Confirmar compra':action==='grant'?'Confirmar concessão':'Confirmar retirada'}</button></footer></form>`;
   const form=dialog.querySelector('form'),submit=form.querySelector('[type=submit]'),output=form.querySelector('output'),error=form.querySelector('[data-error]');
   const selected=()=>grants.find(t=>String(t.id)===form.elements.grant?.value);
   const values=()=>{const tx=selected();return {amount:action==='reverse'?Number(tx?.amount||0):Number(form.elements.amount.value),char:action==='reverse'?tx?.character_id:characterId,tx};};
   const update=()=>{const v=values(),p=preview(action,v.amount,state,v.char);submit.disabled=busy||!!p.error||(!grants.length&&action==='reverse');output.textContent=p.error||`${action==='buy'?`Custo: ${p.cost.toLocaleString('pt-BR')} SoulDrakma. `:''}Reserva após confirmar: ${p.reserve} PEG.${action!=='buy'?` Saldo do personagem após confirmar: ${p.balance} PEG.`:''}`;};
   form.addEventListener('input',update);form.addEventListener('change',update);dialog.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{if(!busy)finish(null);});update();
   form.onsubmit=async e=>{e.preventDefault();if(busy||!form.reportValidity())return;const v=values();if(preview(action,v.amount,state,v.char).error)return;
    if(!canManage(tableId)){error.textContent='A mesa ativa mudou. Feche e abra novamente.';return;}
    const reason=form.elements.reason?.value.trim()||'';if(action!=='buy'&&!reason){error.textContent='Informe o motivo.';return;}
    busy=true;submit.disabled=true;error.textContent='';dialog.setAttribute('aria-busy','true');
    try{let result;if(action==='buy')result=await service.buy(tableId,v.amount);else if(action==='grant')result=await service.grant(tableId,characterId,v.amount,reason);else result=await service.reverseGrant(Number(v.tx.id),reason);
     window.MS_PLATFORM?.emit?.('progression:points-changed',{tableId,characterId:v.char});window.MS_PLATFORM?.toast?.(action==='buy'?'Reserva abastecida.':action==='grant'?'Pontos concedidos.':'Pontos devolvidos à reserva.','success');finish({result,amount:v.amount,reason});
    }catch(e){error.textContent=errorText(e);busy=false;dialog.removeAttribute('aria-busy');update();}
   };
   form.querySelector('input,select,textarea')?.focus();
  }catch(e){if(active!==dialog)return;dialog.innerHTML=`<p role="alert">${esc(errorText(e))}</p><button>Fechar</button>`;dialog.querySelector('button').onclick=()=>finish(null);}})();
 });
}
window.MS_POINTS=Object.freeze({open,preview,reversible,canManage});
})();
