// Mundos Sombrios — Escudo do Mestre (integrado ao design original)
(function(){
  'use strict';
  window.openMasterShield=function(){
    const role=String(window.currentUser?.role||'').toLowerCase();
    const allowed=typeof window.msCanAccessMasterShield==='function'?window.msCanAccessMasterShield():(role==='mestre'||role==='admin');
    if(!allowed){ alert('Acesso restrito a Mestres, Co-Mestres autorizados e ADM.'); return; }
    window.captureMasterShieldReturnContext?.();
    window.MasterTools?.collapseMemoryPanel?.();
    const badge=document.getElementById('master-shield-role');
    if(badge) badge.textContent=role==='admin'?'ARCONTE · ADM':'MESTRE AUTORIZADO';
    if(typeof window.showScreen==='function') window.showScreen('screen-master-shield');
    window.syncMasterShieldReturnUI?.();
    setTimeout(()=>window.msShieldInit?.(),50);
  };
  const root=document.getElementById('master-shield-content');
  if(!root){ console.warn('[Escudo] container master-shield-content ainda nao existe.'); return; }
  window.msShieldInit=window.msShieldInit||function(){};
  const qs=s=>root.querySelector(s);
  const qsa=s=>root.querySelectorAll(s);
  const tt=qs('#ms-tooltip');
  const msGo=v=>{
    qsa('.ms-view').forEach(x=>x.classList.remove('active'));
    const el=qs('#ms-v-'+v);
    if(el)el.classList.add('active');
    qsa('.master-shield-nav button').forEach(b=>b.classList.toggle('active',b.dataset.msView===v));
    window.scrollTo({top:0,behavior:'smooth'});
    if(v==='mapa')setTimeout(()=>window.MSAtlas?.refreshLayout?.(),40);
  };
  const tipMove=e=>{if(tt){tt.style.left=(e.clientX+16)+'px';tt.style.top=(e.clientY+12)+'px';}};
  root.addEventListener('mousemove',tipMove);

/* ══════════ CRONOLOGIA ══════════ */
(function(){
  let h = `<div class="stamp">REGISTRO TEMPORAL — ∆ ARQUIVO DE ERAS</div>
  <h1 class="vt">Cronologia do Planeta-Fonte</h1>
  <p class="sub">// DA PRIMEIRA SEMEADURA DOS COLETORES AO ANO 100 PÓS-GUERRA DA EXTINÇÃO — A COLHEITA É UMA CONTAGEM DECRESCENTE</p><div class="tl">`;
  TIMELINE.forEach(t=>{
    h += `<div class="tl-item"><span class="ano">◈ ${t.ano}</span><h4>${t.titulo}</h4><p>${t.txt}</p></div>`;
  });
  h += `</div><div class="panel vio"><h3>◈ Nota de Calibração Histórica</h3><p style="color:var(--ink-dim)">Num mundo que nunca conheceu as Primeira e Segunda Guerras Mundiais, a <b>Guerra da Extinção (G.E.)</b> permanece como o primeiro e único cataclismo global absoluto da história. A Era dos Heróis começou 177 anos atrás (ano 5608 da era corrente) e foi aniquilada sob o pretexto de "ordem pública". Toda a linha do tempo detalhada está transcrita nos documentos <b>Guia Histórico</b> e <b>Registros Históricos</b> na aba ARQUIVOS.</p></div>`;
  qs('#ms-v-linha').innerHTML = h;
})();

/* ══════════ MAPA GLOBAL INTERATIVO — ATLAS LEAFLET ══════════ */
(function(){
  const host=qs('#ms-v-mapa');
  if(!host)return;
  host.innerHTML='<div class="panel cyn"><h3>ATLAS GLOBAL</h3><p>Inicializando cartografia, dossiês visitáveis e economia sistêmica…</p></div>';
  Promise.resolve(window.MSAtlas?.mount?.(host)).catch(error=>{
    console.error('[Escudo] Falha ao montar Atlas Global:',error);
    host.innerHTML=`<div class="panel"><h3>Falha no Atlas Global</h3><p>${String(error?.message||error||'Erro desconhecido')}</p></div>`;
  });
})();

/* ══════════ ECONOMIA E ACERVO MECÂNICO ══════════ */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards=(items, extra='')=>`<div class="ms-shield-grid">${items.map(x=>`<article class="ms-shield-card"><span class="stamp">${esc(x.tipo||x.tema||x.modo||'REGISTRO')}</span><h4>${esc(x.nome||x.titulo)}</h4><p>${esc(x.desc||x.nota||x.texto||'')}</p>${x.stats?`<p><b>Base:</b> ${esc(x.stats)}</p>`:''}${x.extra?`<p>${esc(x.extra)}</p>`:''}${extra}</article>`).join('')}</div>`;
  const econ=qs('#ms-v-economia');
  if(econ){econ.innerHTML=`<div class="stamp amb">ARQUIVO ECONÔMICO — ANO 100</div><h1 class="vt">Economia das Potências</h1><p class="sub">// Cotações em relação ao Dólar Federal e trajetória histórica das moedas centrais</p><div class="ms-shield-grid">${ECON.moedas.map(m=>`<article class="ms-shield-card"><h4>${esc(m.nome)}</h4><p><b>Cotação atual:</b> ${esc(m.cota[m.cota.length-1]??'—')} DF</p><p>${esc(m.nota)}</p><small>${ECON.periodos.map((p,i)=>`${esc(p)}: ${esc(m.dados[i])}`).join(' · ')}</small></article>`).join('')}</div>`;}
  function renderClasses(target, predicate, title, subtitle){const el=qs(target);if(!el)return;const data=CLASSES.filter(predicate);el.innerHTML=`<div class="stamp">COMPÊNDIO DE ARQUÉTIPOS</div><h1 class="vt">${title}</h1><p class="sub">${subtitle}</p><input class="ms-shield-search" placeholder="Filtrar classes, castas ou arquétipos..." aria-label="Filtrar compêndio"><div data-results>${cards(data)}</div>`;const input=el.querySelector('input'),out=el.querySelector('[data-results]');input.addEventListener('input',()=>{const q=input.value.toLowerCase();out.innerHTML=cards(data.filter(x=>`${x.nome} ${x.tipo} ${x.desc} ${x.extra}`.toLowerCase().includes(q)))})}
  renderClasses('#ms-v-exodo',x=>String(x.modo).includes('Êxodo'),'Êxodo · Assimilação','// Categorias, arquétipos e recursos de sobrevivência no mundo do Gene Êxodo');
  const exodo=qs('#ms-v-exodo');
  if(exodo&&Array.isArray(ESTIGMAS)){exodo.insertAdjacentHTML('beforeend',`<section class="ms-shield-section"><div class="stamp amb">BIOLOGIA DO GENE ÊXODO</div><h2 class="vt" style="font-size:25px">Estigmas</h2><p class="sub">// Custo, benefício e risco das manifestações biológicas</p>${cards(ESTIGMAS.map(x=>({tipo:`CUSTO ${x.custo}`,nome:x.nome,desc:x.desc,extra:`${x.bonus} · Risco: ${x.risco}`})))}</section>`);}
  renderClasses('#ms-v-ocultatun',x=>String(x.modo).includes('Ocultatun'),'Ocultatun · Ecos','// Carreiras e Agentes Designados para investigação, contenção e transgressão');
  renderClasses('#ms-v-ordem',x=>String(x.modo).includes('Ordem'),'Ordem dos Sete','// Castas e vias de Recordação para aqueles que reconhecem a natureza divina');
  renderClasses('#ms-v-envolto',x=>String(x.modo).includes('Envolto'),'Ecos do Envolto','// Classes marcadas pela corrosão ontológica e pelo Espaço Final');
  const trees=qs('#ms-v-arvores');
  if(trees){const groups=Object.entries(ARVORES);trees.innerHTML=`<div class="stamp">ÁRVORES DE HABILIDADE</div><h1 class="vt">Progressões e Ascensões</h1><p class="sub">// Consulta por família, requisito e estágio</p><input class="ms-shield-search" id="ms-tree-search" placeholder="Pesquisar potência, ascensão, requisito..."><div id="ms-tree-results"></div>`;const draw=q=>{q=(q||'').toLowerCase();qs('#ms-tree-results').innerHTML=groups.map(([group,arr])=>{const filtered=(arr||[]).filter(x=>`${x.nome} ${x.tema} ${(x.tiers||[]).map(t=>t.t+' '+t.d).join(' ')}`.toLowerCase().includes(q));if(!filtered.length)return'';return `<h3 class="vt" style="font-size:22px">${esc(group.toUpperCase())}</h3>${cards(filtered.map(x=>({...x,desc:(x.tiers||[]).map(t=>`${t.t}: ${t.d}`).join(' • ')})))}`}).join('')||'<div class="panel">Nenhum resultado.</div>'};draw('');qs('#ms-tree-search').addEventListener('input',e=>draw(e.target.value));}
  const history=qs('#ms-v-historia');
  if(history){
    const H=window.MS_MASTER_HISTORY;
    if(!H||!Array.isArray(H.periods)){
      history.innerHTML='<div class="panel"><h3>Registros Históricos</h3><p>O índice histórico ainda não foi carregado.</p></div>';
    }else{
      let selected=(H.present||H.periods[H.periods.length-1]?.id||H.periods[0]?.id);
      let opened=null;
      let focus='overview';
      const renderFacts=(items,kind)=>{
        const arr=Array.isArray(items)?items:[];
        if(!arr.length) return '<div class="panel"><p>Nenhum registro indexado para este assunto.</p></div>';
        if(kind==='economy') return `<div class="ms-history-topic-grid">${arr.map(item=>`<article class="ms-history-topic-card"><span class="stamp amb">${esc(item.block||'MERCADO')}</span><h4>${esc(item.name||item.title||'Registro')}</h4><p>${esc(item.analysis||item.summary||item.desc||'')}</p><small>${esc(item.value||item.rate||item.extra||'')}</small></article>`).join('')}</div>`;
        if(kind==='hooks') return `<div class="ms-history-topic-grid">${arr.map(item=>`<article class="ms-history-topic-card"><span class="stamp">${esc(item.mode||'GANCHO')}</span><h4>${esc(item.title||item.name||'Gancho')}</h4><p>${esc(item.summary||item.desc||'')}</p><small>${esc(item.objective||item.goal||'')}</small></article>`).join('')}</div>`;
        return `<div class="ms-history-event-list">${arr.map(item=>`<article class="ms-history-event-card"><div class="ms-history-event-mark"></div><div><span class="ms-history-event-type">${esc(item.type||item.kind||'REGISTRO')}</span><h4>${esc(item.title||item.name||'Evento')}</h4><p>${esc(item.summary||item.desc||'')}</p>${item.impact?`<small>Impacto: ${esc(item.impact)}</small>`:''}</div></article>`).join('')}</div>`;
      };
      const renderGeo=(period)=>{
        const geop=(period.geopolitics||[]);
        const eco=(period.economy||[]);
        return `<section class="ms-history-topic-panel"><div class="ms-history-topic-head"><div><span class="stamp amb">ASSUNTO</span><h3>Economia &amp; Geopolítica</h3></div><span>${geop.length + eco.length} registros</span></div>${geop.length?`<div class="ms-history-topic-grid">${geop.map(item=>`<article class="ms-history-topic-card"><span class="stamp amb">GEOPOLÍTICA</span><h4>${esc(item.title||'Leitura estratégica')}</h4><p>${esc(item.summary||item.desc||'')}</p></article>`).join('')}</div>`:''}${eco.length?`<div class="ms-history-subblock"><h4 class="ms-history-inline-title">Mercado cambial e moedas de referência</h4>${renderFacts(eco,'economy')}</div>`:''}`;
      };
      const renderEvents=(period)=>`<section class="ms-history-topic-panel"><div class="ms-history-topic-head"><div><span class="stamp">ASSUNTO</span><h3>Acontecimentos Históricos</h3></div><span>${(period.events||[]).length} registros</span></div>${renderFacts(period.events,'events')}</section>`;
      const renderHooks=(period)=>`<section class="ms-history-topic-panel"><div class="ms-history-topic-head"><div><span class="stamp">ASSUNTO</span><h3>Ganchos de Campanha</h3></div><span>${(period.hooks||[]).length} ganchos</span></div>${renderFacts(period.hooks,'hooks')}</section>`;
      const renderOverview=(period)=>`<section class="ms-history-topic-panel"><div class="ms-history-topic-head"><div><span class="stamp amb">VISÃO GERAL</span><h3>Leitura do Dossiê</h3></div><span>${esc(period.range||period.label||'')}</span></div><p class="ms-history-lead">${esc(period.summary||'')}</p><div class="ms-history-overview-grid"><article class="ms-history-overview-card"><h4>Assuntos centrais</h4><ul>${(period.tags||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></article><article class="ms-history-overview-card"><h4>Índice do arquivo</h4><ul><li>${(period.geopolitics||[]).length} leituras geopolíticas</li><li>${(period.economy||[]).length} marcadores econômicos</li><li>${(period.events||[]).length} acontecimentos históricos</li><li>${(period.hooks||[]).length} ganchos de campanha</li></ul></article><article class="ms-history-overview-card"><h4>Recorte temporal</h4><p>${esc(period.label||'')}</p><small>${esc(period.title||'')}</small></article></div>`;
      const renderBody=(period)=>{
        if(focus==='geopolitics') return renderGeo(period);
        if(focus==='events') return renderEvents(period);
        if(focus==='hooks') return renderHooks(period);
        return renderOverview(period) + renderGeo(period) + renderEvents(period) + renderHooks(period);
      };
      const renderPreview=(period)=>`<div class="ms-history-preview panel vio"><span class="stamp amb">PRÉ-VISUALIZAÇÃO</span><h3>${esc(period.fileName||period.label||'Dossiê')}</h3><p><b>${esc(period.label||'')}</b> · ${esc(period.title||'')}</p><p>${esc(period.summary||'')}</p><div class="ms-history-preview-meta"><span>${(period.geopolitics||[]).length} blocos geopolíticos</span><span>${(period.economy||[]).length} índices económicos</span><span>${(period.events||[]).length} acontecimentos</span><span>${(period.hooks||[]).length} ganchos</span></div><p class="sub" style="margin-bottom:0">// Primeiro clique: destaca o arquivo no fichário · Segundo clique: abre o dossiê completo</p></div>`;
      const draw=()=>{
        const period=H.byId(selected);
        const isOpen=opened===period.id;
        history.innerHTML=`<div class="stamp amb">DOSSIÊ HISTÓRICO DO CENÁRIO</div><h1 class="vt">Registros Históricos</h1><p class="sub">// Arquivo cronológico do Escudo do Mestre · organização por período, assuntos e ganchos jogáveis</p><div class="ms-history-archive-layout"><aside class="ms-history-cabinet" aria-label="Fichário cronológico"><div class="ms-history-cabinet-head"><span class="master-shield-kicker">FICHÁRIO OPERACIONAL</span><h3>Armário de Arquivos</h3><p>Cada gaveta contém um dossiê temporal do cenário. Use a sequência cronológica para preparar mesas, revisar blocos de poder e gerar ganchos.</p></div><div class="ms-history-cabinet-drawers">${H.periods.map((p,i)=>`<button type="button" class="ms-history-drawer ${selected===p.id?'is-selected':''} ${opened===p.id?'is-open':''}" data-history-period="${esc(p.id)}" aria-pressed="${selected===p.id?'true':'false'}"><span class="ms-history-drawer-shell"></span><span class="ms-history-drawer-tab"><small>ARQ ${String(i+1).padStart(2,'0')}</small><strong>${esc(p.fileName||p.label)}</strong><em>${esc(p.label)}</em></span><span class="ms-history-drawer-edge"></span></button>`).join('')}</div><div class="panel amb"><h3>Fonte Canônica</h3><p>Estrutura derivada do PDF oficial fornecido ao projeto. Este painel reorganiza o conteúdo em arquivos consultáveis e prontos para sessão.</p><a class="btn btn-secondary" href="${esc(H.source)}" target="_blank" rel="noopener">ABRIR PDF INTEGRAL</a></div></aside><section class="ms-history-stage"><div class="ms-history-stage-top"><div class="panel ${isOpen?'cyn':'vio'}"><span class="stamp ${isOpen?'':'amb'}">${isOpen?'ARQUIVO ABERTO':'ARQUIVO SELECIONADO'}</span><h3>${esc(period.title||'Registro')}</h3><p>${esc(period.label||'')} · ${esc(period.range||'')}</p><p>${esc(period.summary||'')}</p></div><div class="ms-history-mini-timeline">${H.periods.map(p=>`<button type="button" data-history-period="${esc(p.id)}" class="${selected===p.id?'active':''}"><small>${esc(p.label)}</small><b>${esc(p.title)}</b></button>`).join('')}</div></div>${isOpen?`<article class="ms-history-open-file"><header class="ms-history-file-head"><div><span class="master-shield-kicker">${esc(period.fileName||'ARQUIVO')}</span><h2>${esc(period.title||'')}</h2><p>${esc(period.label||'')} · ${esc(period.range||'')}</p></div><div class="ms-history-file-actions"><div class="ms-history-focus-tabs" role="tablist" aria-label="Assuntos do registro"><button type="button" data-history-focus="overview" class="${focus==='overview'?'active':''}">VISÃO GERAL</button><button type="button" data-history-focus="geopolitics" class="${focus==='geopolitics'?'active':''}">ECONOMIA &amp; GEOPOLÍTICA</button><button type="button" data-history-focus="events" class="${focus==='events'?'active':''}">ACONTECIMENTOS</button><button type="button" data-history-focus="hooks" class="${focus==='hooks'?'active':''}">GANCHOS</button></div><button type="button" class="btn btn-secondary" data-history-close>FECHAR E ARQUIVAR</button></div></header><div class="ms-history-file-sheet">${renderBody(period)}</div></article>`:renderPreview(period)}</section></div>`;
        history.querySelectorAll('[data-history-period]').forEach(btn=>btn.onclick=()=>{
          const id=btn.dataset.historyPeriod;
          if(selected!==id){ selected=id; opened=null; focus='overview'; draw(); return; }
          if(opened!==id){ opened=id; focus='overview'; draw(); return; }
        });
        history.querySelectorAll('[data-history-focus]').forEach(btn=>btn.onclick=()=>{ focus=btn.dataset.historyFocus||'overview'; draw(); });
        const closeBtn=history.querySelector('[data-history-close]');
        if(closeBtn) closeBtn.onclick=()=>{ opened=null; focus='overview'; draw(); };
      };
      draw();
    }
  }

  const files=qs('#ms-v-arquivos');
  if(files){const favKey='msShieldFavoritesV1';const favs=()=>{try{return JSON.parse(localStorage.getItem(favKey)||'[]')}catch(_){return[]}};const setFav=a=>localStorage.setItem(favKey,JSON.stringify(a));files.innerHTML=`<div class="stamp">ACERVO INTEGRAL</div><h1 class="vt">Arquivos & Referências</h1><p class="sub">// Busca textual no corpus editorial · favoritos locais por Mestre</p><input class="ms-shield-search" id="ms-doc-search" placeholder="Pesquisar termo, regra, lugar ou entidade..."><div id="ms-doc-results"></div>`;const draw=q=>{q=(q||'').trim().toLowerCase();let data=DOCS;if(q)data=DOCS.filter(d=>`${d.titulo} ${d.texto}`.toLowerCase().includes(q));data=data.slice(0,q?30:12);const active=favs();qs('#ms-doc-results').innerHTML=data.map(d=>{const snippet=String(d.texto||'').replace(/\s+/g,' ').slice(0,520);return `<article class="ms-shield-card" data-doc="${esc(d.id)}"><div style="display:flex;justify-content:space-between;gap:8px"><h4>${esc(d.titulo)}</h4><button type="button" data-fav="${esc(d.id)}">${active.includes(d.id)?'★':'☆'}</button></div><p>${esc(snippet)}${snippet.length>=520?'…':''}</p><small>Fonte editorial: ${esc(d.titulo)} · ID ${esc(d.id)}</small></article>`}).join('')||'<div class="panel">Nenhum documento corresponde à busca.</div>';qs('#ms-doc-results').querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{const a=favs(),id=b.dataset.fav,i=a.indexOf(id);if(i>=0)a.splice(i,1);else a.push(id);setFav(a);draw(q)})};draw('');qs('#ms-doc-search').addEventListener('input',e=>draw(e.target.value));}
})();


  root.querySelectorAll('.master-shield-nav button, .ms-shield-nav button').forEach(b=>b.addEventListener('click',()=>msGo(b.dataset.msView)));
  window.msShieldNavigate=msGo;
  msGo('linha');
})();
