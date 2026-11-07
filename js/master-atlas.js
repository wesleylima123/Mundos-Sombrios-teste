/* Mundos Sombrios — Atlas Global do Escudo do Mestre v2.6.0 */
(function(){
  'use strict';

  const SOURCE=window.MS_ATLAS_DATA||{};
  const CAT=SOURCE.categories||{};
  const DEFAULT_POINTS=Array.isArray(SOURCE.points)?SOURCE.points:[];
  const DEFAULT_ECONOMY=SOURCE.economy||{};
  const ORDER=['pro','ant','cinza','crit','ocul','veu'];
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const now=()=>new Date().toISOString();

  const ECON_COMMANDS=Object.freeze({
    AVANCAR_CICLO:{label:'Avançar ciclo',desc:'Aplica oscilações sistêmicas moderadas e avança a simulação em um ciclo.'},
    CRISE_ANT_NEXO:{label:'Crise Ant-Nexo',desc:'Contrai economias do bloco Ant-Nexo e eleva a tensão global.'},
    CRISE_PRO_NEXO:{label:'Crise Pró-Nexo',desc:'Contrai economias do bloco Pró-Nexo e eleva a tensão global.'},
    EMBARGO_GLOBAL:{label:'Embargo global',desc:'Reduz comércio, liquidez e índices cambiais em todas as potências.'},
    RUPTURA_DO_VEU:{label:'Ruptura do Véu',desc:'Choque paranormal sistêmico: estabilidade cai e anomalias disparam.'},
    BOOM_HAKURE:{label:'Boom de Hakuré',desc:'Expansão biotecnológica fortalece Hakuré e o bloco Pró-Nexo.'},
    CHOQUE_VOGLASKOV:{label:'Choque de Voglaskov',desc:'A força militar do Krov valoriza Voglaskov e tensiona o comércio global.'},
    COLAPSO_DF:{label:'Colapso do Dólar Federal',desc:'Choque monetário no padrão-base: EUA enfraquecem e moedas rivais ganham valor relativo.'},
    ESTABILIZAR_MERCADOS:{label:'Estabilizar mercados',desc:'Intervenção coordenada reduz tensão e recompõe comércio e estabilidade.'},
    RESET_ECONOMIA:{label:'Restaurar economia',desc:'Retorna todo o simulador ao estado canônico inicial.'}
  });

  const state={
    host:null,root:null,map:null,points:[],economy:null,markers:new Map(),
    activeCats:Object.fromEntries(ORDER.map(k=>[k,true])),query:'',selectedId:null,
    addMode:false,mounted:false,reviewRequest:null,lastEconomyResponse:'',loadToken:0
  };

  function role(){return String(window.currentUser?.role||'').trim().toLowerCase();}
  function isAdmin(){return role()==='admin';}
  function canAccess(){return role()==='admin'||role()==='mestre';}
  function services(){return window.MS_SERVICES?.Atlas||null;}
  function pointById(id){return state.points.find(p=>String(p.id)===String(id))||null;}
  function category(p){return CAT[p?.cat]||{name:String(p?.cat||'REGISTRO').toUpperCase(),color:'#9aa7b0',symbol:'●'};}
  function marketFor(p){return state.economy?.markets?.[p?.id]||null;}

  function toast(message,type='info'){
    if(window.MS_PLATFORM?.toast){window.MS_PLATFORM.toast(message,type);return;}
    const el=state.root?.querySelector('[data-atlas-toast]');
    if(!el)return;
    el.textContent=message;el.dataset.type=type;el.hidden=false;
    clearTimeout(el._t);el._t=setTimeout(()=>{el.hidden=true;},2600);
  }

  function shell(){
    return `<div class="ms-atlas" data-atlas-root>
      <header class="ms-atlas-head">
        <div><span class="stamp amb">CARTOGRAFIA TÁTICA — COALIZÃO GLOBAL</span><h1 class="vt">Atlas Global</h1><p class="sub">// mapa vivo do cenário · 66 registros canônicos · política, anomalias e economia global</p></div>
        <div class="ms-atlas-head-actions">
          <button type="button" data-atlas-refresh>↻ ATUALIZAR</button>
          <span class="ms-atlas-access">${isAdmin()?'ARCONTE · EDIÇÃO TOTAL':'MESTRE · CONSULTA / SOLICITAÇÃO'}</span>
        </div>
      </header>
      <div class="ms-atlas-layout">
        <aside class="ms-atlas-sidebar">
          <label class="ms-atlas-search"><span>⌕</span><input type="search" data-atlas-search placeholder="buscar local, nação, anomalia..."></label>
          <div class="ms-atlas-filters" data-atlas-filters></div>
          <div class="ms-atlas-list" data-atlas-list></div>
          <div class="ms-atlas-tools" data-atlas-tools></div>
        </aside>
        <section class="ms-atlas-mapstage">
          <div class="ms-atlas-map" data-atlas-map></div>
          <div class="ms-atlas-map-status" data-atlas-map-status>CARREGANDO CARTOGRAFIA…</div>
          <div class="ms-atlas-modehint" data-atlas-modehint hidden>MODO ADICIONAR — clique no mapa para posicionar um novo registro</div>
          <div class="ms-atlas-legend" data-atlas-legend></div>
        </section>
        <aside class="ms-atlas-detail" data-atlas-detail></aside>
      </div>
      <section class="ms-atlas-economy" data-atlas-economy></section>
      <div class="ms-atlas-modal" data-atlas-modal hidden></div>
      <div class="ms-atlas-visit" data-atlas-visit hidden></div>
      <div class="ms-atlas-toast" data-atlas-toast hidden></div>
    </div>`;
  }

  function bindShell(){
    const r=state.root;
    r.querySelector('[data-atlas-search]')?.addEventListener('input',e=>{state.query=String(e.target.value||'').trim().toLowerCase();renderList();renderMarkers();});
    r.querySelector('[data-atlas-filters]')?.addEventListener('click',e=>{
      const b=e.target.closest('[data-cat]');if(!b)return;
      const c=b.dataset.cat;state.activeCats[c]=!state.activeCats[c];renderFilters();renderList();renderMarkers();
    });
    r.querySelector('[data-atlas-list]')?.addEventListener('click',e=>{const b=e.target.closest('[data-point]');if(b)selectPoint(b.dataset.point,true);});
    r.querySelector('[data-atlas-tools]')?.addEventListener('click',onToolClick);
    r.querySelector('[data-atlas-detail]')?.addEventListener('click',onDetailClick);
    r.querySelector('[data-atlas-economy]')?.addEventListener('click',onEconomyClick);
    r.querySelector('[data-atlas-economy]')?.addEventListener('keydown',e=>{if(isAdmin()&&e.key==='Enter'&&e.target.matches('[data-econ-command]')){e.preventDefault();executeEconomyCommand(String(e.target.value||''));}});
    r.querySelector('[data-atlas-refresh]')?.addEventListener('click',()=>reloadRemote(true));
    r.querySelector('[data-atlas-modal]')?.addEventListener('click',onModalClick);
    r.querySelector('[data-atlas-visit]')?.addEventListener('click',e=>{if(e.target.closest('[data-close-visit]')||e.target===r.querySelector('[data-atlas-visit]'))closeVisit();});
    document.removeEventListener('keydown',onKeydown);
    document.addEventListener('keydown',onKeydown);
  }

  function onKeydown(e){
    if(!state.mounted)return;
    if(e.key==='Escape'){closeModal();closeVisit();if(state.addMode)setAddMode(false);}
  }

  function normalizePoints(value){
    if(!Array.isArray(value)||!value.length)return clone(DEFAULT_POINTS);
    const base=new Map(DEFAULT_POINTS.map(p=>[String(p.id),p]));
    return value.map((p,i)=>{
      const fallback=base.get(String(p?.id))||{};
      const merged={...clone(fallback),...(p||{})};
      merged.id=String(merged.id||`atlas-${Date.now()}-${i}`);
      merged.name=String(merged.name||'Registro sem nome');
      merged.cat=CAT[merged.cat]?merged.cat:'cinza';
      merged.lat=merged.lat==null||merged.lat===''?null:Number(merged.lat);
      merged.lng=merged.lng==null||merged.lng===''?null:Number(merged.lng);
      if(!Number.isFinite(merged.lat))merged.lat=null;
      if(!Number.isFinite(merged.lng))merged.lng=null;
      merged.visitable=!!merged.visitable;
      return merged;
    });
  }

  function normalizeEconomy(remote){
    const base=clone(DEFAULT_ECONOMY)||{markets:{},log:[]};
    const value=remote&&typeof remote==='object'?clone(remote):{};
    const next={...base,...value,markets:{...(base.markets||{}),...(value.markets||{})},log:Array.isArray(value.log)?value.log.slice(0,20):[]};
    next.cycle=Math.max(0,Math.round(Number(next.cycle)||100));
    next.tension=clamp(next.tension);next.trade=clamp(next.trade);next.anomaly=clamp(next.anomaly);next.inflation=clamp(next.inflation,0,80);
    state.points.filter(p=>['pro','ant','cinza'].includes(p.cat)).forEach(p=>{
      if(!next.markets[p.id])next.markets[p.id]={stability:p.cat==='cinza'?78:p.cat==='pro'?74:67,market:p.cat==='cinza'?76:p.cat==='pro'?72:69,currencyIndex:100};
      const m=next.markets[p.id];m.stability=clamp(m.stability);m.market=clamp(m.market);m.currencyIndex=clamp(m.currencyIndex,20,220);
    });
    return next;
  }

  async function mount(host){
    if(!host||!canAccess())return;
    const token=++state.loadToken;
    if(state.map){try{state.map.remove();}catch(_){ }state.map=null;}
    state.host=host;host.innerHTML=shell();state.root=host.querySelector('[data-atlas-root]');
    bindShell();state.points=clone(DEFAULT_POINTS);state.economy=normalizeEconomy(null);renderStatic();renderList();renderDetail();renderEconomy();
    const mapStatus=state.root.querySelector('[data-atlas-map-status]');
    try{
      const L=await window.MS_VENDOR?.ensure?.('leaflet');
      if(token!==state.loadToken)return;
      if(!L)throw new Error('Leaflet indisponível.');
      initMap(L);mapStatus.hidden=true;
    }catch(error){
      console.warn('[Atlas] Leaflet:',error);mapStatus.textContent='MAPA INDISPONÍVEL — a lista e os dossiês continuam acessíveis.';mapStatus.dataset.error='1';
    }
    await reloadRemote(false);
    state.mounted=true;
    const pending=window.MS_ATLAS_REVIEW_REQUEST;
    if(pending&&isAdmin()){delete window.MS_ATLAS_REVIEW_REQUEST;setTimeout(()=>reviewRequest(pending),80);}
  }

  function initMap(L){
    const el=state.root.querySelector('[data-atlas-map]');
    state.map=L.map(el,{worldCopyJump:true,minZoom:2,maxZoom:12,zoomControl:true,preferCanvas:true}).setView([20,10],3);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap · © CARTO · Mundos Sombrios',subdomains:'abcd',maxZoom:19}).addTo(state.map);
    state.map.on('click',ev=>{
      if(!state.addMode||!isAdmin())return;
      setAddMode(false);openEdit(null,{lat:+ev.latlng.lat.toFixed(4),lng:+ev.latlng.lng.toFixed(4)});
    });
    renderMarkers();setTimeout(()=>state.map?.invalidateSize(),80);
  }

  function renderStatic(){renderFilters();renderTools();renderLegend();}

  function renderFilters(){
    const el=state.root?.querySelector('[data-atlas-filters]');if(!el)return;
    el.innerHTML=ORDER.map(c=>`<button type="button" class="ms-atlas-chip ${state.activeCats[c]?'on':''}" data-cat="${c}" style="--cat:${CAT[c]?.color||'#999'}">${esc(CAT[c]?.name||c)}</button>`).join('');
  }

  function matches(p){
    if(!state.activeCats[p.cat])return false;
    if(!state.query)return true;
    return `${p.name} ${p.type||''} ${p.desc||''} ${p.meta||''} ${p.country||''} ${p.currency||''}`.toLowerCase().includes(state.query);
  }

  function renderList(){
    const el=state.root?.querySelector('[data-atlas-list]');if(!el)return;
    let html='';
    ORDER.forEach(c=>{
      if(!state.activeCats[c])return;
      const items=state.points.filter(p=>p.cat===c&&matches(p));if(!items.length)return;
      html+=`<div class="ms-atlas-cat-title" style="--cat:${CAT[c]?.color||'#999'}"><span>${esc(CAT[c]?.symbol||'●')} ${esc(CAT[c]?.name||c)}</span><b>${items.length}</b></div>`;
      html+=items.map(p=>`<button type="button" data-point="${esc(p.id)}" class="ms-atlas-entry ${state.selectedId===p.id?'active':''}" style="--cat:${CAT[c]?.color||'#999'}"><span class="ms-atlas-entry-name">${esc(p.name)}</span><small>${esc(p.type||'REGISTRO')}${p.lat==null?' · ◈ fora do plano físico':''}</small>${p.art&&p.visitable?'<em>VISITÁVEL</em>':''}</button>`).join('');
    });
    el.innerHTML=html||'<div class="ms-atlas-empty">&gt; nenhum registro encontrado</div>';
  }

  function renderTools(){
    const el=state.root?.querySelector('[data-atlas-tools]');if(!el)return;
    if(isAdmin()){
      el.innerHTML=`<button type="button" data-tool="add" class="${state.addMode?'active':''}">＋ ADICIONAR</button><button type="button" data-tool="export">⇩ EXPORTAR</button><button type="button" data-tool="import">⇧ IMPORTAR</button><button type="button" data-tool="reset" class="danger">↺ RESTAURAR</button><input type="file" data-atlas-import accept=".json,application/json" hidden>`;
      el.querySelector('[data-atlas-import]')?.addEventListener('change',importJSON);
    }else{
      el.innerHTML='<div class="ms-atlas-readonly">MODO MESTRE<br><small>Consulte o Atlas e solicite alterações ao ADM.</small></div>';
    }
  }

  function renderLegend(){
    const el=state.root?.querySelector('[data-atlas-legend]');if(!el)return;
    el.innerHTML=ORDER.map(c=>`<span><i style="--cat:${CAT[c]?.color||'#999'}"></i>${esc(CAT[c]?.name||c)}</span>`).join('');
  }

  function markerIcon(p){
    const L=window.L,c=category(p);
    return L.divIcon({className:'ms-atlas-divicon',html:`<div class="ms-atlas-marker ms-atlas-marker-${esc(p.cat)}" style="--cat:${c.color}"><span>${esc(c.symbol)}</span>${p.art&&p.visitable?'<b>•</b>':''}</div>`,iconSize:[28,28],iconAnchor:[14,14]});
  }

  function renderMarkers(){
    if(!state.map||!window.L)return;
    state.markers.forEach(m=>{try{state.map.removeLayer(m);}catch(_){ }});state.markers.clear();
    state.points.forEach(p=>{
      if(p.lat==null||p.lng==null||!matches(p))return;
      const marker=window.L.marker([p.lat,p.lng],{icon:markerIcon(p),title:p.name});
      marker.on('click',()=>selectPoint(p.id,false));marker.addTo(state.map);state.markers.set(p.id,marker);
    });
  }

  function selectPoint(id,fly){
    const p=pointById(id);if(!p)return;
    state.selectedId=p.id;renderList();renderDetail();
    if(fly&&state.map&&p.lat!=null&&p.lng!=null)state.map.flyTo([p.lat,p.lng],Math.max(5,state.map.getZoom()),{duration:.8});
  }

  function economyHTML(p){
    const m=marketFor(p);if(!m)return '<div class="ms-atlas-noeconomy">Sem mercado nacional simulado para este tipo de registro.</div>';
    const simulated=Number.isFinite(Number(p.baseRateDF))&&p.id!=='eua'?(Number(p.baseRateDF)*Number(m.currencyIndex)/100):null;
    return `<div class="ms-atlas-market-card"><div><span>ESTABILIDADE</span><b>${Math.round(m.stability)}</b><i><u style="width:${clamp(m.stability)}%"></u></i></div><div><span>MERCADO</span><b>${Math.round(m.market)}</b><i><u style="width:${clamp(m.market)}%"></u></i></div><div><span>ÍNDICE CAMBIAL</span><b>${Number(m.currencyIndex).toFixed(1)}</b><i><u style="width:${clamp(m.currencyIndex/2.2)}%"></u></i></div>${simulated!=null?`<p>Projeção simulada: <strong>1 unidade ≈ ${simulated.toFixed(2)} DF</strong></p>`:''}</div>`;
  }

  function renderDetail(){
    const el=state.root?.querySelector('[data-atlas-detail]');if(!el)return;
    const p=pointById(state.selectedId)||state.points.find(x=>x.art)||state.points[0];
    if(!p){el.innerHTML='<div class="ms-atlas-empty">Sem registros.</div>';return;}
    state.selectedId=p.id;const c=category(p);
    el.style.setProperty('--cat',c.color);
    const art=p.art?`<div class="ms-atlas-detail-art"><img src="${esc(p.art)}" alt="Arte de ${esc(p.name)}" loading="lazy"><span>${p.visitable?'LOCAL VISITÁVEL':'ARTE DE REFERÊNCIA'}</span></div>`:`<div class="ms-atlas-detail-art placeholder"><span>REGISTRO CARTOGRÁFICO</span><b>${esc(c.symbol)}</b><small>Arte individual ainda não vinculada.</small></div>`;
    const actions=[p.art&&p.visitable?'<button type="button" data-detail="visit" class="primary">◈ VISITAR LOCAL</button>':'',isAdmin()?'<button type="button" data-detail="edit">✎ EDITAR</button><button type="button" data-detail="delete" class="danger">✕ APAGAR</button>':'<button type="button" data-detail="request">✉ SOLICITAR ALTERAÇÃO</button>'].filter(Boolean).join('');
    el.innerHTML=`${art}<div class="ms-atlas-detail-body"><span class="ms-atlas-cat-badge">${esc(c.name)}</span><h2>${esc(p.name)}</h2><p class="ms-atlas-type">${esc(p.type||'')}</p><p class="ms-atlas-lore">${esc(p.desc||'')}</p><dl><div><dt>PAÍS / REGIÃO</dt><dd>${esc(p.country||'Não especificado')}</dd></div><div><dt>GOVERNO</dt><dd>${esc(p.government||'Não especificado')}</dd></div><div><dt>MOEDA</dt><dd>${esc(p.currency||'Não especificada')}</dd></div><div><dt>CÂMBIO CANÔNICO</dt><dd>${esc(p.exchange||'Não especificado')}</dd></div><div><dt>COORDENADAS</dt><dd>${p.lat==null?'Fora do plano físico':`${Number(p.lat).toFixed(3)}, ${Number(p.lng).toFixed(3)}`}</dd></div><div><dt>METADADOS</dt><dd>${esc(p.meta||'—')}</dd></div></dl>${p.canonNote?`<div class="ms-atlas-canon-note"><b>LEITURA ESTRATÉGICA</b><p>${esc(p.canonNote)}</p></div>`:''}<h3>ECONOMIA SIMULADA</h3>${economyHTML(p)}<div class="ms-atlas-detail-actions">${actions}</div></div>`;
  }

  function onDetailClick(e){
    const b=e.target.closest('[data-detail]');if(!b)return;
    const p=pointById(state.selectedId);if(!p)return;
    if(b.dataset.detail==='visit')openVisit(p);
    if(b.dataset.detail==='edit'&&isAdmin())openEdit(p);
    if(b.dataset.detail==='delete'&&isAdmin())deletePoint(p);
    if(b.dataset.detail==='request'&&!isAdmin())openRequest(p);
  }

  function openVisit(p){
    if(!p?.art||!p?.visitable)return;
    const c=category(p),el=state.root.querySelector('[data-atlas-visit]');el.hidden=false;el.style.setProperty('--cat',c.color);
    el.innerHTML=`<div class="ms-atlas-visit-card"><button type="button" data-close-visit class="ms-atlas-close">×</button><img src="${esc(p.art)}" alt="${esc(p.name)}"><div class="ms-atlas-visit-info"><span>${esc(c.name)}</span><h2>${esc(p.name)}</h2><p>${esc(p.desc||'')}</p><div><b>${esc(p.country||'Região não especificada')}</b><small>${esc(p.government||'Governo não especificado')} · ${esc(p.currency||'Moeda não especificada')}</small></div>${economyHTML(p)}</div></div>`;
  }
  function closeVisit(){const el=state.root?.querySelector('[data-atlas-visit]');if(el){el.hidden=true;el.innerHTML='';}}

  function openEdit(p,coords){
    if(!isAdmin())return;
    const isNew=!p;const v=p?clone(p):{id:'',name:'',cat:'pro',type:'',lat:coords?.lat??null,lng:coords?.lng??null,meta:'',desc:'',country:'',currency:'',exchange:'',government:'',art:'',visitable:false};
    const req=state.reviewRequest&&String(state.reviewRequest?.data?.atlasPointId||'')===String(v.id)?state.reviewRequest:null;
    const el=state.root.querySelector('[data-atlas-modal]');el.hidden=false;
    el.innerHTML=`<form class="ms-atlas-dialog" data-edit-form data-edit-id="${esc(v.id)}"><header><div><span>${req?'REVISÃO DE SOLICITAÇÃO':'EDIÇÃO ADMINISTRATIVA'}</span><h3>${isNew?'NOVO REGISTRO':'EDITAR REGISTRO'}</h3></div><button type="button" data-modal-close>×</button></header>${req?`<div class="ms-atlas-request-review"><b>Solicitação de ${esc(req.username||'Mestre')}</b><p><strong>Motivo:</strong> ${esc(req.data?.reason||'—')}</p><p><strong>Alteração sugerida:</strong> ${esc(req.data?.suggestion||'—')}</p></div>`:''}<div class="ms-atlas-form-grid"><label>NOME<input name="name" required value="${esc(v.name)}"></label><label>TIPO / SUBTÍTULO<input name="type" value="${esc(v.type)}"></label><label>CATEGORIA<select name="cat">${ORDER.map(c=>`<option value="${c}" ${v.cat===c?'selected':''}>${esc(CAT[c]?.name||c)}</option>`).join('')}</select></label><label>PAÍS / REGIÃO<input name="country" value="${esc(v.country||'')}"></label><label>GOVERNO<input name="government" value="${esc(v.government||'')}"></label><label>MOEDA<input name="currency" value="${esc(v.currency||'')}"></label><label>CÂMBIO CANÔNICO<input name="exchange" value="${esc(v.exchange||'')}"></label><label>LATITUDE<input name="lat" type="number" step="0.0001" value="${v.lat==null?'':esc(v.lat)}"></label><label>LONGITUDE<input name="lng" type="number" step="0.0001" value="${v.lng==null?'':esc(v.lng)}"></label><label class="wide">METADADOS<input name="meta" value="${esc(v.meta||'')}"></label><label class="wide">DESCRIÇÃO / LORE<textarea name="desc" rows="5">${esc(v.desc||'')}</textarea></label><label class="wide">CAMINHO DA ARTE<input name="art" placeholder="assets/atlas/places/local.webp" value="${esc(v.art||'')}"></label><label class="check wide"><input name="visitable" type="checkbox" ${v.visitable?'checked':''}> Marcar como local visitável</label></div><footer><button type="button" data-modal-close>CANCELAR</button><button type="submit" class="primary">SALVAR NO ATLAS</button></footer></form>`;
    el.querySelector('[data-edit-form]')?.addEventListener('submit',saveEdit);
  }

  async function saveEdit(e){
    e.preventDefault();if(!isAdmin())return;
    const form=e.currentTarget,fd=new FormData(form),id=form.dataset.editId||`u${Date.now()}`;
    const old=clone(state.points);
    const existing=pointById(id);
    const value={...(existing||{}),id,name:String(fd.get('name')||'').trim(),type:String(fd.get('type')||''),cat:String(fd.get('cat')||'cinza'),country:String(fd.get('country')||''),government:String(fd.get('government')||''),currency:String(fd.get('currency')||''),exchange:String(fd.get('exchange')||''),lat:fd.get('lat')===''?null:Number(fd.get('lat')),lng:fd.get('lng')===''?null:Number(fd.get('lng')),meta:String(fd.get('meta')||''),desc:String(fd.get('desc')||''),art:String(fd.get('art')||'').trim(),visitable:fd.get('visitable')==='on'};
    if(!value.name){toast('Nome obrigatório.','error');return;}
    if(existing)Object.assign(existing,value);else state.points.push(value);
    state.economy=normalizeEconomy(state.economy);state.selectedId=id;renderList();renderMarkers();renderDetail();closeModal();
    try{await persistPoints();}
    catch(err){state.points=old;renderList();renderMarkers();renderDetail();toast(err.message||'Falha ao salvar o Atlas.','error');return;}
    if(state.reviewRequest){
      try{const resolved=await services()?.resolveRequest?.(state.reviewRequest,'approved');if(!resolved)throw new Error('Solicitação não confirmada pelo Supabase.');state.reviewRequest=null;toast('Atlas atualizado e solicitação aprovada.','success');}
      catch(err){toast(`Atlas salvo; pendência administrativa mantida: ${err.message||err}`,'error');}
    }else toast(existing?'Registro atualizado.':'Registro criado.','success');
  }

  function openRequest(p){
    if(isAdmin()||role()!=='mestre')return;
    const el=state.root.querySelector('[data-atlas-modal]');el.hidden=false;
    el.innerHTML=`<form class="ms-atlas-dialog compact" data-request-form><header><div><span>PROTOCOLO DO MESTRE</span><h3>SOLICITAR ALTERAÇÃO</h3></div><button type="button" data-modal-close>×</button></header><div class="ms-atlas-request-target"><small>REGISTRO</small><b>${esc(p.name)}</b></div><label>TIPO DE SOLICITAÇÃO<select name="kind"><option value="correction">Correção de informação</option><option value="lore">Alteração de lore</option><option value="position">Posição / coordenadas</option><option value="economy">Economia / moeda</option><option value="art">Arte / visitação</option><option value="other">Outra alteração</option></select></label><label>JUSTIFICATIVA<textarea name="reason" rows="4" required placeholder="Explique por que o registro deve ser revisto."></textarea></label><label>ALTERAÇÃO SUGERIDA<textarea name="suggestion" rows="5" required placeholder="Descreva exatamente o que você sugere alterar."></textarea></label><footer><button type="button" data-modal-close>CANCELAR</button><button type="submit" class="primary">ENVIAR AO ADM</button></footer></form>`;
    el.querySelector('[data-request-form]')?.addEventListener('submit',ev=>submitRequest(ev,p));
  }

  async function submitRequest(e,p){
    e.preventDefault();const fd=new FormData(e.currentTarget);const reason=String(fd.get('reason')||'').trim(),suggestion=String(fd.get('suggestion')||'').trim();
    if(!reason||!suggestion){toast('Preencha justificativa e alteração sugerida.','error');return;}
    try{const svc=services();if(!svc?.requestChange)throw new Error('Serviço de solicitações indisponível.');const result=await svc.requestChange({atlasPointId:p.id,atlasPointName:p.name,kind:String(fd.get('kind')||'other'),reason,suggestion});if(!result)throw new Error('O Supabase não confirmou a solicitação.');closeModal();toast('Solicitação enviada ao ADM.','success');}
    catch(err){toast(err.message||'Não foi possível enviar a solicitação.','error');}
  }

  function closeModal(){const el=state.root?.querySelector('[data-atlas-modal]');if(el){el.hidden=true;el.innerHTML='';}}
  function onModalClick(e){if(e.target.closest('[data-modal-close]')||e.target===state.root.querySelector('[data-atlas-modal]'))closeModal();}

  async function deletePoint(p){
    if(!isAdmin()||!p||!confirm(`Apagar "${p.name}" do Atlas?`))return;
    const oldPoints=clone(state.points),oldEconomy=clone(state.economy);
    state.points=state.points.filter(x=>x.id!==p.id);delete state.economy?.markets?.[p.id];state.selectedId=state.points[0]?.id||null;renderList();renderMarkers();renderDetail();renderEconomy();
    try{await persistPoints();await persistEconomy();toast('Registro apagado.','success');}
    catch(err){state.points=oldPoints;state.economy=oldEconomy;renderList();renderMarkers();renderDetail();renderEconomy();toast(err.message||'Falha ao apagar.','error');}
  }

  function setAddMode(on){state.addMode=!!on&&isAdmin();renderTools();const hint=state.root?.querySelector('[data-atlas-modehint]');if(hint)hint.hidden=!state.addMode;state.root?.classList.toggle('is-adding',state.addMode);}

  function onToolClick(e){
    const b=e.target.closest('[data-tool]');if(!b||!isAdmin())return;
    const t=b.dataset.tool;
    if(t==='add'){setAddMode(!state.addMode);return;}
    if(t==='export'){exportJSON();return;}
    if(t==='import'){state.root.querySelector('[data-atlas-import]')?.click();return;}
    if(t==='reset')resetPoints();
  }

  function exportJSON(){
    const payload={version:SOURCE.version||'2.6.0',exportedAt:now(),points:state.points,economy:state.economy};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mundos-sombrios-atlas-global.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function importJSON(e){
    const file=e.target.files?.[0];e.target.value='';if(!file||!isAdmin())return;
    const oldPoints=clone(state.points),oldEconomy=clone(state.economy);
    try{
      const parsed=JSON.parse(await file.text()),points=Array.isArray(parsed)?parsed:parsed.points;if(!Array.isArray(points))throw new Error('Arquivo sem lista de pontos.');
      state.points=normalizePoints(points);if(parsed.economy)state.economy=normalizeEconomy(parsed.economy);state.selectedId=state.points[0]?.id||null;renderList();renderMarkers();renderDetail();renderEconomy();
      await persistPoints();if(parsed.economy)await persistEconomy();toast('Atlas importado e publicado.','success');
    }catch(err){state.points=oldPoints;state.economy=oldEconomy;renderList();renderMarkers();renderDetail();renderEconomy();toast(err.message||'Arquivo inválido.','error');}
  }

  async function resetPoints(){
    if(!confirm('Restaurar os 66 registros canônicos do Atlas? As alterações publicadas serão substituídas.'))return;
    const old=clone(state.points);state.points=clone(DEFAULT_POINTS);state.selectedId=state.points.find(x=>x.art&&x.visitable)?.id||state.points[0]?.id||null;renderList();renderMarkers();renderDetail();
    try{await persistPoints();toast('Atlas restaurado para a base canônica.','success');}
    catch(err){state.points=old;renderList();renderMarkers();renderDetail();toast(err.message||'Falha ao restaurar o Atlas.','error');}
  }

  async function persistPoints(){if(!isAdmin())throw new Error('Somente o ADM pode publicar alterações.');const svc=services();if(!svc)throw new Error('Serviço do Atlas indisponível.');const result=await svc.savePoints(clone(state.points));if(!result)throw new Error('O Supabase não confirmou a gravação do Atlas.');return result;}
  async function persistEconomy(){if(!isAdmin())throw new Error('Somente o ADM pode comandar a economia.');const svc=services();if(!svc)throw new Error('Serviço econômico indisponível.');const result=await svc.saveEconomy(clone(state.economy));if(!result)throw new Error('O Supabase não confirmou a gravação econômica.');return result;}

  async function reloadRemote(notify){
    const svc=services();if(!svc||!window.MS_DB?.ready){if(notify)toast('Serviços online indisponíveis; exibindo base canônica.','error');return;}
    try{
      const [points,economy]=await Promise.all([svc.points().catch(()=>null),svc.economy().catch(()=>null)]);
      const atlasPayload=Array.isArray(points)&&points.length&&points.some(p=>p&&typeof p.name==='string'&&typeof p.cat==='string');
      if(atlasPayload)state.points=normalizePoints(points);else state.points=normalizePoints(DEFAULT_POINTS);
      state.economy=normalizeEconomy(economy);if(!pointById(state.selectedId))state.selectedId=state.points.find(x=>x.art&&x.visitable)?.id||state.points[0]?.id||null;
      renderList();renderMarkers();renderDetail();renderEconomy();if(notify)toast('Atlas sincronizado com o Supabase.','success');
    }catch(err){console.warn('[Atlas] sincronização:',err);if(notify)toast('Não foi possível sincronizar; mantendo dados atuais.','error');}
  }

  function metric(label,value,suffix=''){
    const n=Number(value)||0;return `<div class="ms-econ-metric"><span>${esc(label)}</span><b>${Number.isInteger(n)?n:n.toFixed(1)}${suffix}</b><i><u style="width:${clamp(label==='Inflação'?n*4:n)}%"></u></i></div>`;
  }

  function renderEconomy(){
    const el=state.root?.querySelector('[data-atlas-economy]');if(!el||!state.economy)return;
    const e=state.economy,log=(e.log||[]).slice(0,6);
    el.innerHTML=`<div class="ms-econ-head"><div><span class="stamp amb">SIMULAÇÃO SISTÊMICA</span><h2>Economia Global · Ciclo ${esc(e.cycle)}</h2><p>Estado compartilhado do cenário. Mestres consultam; somente o ADM executa comandos e publica mudanças.</p></div><div class="ms-econ-sync">${e.updatedAt?`ATUALIZADO ${esc(new Date(e.updatedAt).toLocaleString('pt-BR'))}`:'ESTADO CANÔNICO INICIAL'}</div></div><div class="ms-econ-metrics">${metric('Tensão',e.tension)}${metric('Comércio',e.trade)}${metric('Anomalia',e.anomaly)}${metric('Inflação',e.inflation,'%')}</div>${isAdmin()?renderEconomyConsole():`<div class="ms-econ-master-note"><b>CONSOLE BLOQUEADO</b><span>Comandos econômicos são exclusivos do ADM.</span></div>`}${log.length?`<div class="ms-econ-log"><h3>ÚLTIMOS EVENTOS</h3>${log.map(x=>`<article><time>${esc(x.at?new Date(x.at).toLocaleString('pt-BR'):'')}</time><b>${esc(x.command||'EVENTO')}</b><p>${esc(x.response||'')}</p></article>`).join('')}</div>`:''}`;
  }

  function renderEconomyConsole(){
    return `<div class="ms-econ-console"><div class="ms-econ-terminal"><label>COMANDO PREDEFINIDO<div><span>&gt;</span><input data-econ-command spellcheck="false" autocomplete="off" placeholder="AVANCAR_CICLO"><button type="button" data-econ-execute>EXECUTAR</button></div></label><output data-econ-output>${esc(state.lastEconomyResponse||'Console pronto. Apenas comandos da lista são aceitos.')}</output></div><div class="ms-econ-commands">${Object.entries(ECON_COMMANDS).map(([code,x])=>`<button type="button" data-econ-code="${code}"><b>${code}</b><span>${esc(x.desc)}</span></button>`).join('')}</div></div>`;
  }

  function onEconomyClick(e){
    if(!isAdmin())return;
    const preset=e.target.closest('[data-econ-code]');if(preset){const inp=state.root.querySelector('[data-econ-command]');if(inp){inp.value=preset.dataset.econCode;inp.focus();}return;}
    if(e.target.closest('[data-econ-execute]')){const input=state.root.querySelector('[data-econ-command]');executeEconomyCommand(String(input?.value||''));}
  }

  function adjustMarkets(filter,delta){
    state.points.forEach(p=>{
      if(!filter(p))return;const m=state.economy.markets[p.id];if(!m)return;
      if(delta.stability)m.stability=clamp(m.stability+delta.stability);
      if(delta.market)m.market=clamp(m.market+delta.market);
      if(delta.currency)m.currencyIndex=clamp(m.currencyIndex+delta.currency,20,220);
    });
  }

  function deterministicCycleDrift(p,cycle){
    const seed=String(p.id).split('').reduce((a,c)=>a+c.charCodeAt(0),0)+cycle*17;
    return ((seed%9)-4)/2;
  }

  async function executeEconomyCommand(raw){
    if(!isAdmin())return;
    const code=String(raw||'').trim().toUpperCase();if(!ECON_COMMANDS[code]){state.lastEconomyResponse=`Comando rejeitado: ${code||'(vazio)'}. Use somente os comandos predefinidos.`;renderEconomy();return;}
    const before=clone(state.economy);let response='';
    try{
      switch(code){
        case 'AVANCAR_CICLO':
          state.economy.cycle+=1;state.points.forEach(p=>{const m=state.economy.markets[p.id];if(!m)return;const d=deterministicCycleDrift(p,state.economy.cycle);m.market=clamp(m.market+d);m.currencyIndex=clamp(m.currencyIndex+d*.7,20,220);m.stability=clamp(m.stability+d*.35);});state.economy.tension=clamp(state.economy.tension+deterministicCycleDrift({id:'global'},state.economy.cycle));response=`Ciclo ${state.economy.cycle} processado. Mercados oscilaram segundo pressão sistêmica.`;break;
        case 'CRISE_ANT_NEXO':adjustMarkets(p=>p.cat==='ant',{stability:-11,market:-9,currency:-8});adjustMarkets(p=>p.cat==='pro',{currency:2,market:1});state.economy.tension=clamp(state.economy.tension+13);state.economy.trade=clamp(state.economy.trade-8);response='Crise no bloco Ant-Nexo: contenção de capital, queda de estabilidade e fuga para moedas rivais.';break;
        case 'CRISE_PRO_NEXO':adjustMarkets(p=>p.cat==='pro',{stability:-11,market:-9,currency:-8});adjustMarkets(p=>p.cat==='ant',{currency:2,market:1});state.economy.tension=clamp(state.economy.tension+13);state.economy.trade=clamp(state.economy.trade-8);response='Crise no bloco Pró-Nexo: cadeias biotecnológicas retraem e o bloco Ant-Nexo captura liquidez.';break;
        case 'EMBARGO_GLOBAL':adjustMarkets(()=>true,{stability:-3,market:-9,currency:-4});state.economy.trade=clamp(state.economy.trade-17);state.economy.tension=clamp(state.economy.tension+9);state.economy.inflation=clamp(state.economy.inflation+2.4,0,80);response='Embargo global ativado: comércio despenca, inflação sobe e liquidez internacional contrai.';break;
        case 'RUPTURA_DO_VEU':adjustMarkets(()=>true,{stability:-13,market:-7,currency:-5});state.economy.anomaly=clamp(state.economy.anomaly+24);state.economy.tension=clamp(state.economy.tension+17);state.economy.trade=clamp(state.economy.trade-11);response='Ruptura do Véu registrada: cadeias logísticas falham e a confiança institucional sofre choque severo.';break;
        case 'BOOM_HAKURE':adjustMarkets(p=>p.cat==='pro',{stability:4,market:8,currency:9});adjustMarkets(p=>p.id==='hakure',{stability:5,market:9,currency:12});state.economy.trade=clamp(state.economy.trade+9);state.economy.tension=clamp(state.economy.tension-4);response='Expansão de Hakuré: biotecnologia impulsiona o bloco Pró-Nexo e reabre corredores comerciais.';break;
        case 'CHOQUE_VOGLASKOV':adjustMarkets(p=>p.cat==='ant',{market:1,currency:3});adjustMarkets(p=>p.id==='vogla',{stability:7,market:8,currency:18});state.economy.tension=clamp(state.economy.tension+19);state.economy.trade=clamp(state.economy.trade-7);response='Choque de Voglaskov: Krov dispara com a dissuasão militar, enquanto o comércio global recua.';break;
        case 'COLAPSO_DF':adjustMarkets(p=>p.id==='eua',{stability:-12,market:-15,currency:-22});adjustMarkets(p=>p.id!=='eua',{currency:7});state.economy.inflation=clamp(state.economy.inflation+5,0,80);state.economy.tension=clamp(state.economy.tension+14);state.economy.trade=clamp(state.economy.trade-6);response='Dólar Federal em colapso: o padrão-base perde poder de compra e moedas rivais valorizam relativamente.';break;
        case 'ESTABILIZAR_MERCADOS':adjustMarkets(()=>true,{stability:9,market:6,currency:2});state.economy.tension=clamp(state.economy.tension-13);state.economy.trade=clamp(state.economy.trade+8);state.economy.anomaly=clamp(state.economy.anomaly-4);state.economy.inflation=clamp(state.economy.inflation-1.8,0,80);response='Intervenção coordenada concluída: mercados recuperam liquidez e a tensão global recua.';break;
        case 'RESET_ECONOMIA':state.economy=normalizeEconomy(DEFAULT_ECONOMY);response='Simulação restaurada ao estado canônico inicial do Ano 100.';break;
      }
      state.economy.updatedAt=now();state.economy.log=[{at:state.economy.updatedAt,command:code,response},...(state.economy.log||[])].slice(0,20);state.lastEconomyResponse=response;renderEconomy();renderDetail();await persistEconomy();toast('Comando econômico publicado.','success');
    }catch(err){state.economy=before;state.lastEconomyResponse=`Falha ao publicar ${code}: ${err.message||err}`;renderEconomy();renderDetail();toast('Comando revertido: falha de persistência.','error');}
  }

  function refreshLayout(){if(state.map)setTimeout(()=>state.map.invalidateSize(),30);}

  function reviewRequest(req){
    if(!isAdmin()||!req)return;
    state.reviewRequest=req;const id=req.data?.atlasPointId;if(id){selectPoint(id,true);setTimeout(()=>openEdit(pointById(id)),350);}else toast('Solicitação sem registro cartográfico associado.','error');
  }

  window.MSAtlas=Object.freeze({mount,refreshLayout,reviewRequest,reload:()=>reloadRemote(true),commands:ECON_COMMANDS});
})();
