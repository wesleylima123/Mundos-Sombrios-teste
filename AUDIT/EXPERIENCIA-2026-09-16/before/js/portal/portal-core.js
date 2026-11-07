/* Mundos Sombrios — Portal Oficial V2.2
   Fonte única de navegação e renderização pública do portal.
*/
(function(){
  'use strict';
  const state={section:'home',world:null,detail:null};
  const esc=()=>window.PortalContent.escapeHtml;
  const root=()=>document.getElementById('screen-portal');
  const e=v=>esc()(v);
  let mediaUrls={};
  const fmtDate=d=>{if(!d)return '';const date=new Date(d);return Number.isNaN(date.getTime())?e(d):date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const fmtMedia=ref=>ref&&mediaUrls[ref.id]?mediaUrls[ref.id]:'';
  const mediaBox=(ref,alt='',cls='')=>{const src=fmtMedia(ref);if(!src)return '';const a=e(ref?.alt||alt||'Mídia do Portal');if(ref.kind==='video')return `<div class="portal-media ${cls}"><video controls preload="metadata" playsinline aria-label="${a}" src="${src}"></video></div>`;return `<div class="portal-media ${cls}"><img loading="lazy" src="${src}" alt="${a}"></div>`;};
  function user(){try{return window.currentUser||null}catch(_){return null;}}
  function role(){return user()?.role||'visitante';}
  function show(id){if(typeof window.showScreen==='function')return window.showScreen(id);const target=document.getElementById(id);if(!target)return false;document.querySelectorAll('.screen').forEach(screen=>{screen.classList.remove('active','overlay');screen.setAttribute('aria-hidden','true');});target.classList.add('active');target.setAttribute('aria-hidden','false');return true;}
  function openLogin(){show('screen-login');}
  function backToPortal(){state.section='home';state.world=null;state.detail=null;render();show('screen-portal');}
  function navButton(section,label){
    const active=state.section===section?' active':'';
    return `<button class="${active.trim()}" data-section="${section}"${active?' aria-current="page"':''}>${label}</button>`;
  }
  function portalNav(){
    const logged=user();
    const elevated=['mestre','admin'].includes(String(logged?.role||'').toLowerCase());
    return `<header class="portal-nav">
      <div class="portal-nav-inner">
        <button class="portal-brand" data-act="top" aria-label="Voltar à página inicial">MUNDOS <span>SOMBRIOS</span></button>
        <nav class="portal-nav-primary" aria-label="Navegação principal">
          ${navButton('worlds','MUNDOS')}${navButton('classes','CLASSES')}${navButton('expansions','EXPANSÕES')}${navButton('stories','HISTÓRIAS')}
          <button data-act="codex">CÓDICES</button>
        </nav>
        <div class="portal-user">${logged?`<span class="portal-user-name">Olá, <b>${e(logged.username)}</b></span><button data-act="game" class="portal-user-play">JOGAR</button><button data-act="logout" class="ghost">SAIR</button>`:`<button data-act="login" class="portal-user-login">ENTRAR</button>`}${PortalContent.isAdmin()?`<button data-act="admin" class="admin-link">ADMINISTRAR</button>`:''}</div>
      </div>
      <div class="portal-nav-secondary" aria-label="Atalhos editoriais">
        ${navButton('news','NOVIDADES')}${navButton('events','AGENDA')}${navButton('community','COMUNIDADE')}
        <button data-act="masters">MESAS</button>${elevated?`<button data-act="shield" class="portal-shield-link">ESCUDO DO MESTRE</button>`:''}
      </div>
    </header>`;
  }
  function portalFooter(c){
    return `<footer class="portal-footer"><div><strong>MUNDOS SOMBRIOS</strong><span>Portal Oficial do cenário e sistema autorais.</span></div><div><button data-section="news">Notícias</button><button data-section="events">Eventos</button><button data-section="stories">Histórias</button><button data-section="classes">Classes</button><button data-section="expansions">Expansões</button><button data-act="codex">Códices</button></div><small>${e(c.portalVersion)} · Arquivo oficial</small></footer>`;
  }
  function portalShell(body,c,isHome=false){return `<div class="portal-shell${isHome?' portal-shell-home':''}">${portalNav()}<main class="${isHome?'portal-home':''}">${body}</main>${portalFooter(c)}</div>`;}
  function render(){
    const r=root();if(!r)return;
    r.setAttribute('aria-busy','true');
    const c=PortalContent.read();
    try{mediaUrls=PortalMedia.prepareContent(c)||{};}catch(_){mediaUrls={};}
    let body;
    if(state.section==='home'){r.innerHTML=home(c);r.setAttribute('aria-busy','false');document.body.classList.remove('ms-shell-booting');bind(r);return;}
    if(state.section==='world')body=worldPage(c,state.world);
    else if(state.section==='news')body=listing(c,'announcements','NOVIDADES','Atualizações e comunicados',x=>cardFor('announcements',x));
    else if(state.section==='events')body=listing(c,'events','EVENTOS','Próximos encontros e acontecimentos',x=>cardFor('events',x));
    else if(state.section==='classes')body=listing(c,'classes','CLASSES','Arquivos de personagens',x=>cardFor('classes',x));
    else if(state.section==='expansions')body=listing(c,'expansions','EXPANSÕES','Novos capítulos do cenário',x=>cardFor('expansions',x));
    else if(state.section==='community')body=listing(c,'community','COMUNIDADE','Campanhas, criações e destaques',x=>cardFor('community',x));
    else if(state.section==='stories')body=listing(c,'stories','HISTÓRIAS & CONTOS','Narrativas oficiais dos mundos',x=>cardFor('stories',x));
    else if(state.section==='worlds')body=worldsPage(c);
    else body=detailPage(c,state.detail);
    r.innerHTML=portalShell(body,c,false);r.setAttribute('aria-busy','false');document.body.classList.remove('ms-shell-booting');bind(r);
  }
  function mediaStrip(ref,alt){return mediaBox(ref,alt,'portal-card-media');}
  function homePanel(kicker,title,section,items,renderer,limit=2,extra=''){
    if(!items.length)return '';
    return `<section class="portal-home-panel ${extra}"><header><div><span class="portal-label">${kicker}</span><h2>${title}</h2></div><button data-section="${section}" class="portal-inline-link">VER ARQUIVO</button></header><div class="portal-home-panel-grid">${items.slice(0,limit).map(renderer).join('')}</div></section>`;
  }
  function archiveStrip(c){
    const entries=[
      ['news','Novidades',PortalContent.published(c.announcements).length],['events','Agenda',PortalContent.published(c.events).length],
      ['classes','Classes',PortalContent.published(c.classes).length],['expansions','Expansões',PortalContent.published(c.expansions).length],
      ['stories','Histórias',PortalContent.published(c.stories).length],['community','Comunidade',PortalContent.published(c.community).length]
    ];
    return `<section class="portal-archive-strip"><header><span class="portal-label">ÍNDICE DO PORTAL</span><h2>Acesso rápido ao arquivo oficial.</h2></header><div class="portal-archive-links">${entries.map(([section,label,count])=>`<button data-section="${section}"><span>${label}</span><b>${String(count).padStart(2,'0')}</b></button>`).join('')}<button data-act="codex"><span>Códices</span><b>↗</b></button></div></section>`;
  }
  function home(c){
    const elevated=['mestre','admin'].includes(String(role()).toLowerCase());
    const roomSnapshot=typeof window.getMasterRoomState==='function'?window.getMasterRoomState():{tables:[]};
    const masterTables=Array.isArray(roomSnapshot?.tables)?roomSnapshot.tables:[];
    const masterCenter=elevated?`<section class="portal-masters portal-masters-command"><div><span class="portal-label">CENTRO DE OPERAÇÕES</span><h2>O mundo não para entre sessões.</h2><p>${masterTables.length} campanha(s) sob sua guarda. Prepare cenas, consulte os Registros Históricos, acompanhe facções e conduza a mesa pelo Centro de Comando.</p><div class="portal-master-shortcuts"><button data-act="masters">CENTRO DE COMANDO</button><button data-act="master-history">REGISTROS HISTÓRICOS</button><button data-act="shield">ESCUDO DO MESTRE</button></div></div><div class="portal-master-seal"><b>${masterTables.length}</b><span>FENDAS</span><small>${String(role()).toUpperCase()}</small></div></section>`:`<section class="portal-masters"><div><span class="portal-label">CENTRO DOS MESTRES</span><h2>Prepare a próxima sessão.</h2><p>Mesas, Códices, NPCs, arquivos privados e Escudo do Mestre reunidos em um único centro operacional.</p></div><button class="portal-btn primary" data-act="masters">ENTRAR NA SALA DOS MESTRES</button></section>`;
    const announcements=PortalContent.published(c.announcements).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const events=PortalContent.published(c.events).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const classes=PortalContent.published(c.classes);
    const expansions=PortalContent.published(c.expansions);
    const stories=PortalContent.published(c.stories).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const editorial=[
      homePanel('ÚLTIMOS REGISTROS','Novidades','news',announcements,x=>cardFor('announcements',x),2,'portal-home-panel-news'),
      homePanel('AGENDA','Próximos eventos','events',events,x=>cardFor('events',x),2,'portal-home-panel-events'),
      homePanel('PERSONAGENS','Classes em foco','classes',classes,x=>cardFor('classes',x),2,'portal-home-panel-classes'),
      homePanel('CONTEÚDO OFICIAL','Expansões','expansions',expansions,x=>cardFor('expansions',x),2,'portal-home-panel-expansions'),
      homePanel('NARRATIVAS','Histórias & Contos','stories',stories,x=>cardFor('stories',x),2,'portal-home-panel-stories')
    ].filter(Boolean).join('');
    const featuredMedia=mediaStrip(c.featured.media,c.featured.title);
    const body=`
      <section class="portal-hero">${mediaStrip(c.hero.media,c.hero.title)}<div class="portal-hero-inner">
        <div class="portal-hero-copy"><span class="portal-eyebrow">${e(c.hero.eyebrow)}</span><h1>${e(c.hero.title)}</h1><h2>${e(c.hero.subtitle)}</h2><p>${e(c.hero.description)}</p><div class="portal-cta-row"><button class="portal-btn primary" data-act="create">CRIAR PERSONAGEM</button><button class="portal-btn" data-section="worlds">CONHECER O CENÁRIO</button><button class="portal-btn ghost" data-act="codex">CONSULTAR REGRAS</button></div></div>
        <aside class="portal-hero-console" aria-label="Identidade do portal"><div class="portal-hero-sigil" aria-hidden="true"><div class="portal-sigil-ring r1"></div><div class="portal-sigil-ring r2"></div><div class="portal-sigil-core">MS</div></div><div class="portal-hero-index"><span><b>02</b> CENÁRIOS</span><span><b>31</b> ARQUÉTIPOS</span><span><b>01</b> FORJA DA ALMA</span></div></aside>
      </div></section>
      <section class="portal-gateway" aria-label="Acessos principais"><button data-section="worlds"><b>01 · CENÁRIO</b><span>Conhecer os Mundos</span><small>Êxodo, Ocultatun e suas expansões.</small></button><button data-act="create"><b>02 · PERSONAGEM</b><span>Criar Personagem</span><small>Abra a Forja da Alma.</small></button><button data-act="codex"><b>03 · REGRAS</b><span>Consultar Regras</span><small>Códices e referências oficiais.</small></button><button data-act="masters"><b>04 · MESAS</b><span>Acessar Mesas</span><small>Campanhas, Fendas e sessões.</small></button></section>
      <section class="portal-home-overview">
        <section class="portal-featured ${featuredMedia?'has-media':'no-media'}">${featuredMedia}<div class="portal-featured-copy"><span class="portal-label">EM DESTAQUE</span><h2>${e(c.featured.title)}</h2><h3>${e(c.featured.subtitle)}</h3><p>${e(c.featured.description)}</p><span class="portal-badge">${e(c.featured.category)} · ${e(c.featured.world)}</span></div><button class="portal-featured-open" data-detail="featured">EXPLORAR</button></section>
        <section class="portal-world-rail"><header><div><span class="portal-label">DOIS MUNDOS</span><h2>Escolha sua realidade</h2></div><button data-section="worlds" class="portal-inline-link">VER MUNDOS</button></header><div class="portal-world-grid portal-world-grid-compact">${c.worlds.map(x=>cardFor('worlds',x)).join('')}</div></section>
      </section>
      ${archiveStrip(c)}
      ${editorial?`<section class="portal-home-editorial">${editorial}</section>`:''}
      ${masterCenter}`;
    return portalShell(body,c,true);
  }
  function cardFor(type,x){
    if(type==='announcements')return `<article class="portal-card">${mediaStrip(x.media,x.title)}<div class="portal-card-meta"><span>${e(x.category||'Atualização')}</span><time>${fmtDate(x.date)}</time></div><h3>${e(x.title)}</h3><p>${e(x.summary||x.description||'')}</p><button data-item="announcements" data-id="${e(x.id)}">LER MAIS</button></article>`;
    if(type==='events')return `<article class="portal-card portal-event-card">${mediaStrip(x.media,x.title)}<div class="event-date"><strong>${fmtDate(x.date)}</strong><span>${e(x.world||'')}</span></div><h3>${e(x.title)}</h3><p>${e(x.description||'')}</p><button data-item="events" data-id="${e(x.id)}">VER EVENTO</button></article>`;
    if(type==='classes')return `<article class="portal-class-card">${mediaStrip(x.media,x.title)}<div class="class-mark">${e(String(x.title||'?').slice(0,1))}</div><span>${e(x.world||'')}</span><h3>${e(x.title)}</h3><strong>${e(x.subtitle||'')}</strong><p>${e(x.description||'')}</p><button data-item="classes" data-id="${e(x.id)}">CONHECER</button></article>`;
    if(type==='expansions')return `<article class="portal-expansion-card">${mediaStrip(x.media,x.title)}<span>${e(x.world||'')}</span><h3>${e(x.title)}</h3><p>${e(x.description||'')}</p><footer><b>${e(x.status||'Disponível')}</b><button data-item="expansions" data-id="${e(x.id)}">EXPLORAR</button></footer></article>`;
    if(type==='stories')return `<article class="portal-story-card">${mediaStrip(x.media,x.title)}<div class="portal-card-meta"><span>${e(x.kind||'Conto')}</span><time>${fmtDate(x.date)}</time></div><h3>${e(x.title)}</h3><strong>${e(x.subtitle||x.world||'')}</strong><p>${e(x.description||'')}</p><button data-item="stories" data-id="${e(x.id)}">LER HISTÓRIA</button></article>`;
    if(type==='community')return `<article class="portal-card">${mediaStrip(x.media,x.title)}<div class="portal-card-meta"><span>${e(x.kind||'Comunidade')}</span><time>${fmtDate(x.date)}</time></div><h3>${e(x.title)}</h3><p>${e(x.description||'')}</p><button data-item="community" data-id="${e(x.id)}">VER DESTAQUE</button></article>`;
    if(type==='worlds')return `<article class="portal-world-card ${e(x.accent)}">${mediaStrip(x.media,x.title)}<div class="world-card-seal">${x.key==='exodo'?'◈':'✦'}</div><span>${e(x.eyebrow)}</span><h3>${e(x.title)}</h3><p>${e(x.description)}</p><footer><button data-world="${e(x.key)}">CONHECER MUNDO</button><button data-world-play="${e(x.key)}">ENTRAR NO MUNDO</button></footer></article>`;
    return '';
  }
  function listing(c,key,title,sub,renderer){const items=PortalContent.published(c[key]);return `<div class="portal-subpage"><header class="portal-subpage-head"><button data-act="back">← PORTAL</button><span class="portal-label">${e(title)}</span><h1>${e(sub)}</h1></header><div class="portal-list-grid">${items.length?items.map(renderer).join(''):`<div class="portal-empty">Nenhum conteúdo publicado ainda.</div>`}</div></div>`;}
  function worldsPage(c){return `<div class="portal-subpage"><header class="portal-subpage-head"><button data-act="back">← PORTAL</button><span class="portal-label">DOIS MUNDOS</span><h1>Escolha sua realidade</h1><p>Explore as identidades, registros e caminhos de cada cenário.</p></header><div class="portal-world-grid">${c.worlds.map(x=>cardFor('worlds',x)).join('')}</div></div>`;}
  function worldPage(c,key){const w=c.worlds.find(x=>x.key===key)||c.worlds[0];return `<div class="portal-subpage world-subpage ${e(w.accent)}"><header class="portal-subpage-head">${mediaStrip(w.media,w.title)}<button data-act="back">← PORTAL</button><span class="portal-label">${e(w.eyebrow)}</span><h1>${e(w.title)}</h1><p>${e(w.description)}</p></header><div class="world-subpage-actions"><button class="portal-btn primary" data-world-play="${e(w.key)}">ENTRAR NO MUNDO</button><button class="portal-btn" data-act="codex">CONSULTAR CÓDICE</button></div><div class="world-lore-grid"><article><span>O QUE É</span><h2>Cenário</h2><p>${e(w.description)}</p></article><article><span>CONTEÚDO</span><h2>Classes e expansões</h2><p>Descubra as opções disponíveis no portal e depois entre no Santuário para criar sua ficha.</p></article><article><span>REGISTROS</span><h2>Arquivos do mundo</h2><p>Acesse o Códice oficial para consultar regras, expansões e documentos publicados pelo ADM.</p></article></div></div>`;}
  function detailPage(c,detail){const [type,id]=String(detail||'').split(':');if(detail==='featured')return `<div class="portal-subpage"><header class="portal-subpage-head">${mediaStrip(c.featured.media,c.featured.title)}<button data-act="back">← PORTAL</button><span class="portal-label">EM DESTAQUE</span><h1>${e(c.featured.title)}</h1><p>${e(c.featured.description)}</p></header><article class="portal-detail"><p><b>${e(c.featured.subtitle)}</b></p><p>Categoria: ${e(c.featured.category)} · Mundo: ${e(c.featured.world)}</p><button class="portal-btn primary" data-act="codex">CONSULTAR CÓDICE</button></article></div>`;const item=(c[type]||[]).find(x=>String(x.id)===String(id));if(!item)return `<div class="portal-subpage"><header class="portal-subpage-head"><button data-act="back">← PORTAL</button><span class="portal-label">ARQUIVO</span><h1>Registro indisponível</h1><p>Este conteúdo não está mais publicado. Retorne ao Portal para consultar os registros atuais.</p></header></div>`;return `<div class="portal-subpage"><header class="portal-subpage-head">${mediaStrip(item.media,item.title)}<button data-act="back">← PORTAL</button><span class="portal-label">${e(type.toUpperCase())}</span><h1>${e(item.title)}</h1><p>${e(item.description||item.summary||'')}</p></header><article class="portal-detail">${item.subtitle?`<p><b>${e(item.subtitle)}</b></p>`:''}<div class="portal-detail-meta">${e(item.world||item.category||item.kind||item.status||'Mundos Sombrios')} · ${fmtDate(item.date)}</div>${type==='stories'&&item.body?`<div class="portal-story-body">${e(item.body).split(/\n\s*\n/).map(par=>`<p>${par.replace(/\n/g,'<br>')}</p>`).join('')}</div>`:''}<button class="portal-btn primary" data-act="${type==='events'?'login':'codex'}">${type==='events'?'PARTICIPAR / ENTRAR':'CONSULTAR CÓDICES'}</button></article></div>`;}
  function bind(r){
    r.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.section;state.world=null;state.detail=null;render();}));
    r.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>{state.section='world';state.world=b.dataset.world;render();}));
    r.querySelectorAll('[data-world-play]').forEach(b=>b.addEventListener('click',()=>{if(!user()){openLogin();return;}show('screen-mode-select');if(typeof window.selectGameMode==='function')window.selectGameMode(b.dataset.world);}));
    r.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{state.section='detail';state.detail=`${b.dataset.item}:${b.dataset.id}`;render();}));
    r.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{state.section='detail';state.detail=b.dataset.detail;render();}));
    r.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>handleAction(b.dataset.act)));
  }
  function handleAction(act){if(act==='login'){openLogin();return;}if(act==='logout'){if(typeof window.doLogout==='function')window.doLogout();return;}if(act==='create'){if(user())show('screen-mode-select');else openLogin();return;}if(act==='game'){if(user())show('screen-mode-select');else openLogin();return;}if(act==='codex'){show('screen-codex');if(!document.getElementById('world-codex-root')&&typeof window.renderWorldCodex==='function')window.renderWorldCodex();return;}if(act==='masters'){if(!user()){openLogin();return;}if(typeof window.showScreen==='function')window.showScreen('screen-ancoragem',{skipAncoragemRender:true});if(typeof window.switchAncoragemTab==='function')window.switchAncoragemTab(role()==='jogador'?'player':'gm');return;}if(act==='master-history'){if(!['mestre','admin'].includes(String(role()).toLowerCase())){openLogin();return;}if(typeof window.showScreen==='function')window.showScreen('screen-ancoragem',{skipAncoragemRender:true});if(typeof window.switchAncoragemTab==='function')window.switchAncoragemTab('gm');Promise.resolve(window.MS_FEATURES?.ensureMasterHistory?.()).catch(()=>null).finally(()=>setTimeout(()=>{window.MasterCommandCenter?.setPane?.('history');document.querySelector('.master-command-center')?.scrollIntoView({behavior:'smooth',block:'start'});},0));return;}if(act==='shield'){if(!['mestre','admin'].includes(String(role()).toLowerCase())){alert('Acesso restrito a Mestres e ADM.');return;}if(typeof window.openMasterShield==='function')window.openMasterShield();return;}if(act==='admin'){window.openPortalAdmin&&window.openPortalAdmin();return;}if(act==='back'||act==='top'){backToPortal();}}
  let portalHydrationPromise=null;
  function refreshPortalContent(){
    if(portalHydrationPromise)return portalHydrationPromise;
    portalHydrationPromise=Promise.resolve(PortalContent.hydrate()).then(()=>{if(document.getElementById('screen-portal')?.classList.contains('active'))render();}).finally(()=>{portalHydrationPromise=null;});
    return portalHydrationPromise;
  }
  window.renderOfficialPortal=render;window.openOfficialPortal=()=>{state.section='home';state.world=null;state.detail=null;show('screen-portal');render();if(window.MS_DB?.ready)setTimeout(refreshPortalContent,0);return true;};window.returnToOfficialPortal=backToPortal;window.backToOfficialPortal=backToPortal;
  // O Portal público não espera SDK/Auth remoto para existir. Ele é renderizado assim que
  // seu módulo local está disponível; a hidratação online acontece quando o app termina o boot.
  window.openOfficialPortal();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refreshPortalContent(),{once:true});else refreshPortalContent();
})();
