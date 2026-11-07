/* Mundos Sombrios — Soundscape Engine V2.11.2
 * Paisagens sonoras locais em OGG/Opus, mixadas via WebAudio.
 * Desenhado para RPG: loops discretos, crossfade, EQ que preserva diálogo e compressor suave.
 */
(function(){
  'use strict';
  const VERSION='2.11.2';
  const CATALOG_URL='data/grid-architect/soundscapes.json';
  const LEGACY_MAP=Object.freeze({
    storm:'storm',forest_night:'forest_night',
    industrial:'exodo_industrial',
    archive:'ocultatun_archive',occult:'ocultatun_ritual',anomaly:'ocultatun_anomaly',fire:'fire_ruins'
  });
  const state={ctx:null,master:null,highpass:null,dialogueEq:null,compressor:null,decks:[null,null],deckOps:[0,0],buffers:new Map(),catalog:null,catalogPromise:null,customUrl:'',customName:'',preserveDialogue:true,playing:false};
  const clamp=(v,a,b,f)=>{v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):f};
  const normalizeId=id=>LEGACY_MAP[String(id||'')]||String(id||'off');

  async function catalog(){
    if(state.catalog)return state.catalog;
    if(state.catalogPromise)return state.catalogPromise;
    state.catalogPromise=fetch(CATALOG_URL,{cache:'force-cache'}).then(async r=>{
      if(!r.ok)throw new Error(`SOUNDSCAPE_CATALOG_${r.status}`);
      const rows=await r.json();state.catalog=Array.isArray(rows)?rows:[];return state.catalog;
    }).catch(()=>{state.catalog=[];return state.catalog});
    return state.catalogPromise;
  }
  async function itemFor(id){id=normalizeId(id);if(id==='off')return null;if(id==='custom')return{id:'custom',name:state.customName||'Áudio personalizado',file:state.customUrl,defaultVolume:.35};return (await catalog()).find(x=>x.id===id)||null}

  function ensureContext(){
    if(state.ctx&&state.ctx.state!=='closed')return state.ctx;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    const ctx=new AC();
    const master=ctx.createGain(),highpass=ctx.createBiquadFilter(),eq=ctx.createBiquadFilter(),comp=ctx.createDynamicsCompressor();
    highpass.type='highpass';highpass.frequency.value=30;highpass.Q.value=.65;
    eq.type='peaking';eq.frequency.value=2200;eq.Q.value=.7;eq.gain.value=-3.5;if(!state.preserveDialogue)eq.gain.value=0;
    comp.threshold.value=-18;comp.knee.value=18;comp.ratio.value=2.2;comp.attack.value=.025;comp.release.value=.38;
    master.gain.value=.92;
    master.connect(highpass);highpass.connect(eq);eq.connect(comp);comp.connect(ctx.destination);
    Object.assign(state,{ctx,master,highpass,dialogueEq:eq,compressor:comp});
    return ctx;
  }
  async function decode(url){
    if(!url)throw new Error('SOUNDSCAPE_SOURCE_MISSING');
    if(state.buffers.has(url))return state.buffers.get(url);
    const ctx=ensureContext();if(!ctx)throw new Error('WEB_AUDIO_UNAVAILABLE');
    const p=fetch(url,{cache:url.startsWith('blob:')?'no-store':'force-cache'}).then(r=>{if(!r.ok)throw new Error(`SOUNDSCAPE_${r.status}`);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b.slice(0)));
    state.buffers.set(url,p);try{return await p}catch(e){state.buffers.delete(url);throw e}
  }
  function stopDeck(deck,fade=.45){if(!deck)return;const ctx=state.ctx;if(!ctx)return;const now=ctx.currentTime;try{deck.gain.gain.cancelScheduledValues(now);deck.gain.gain.setValueAtTime(Math.max(.0001,deck.gain.gain.value),now);deck.gain.gain.exponentialRampToValueAtTime(.0001,now+fade);deck.source.stop(now+fade+.05)}catch(_){} }
  async function playDeck(index,id,volume){
    const op=++state.deckOps[index];
    id=normalizeId(id);volume=clamp(volume,0,1,.3);const old=state.decks[index];
    if(id==='off'){stopDeck(old);state.decks[index]=null;return false}
    const item=await itemFor(id);if(op!==state.deckOps[index])return false;if(!item?.file){stopDeck(state.decks[index]);state.decks[index]=null;return false}
    const cur=state.decks[index];
    if(cur?.id===id&&cur?.item?.file===item.file){cur.gain.gain.cancelScheduledValues(state.ctx.currentTime);cur.gain.gain.setTargetAtTime(volume,state.ctx.currentTime,.08);return true}
    const buffer=await decode(item.file);if(op!==state.deckOps[index])return false;
    const ctx=ensureContext(),source=ctx.createBufferSource(),gain=ctx.createGain(),prev=state.decks[index];
    source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;gain.gain.value=.0001;source.connect(gain);gain.connect(state.master);
    const now=ctx.currentTime;source.start(now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+1.1);stopDeck(prev,1.05);
    state.decks[index]={id,source,gain,item};return true
  }
  async function start(layers=[]){
    const ctx=ensureContext();if(!ctx)return false;await ctx.resume?.();
    const arr=[layers[0]||{},layers[1]||{}];
    const ok=await Promise.all(arr.map((x,i)=>playDeck(i,x.id||'off',x.volume)));
    state.playing=ok.some(Boolean);return state.playing
  }
  function stop(){state.deckOps=[state.deckOps[0]+1,state.deckOps[1]+1];for(const d of state.decks)stopDeck(d,.35);state.decks=[null,null];state.playing=false;return true}
  function setVolume(index,volume){const d=state.decks[index];if(!d||!state.ctx)return false;d.gain.gain.cancelScheduledValues(state.ctx.currentTime);d.gain.gain.setTargetAtTime(clamp(volume,0,1,.3),state.ctx.currentTime,.06);return true}
  function setMaster(volume){if(!state.master||!state.ctx)return false;state.master.gain.setTargetAtTime(clamp(volume,0,1,.92),state.ctx.currentTime,.08);return true}
  function preserveDialogue(on=true){state.preserveDialogue=!!on;if(state.dialogueEq)state.dialogueEq.gain.setTargetAtTime(on?-3.5:0,state.ctx.currentTime,.08);return state.preserveDialogue}
  function setCustomSource(url,name='Áudio personalizado'){if(state.customUrl&&state.customUrl!==url&&state.customUrl.startsWith('blob:')){try{URL.revokeObjectURL(state.customUrl)}catch(_){}}state.customUrl=String(url||'');state.customName=String(name||'Áudio personalizado');return !!state.customUrl}
  function status(){return{version:VERSION,playing:state.playing,preserveDialogue:state.preserveDialogue,layers:state.decks.map(d=>d?{id:d.id,name:d.item?.name||d.id}:null)}}
  function dispose(){stop();if(state.customUrl?.startsWith('blob:')){try{URL.revokeObjectURL(state.customUrl)}catch(_){}}state.customUrl='';state.buffers.clear();try{state.ctx?.close?.()}catch(_){}state.ctx=null;state.master=null;state.playing=false}

  window.MS_SOUNDSCAPE=Object.freeze({version:VERSION,catalog,itemFor,normalizeId,start,stop,setVolume,setMaster,preserveDialogue,setCustomSource,status,dispose});
  window.MS_PLATFORM?.on?.('vtt:left',dispose);
})();
