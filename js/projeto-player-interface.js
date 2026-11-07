(function(){
  'use strict';
  const ROOT_ID='player-interface-root';
  const DATA_ID='pp-interface-state';
  const HUD=[
    {id:'querubin',name:'Querubim',role:'Combate Tático',bonus:'+1 Potência Física e +1 Potência Cinesia',desc:'Estética militarista em azul e branco; o mundo é lido como uma zona de alvos.'},
    {id:'arcanjo',name:'Arcanjo',role:'Analista Temporal',bonus:'+1 Potência Protetiva e +1 Potência Cinética',desc:'Estética geométrica dourada; projeta fantasmas de trajetórias futuras.'},
    {id:'tronos',name:'Tronos',role:'Sintonia Biológica',bonus:'+1 Potência de Alteração e +1 Potência de Restauração',desc:'Estética orgânica ciano; mostra fluxo sanguíneo e pontos de pressão.'},
    {id:'serafins',name:'Serafins',role:'Imersão Neural',bonus:'+1 Potência de Projeção e +1 Potência Sistêmica',desc:'Estética etérea fúcsia; lê o mundo em camadas de informação e vontade pura.'}
  ];
  const AI={
    'IA Virtudes':{tone:'Nobre e estóica',missions:'Estabilizar zona de conflito; resgatar civis de Assimilação; proteger o fraco.',bonus:'-3 no Estresse Genético (TCG)',skin:'Luz dourada/ciano, mármore e metal sagrado.'},
    'IA Domínios':{tone:'Impetuosa e agressiva',missions:'Eliminar ameaças; conquistar território; testar limites em combate.',bonus:'+1 em uma Potência à escolha; Assimilação +2',skin:'Industrial, néon, steampunk/cyberpunk.'},
    'IA Principados':{tone:'Fria e intelectual',missions:'Hackear bases; analisar resíduos de fenda; recuperar dados de eras passadas.',bonus:'Altera um Prodígio por cena mantendo o CÊ original; Vantagem em Percepção',skin:'Fractal, geométrica, preto/fúcsia.'}
  };
  const RES=[
    {id:'nexon',name:'Nexon',focus:'Energia',desc:'Controle de campo e fluxo; focada em manipulação de área e estados.',gain:'Potência Sistêmica sem custo de CÊ; se já possuir, +1 Capacidade.'},
    {id:'kairon',name:'Kairon',focus:'Tempo/Mente',desc:'Velocidade e precisão; aceleração sináptica e antecipação.',gain:'Crítico Natural reduzido em 3.'},
    {id:'xenion',name:'Xenion',focus:'Matéria',desc:'Resistência e estrutura; combate direto e integridade molecular.',gain:'Acesso imediato a Física ou Protetiva; se já possuir, +1 Capacidade.'},
    {id:'oniron',name:'Oníron',focus:'Consciência',desc:'Controle e invocação; criação de formas complexas e manipulação vital.',gain:'Acesso à Potência Vital ou Onírica.'}
  ];
  const syncLevels=[
    {n:1,min:0,max:9,slots:1,label:'Acesso',gain:'HUD básico + Inventário Kafra (5 slots iniciais).'},
    {n:2,min:10,max:24,slots:2,label:'Estabilização',gain:'+1 em todos os TCG; define a Classe Única.'},
    {n:3,min:25,max:49,slots:3,label:'Otimização',gain:'Segundo modo de HUD; 5 CÊ Residual limpam 1 Estresse.'},
    {n:4,min:50,max:99,slots:4,label:'Definitivo',gain:'20 CÊ a cada 10% PS; sustenta um adicional em um poder sem aumentar CD do TCG.'},
    {n:5,min:100,max:100,slots:5,label:'Admin',gain:'Sincronia Total; Potência Nexo Probabilística com 50% de desconto; Burst Mode.'}
  ];
  const POTENCIES=['Física','Energética','Destrutiva','Protetiva','Cinesia','Domínio','Alteração','Projeção','Restauração','Saturação','Sistêmica','Cinética'];
  const AI_THEME={
    'IA Virtudes':{id:'virtudes',a:'#e9d38a',b:'#7de7ff',bg:'#111827'},
    'IA Domínios':{id:'dominios',a:'#ff9f5c',b:'#ff3d9a',bg:'#241327'},
    'IA Principados':{id:'principados',a:'#b38cff',b:'#4de6d2',bg:'#111326'}
  };
  function el(id){return document.getElementById(id)};
  function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));}
  function isOperator(){const nature=String(el('char-nature')?.value||'');const cls=String(el('char-class')?.value||'');return nature==='Operador de Sistema (Proj. Player)' && ['IA Virtudes','IA Domínios','IA Principados'].includes(cls);}
  function state(){
    const raw=el(DATA_ID)?.value||'{}';
    try{return JSON.parse(raw)||{}}catch(_){return {}}
  }
  function setState(next){const e=el(DATA_ID); if(e)e.value=JSON.stringify(next); return next;}
  function num(id,def=0){const v=Number(el(id)?.value);return Number.isFinite(v)?v:def}
  function ceField(){return document.querySelector('#resource-panel .res-val-input[data-type="CÊ Residual"]')}
  function syncCEFromResource(s){const f=ceField(); if(f && f.value!=='' && Number.isFinite(Number(f.value))) s.ce=Number(f.value); return s}
  function syncCEToResource(s){const f=ceField(); if(f) f.value=String(Number(s.ce)||0);}
  function currentAI(){
    const persisted=state().ai;
    if(AI[persisted]) return persisted;
    const selected=el('pp-ai')?.value;
    if(AI[selected]) return selected;
    return 'IA Virtudes';
  }
  function ensureState(){
    const s=state();
    syncCEFromResource(s);
    if(!s.ps) s.ps=0;
    if(!s.ce) s.ce=0;
    if(!s.hud) s.hud='querubin';
    if(!s.ai) s.ai=currentAI();
    if(!s.resonance) s.resonance='nexon';
    if(!Array.isArray(s.kafraItems)) s.kafraItems=[];
    if(!Array.isArray(s.skills)) s.skills=[];
    if(!Array.isArray(s.missions)) s.missions=[];
    if(!Number.isInteger(s.editSkillIndex)) s.editSkillIndex=-1;
    setState(s); return s;
  }
  function syncLevel(ps){return syncLevels.find(l=>ps>=l.min&&ps<=l.max)||syncLevels[0]}
  function ensureScopedStyle(){
    if(document.getElementById('pp-live-style')) return;
    const style=document.createElement('style'); style.id='pp-live-style'; style.textContent=`
      #${ROOT_ID}{--pp-a:#e9d38a;--pp-b:#7de7ff;--pp-bg:#111827;}
      #${ROOT_ID} .pp-live-shell{position:relative;overflow:hidden;border-color:color-mix(in srgb,var(--pp-a) 34%,transparent);background:radial-gradient(circle at 15% 10%,color-mix(in srgb,var(--pp-a) 12%,transparent),transparent 34%),radial-gradient(circle at 85% 18%,color-mix(in srgb,var(--pp-b) 10%,transparent),transparent 30%),linear-gradient(135deg,var(--pp-bg),#080b13);transition:background .5s ease,border-color .5s ease,box-shadow .5s ease;}
      #${ROOT_ID} .pp-ai-orb{background:radial-gradient(circle at 30% 30%,#fff 0 8%,var(--pp-b) 17%,color-mix(in srgb,var(--pp-a) 76%,transparent) 45%,transparent 68%);box-shadow:0 0 24px color-mix(in srgb,var(--pp-a) 45%,transparent),0 0 65px color-mix(in srgb,var(--pp-b) 22%,transparent);animation:ppAiPulse 3s ease-in-out infinite;}
      #${ROOT_ID} .pp-kpi-row .pp-ai-metric{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--pp-a) 20%,transparent);border-radius:12px;padding:8px;background:rgba(255,255,255,.03)}
      #${ROOT_ID} .pp-resource-meter{height:9px;border-radius:99px;overflow:hidden;background:#07101a;margin-top:7px;}#${ROOT_ID} .pp-resource-meter>span{display:block;height:100%;background:linear-gradient(90deg,var(--pp-a),var(--pp-b));box-shadow:0 0 14px color-mix(in srgb,var(--pp-b) 38%,transparent);transition:width .5s ease;animation:ppFlow 2.2s linear infinite;}
      #${ROOT_ID} .pp-skill-card{position:relative;overflow:hidden;padding:12px;border:1px solid color-mix(in srgb,var(--pp-a) 22%,transparent);border-radius:15px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015));margin-top:8px;}#${ROOT_ID} .pp-skill-card:before{content:"";position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--pp-b) 20%,transparent),transparent 68%);animation:ppFloat 4s ease-in-out infinite;pointer-events:none;}
      #${ROOT_ID} .pp-skill-emblem{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;margin:4px 4px 0 0;background:linear-gradient(135deg,color-mix(in srgb,var(--pp-a) 22%,transparent),color-mix(in srgb,var(--pp-b) 12%,transparent));border:1px solid color-mix(in srgb,var(--pp-a) 40%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--pp-a) 14%,transparent);animation:ppEmblem 3.4s ease-in-out infinite;}
      #${ROOT_ID} .pp-skill-emblem .sig{width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,var(--pp-b),var(--pp-a));color:#111;font-size:.65rem;font-weight:900;}
      #${ROOT_ID} .pp-skill-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}#${ROOT_ID} .pp-skill-actions button{border:1px solid rgba(255,255,255,.12);background:rgba(7,12,20,.75);color:#eaf3ff;border-radius:8px;padding:6px 9px;cursor:pointer;}
      @keyframes ppAiPulse{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.06);opacity:1}}@keyframes ppFlow{to{filter:hue-rotate(18deg)}}@keyframes ppFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}@keyframes ppEmblem{0%,100%{box-shadow:0 0 12px color-mix(in srgb,var(--pp-a) 10%,transparent)}50%{box-shadow:0 0 22px color-mix(in srgb,var(--pp-b) 22%,transparent)}}
      @media(prefers-reduced-motion:reduce){#${ROOT_ID} .pp-ai-orb,#${ROOT_ID} .pp-resource-meter>span,#${ROOT_ID} .pp-skill-card:before,#${ROOT_ID} .pp-skill-emblem{animation:none!important}}
    `; document.head.appendChild(style);
  }
  function applyAITheme(s){
    const root=el(ROOT_ID); if(!root)return; const t=AI_THEME[s.ai]||AI_THEME['IA Virtudes']; root.style.setProperty('--pp-a',t.a);root.style.setProperty('--pp-b',t.b);root.style.setProperty('--pp-bg',t.bg);root.dataset.aiTheme=t.id;
  }
  function getPowerNames(){const out=[];document.querySelectorAll('#powers-list .list-item .power-name-input').forEach(i=>{const v=i.value?.trim();if(v&&!out.includes(v))out.push(v)});return out;}
  function skillBudget(ps){return Math.min(100,Math.floor((Number(ps)||0)/5)*10);}
  function decorateProjectPlayerPowerEmblems(){
    if(!isOperator())return; const s=ensureState(); document.querySelectorAll('#powers-list .pp-skill-emblems,[data-pp-skill-emblems]').forEach(x=>x.remove());
    document.querySelectorAll('#powers-list .list-item').forEach(item=>{const name=item.querySelector('.power-name-input')?.value?.trim(); if(!name)return; const matches=(s.skills||[]).filter(sk=>sk.powerName===name); if(!matches.length)return; const wrap=document.createElement('div');wrap.className='pp-skill-emblems';wrap.dataset.ppSkillEmblems='1';matches.forEach(sk=>{const b=document.createElement('span');b.className='pp-skill-emblem';b.title=(sk.desc||'');b.innerHTML=`<span class="sig">✦</span>${esc(sk.name)} · Cap ${esc(sk.cap||1)}`;wrap.appendChild(b)});item.appendChild(wrap);});
  }
  function render(){
    const r=el(ROOT_ID); if(!r)return;
    ensureScopedStyle();
    const s=ensureState();
    applyAITheme(s);
    syncCEToResource(s);
    const lvl=syncLevel(Number(s.ps)||0); const aiName=currentAI();
    if(el('pp-ai')) el('pp-ai').value=aiName;
    s.ai=aiName; setState(s);
    const ai=AI[aiName]||AI['IA Virtudes'];
    const hud=HUD.find(x=>x.id===s.hud)||HUD[0]; const res=RES.find(x=>x.id===s.resonance)||RES[0];
    const uploadBase=Math.min(4,lvl.n); const uploadTarget=lvl.n===1?10:lvl.n===2?25:lvl.n===3?50:100;
    const uploadCost=(uploadBase*10)+uploadTarget;
    const uniqueBudget=Math.min(50,Math.floor((Number(s.ps)||0)/5))*10;
    const uniqueSlots=Math.min(5,lvl.slots);
    r.innerHTML=`
      <section class="pp-live-shell">
        <input type="hidden" id="${DATA_ID}" value='${esc(JSON.stringify(s))}'>
        <div class="pp-aura"></div><div class="pp-scanline"></div>
        <header class="pp-header"><div><span class="pp-eyebrow">PROJETO PLAYER · ONÍRON / NEXON</span><h2>INTERFACE & KAFRA</h2><p>Interface viva integrada ao córtex. O HUD calcula, a Kafra materializa e o Operador executa.</p></div><div class="pp-status"><span class="pp-led"></span><b>LINK ANGELICAL</b><small>${esc(lvl.label)} · ${lvl.slots} SLOT(S)</small></div></header>
        <div class="pp-grid pp-top">
          <article class="pp-card pp-hud-card"><div class="pp-card-title">HUD · BIO-PERCEPÇÃO RETINAL</div><p class="pp-muted">Modo de exibição altera a estética e concede o bônus de processamento correspondente.</p><div class="pp-hud-grid">${HUD.map(h=>{const locked=Number(s.ps)<25 && h.id!==HUD[0].id; return `<button class="pp-hud-option ${h.id===s.hud?'active':''} ${locked?'locked':''}" ${locked?'disabled':''} onclick="window.ppSetHUD('${h.id}')"><span class="pp-hud-glyph">◈</span><b>${h.name}${locked?' · BLOQUEADO':''}</b><small>${h.role}</small><em>${h.bonus}</em></button>`}).join('')}</div><div class="pp-callout">${esc(hud.desc)}<br><strong>${esc(hud.bonus)}</strong></div></article>
          <article class="pp-card pp-ai-card"><div class="pp-card-title">IA ANGÉLICA · CO-PILOTO</div><div class="pp-ai-orb">✦</div><h3>${esc(aiName)}</h3><p>${esc(ai.tone)}. ${esc(ai.missions)}</p><div class="pp-badge">${esc(ai.bonus)}</div><div class="pp-ai-lore">Assinatura visual: ${esc(ai.skin)}</div><label>IA vinculada<select id="pp-ai" onchange="window.ppSetAI(this.value)"><option>IA Virtudes</option><option>IA Domínios</option><option>IA Principados</option></select></label></article>
          <article class="pp-card pp-sync-card"><div class="pp-card-title">SINCRONIA · PS / CÊ RESIDUAL</div><div class="pp-sync-ring" style="--pp:${Number(s.ps)||0}%"><span>${Number(s.ps)||0}%</span></div><div class="pp-kpi-row"><span class="pp-ai-metric"><small>NÍVEL</small><b>${lvl.n}</b></span><span class="pp-ai-metric"><small>LABEL</small><b>${lvl.label}</b></span><span class="pp-ai-metric"><small>SLOTS</small><b>${uniqueSlots}</b></span><span class="pp-ai-metric"><small>CÊ LIVRE</small><b>${Number(s.ce)||0}</b></span></div><div style="margin-top:8px"><small class="pp-muted">CÊ Residual disponível</small><div class="pp-resource-meter"><span style="width:${Math.min(100,Number(s.ce)||0)}%"></span></div></div><label style="text-align:left">CÊ Residual<input id="pp-ce" type="number" min="0" value="${Number(s.ce)||0}" oninput="window.ppSetCE(this.value)"></label><p class="pp-muted">${esc(lvl.gain)}</p><label>PS (%)<input id="pp-ps" type="number" min="0" max="100" value="${Number(s.ps)||0}" oninput="window.ppSetPS(this.value)"></label><div class="pp-mini-grid"><span>Upload alvo <b>${uploadTarget}%</b></span><span>Custo Upload <b>${uploadCost}</b></span><span>Budget Skills <b>${uniqueBudget} CÊ</b></span></div></article>
        </div>
        <div class="pp-grid pp-mid">
          <article class="pp-card pp-missions"><div class="pp-card-title">MISSÕES · KAIRON</div><p class="pp-muted">Até 3 objetivos por sessão. Cada objetivo concluído concede CÊ Residual imediata.</p><div class="pp-row"><input id="pp-mission-text" placeholder="Novo objetivo do sistema"><input id="pp-mission-ce" type="number" min="0" value="1" title="CÊ ganho"><button class="pp-btn" onclick="window.ppAddMission()">REGISTRAR</button></div><div id="pp-mission-list">${(s.missions||[]).map((m,i)=>`<div class="pp-list-row"><span>${esc(m.text)}</span><b>+${m.ce} CÊ</b><button onclick="window.ppCompleteMission(${i})">CONCLUIR</button></div>`).join('')}</div></article>
          <article class="pp-card pp-resonance"><div class="pp-card-title">RESSONÂNCIA · PARTÍCULA DE CLASSE</div><div class="pp-res-grid">${RES.map(x=>`<button class="pp-res-option ${x.id===s.resonance?'active':''}" onclick="window.ppSetResonance('${x.id}')"><b>${x.name}</b><small>${x.focus}</small><span>${x.gain}</span></button>`).join('')}</div><div class="pp-callout">${esc(res.desc)}<br><strong>${esc(res.gain)}</strong></div></article>
          <article class="pp-card pp-debug"><div class="pp-card-title">DEBUG · ESTABILIDADE DE ASSIMILAÇÃO</div><div class="pp-debug-line"><b>Protocolo</b><span>Intelecto + Presença vs CD 20</span></div><div class="pp-debug-line"><b>Sucesso</b><span>Assimilação Inativa por 1 cena; ponto de corrupção permanece registrado.</span></div><div class="pp-debug-line"><b>Proteção TCG</b><span>Vantagem em todos os Testes de Controle Genético.</span></div><div class="pp-debug-line"><b>Ruído</b><span>Necrose: -2% PS. Um ponto de Assimilação trava a barra até Intelecto + Tecnologia vs CD 15.</span></div><div class="pp-module-row"><button class="pp-module" onclick="window.ppGainPS(1)">ABATE +1% PS</button><button class="pp-module" onclick="window.ppGainPS(1)">ESCANEAMENTO +1%</button><button class="pp-module" onclick="window.ppGainPS(5)">CRÍTICO +5%</button><button class="pp-module" onclick="window.ppGainPS(5)">QUEST +5%</button><button class="pp-module" onclick="window.ppGainPS(3)">RESSONÂNCIA +3%</button><button class="pp-module" onclick="window.ppClearStress()">DEBUG · 5 CÊ → -1 ESTRESSE</button></div></article>
        </div>
        <article class="pp-card pp-kafra"><div class="pp-card-title">REPOSITÓRIO KAFRA · DOWNLOAD DE MATÉRIA</div><div class="pp-kafra-layout"><div class="pp-kafra-terminal"><div class="pp-terminal-head"><span>✦ KA-FRA NODE</span><span>XENION ONLINE</span></div><div class="pp-catalog-grid"><div><label>Item / chassi<input id="pp-k-item" placeholder="Ex.: Faca Fractal"></label><label>Custo CÊ<input id="pp-k-cost" type="number" min="0" value="2"></label><label>PCs de customização<input id="pp-k-pc" type="number" min="0" value="0"></label><label>Efeito / módulo<textarea id="pp-k-effect" rows="3" placeholder="Smart-Link, módulo, função..."></textarea></label><div class="pp-module-row"><button class="pp-module" data-pc="5" onclick="window.ppAddKafraModule('Módulo de Dano Gênico',5)">+5 PC · Dano Gênico</button><button class="pp-module" data-pc="3" onclick="window.ppAddKafraModule('Módulo de Ocultação',3)">+3 PC · Ocultação</button><button class="pp-module" data-pc="7" onclick="window.ppAddKafraModule('Módulo de IA Dedicada',7)">+7 PC · IA Dedicada</button></div><button class="pp-btn pp-btn-gold" onclick="window.ppCreateKafraItem()">MATERIALIZAR · SMART-LINK</button></div><div class="pp-downloads"><h4>DOWNLOAD EM CAMPO</h4><p>Itens do catálogo do Livro Base seguem o tempo por classe: Leve = 1 Reação · Médio = 1 Ação Rápida · Pesado = 1 Ação Padrão.</p><div class="pp-purchase"><input id="pp-k-buy-name" placeholder="Item do catálogo"><input id="pp-k-buy-cost" type="number" value="2"><button onclick="window.ppPurchaseKafra()">DOWNLOAD +2 CÊ</button></div><small>Itens comprados em campo recebem +2 CÊ de taxa de processamento.</small></div></div><div class="pp-kafra-items">${(s.kafraItems||[]).map((it,i)=>`<div class="pp-item"><div><b>${esc(it.name)}</b><small>${esc(it.skin||aiName)} · Smart-Link · ${it.pc||0} PC</small></div><span>${esc(it.effect||'')}</span><button onclick="window.ppRemoveKafra(${i})">×</button></div>`).join('')||'<div class="pp-empty">Nenhum item materializado.</div>'}</div></div></article>
        <div class="pp-grid pp-bottom"><article class="pp-card"><div class="pp-card-title">UNIQUE SKILLS · TÉCNICAS DE ASSINATURA</div><p class="pp-muted">Cada 5% de PS até 50% libera 10 CÊ para uma nova técnica derivada de um Prodígio já criado. Selecione Potência, Capacidade e o Poder desta ficha ao qual o emblema será vinculado.</p><div class="pp-row"><input id="pp-skill-name" placeholder="Nome da Skill" value="${esc((s.skills?.[s.editSkillIndex]?.name)||'')}"><select id="pp-skill-pot">${POTENCIES.map(p=>`<option ${((s.skills?.[s.editSkillIndex]?.potency)||POTENCIES[0])===p?'selected':''}>${esc(p)}</option>`).join('')}</select><select id="pp-skill-cap">${Array.from({length:10},(_,i)=>i+1).map(c=>`<option ${Number(s.skills?.[s.editSkillIndex]?.cap||1)===c?'selected':''}>Cap ${c}</option>`).join('')}</select><select id="pp-skill-power"><option value="">Sem vínculo</option>${getPowerNames().map(p=>`<option ${((s.skills?.[s.editSkillIndex]?.powerName)||'')===p?'selected':''}>${esc(p)}</option>`).join('')}</select></div><textarea id="pp-skill-desc" rows="3" placeholder="Descrição da técnica e da execução.">${esc((s.skills?.[s.editSkillIndex]?.desc)||'')}</textarea><div class="pp-skill-emblem"><span class="sig">✦</span> Budget: ${skillBudget(s.ps)} CÊ · usado: ${(s.skills||[]).length*10} CÊ</div><div class="pp-skill-actions"><button type="button" onclick="window.ppSaveSkill()">${s.editSkillIndex>=0?'SALVAR ALTERAÇÃO':'CRIAR SKILL · 10 CÊ'}</button>${s.editSkillIndex>=0?'<button type="button" onclick="window.ppCancelSkillEdit()">CANCELAR</button>':''}</div><div class="pp-skill-list">${(s.skills||[]).map((x,i)=>`<article class="pp-skill-card"><div class="pp-live-eyebrow">SIGNATURE EMBLEM · ${esc(x.potency||'Potência')}</div><h3 style="margin:.2rem 0">✦ ${esc(x.name)}</h3><div class="pp-muted">Capacidade ${esc(x.cap||1)} · ${x.powerName?`Vinculada a ${esc(x.powerName)}`:'sem Poder vinculado'} · 10 CÊ</div><p>${esc(x.desc||'Técnica derivada do Prodígio base.')}</p><span class="pp-skill-emblem"><span class="sig">✦</span>${esc(x.name)}</span><div class="pp-skill-actions"><button type="button" onclick="window.ppEditSkill(${i})">EDITAR</button><button type="button" onclick="window.ppDeleteSkill(${i})">EXCLUIR</button></div></article>`).join('')||'<div class="pp-empty">Nenhuma técnica registrada.</div>'}</div></article><article class="pp-card"><div class="pp-card-title">NEXON · UPLOAD & TRANSCENDÊNCIA</div><div class="pp-debug-line"><b>Upload</b><span>Custo = (Nível atual × 10) + PS alvo.</span></div><div class="pp-debug-line"><b>Burst Mode</b><span>Em 100% PS, com 77 CÊ: converta a carga em um novo Prodígio. Os 77 CÊ gastos não podem ser reutilizados; se não houver reserva restante, o sistema concede 25 CÊ para estruturar o novo Prodígio.</span></div><div class="pp-debug-line"><b>Classe Definitiva</b><span>Ativa no Nível 4 (50%–99% PS).</span></div><div class="pp-debug-line"><b>Facilitação</b><span>-5 permanente na CD de testes de Evolução Gradual de capacidades.</span></div><div class="pp-callout">Ressonância selecionada: <strong>${esc(res.name)}</strong>. IA: <strong>${esc(aiName)}</strong>. HUD: <strong>${esc(hud.name)}</strong>.</div></article></div>
      </section>`;
    const aiSel=el('pp-ai'); if(aiSel) aiSel.value=aiName;
    applyAITheme(s);
    decorateProjectPlayerPowerEmblems();
  }
  function update(fn){const s=ensureState();syncCEFromResource(s);fn(s);setState(s);syncCEToResource(s);render();}
  window.ppSetHUD=id=>update(s=>s.hud=id);
  window.ppSetAI=v=>update(s=>{s.ai=AI[v]?v:'IA Virtudes'});
  window.ppSetCE=v=>update(s=>{s.ce=Math.max(0,Number(v)||0)});
  window.ppSetPS=v=>update(s=>{s.ps=Math.max(0,Math.min(100,Number(v)||0));if(s.ps<25)s.hud='querubin'});
  window.ppSetResonance=id=>update(s=>s.resonance=id);
  window.ppAddMission=()=>update(s=>{if((s.missions||[]).length>=3)return;s.missions.push({text:el('pp-mission-text').value.trim()||'Objetivo do sistema',ce:Math.max(0,Number(el('pp-mission-ce').value)||0),done:false})});
  window.ppCompleteMission=i=>update(s=>{const m=s.missions?.[i];if(!m||m.done)return;m.done=true;s.ce=(Number(s.ce)||0)+(Number(m.ce)||0)});
  window.ppAddKafraModule=(name,pc)=>{const p=el('pp-k-pc'); if(p)p.value=(Number(p.value)||0)+pc; const e=el('pp-k-effect'); if(e)e.value+=(e.value?', ':'')+name;};
  window.ppCreateKafraItem=()=>update(s=>{const name=el('pp-k-item').value.trim();if(!name)return; const pc=Math.max(0,Number(el('pp-k-pc').value)||0); const cost=Math.max(0,Number(el('pp-k-cost').value)||0)+(pc>0?1:0); if((Number(s.ce)||0)<cost){alert('CÊ Residual insuficiente para materializar este item.');return;} s.ce-=cost;s.kafraItems.push({name,pc,effect:el('pp-k-effect').value.trim(),skin:AI[s.ai||currentAI()]?.skin||''});});
  window.ppPurchaseKafra=()=>update(s=>{const name=el('pp-k-buy-name').value.trim();if(!name)return;const cost=(Number(el('pp-k-buy-cost').value)||0)+2;if((Number(s.ce)||0)<cost){alert('CÊ Residual insuficiente para o download em campo.');return;}s.ce-=cost;s.kafraItems.push({name,pc:0,effect:'Download via Kafra · catálogo do Livro Base',skin:AI[s.ai||currentAI()]?.skin||''});});
  window.ppRemoveKafra=i=>update(s=>s.kafraItems.splice(i,1));
  window.ppGainPS=amount=>update(s=>s.ps=Math.min(100,(Number(s.ps)||0)+Number(amount||0)));
  window.ppClearStress=()=>update(s=>{if((Number(s.ps)||0)<25){alert('Debug de Estresse exige Nível 3 de Sincronia (25% PS).');return;} if((Number(s.ce)||0)<5){alert('CÊ Residual insuficiente.');return;} s.ce-=5; s.debugStressClears=(s.debugStressClears||0)+1;});
  window.ppEditSkill=i=>update(s=>{if(Number.isInteger(i)&&s.skills?.[i])s.editSkillIndex=i;});
  window.ppCancelSkillEdit=()=>update(s=>s.editSkillIndex=-1);
  window.ppDeleteSkill=i=>update(s=>{if(Number.isInteger(i)&&s.skills?.[i]){s.skills.splice(i,1);s.editSkillIndex=-1;}});
  window.ppSaveSkill=()=>update(s=>{
    const name=el('pp-skill-name')?.value.trim();if(!name){alert('Dê um nome para a Unique Skill.');return;}
    const potency=el('pp-skill-pot')?.value||POTENCIES[0];const cap=Math.max(1,Math.min(10,Number(String(el('pp-skill-cap')?.value||'1').replace(/\D/g,''))||1));const powerName=el('pp-skill-power')?.value||'';const desc=el('pp-skill-desc')?.value.trim()||'Técnica derivada do Prodígio base.';
    const idx=Number.isInteger(s.editSkillIndex)?s.editSkillIndex:-1;
    if(idx>=0&&s.skills?.[idx]){s.skills[idx]={...s.skills[idx],name,potency,cap,powerName,desc,costCE:10};s.editSkillIndex=-1;return;}
    const budget=skillBudget(s.ps);const spent=(s.skills||[]).length*10;if(budget-spent<10){alert(`Budget de Unique Skill insuficiente. Liberado: ${budget} CÊ; usado: ${spent} CÊ.`);return;}
    s.skills.push({id:`ppskill-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,potency,cap,powerName,desc,costCE:10,createdAt:new Date().toISOString()});s.editSkillIndex=-1;
  });
  window.ppAddSkill=window.ppSaveSkill;
  window.refreshProjetoPlayerPowerEmblems=decorateProjectPlayerPowerEmblems;
  window.clearProjetoPlayerPowerEmblems=function(){document.querySelectorAll('#powers-list .pp-skill-emblems,[data-pp-skill-emblems]').forEach(x=>x.remove());};
  window.renderProjetoPlayerInterface=function(){
    const c=el('specific-content-container'); if(!c)return;
    if(!isOperator()){window.clearProjetoPlayerPowerEmblems(); c.innerHTML=''; return;}
    c.innerHTML='<div id="'+ROOT_ID+'"></div>';
    if(!el(DATA_ID)){c.insertAdjacentHTML('afterbegin','<input type="hidden" id="'+DATA_ID+'" value="{}">')}
    render();
  };
  window.restoreProjetoPlayerFromData=function(data){
    if(!isOperator()){window.clearProjetoPlayerPowerEmblems();return;}
    if(!el(ROOT_ID)) window.renderProjetoPlayerInterface();
    const source=data?.[DATA_ID]; if(source){try{el(DATA_ID).value=source}catch(_){} }
    render();
  };
})();
