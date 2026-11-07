/* Mundos Sombrios — Table Session Engine v3 / V2.7
 * Autoridade de ciclo de vida do cliente: conecta primeiro, recupera eventos por ID,
 * normaliza estado e mantém telemetria/reconexão observável.
 */
(function(){
  'use strict';
  const platform=()=>window.MS_PLATFORM;
  const services=()=>window.MS_SERVICES;
  const realtime=()=>window.MS_REALTIME;
  const DEFAULT_STATE=Object.freeze({schemaVersion:3,scene:{},grid:{},controls:{chatLocked:false,npcHealthPublic:true,paused:false},gallery:[],chat:[],dice:[],initiative:{active:false,round:0,turn:0,order:[]}});
  const state={tableId:null,status:'idle',lastEventId:0,pending:0,reconnects:0,lastError:null,connectedAt:null,lastEventAt:null,seen:new Set(),handler:null,stop:null,reconnectTimer:null,presenceTimer:null,bootstrapping:false,buffer:[]};
  function clone(v){return JSON.parse(JSON.stringify(v));}

  function stopPresenceHeartbeat(){if(state.presenceTimer&&typeof globalThis.clearInterval==='function')globalThis.clearInterval(state.presenceTimer);state.presenceTimer=null;}
  function touchPresence(online=true){
    const id=state.tableId;if(!id||id==='draft'||!services()?.Games?.touchPresence)return Promise.resolve(false);
    return Promise.resolve(services().Games.touchPresence(id,online)).catch(error=>{console.warn('[Mundos Sombrios] heartbeat de presença indisponível:',error?.message||error);return false;});
  }
  function startPresenceHeartbeat(){stopPresenceHeartbeat();touchPresence(true);if(typeof globalThis.setInterval==='function')state.presenceTimer=globalThis.setInterval(()=>touchPresence(true),20000);}
  function normalize(raw){
    const src=raw&&typeof raw==='object'?clone(raw):{};
    return {
      ...clone(DEFAULT_STATE),...src,
      schemaVersion:3,
      scene:src.scene&&typeof src.scene==='object'?src.scene:{},
      grid:src.grid&&typeof src.grid==='object'?src.grid:{},
      controls:{...DEFAULT_STATE.controls,...(src.controls||{}),chatLocked:typeof src.chatLocked==='boolean'?src.chatLocked:(src.controls?.chatLocked??false)},
      gallery:Array.isArray(src.gallery)?src.gallery:[],chat:Array.isArray(src.chat)?src.chat:[],dice:Array.isArray(src.dice)?src.dice:[],
      initiative:{...DEFAULT_STATE.initiative,...(src.initiative||{}),order:Array.isArray(src.initiative?.order)?src.initiative.order:[]}
    };
  }
  // Consultas são somente leitura: renderizadores também consultam dentro de eventos de saúde.
  function snapshot(extra={}){
    return {tableId:state.tableId,status:state.status,lastEventId:state.lastEventId,pending:state.pending,reconnects:state.reconnects,lastError:state.lastError?String(state.lastError.message||state.lastError):null,connectedAt:state.connectedAt,lastEventAt:state.lastEventAt,presence:clone(realtime()?.current?.().presence||{}),...extra};
  }
  function health(extra={}){
    const payload=snapshot(extra);
    platform()?.emit('table:session-health',payload); return payload;
  }
  function remember(event){
    const id=Number(event?.id||0); if(id){if(state.seen.has(id))return false;state.seen.add(id);state.lastEventId=Math.max(state.lastEventId,id);if(state.seen.size>1000){const keep=[...state.seen].sort((a,b)=>b-a).slice(0,500);state.seen=new Set(keep);}}
    state.lastEventAt=event?.created_at||new Date().toISOString(); return true;
  }
  function deliver(event){if(!event)return;if(state.bootstrapping){state.buffer.push(event);return;}if(!remember(event))return;try{state.handler?.(event);}catch(error){console.warn('[Mundos Sombrios] evento de mesa rejeitado pelo consumidor:',error);}health();}
  async function catchUp(){
    if(!state.tableId)return [];
    const result=await window.MS_DB.fetchTableEventsAfter(state.tableId,state.lastEventId,500);
    if(result?.error)throw result.error;
    const rows=(result?.data||[]).slice().sort((a,b)=>Number(a.id)-Number(b.id));rows.forEach(deliver);return rows;
  }
  async function connect(tableId,handler){
    await disconnect(); const id=String(tableId||'').trim(); if(!id||id==='draft')return {state:normalize(null),events:[]};
    state.tableId=id;state.handler=handler;state.status='connecting';state.lastError=null;state.lastEventId=0;state.seen.clear();state.bootstrapping=true;state.buffer=[];health();
    const onStatus=status=>{
      if(status==='SUBSCRIBED'){state.status='connected';state.connectedAt=new Date().toISOString();startPresenceHeartbeat();health();return;}
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)&&state.tableId){state.status='offline';state.lastError=new Error(`Realtime ${status}`);health();scheduleReconnect();}
    };
    try{
      // Inscreve PRIMEIRO. Eventos recebidos durante o bootstrap ficam no buffer.
      state.stop=await realtime().connect(id,deliver,{status:onStatus});
      const [remoteState,events]=await Promise.all([services().VTT.state(id),window.MS_DB.fetchTableEventsAfter(id,0,500)]);
      const normalized=normalize(remoteState?.data!==undefined?remoteState.data:remoteState);
      const rows=(events?.data||[]).slice().sort((a,b)=>Number(a.id)-Number(b.id));
      // Histórico é devolvido ao consumidor para reconstrução determinística, sem disparar efeitos visuais antigos.
      rows.forEach(remember);
      state.bootstrapping=false;
      const buffered=state.buffer.splice(0).sort((a,b)=>Number(a?.id||0)-Number(b?.id||0));buffered.forEach(deliver);
      state.status='synced';health({bootstrapEvents:rows.length,bufferedEvents:buffered.length});return {state:normalized,events:rows};
    }catch(error){state.bootstrapping=false;state.buffer=[];state.status='offline';state.lastError=error;health();throw error;}
  }
  function scheduleReconnect(){
    if(state.reconnectTimer||!state.tableId)return; const id=state.tableId; const handler=state.handler;
    const delay=Math.min(8000,800*Math.pow(2,Math.min(state.reconnects,4)));
    state.reconnectTimer=setTimeout(async()=>{state.reconnectTimer=null;if(state.tableId!==id)return;state.reconnects++;try{
      try{state.stop?.();}catch(_){} state.stop=await realtime().connect(id,deliver,{status:s=>{if(s==='SUBSCRIBED'){state.status='connected';startPresenceHeartbeat();health();}}});await catchUp();state.status='synced';state.lastError=null;state.handler=handler;health();
    }catch(error){state.status='offline';state.lastError=error;health();scheduleReconnect();}},delay);
  }
  async function send(type,payload){
    if(!state.tableId)throw new Error('Nenhuma mesa conectada.');state.pending++;health();
    try{const event=await services().VTT.event(state.tableId,type,payload,{clientEventId:crypto.randomUUID?.()});if(event?.id)remember(event);return event;}
    catch(error){state.lastError=error;health();throw error;}finally{state.pending=Math.max(0,state.pending-1);health();}
  }
  async function broadcastTransient(type,payload){
    if(!state.tableId)throw new Error('Nenhuma mesa conectada.');
    if(String(type)==='grid_preview'&&!window.__msVttIsGM)throw new Error('GM_REQUIRED');
    if(!window.MS_DB?.broadcastTableEvent)throw new Error('Canal efêmero indisponível.');
    return window.MS_DB.broadcastTableEvent(state.tableId,String(type),payload||{}, { transient:true });
  }
  async function disconnect(){
    if(state.reconnectTimer){clearTimeout(state.reconnectTimer);state.reconnectTimer=null;}stopPresenceHeartbeat();
    const leavingId=state.tableId;
    if(leavingId){try{await touchPresence(false);}catch(_){}}
    try{state.stop?.();}catch(_){}try{realtime()?.disconnect?.();}catch(_){}
    state.stop=null;state.tableId=null;state.handler=null;state.status='idle';state.connectedAt=null;state.lastEventId=0;state.bootstrapping=false;state.buffer=[];state.seen.clear();health();
  }
  function current(){return snapshot();}
  window.MS_TABLE_SESSION=Object.freeze({version:'3.2',connect,disconnect,send,broadcastTransient,catchUp,normalizeState:normalize,current,DEFAULT_STATE:clone(DEFAULT_STATE)});
})();
