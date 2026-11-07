/*
 * Mundos Sombrios - Esoterico Surgery Suite
 * Canonical owner of Esoterico graft / rejection / cove mechanics.
 * Source of truth: characters[*].esoterico
 */
(function(){
  'use strict';

  const OWNER='js/esoterico-surgery.js';
  const qs=s=>document.querySelector(s);
  const esc=v=>typeof window.escHtml==='function'?window.escHtml(String(v??'')):String(v??'');
  const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}};

  const SPECIALIZATIONS=[
    {id:'nucleo',name:'Sincronização de Núcleo',effect:'Você pode comandar seus Covis mentalmente a até 1 km de distância.'},
    {id:'registro',name:'Registro da Carne',effect:'Ao estudar um cadáver ou criatura paranormal, descobre suas fraquezas e recebe +5 em todos os testes contra aquela espécie específica na próxima rodada.'},
    {id:'simbiose',name:'Simbiose Modular',effect:'Como uma Ação Padrão, pode alternar qual Enxerto está ativo sem cirurgia, respeitando seus Slots.'},
    {id:'eco',name:'Eco de Realidade Falsa',effect:'Ao entrar em um de seus Covis, pode criar uma cópia ilusória de si mesmo com 1 PV, compartilhando todas as suas estatísticas de Defesa.'}
  ];
  const DECADENCE=[
    {range:'1-2',title:'Dissonância Biológica',effect:'Pele com tonalidades estranhas; deixa de precisar de comida humana, nutrindo-se de resíduos de EP ou substâncias químicas tóxicas.'},
    {range:'3-4',title:'Desumanização Funcional',effect:'Órgãos vitais são substituídos por mecânicas anômalas. RD 10 contra venenos e doenças; -10 em Diplomacia com humanos comuns.'},
    {range:'5',title:'Herege - O Oráculo Calcinado',effect:'Perde a coesão física, tornando-se um Covil ambulante. Perde a ficha de personagem e passa a guardar um local ou Códice.'}
  ];
  const COVE_TYPES={
    'Rápido':{time:'1 Ação Padrão',dc:10,duration:'1 Cena'},
    'Prático':{time:'10 Minutos',dc:15,duration:'24 Horas'},
    'Perpétuo':{time:'1 Semana',dc:20,duration:'Permanente'}
  };

  const defaultState={activeGrafts:[],grafts:[],surgeryUsed:false,stress:0,coves:[],specializations:[],decadence:0,ptRejection:0,rejectionResult:null,medicineBonus:0,lastAcceptance:'',lastHealing:null,lastMutation:0,lastError:''};
  let state=clone(defaultState);

  function normalize(src){
    const d=Object.assign(clone(defaultState),clone(src||{}));
    d.grafts=Array.isArray(d.grafts)?d.grafts.map(normalizeGraft).slice(0,100):[];
    const graftById=new Map(d.grafts.map(g=>[g.id,g]));
    const graftByName=new Map(d.grafts.map(g=>[g.name.toLowerCase(),g]));
    d.activeGrafts=Array.isArray(d.activeGrafts)?d.activeGrafts.map(g=>graftById.get(String(g?.id||''))||graftByName.get(String(g?.name||'').toLowerCase())||normalizeGraft(g)).slice(0,20):[];
    d.coves=Array.isArray(d.coves)?d.coves.map(normalizeCove).slice(0,50):[];
    d.specializations=[...new Set(Array.isArray(d.specializations)?d.specializations.filter(id=>SPECIALIZATIONS.some(s=>s.id===id)):[])];
    d.surgeryUsed=!!d.surgeryUsed;
    d.stress=clampInt(d.stress,0,999);
    d.decadence=clampInt(d.decadence,0,5);
    d.ptRejection=clampInt(d.ptRejection,0,999);
    d.medicineBonus=clampInt(d.medicineBonus,-20,20);
    d.rejectionResult=['accepted','rejected',null].includes(d.rejectionResult)?d.rejectionResult:null;
    d.lastAcceptance=String(d.lastAcceptance||'');
    d.lastHealing=d.lastHealing||null;
    d.lastMutation=clampInt(d.lastMutation,0,999);
    d.lastError=String(d.lastError||'');
    return d;
  }
  function clampInt(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):min;}
  function normalizeGraft(g){
    return {id:String(g?.id||`graft-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),name:String(g?.name||'Enxerto sem nome').trim().slice(0,90),capacity:clampInt(g?.capacity,1,10),slots:clampInt(g?.slots||1,1,10),effect:String(g?.effect||'').trim().slice(0,1200),source:String(g?.source||'Esotérico · Registro de Enxertos')};
  }
  function normalizeCove(c){
    const type=Object.prototype.hasOwnProperty.call(COVE_TYPES,c?.type)?c.type:'Rápido';
    const gc=clampInt(c?.gc,1,10), base=COVE_TYPES[type];
    return {id:String(c?.id||`cove-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),name:String(c?.name||`Covil ${type}`).trim().slice(0,90),type,gc,cd:Number(c?.cd??base.dc+gc),time:String(c?.time||base.time),duration:String(c?.duration||base.duration),integrity:gc*10,defenses:{corporal:Number(c?.defenses?.corporal??c?.defenses??0),mental:Number(c?.defenses?.mental??c?.defenses??0),existential:Number(c?.defenses?.existential??c?.defenses??0)},effects:String(c?.effects||'').trim().slice(0,1200)};
  }

  function stats(){
    const vig=Number(qs('#attr-vig')?.value||0);
    const int=Number(qs('#attr-int')?.value||0);
    const pv=(vig*10)+12;
    const ep=(int*5)+15;
    const slots=Math.max(2,vig+1);
    return {vig,int,pv,ep,slots};
  }
  function setState(next){state=normalize(next);window.__esoDraft=clone(state);return state;}
  function current(){state=normalize(window.__esoDraft||state);return state;}
  function syncDraft(){window.__esoDraft=clone(state);return clone(state);}

  function ensurePanel(){
    if(typeof currentClass!=='undefined' && currentClass!=='Esotérico') return null;
    const host=qs('#specific-content-container');
    if(!host)return null;
    host.querySelectorAll('.v16-esoteric-surgery,.eso-surgery-suite').forEach((el,i)=>{if(i>0||!el.classList.contains('eso-surgery-suite'))el.remove();});
    let panel=host.querySelector('.eso-surgery-suite');
    if(!panel){panel=document.createElement('section');panel.className='eso-surgery-suite';panel.setAttribute('aria-labelledby','eso-title');host.appendChild(panel);}
    return panel;
  }

  function statusTone(d){return d.rejectionResult==='accepted'?'accepted':d.rejectionResult==='rejected'?'rejected':'neutral';}
  function monitorText(d){
    if(d.lastError)return ['error','FALHA DE PRONTUÁRIO',d.lastError];
    if(d.rejectionResult==='accepted')return ['success','ENXERTO ACEITO',d.lastAcceptance||'Protocolo concluído.'];
    if(d.rejectionResult==='rejected')return ['danger','REJEIÇÃO DETECTADA',d.lastAcceptance||'O paciente requer estabilização.'];
    return ['neutral','MONITORANDO','Risco de rejeição: Vigor + Medicina vs CD 15.'];
  }

  function render(){
    if(typeof currentClass!=='undefined' && currentClass!=='Esotérico'){
      document.querySelectorAll('.eso-surgery-suite').forEach(el=>el.remove());
      return;
    }
    const panel=ensurePanel();if(!panel)return;
    const d=current(),s=stats(), [tone,mTitle,mText]=monitorText(d);
    const activeSet=new Set(d.activeGrafts.map(g=>g.id));
    panel.innerHTML=`
      <div class="eso-surgery-atmosphere" aria-hidden="true"><span class="eso-flicker"></span><span class="eso-haze"></span></div>
      <header class="eso-surgery-header">
        <div class="eso-header-copy"><span class="module-kicker">OCULTATUN · ESOTÉRICO</span><h4 id="eso-title">LABORATÓRIO DE ANOMALIAS · CENTRO CIRÚRGICO</h4><p>Interface única para Autocirurgia Paranormal, Enxertos, aceitação/rejeição, progressão da Decadência e Engenharia de Covis. Os dados continuam na ficha em <code>esoterico</code>.</p></div>
        <div class="eso-surgery-lamp" aria-label="Luminária cirúrgica"><span>✚</span></div>
      </header>

      <section class="eso-vitals-grid" aria-label="Monitoramento vital">
        <article class="eso-vital"><small>PV inicial</small><strong>${s.pv}</strong><span>(VIG × 10) + 12</span></article>
        <article class="eso-vital"><small>EP inicial</small><strong>${s.ep}</strong><span>(INT × 5) + 15</span></article>
        <article class="eso-vital"><small>Slots de Enxerto</small><strong>${d.activeGrafts.reduce((n,g)=>n+g.slots,0)}/${s.slots}</strong><span>Mod. VIG + 1</span></article>
        <article class="eso-vital eso-vital-ecg"><small>ECG / EP</small><strong><span class="eso-pulse-dot"></span> SINCRONIZADO</strong><div class="eso-ecg-line"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>ritmo paranormal estável</span></article>
      </section>

      <section class="eso-rule-strip" aria-label="Protocolos canônicos do Esotérico">
        <article><span class="module-kicker">EVOLUÇÃO</span><b>1d8</b><small>Dado de Vida por patamar</small></article>
        <article><span class="module-kicker">ENXERTES</span><b>VIG &gt; Cap.</b><small>Vantagem em TCP quando a Capacidade do enxerto é inferior ao Vigor</small></article>
        <article><span class="module-kicker">ATIVAÇÃO</span><b>Cap. × 2 EP</b><small>Custo paranormal de uso do enxerto</small></article>
        <article><span class="module-kicker">AUTOCIRURGIA</span><b>1× / sessão</b><small>1 hora de descanso · trocar ativos ou curar 2d8 PV</small></article>
      </section>

      <section class="eso-or-section">
        <div class="eso-or-main">
          <div class="eso-or-head"><div><span class="module-kicker">SALA DE CIRURGIA</span><h5>Procedimento de Integração</h5></div><span class="eso-sterile-badge">CAMPO ESTERILIZADO</span></div>
          <div class="eso-operating-room">
            <div class="eso-overhead-lamp"></div>
            <div class="eso-patient-table"><div class="eso-patient"><span class="head"></span><span class="torso"></span><span class="arm a1"></span><span class="arm a2"></span><span class="leg l1"></span><span class="leg l2"></span><span class="incision"></span><span class="wire w1"></span><span class="wire w2"></span></div></div>
            <div class="eso-monitor"><header><span>ECG // ANOMALIA</span><b>● REC</b></header><div class="eso-monitor-grid"><div class="eso-wave"><span></span></div><div class="eso-monitor-data"><b>${d.rejectionResult==='accepted'?'ACEITO':d.rejectionResult==='rejected'?'REJEITADO':'AGUARDANDO'}</b><small>TCP / VIG + Medicina</small><small>CD 15 · Estresse +1 na falha</small></div></div></div>
            <div class="eso-instrument-tray"><span class="module-kicker">INSTRUMENTAL</span><div class="eso-tools"><span>✚</span><span>⌁</span><span>◈</span><span>⊕</span><span>╱</span><span>✦</span></div><small>pinça · bisturi · cânula · selador · agulha · matriz anômala</small></div>
          </div>
          <div class="eso-active-grafts"><div class="eso-subhead"><div><span class="module-kicker">CAMPO DE IMPLANTAÇÃO</span><h6>Enxertos Ativos</h6></div><span>${d.activeGrafts.length} ativo(s)</span></div><div class="eso-active-grid">${(()=>{const cards=d.activeGrafts.map((g,i)=>`<article class="eso-slot filled"><span class="eso-slot-index">S${i+1}</span><b>${esc(g.name)}</b><small>Cap. ${g.capacity} · ${g.slots} slot · ${g.capacity*2} EP</small><em>${esc(g.effect||'Efeito não descrito.')}</em></article>`);const usedSlots=d.activeGrafts.reduce((n,g)=>n+g.slots,0);const emptyCount=Math.max(0,s.slots-usedSlots);for(let i=0;i<emptyCount;i++)cards.push(`<article class="eso-slot"><span class="eso-slot-index">S${d.activeGrafts.length+i+1}</span><span class="eso-slot-empty">Slot esterilizado · vazio</span></article>`);return cards.join('');})()}</div></div>
        </div>
        <aside class="eso-surgical-console">
          <div class="eso-console-card"><span class="module-kicker">MONITORAMENTO</span><strong class="eso-monitor-title ${tone}">${mTitle}</strong><p>${esc(mText)}</p><div class="eso-status-track"><span class="${d.rejectionResult==='accepted'?'on':''}">ACEITAÇÃO</span><i></i><span class="${d.rejectionResult==='rejected'?'on-danger':''}">REJEIÇÃO</span></div></div>
          <div class="eso-console-card"><span class="module-kicker">PROTOCOLO DE AUTOCIRURGIA</span><p>1 vez por sessão, 1 hora de descanso. Permite alterar Enxertos Ativos ou curar 2d8 PV removendo tecido necrosado.</p><button class="souls-btn small-btn" type="button" data-action="heal">✚ REGISTRAR CURA 2d8</button></div>
          <div class="eso-console-card"><span class="module-kicker">TESTE DE ACEITAÇÃO / REJEIÇÃO</span><label class="eso-field">Bônus de Medicina<input id="eso-medicine-bonus" type="number" min="-20" max="20" value="${d.medicineBonus}"></label><div class="eso-test-rule">1d20 + Vigor + Medicina vs CD 15</div><button class="souls-btn small-btn primary" type="button" data-action="roll">⚕ REALIZAR TESTE</button>${d.lastAcceptance?`<small class="eso-result ${statusTone(d)}">${esc(d.lastAcceptance)}</small>`:''}</div>
        </aside>
      </section>

      <section class="eso-graft-lab"><header class="eso-section-head"><div><span class="module-kicker">BANDEJA DE ENXERTOS</span><h5>Registro e Planejamento de Anomalias</h5><p>Enxertos usam a mesma lógica de Potências e Capacidades: Capacidade 1–10, custo de ativação = Capacidade × 2 EP e Vantagem em TCP quando a Capacidade for inferior ao Vigor.</p></div><button class="souls-btn small-btn" type="button" data-action="new-graft">＋ NOVO ENXERTO</button></header><div class="eso-graft-registry">${d.grafts.map(g=>`<article class="eso-graft-card"><div class="eso-graft-symbol">◈</div><div class="eso-graft-copy"><b>${esc(g.name)}</b><span>Cap. ${g.capacity} · ${g.capacity*2} EP · ${g.slots} slot(s)</span><p>${esc(g.effect||'Efeito não registrado.')}</p></div><div class="eso-graft-actions"><button class="souls-btn tiny-btn" type="button" data-action="edit-graft" data-id="${esc(g.id)}">EDITAR</button><button class="souls-btn tiny-btn danger" type="button" data-action="toggle-graft" data-id="${esc(g.id)}">${activeSet.has(g.id)?'REMOVER':'IMPLANTAR'}</button></div></article>`).join('')||'<div class="eso-empty">Nenhum enxerto registrado. A bancada está pronta para o primeiro procedimento.</div>'}</div></section>

      <section class="eso-progress-grid">
        <article class="eso-panel-card"><header><div><span class="module-kicker">PROGRESSÃO EXCLUSIVA</span><h5>Especializações</h5></div></header><div class="eso-specializations">${SPECIALIZATIONS.map(sp=>`<label class="eso-special"><input type="checkbox" data-special="${sp.id}" ${d.specializations.includes(sp.id)?'checked':''}><span><b>${esc(sp.name)}</b><small>${esc(sp.effect)}</small></span></label>`).join('')}</div></article>
        <article class="eso-panel-card"><header><div><span class="module-kicker">DECADÊNCIA</span><h5>Assimilação do Abismo</h5></div><label class="eso-decay-input">Nível <input id="eso-decadence" type="number" min="0" max="5" value="${d.decadence}"></label></header><div class="eso-decay-ladder">${DECADENCE.map(x=>`<div class="${decayActive(d.decadence,x.range)?'active':''}"><b>Nível ${x.range} · ${esc(x.title)}</b><span>${esc(x.effect)}</span></div>`).join('')}</div></article>
      </section>

      <section class="eso-cove-lab"><header class="eso-section-head cove"><div><span class="module-kicker">ENGENHARIA DE COVIS</span><h5>Laboratório de Contenção Territorial</h5><p>Um Covil é uma extensão da vontade do Esotérico no cenário. GC = Capacidade (1–10), PV = GC × 10 e as três defesas usam base 10 + INT.</p></div><button class="souls-btn small-btn" type="button" data-action="new-cove">＋ REGISTRAR COVIL</button></header><div class="eso-cove-operations"><div class="eso-cove-blueprint"><div class="eso-blueprint-grid"></div><div class="eso-blueprint-core">◈</div><span class="label l1">CONTENÇÃO</span><span class="label l2">ÂNCORA</span><span class="label l3">NÚCLEO</span><span class="label l4">CORRUPÇÃO CONTROLADA</span></div><div class="eso-cove-ruleboard"><div class="eso-cove-rule"><b>RÁPIDO</b><span>1 Ação Padrão</span><em>CD 10 + GC · 1 Cena</em></div><div class="eso-cove-rule"><b>PRÁTICO</b><span>10 Minutos</span><em>CD 15 + GC · 24 Horas</em></div><div class="eso-cove-rule"><b>PERPÉTUO</b><span>1 Semana</span><em>CD 20 + GC · Permanente</em></div></div></div><div class="eso-cove-list">${d.coves.map(c=>`<article class="eso-cove-card"><div class="eso-cove-emblem">${c.type==='Perpétuo'?'∞':'◈'}</div><div><b>${esc(c.name)}</b><small>${esc(c.type)} · GC ${c.gc} · CD ${c.cd} · ${esc(c.duration)}</small><p>PV ${c.integrity} · Corporal ${c.defenses.corporal||10+s.int} · Mental ${c.defenses.mental||10+s.int} · Existencial ${c.defenses.existential||10+s.int}</p><em>${esc(c.effects||'Nenhum efeito específico registrado.')}</em></div></article>`).join('')||'<div class="eso-empty">Nenhum Covil registrado. O laboratório de contenção está sem estruturas ativas.</div>'}</div></section>

      <footer class="eso-source-footer"><span>Fonte mecânica: Livro-base Ocultatun: Ecos · seção “Esotérico: O Cientista do Abismo”.</span><span>Proprietário: ${OWNER}</span></footer>`;

    bind(panel);
  }

  function decayActive(level,range){
    if(range==='1-2')return level>=1;
    if(range==='3-4')return level>=3;
    return level>=5;
  }
  function bind(panel){
    panel.querySelector('[data-action="roll"]')?.addEventListener('click',rollAcceptance);
    panel.querySelector('[data-action="heal"]')?.addEventListener('click',useHealing);
    panel.querySelector('[data-action="new-graft"]')?.addEventListener('click',()=>openGraftModal(-1));
    panel.querySelector('[data-action="new-cove"]')?.addEventListener('click',()=>openCoveModal());
    panel.querySelectorAll('[data-action="edit-graft"]').forEach(b=>b.addEventListener('click',()=>openGraftModal(draftGraftIndex(b.dataset.id))));
    panel.querySelectorAll('[data-action="toggle-graft"]').forEach(b=>b.addEventListener('click',()=>toggleGraft(b.dataset.id)));
    panel.querySelectorAll('[data-special]').forEach(i=>i.addEventListener('change',()=>{if(i.checked)state.specializations=[...new Set([...state.specializations,i.dataset.special])];else state.specializations=state.specializations.filter(id=>id!==i.dataset.special);syncDraft();render();}));
    panel.querySelector('#eso-decadence')?.addEventListener('change',e=>{state.decadence=clampInt(e.target.value,0,5);syncDraft();render();});
    panel.querySelector('#eso-medicine-bonus')?.addEventListener('input',e=>{state.medicineBonus=clampInt(e.target.value,-20,20);syncDraft();});
  }
  function draftGraftIndex(id){return state.grafts.findIndex(g=>g.id===id);}
  function toggleGraft(id){
    const g=state.grafts.find(x=>x.id===id);if(!g)return;
    const idx=state.activeGrafts.findIndex(x=>x.id===id);
    if(idx>=0){state.activeGrafts.splice(idx,1);syncDraft();render();return;}
    const used=state.activeGrafts.reduce((n,x)=>n+x.slots,0);
    if(used+g.slots>stats().slots){setError('Não há Slots de Enxerto suficientes.');render();return;}
    if(!state.specializations.includes('simbiose') && state.surgeryUsed){setError('A Autocirurgia desta sessão já foi utilizada.');render();return;}
    state.lastError='';state.activeGrafts.push(clone(g));if(!state.specializations.includes('simbiose'))state.surgeryUsed=true;state.rejectionResult=null;syncDraft();render();
  }
  function rollAcceptance(){
    state.medicineBonus=clampInt(qs('#eso-medicine-bonus')?.value??state.medicineBonus,-20,20);
    const roll=1+Math.floor(Math.random()*20),total=roll+stats().vig+state.medicineBonus,ok=total>=15;
    state.rejectionResult=ok?'accepted':'rejected';
    state.stress += ok?0:1;
    state.lastAcceptance=`1d20 (${roll}) + Vigor (${stats().vig}) + Medicina (${state.medicineBonus}) = ${total} vs CD 15 → ${ok?'ACEITO':'REJEITADO'}${ok?'':' · +1 Estresse permanente até o fim da missão.'}`;
    state.lastError='';syncDraft();render();
  }
  function useHealing(){
    if(state.surgeryUsed&&!state.specializations.includes('simbiose')){setError('A Autocirurgia desta sessão já foi utilizada.');render();return;}
    state.surgeryUsed=true;state.lastHealing={formula:'2d8',recordedAt:new Date().toISOString()};state.lastError='';syncDraft();render();
  }
  function setError(msg){state.lastError=msg;syncDraft();}

  function openGraftModal(index){
    const existing=qs('#eso-graft-modal');if(existing)existing.remove();
    const g=index>=0?state.grafts[index]:null;
    const m=document.createElement('div');m.id='eso-graft-modal';m.className='eso-modal';m.innerHTML=`<div class="eso-modal-card" role="dialog" aria-modal="true" aria-labelledby="eso-graft-title"><header><div><span class="module-kicker">SALA DE CIRURGIA · ENXERTO</span><h5 id="eso-graft-title">${index>=0?'Editar':'Registrar'} Enxerto</h5></div><button type="button" class="eso-modal-close" aria-label="Fechar">×</button></header><div class="eso-form-grid"><label>Nome do Enxerto<input id="eso-g-name" maxlength="90" value="${esc(g?.name||'')}"></label><label>Capacidade (1–10)<input id="eso-g-cap" type="number" min="1" max="10" value="${g?.capacity||1}"></label><label>Slots ocupados<input id="eso-g-slots" type="number" min="1" max="10" value="${g?.slots||1}"></label><label>Custo de ativação<input id="eso-g-cost" type="text" readonly value="${(g?.capacity||1)*2} EP"></label><label class="full">Efeito / poder<textarea id="eso-g-effect" rows="6" maxlength="1200">${esc(g?.effect||'')}</textarea></label></div><div class="eso-rule-note">Enxertos usam a mecânica de Potências e Capacidades. Ativação = Capacidade × 2 EP. Vantagem em TCP quando Capacidade &lt; Vigor.</div><footer><button type="button" class="souls-btn small-btn" data-save>Salvar enxerto</button></footer></div>`;document.body.appendChild(m);m.querySelector('.eso-modal-close').onclick=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)m.remove();});const cap=m.querySelector('#eso-g-cap');cap.oninput=()=>m.querySelector('#eso-g-cost').value=`${clampInt(cap.value,1,10)*2} EP`;m.querySelector('[data-save]').onclick=()=>{const name=m.querySelector('#eso-g-name').value.trim();if(!name){setError('Defina um nome para o enxerto.');m.remove();render();return;}const ng=normalizeGraft({id:g?.id,name,capacity:cap.value,slots:m.querySelector('#eso-g-slots').value,effect:m.querySelector('#eso-g-effect').value});if(index>=0)state.grafts[index]=ng;else state.grafts.push(ng);state.activeGrafts=state.activeGrafts.map(x=>x.id===ng.id?clone(ng):x);state.lastError='';syncDraft();m.remove();render();};
  }
  function openCoveModal(){
    const existing=qs('#eso-cove-modal');if(existing)existing.remove();
    const m=document.createElement('div');m.id='eso-cove-modal';m.className='eso-modal';m.innerHTML=`<div class="eso-modal-card" role="dialog" aria-modal="true" aria-labelledby="eso-cove-title"><header><div><span class="module-kicker">ENGENHARIA DE COVIS</span><h5 id="eso-cove-title">Registrar Covil</h5></div><button type="button" class="eso-modal-close" aria-label="Fechar">×</button></header><div class="eso-form-grid"><label>Nome do Covil<input id="eso-c-name" maxlength="90" placeholder="Ex.: Câmara de Carne Fria"></label><label>Tipo<select id="eso-c-type"><option>Rápido</option><option>Prático</option><option>Perpétuo</option></select></label><label>Graduação de Contenção (GC)<input id="eso-c-gc" type="number" min="1" max="10" value="1"></label><label>Defesa Corporal<input id="eso-c-corp" type="number" min="0" value="${10+stats().int}"></label><label>Defesa Mental<input id="eso-c-mental" type="number" min="0" value="${10+stats().int}"></label><label>Defesa Existencial<input id="eso-c-exist" type="number" min="0" value="${10+stats().int}"></label><label class="full">Efeitos do Covil<textarea id="eso-c-effects" rows="5" maxlength="1200" placeholder="Efeito destrutivo, Aflição ou Anulação de EP que o Covil manifesta."></textarea></label></div><div class="eso-rule-note" id="eso-c-preview">Rápido · 1 Ação Padrão · CD 11 · 1 Cena · PV 10</div><footer><button type="button" class="souls-btn small-btn" data-save>Registrar Covil</button></footer></div>`;document.body.appendChild(m);const type=m.querySelector('#eso-c-type'),gc=m.querySelector('#eso-c-gc'),preview=m.querySelector('#eso-c-preview');function refresh(){const t=COVE_TYPES[type.value],g=clampInt(gc.value,1,10);preview.textContent=`${type.value} · ${t.time} · CD ${t.dc+g} · ${t.duration} · PV ${g*10}`;}type.onchange=refresh;gc.oninput=refresh;m.querySelector('.eso-modal-close').onclick=()=>m.remove();m.addEventListener('click',e=>{if(e.target===m)m.remove();});m.querySelector('[data-save]').onclick=()=>{const name=m.querySelector('#eso-c-name').value.trim()||`Covil ${type.value}`;const t=COVE_TYPES[type.value],g=clampInt(gc.value,1,10);state.coves.push(normalizeCove({name,type:type.value,gc:g,cd:t.dc+g,time:t.time,duration:t.duration,defenses:{corporal:clampInt(m.querySelector('#eso-c-corp').value,0,999),mental:clampInt(m.querySelector('#eso-c-mental').value,0,999),existential:clampInt(m.querySelector('#eso-c-exist').value,0,999)},effects:m.querySelector('#eso-c-effects').value}));state.lastError='';syncDraft();m.remove();render();};
  }

  function capture(){return syncDraft();}
  function load(src){setState(src||{});render();return clone(state);}
  function resetSession(){state=normalize(state);state.surgeryUsed=false;state.rejectionResult=null;state.lastAcceptance='';state.lastError='';syncDraft();render();}

  window.EsotericoSurgery={owner:OWNER,normalize,capture,load,render,resetSession,showState:()=>clone(state),specializations:SPECIALIZATIONS,decadence:DECADENCE,coveTypes:COVE_TYPES};
  window.__esoDraft=normalize(window.__esoDraft||{});

  // Preserve existing data without making this module depend on the old renderer.
  function wrapSave(){
    const prev=window.saveCharacter;
    if(typeof prev!=='function'||prev.__esoCanonicalWrapped)return;
    if(prev.__esoReadsCanonical)return;
    const wrapped=function(){
      if(typeof currentClass!=='undefined'&&currentClass==='Esotérico') window.__esoDraft=capture();
      return prev.apply(this,arguments);
    };
    wrapped.__esoCanonicalWrapped=true;wrapped.__esoReadsCanonical=true;window.saveCharacter=wrapped;
  }
  function wrapBuild(){
    const prev=window.buildCharacterPayloadFromBuilder;
    if(typeof prev!=='function'||prev.__esoBuildWrapped)return;
    const wrapped=function(){const p=prev.apply(this,arguments)||{};if(typeof currentClass!=='undefined'&&currentClass==='Esotérico')p.esoterico=capture();return p;};
    wrapped.__esoBuildWrapped=true;window.buildCharacterPayloadFromBuilder=wrapped;
  }
  function wrapLoad(){
    const prev=window.loadCharacterToBuilder;
    if(typeof prev!=='function'||prev.__esoLoadWrapped)return;
    const wrapped=function(){const r=prev.apply(this,arguments);const idx=arguments[0],arr=arguments[1]||window.characters||[];const ch=arr?.[idx]||{};setState(ch.esoterico||defaultState);setTimeout(()=>{if(typeof currentClass!=='undefined'&&currentClass==='Esotérico')render();},40);return r;};
    wrapped.__esoLoadWrapped=true;window.loadCharacterToBuilder=wrapped;
  }
  function wrapSelect(){
    const prev=window.selectClass;
    if(typeof prev!=='function'||prev.__esoSelectWrapped)return;
    const wrapped=function(){const r=prev.apply(this,arguments);const cls=arguments[0];setTimeout(()=>{if(cls==='Esotérico'){
        if(typeof editingIndex!=='undefined' && (editingIndex===null || editingIndex===undefined)) state=normalize(defaultState);
        else state=normalize(window.__esoDraft||{});
        syncDraft(); render();
      }},30);return r;};
    wrapped.__esoSelectWrapped=true;window.selectClass=wrapped;
  }

  function init(){
    wrapSave();wrapBuild();wrapLoad();wrapSelect();
    if(typeof currentClass!=='undefined'&&currentClass==='Esotérico')setTimeout(render,100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
