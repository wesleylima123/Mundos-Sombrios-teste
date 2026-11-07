/* Mundos Sombrios — Forja transversal / Mesa integrada V2.8.8 */
(function(){
  'use strict';

  const CATEGORY_META = Object.freeze({
    combatente:{title:'Combatente',summary:'Impacto, contenção e domínio do risco imediato.',attrs:{for:3,agi:2,prn:1},pe:5,skills:{exodo:[['Atletismo',2],['Pontaria',2],['Luta',2]],ocultatun:[['Atletismo',2],['Pontaria',2],['Luta',2]]}},
    sobrevivente:{title:'Sobrevivente',summary:'Resiliência, improviso, exploração e permanência em campo.',attrs:{vig:3,agi:3},pe:5,skills:{exodo:[['Tratamento',3],['Intuição',3]],ocultatun:[['Medicina',3],['Sobrevivência',3]]}},
    especialista:{title:'Especialista',summary:'Conhecimento aplicado, suporte técnico e soluções de precisão.',attrs:{int:4,prn:1},pe:15,skills:{exodo:[['Especialidade',4],['Tecnologia',4]],ocultatun:[['Investigação',4],['Artífice',4]]}}
  });

  const CLASS_META = Object.freeze({
    'Combatente':{powers:true},'Sobrevivente':{powers:true},'Especialista':{powers:true},
    'Engenheiro Biológico':{powers:false},'IA Virtudes':{powers:false},'IA Domínios':{powers:false},'IA Principados':{powers:false},
    'Velocitus Bellator':{powers:false},'Aeternus Vitalis':{powers:false},'Mentis Aurorae':{powers:false},
    'Mercador da Morte':{powers:false},'Carrasco Cinzento':{powers:false},'Alquerino':{powers:false},
    'Taumatúrgico':{powers:true},'Hermético':{powers:false},'Esotérico':{powers:true},
    'O Arauto':{powers:true},'O Tocado':{powers:true},'O Condenado':{powers:true},
    'Inquisidor (A Lança)':{powers:true},'Intérprete (Os Olhos)':{powers:true},'Sentinela (A Parede)':{powers:true},'Juízo (A Voz)':{powers:true}
  });

  const ATTR_IDS={for:'attr-for',vig:'attr-vig',agi:'attr-agi',int:'attr-int',prn:'attr-prn',pre:'attr-pre'};
  let listenersBound=false;

  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch));
  const num=(id,fallback=0)=>Number(byId(id)?.value??fallback)||0;
  const toast=(msg,kind='info')=>window.MS_PLATFORM?.toast?.(msg,kind);
  const builder=()=>byId('screen-builder');
  const mode=()=>String(window.currentMode||byId('char-mode')?.value||'exodo');
  const nature=()=>String(window.currentNature||byId('char-nature')?.value||'');
  const className=()=>String(window.currentClass||byId('char-class')?.value||'');
  const category=()=>String(window.currentCategory||byId('char-category')?.value||'').trim().toLowerCase();
  const slug=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';

  function categoryIcon(key){
    if(key==='combatente')return '<span class="ms-cat-field"></span><span class="ms-cat-cross"></span><span class="ms-cat-orb"></span>';
    if(key==='sobrevivente')return '<span class="ms-cat-field"></span><span class="ms-cat-ring"></span><span class="ms-cat-orb"></span>';
    return '<span class="ms-cat-field"></span><span class="ms-cat-prism"></span><span class="ms-cat-cube"></span>';
  }

  function categoryStripHtml(){
    return `<section id="ms-category-strip" class="ms-category-strip" aria-labelledby="ms-category-title">
      <div class="ms-category-strip-copy"><span>FUNÇÃO OPERACIONAL</span><strong id="ms-category-title">Categoria</strong><small>Escolha antes da expansão e da classe.</small></div>
      <input type="hidden" id="char-category" name="category">
      <div class="ms-category-icons" role="radiogroup" aria-label="Categoria fundamental">
        ${Object.entries(CATEGORY_META).map(([key,data])=>`<button type="button" class="ms-category-icon-button" data-category="${key}" role="radio" aria-checked="false" title="${esc(data.title)} — ${esc(data.summary)}"><span class="ms-category-icon" aria-hidden="true">${categoryIcon(key)}</span><span>${esc(data.title)}</span></button>`).join('')}
      </div>
      <div class="ms-category-benefits" id="ms-category-benefits">Selecione uma categoria para aplicar automaticamente atributos, perícias e PE da categoria à ficha.</div>
    </section>`;
  }

  function presetFor(cat=category()){
    const base=CATEGORY_META[cat]; if(!base)return null;
    return {...base,skills:(base.skills?.[mode()]||base.skills?.exodo||[])};
  }

  function benefitText(cat=category()){
    const p=presetFor(cat); if(!p)return 'Selecione uma categoria para aplicar automaticamente atributos, perícias e PE da categoria à ficha.';
    const attrs=Object.entries(p.attrs).map(([k,v])=>`${k.toUpperCase()} +${v}`).join(' · ');
    const skills=p.skills.map(([n,g])=>`${n} ${g}`).join(' · ');
    return `<b>${esc(p.title)}</b> · ${esc(attrs)} · ${esc(skills)} · +${p.pe} PE`;
  }

  function setCategory(value,options={}){
    const next=String(value||'').toLowerCase().trim();
    const previous=category();
    window.currentCategory=next;
    if(byId('char-category'))byId('char-category').value=next;
    const root=builder();
    if(root){root.dataset.category=next;root.dataset.mode=mode();root.dataset.nature=slug(nature());root.dataset.classname=slug(className());}
    root?.querySelectorAll('.ms-category-icon-button').forEach(btn=>{
      const active=btn.dataset.category===next;btn.classList.toggle('active',active);btn.setAttribute('aria-checked',active?'true':'false');
    });
    const benefits=byId('ms-category-benefits'); if(benefits)benefits.innerHTML=benefitText(next);
    if(options.apply!==false)applyCategoryPreset(next,{previous,attributes:options.attributes!==false,skills:options.skills!==false});
    updateArchetypeLock();updateTabsAndTheme();recalculateEnhancedStats();
  }

  function applyCategoryPreset(cat,{previous='',attributes=true,skills=true}={}){
    const next=CATEGORY_META[cat]; const old=CATEGORY_META[previous];
    if(attributes&&next){
      for(const [key,id] of Object.entries(ATTR_IDS)){
        const el=byId(id); if(!el)continue;
        const prior=Number(el.dataset.msCategoryBonus||old?.attrs?.[key]||0)||0;
        const base=(Number(el.value)||0)-prior;
        const bonus=Number(next.attrs?.[key]||0)||0;
        el.value=base+bonus;el.dataset.msCategoryBonus=String(bonus);
      }
    }
    if(skills)renderCategorySkillBenefits(cat);
    renderCategorySheetSummary(cat);
  }

  function renderCategorySkillBenefits(cat=category()){
    const list=byId('skills-list');if(!list)return;
    list.querySelectorAll('.ms-category-native').forEach(n=>n.remove());
    const p=presetFor(cat);if(!p)return;
    p.skills.forEach(([name,grade])=>{
      const div=document.createElement('div');div.className='list-item locked ms-category-native';div.dataset.category=cat;
      div.innerHTML=`<div class="list-item-header"><input type="text" value="Categoria · ${esc(name)} (G${grade})" readonly></div><div class="desc-box" style="margin-top:5px;border-left:none;">Benefício automático de ${esc(p.title)}. Não consome os pontos normais da ficha.</div>`;
      list.appendChild(div);
    });
  }

  function renderCategorySheetSummary(cat=category()){
    const root=byId('tab-stats');if(!root)return;
    let box=byId('ms-category-sheet-summary');
    if(!box){box=document.createElement('section');box.id='ms-category-sheet-summary';box.className='ms-category-sheet-summary';const target=byId('resource-panel');target?.insertAdjacentElement('beforebegin',box);}
    const p=presetFor(cat);
    box.innerHTML=p?`<span>CATEGORIA APLICADA</span><strong>${esc(p.title)}</strong><small>${benefitText(cat)}</small>`:'<span>CATEGORIA</span><strong>Não definida</strong><small>Escolha a categoria na Identidade para aplicar seus benefícios.</small>';
  }

  function bindCategoryButtons(){
    byId('ms-category-strip')?.querySelectorAll('[data-category]').forEach(btn=>{
      btn.onclick=()=>setCategory(btn.dataset.category);
    });
  }

  function ensureBuilderStructure(){
    const root=builder(),identity=byId('tab-identity');if(!root||!identity)return;
    if(!byId('ms-category-strip')){
      const natureGroup=byId('char-nature')?.closest('.form-group');
      if(natureGroup)natureGroup.insertAdjacentHTML('beforebegin',categoryStripHtml());
      else identity.querySelector('.ms-concept-panel')?.insertAdjacentHTML('afterend',categoryStripHtml());
      bindCategoryButtons();
    }
    const natureGroup=byId('char-nature')?.closest('.form-group');
    if(natureGroup){natureGroup.querySelector('h3').textContent='II. Expansão / Origem';const p=natureGroup.querySelector('p');if(p)p.textContent='Escolha a expansão depois de definir sua categoria fundamental.';}
    const classGroup=byId('class-container');
    if(classGroup){classGroup.querySelector('h3').textContent='III. Classe';const p=classGroup.querySelector('p');if(p)p.textContent='A classe define especialização e recursos próprios; a categoria já foi aplicada como camada base da ficha.';}
    const galleryHeading=identity.querySelector('.image-upload-section h3');if(galleryHeading)galleryHeading.textContent='IV. Retrato e Galeria da Alma';
    const resourcePanel=byId('resource-panel');
    if(resourcePanel&&!byId('derived-panel'))resourcePanel.insertAdjacentHTML('afterend',`<section id="derived-panel" class="ms-derived-panel"><div class="ms-section-heading"><span>MECÂNICAS AUTOMÁTICAS</span><h3>Recálculo do cenário</h3><p>Valores derivados acompanham atributos, categoria, classe e campos específicos.</p></div><div class="ms-derived-grid" id="ms-derived-grid"></div></section>`);
    root.dataset.mode=mode();updateArchetypeLock();bindListeners();renderCategorySheetSummary();
  }

  function updateArchetypeLock(){
    const natureGroup=byId('char-nature')?.closest('.form-group');if(natureGroup)natureGroup.classList.toggle('ms-archetype-locked',!category());
    const classGroup=byId('class-container');if(classGroup&&!category())classGroup.style.display='none';
  }

  function bindListeners(){
    if(listenersBound)return;listenersBound=true;
    document.addEventListener('input',evt=>{if(evt.target?.classList?.contains('res-val-input')&&evt.isTrusted)evt.target.dataset.userEdited='true';if(evt.target?.classList?.contains('attr-input')&&evt.isTrusted)recalculateEnhancedStats();},true);
    document.addEventListener('change',evt=>{if(['spec-patamar','spec-alquerino-patamar','spec-recordacao','spec-saturacao','spec-co','spec-pp'].includes(evt.target?.id))recalculateEnhancedStats();},true);
  }

  function patamar(){return Math.max(1,Math.min(4,Number(byId('spec-alquerino-patamar')?.value||byId('spec-patamar')?.value||1)||1));}
  function skillGrade(name){const rx=new RegExp(`${String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}[^\\n]*\\(G(\\d+)\\)`,'i');let best=0;byId('skills-list')?.querySelectorAll('input').forEach(input=>{const m=String(input.value||'').match(rx);if(m)best=Math.max(best,Number(m[1])||0);});return best;}
  function computeDerived(){
    const cls=className(),m=mode(),cat=category();const FOR=num('attr-for'),VIG=num('attr-vig'),AGI=num('attr-agi'),INT=num('attr-int'),PRN=num('attr-prn'),PRE=num('attr-pre'),pat=patamar();
    let pv=Math.max(10,10+10*VIG),resourceLabel=m==='ocultatun'?'Recurso Principal':'CÊ de referência',resourceValue='—',resourceNote='Definido pelo cenário e pela classe.';
    if(cls==='Carrasco Cinzento'){pv=15+10*VIG;resourceLabel='Ameaça Máxima';resourceValue=Math.max(3,VIG+3+(pat>=3?3:0));resourceNote='Teto de Ameaça da classe.';}
    else if(cls==='Mercador da Morte'){resourceLabel='Estamina';resourceValue=6+VIG;resourceNote='Base sem bônus de patente.';}
    else if(cls==='Alquerino'){resourceLabel='EN Máxima';resourceValue=8+INT+PRE+pat;resourceNote='8 + INT + PRE + Patamar.';}
    else if(cls==='Taumatúrgico'){resourceLabel='EP Máxima';resourceValue=15+5*Math.max(INT,PRE);resourceNote='15 + 5 × atributo de manifestação.';}
    else if(cls==='Hermético'){resourceLabel='TR Máxima';resourceValue=Math.max(6,6+INT+VIG);resourceNote='6 + INT + VIG, mínimo 6.';}
    else if(cls==='Esotérico'){pv=12+10*VIG;resourceLabel='EP Máxima';resourceValue=15+5*INT;resourceNote=`15 + 5 × INT · enxertos ${Math.max(2,VIG+1)}.`;}
    else if(m==='exodo'){resourceLabel='CÊ de referência';resourceValue=40;resourceNote='Orçamento varia com campanha e Arquétipo; este painel não substitui o orçamento escolhido pelo Mestre.';}
    const defense=m==='exodo'?10+AGI+skillGrade('Luta'):10+AGI;
    const fortitude=m==='exodo'?VIG:VIG;
    const reflexes=m==='exodo'?Math.max(AGI,PRN):AGI;
    const will=m==='exodo'?Math.max(INT,PRE):PRE;
    const movement=m==='exodo'?6+Math.max(0,AGI):9;
    const initiative=m==='exodo'?PRN:PRN;
    return {pv,resourceLabel,resourceValue,resourceNote,defense,fortitude,reflexes,will,movement,initiative,category:cat};
  }

  function recalculateEnhancedStats(){
    ensureBuilderStructure();const d=computeDerived();const grid=byId('ms-derived-grid');
    if(grid)grid.innerHTML=[['PV Máximos',d.pv,'Vida derivada do VIG e da classe.'],[d.resourceLabel,d.resourceValue,d.resourceNote],['Defesa',d.defense,'Base antes de proteção, Luta ou outras fontes específicas.'],['Fortitude',d.fortitude,'Resistência física.'],['Reflexos',d.reflexes,'Resposta a perigo súbito.'],['Vontade',d.will,'Resistência mental.'],['Deslocamento',`${d.movement} m`,'Movimento terrestre base.'],['Iniciativa',`+${d.initiative}`,'Modificador-base do cenário.']].map(([l,v,n])=>`<article class="ms-derived-card"><span>${esc(l)}</span><strong>${esc(v)}</strong><small>${esc(n)}</small></article>`).join('');
    const orig=window.__msOriginalRecalculateStats;if(typeof orig==='function')try{orig();}catch(e){console.warn('[Forja V2.8.8] recálculo legado:',e);}
  }

  function updateTabsAndTheme(){
    const root=builder();if(!root)return;const cls=className(),meta=CLASS_META[cls]||{};
    root.dataset.mode=mode();root.dataset.category=category();root.dataset.nature=slug(nature());root.dataset.classname=slug(cls);
    const powersBtn=byId('btn-tab-powers'),powersTab=byId('tab-powers');const showPowers=meta.powers!==false&&!!cls;
    if(powersBtn)powersBtn.style.display=showPowers?'':'none';if(powersTab&&!showPowers&&powersTab.classList.contains('active'))window.openTab?.('tab-identity');
    const ritualsBtn=byId('btn-tab-rituals');if(ritualsBtn)ritualsBtn.style.display=/hermético|hermetico/i.test(cls)?'':'none';
    const alqBtn=byId('btn-tab-alquerino');if(alqBtn)alqBtn.style.display=cls==='Alquerino'?'':'none';
  }

  function patchLifecycle(){
    if(window.__msForjaV288Patched)return;window.__msForjaV288Patched=true;
    if(typeof window.recalculateStats==='function'){window.__msOriginalRecalculateStats=window.recalculateStats;window.recalculateStats=recalculateEnhancedStats;}
    if(typeof window.startBuilder==='function'){
      const orig=window.startBuilder;window.startBuilder=function(){const r=orig.apply(this,arguments);setTimeout(()=>{ensureBuilderStructure();window.currentCategory='';if(byId('char-category'))byId('char-category').value='';setCategory('',{apply:false});},0);return r;};
    }
    if(typeof window.selectNature==='function'){
      const orig=window.selectNature;window.selectNature=function(){ensureBuilderStructure();if(!category()){toast('Escolha Combatente, Sobrevivente ou Especialista antes da expansão.','error');return false;}const r=orig.apply(this,arguments);setTimeout(()=>{updateTabsAndTheme();renderCategorySkillBenefits();},0);return r;};
    }
    if(typeof window.selectClass==='function'){
      const orig=window.selectClass;window.selectClass=function(name,skipAutofill=false){
        const cat=category();
        const generic=['Combatente','Sobrevivente','Especialista'];
        if(generic.includes(String(name)) && cat && String(name).toLowerCase()!==cat){toast(`A classe-base ${name} exige a categoria ${name}. Escolha a opção correspondente ou outra classe da expansão.`,'error');return false;}
        const r=orig.apply(this,arguments);
        setTimeout(()=>{
          if(!skipAutofill){
            for(const id of Object.values(ATTR_IDS)){const el=byId(id);if(el)el.dataset.msCategoryBonus='0';}
            if(generic.includes(String(name))){for(const id of Object.values(ATTR_IDS)){const el=byId(id);if(el)el.value='0';}}
            applyCategoryPreset(cat,{previous:'',attributes:true,skills:true});
          }else{renderCategorySkillBenefits();renderCategorySheetSummary();}
          updateTabsAndTheme();recalculateEnhancedStats();
        },0);
        return r;
      };
    }
    if(typeof window.buildCharacterPayloadFromBuilder==='function'){
      const orig=window.buildCharacterPayloadFromBuilder;window.buildCharacterPayloadFromBuilder=function(){const p=orig.apply(this,arguments);const cat=category();p.category=cat;p.categoryPreset=cat?{name:CATEGORY_META[cat].title,attributes:{...CATEGORY_META[cat].attrs},skills:presetFor(cat).skills.map(([name,grade])=>({name,grade})),equipmentBonusPE:CATEGORY_META[cat].pe}:null;p.derived=computeDerived();p.concept=p.concept||{};p.concept.category=cat;return p;};
    }
    if(typeof window.loadCharacterToBuilder==='function'){
      const orig=window.loadCharacterToBuilder;window.loadCharacterToBuilder=function(index,sourceArray){const source=Array.isArray(sourceArray)?sourceArray:(Array.isArray(window.characters)?window.characters:[]);const ch=source?.[index]||{};window.currentCategory=String(ch.category||ch.concept?.category||'').toLowerCase();const r=orig.apply(this,arguments);setTimeout(()=>{ensureBuilderStructure();setCategory(window.currentCategory,{apply:false});renderCategorySkillBenefits();renderCategorySheetSummary();updateTabsAndTheme();recalculateEnhancedStats();},0);return r;};
    }
    if(typeof window.saveCharacter==='function'){
      const orig=window.saveCharacter;window.saveCharacter=function(event){if(!category()){event?.preventDefault?.();toast('Escolha a categoria fundamental antes de salvar a ficha.','error');return false;}return orig.apply(this,arguments);};
    }
    if(typeof window.enterVTT==='function'){
      const orig=window.enterVTT;window.enterVTT=async function(){const r=await orig.apply(this,arguments);setTimeout(()=>{ensureCampaignInTable();if(window.isVttGM&&window.currentTableData?.id&&String(window.currentTableData.id)!=='draft')Promise.resolve(window.MS_SERVICES?.Games?.setLiveStatus?.(window.currentTableData.id,'active')).catch(()=>null);},80);return r;};
    }
  }

  function ensureCampaignInTable(){
    const shell=byId('ms-table-v3');if(!shell)return;const nav=shell.querySelector('.ms-table-v3-nav');
    if(nav&&!nav.querySelector('[data-open="vtt-campaign-window"]')){const btn=document.createElement('button');btn.type='button';btn.className='gm-only-v3';btn.dataset.open='vtt-campaign-window';btn.textContent='CAMPANHA';btn.hidden=!window.isVttGM;btn.onclick=()=>setTimeout(renderCampaignWindow,0);nav.insertBefore(btn,nav.querySelector('[data-action="director"]')||null);}
    const overlays=shell.querySelector('.ms-table-v3-overlays')||shell;if(!byId('vtt-campaign-window')){const wrap=document.createElement('div');wrap.id='vtt-campaign-window';wrap.className='vtt-floating-window';wrap.innerHTML='<div class="vtt-window-header" id="campaign-window-header"><span class="vtt-font">Campanha em Movimento</span><button class="win-close-btn" type="button" onclick="toggleVttWindow(\'vtt-campaign-window\')">X</button></div><div class="vtt-window-body"><div id="vtt-campaign-root"></div></div>';overlays.appendChild(wrap);try{window.dragElement?.(wrap,'campaign-window-header');}catch(_){} }
    renderCampaignWindow();
  }
  function renderCampaignWindow(){const root=byId('vtt-campaign-root');if(!root||!window.isVttGM)return;root.innerHTML='';try{window.MasterCommandCenter?.render?.(root,window.currentTableData||null);}catch(e){root.innerHTML=`<div class="gm-empty">Falha ao carregar campanha: ${esc(e?.message||e)}</div>`;}}



  patchLifecycle();ensureBuilderStructure();ensureCampaignInTable();
  window.MS_FORJA_V288=Object.freeze({version:'2.8.8',categories:CATEGORY_META,setCategory,computeDerived});
})();
