/* Mundos Sombrios — Realtime Orchestrator v0.66
 * Uma assinatura por mesa, com Broadcast privado + Presence.
 * PostgreSQL continua sendo a fonte persistente; Realtime apenas sincroniza a sessão.
 */
(function(){
  'use strict';
  const state={tableId:null, unsubscribe:null, presence:{}};
  const platform=()=>window.MS_PLATFORM;
  const services=()=>window.MS_SERVICES;
  function normalizePresence(raw){
    const merged={};
    Object.entries(raw||{}).forEach(([key, entries])=>{
      const e=Array.isArray(entries)?entries[entries.length-1]:entries;
      if(e) merged[String(e.user_id||key)]={...e,key:String(key)};
    });
    return merged;
  }
  function renderPresence(){
    const host=document.querySelectorAll('[data-ms-table-presence]');
    const values=Object.values(state.presence);
    host.forEach(node=>{
      if(!values.length){ node.innerHTML='<span class="ms-presence-empty">Nenhum participante conectado.</span>'; return; }
      node.innerHTML=values.map(p=>`<span class="ms-presence-chip" title="${platform()?.escapeHtml?.(p.username)||String(p.username||'Jogador')}"><i></i>${platform()?.escapeHtml?.(p.username)||String(p.username||'Jogador')}</span>`).join('');
    });
    platform()?.emit('table:presence', {tableId:state.tableId, users:JSON.parse(JSON.stringify(state.presence))});
  }
  async function connect(tableId, onEvent){
    disconnect();
    const id=String(tableId||'').trim(); if(!id || id==='draft') return ()=>{};
    state.tableId=id;
    platform()?.setStatus('realtime','loading');
    try{
      const stop=await window.MS_DB.subscribeTable(id,{event:onEvent,presence:raw=>{state.presence=normalizePresence(raw);renderPresence();}});
      state.unsubscribe=stop;
      platform()?.setStatus('realtime','success');
      platform()?.emit('table:connected',{tableId:id});
      renderPresence();
      return stop;
    }catch(error){
      platform()?.setStatus('realtime','error',error);
      platform()?.toast(error?.message||'Não foi possível conectar a mesa em tempo real.','error');
      throw error;
    }
  }
  function disconnect(){
    try{state.unsubscribe?.();}catch(_){}
    state.unsubscribe=null; state.tableId=null; state.presence={}; renderPresence();
    platform()?.emit('table:disconnected',{});
  }
  async function send(eventType,payload){
    if(!state.tableId) throw new Error('Nenhuma mesa em tempo real está conectada.');
    return services().VTT.event(state.tableId,eventType,payload);
  }
  function current(){return {tableId:state.tableId,presence:JSON.parse(JSON.stringify(state.presence))};}
  window.MS_REALTIME=Object.freeze({connect,disconnect,send,current});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.tableId) platform()?.emit('table:resume',{tableId:state.tableId});});
})();
