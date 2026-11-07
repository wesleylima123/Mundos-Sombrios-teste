/*
 * Mundos Sombrios — Linhagem Herdada
 * Skill Tree reestruturada: TIER 1 → TIER 2 → TIER 3.
 * Mantém o campo `tree-unlocked-data` para persistência das fichas.
 */
(function () {
    'use strict';

    const T1 = [
        ['1.1','Fibras de Explosão','P','—',6,'—','+3m de deslocamento permanente.'],
        ['1.2','Couraça Subdérmica','P','—',7,'—','Redução de Dano (RD) Física +2.'],
        ['1.3','Olho do Caçador','P','—',6,'—','+2 em testes de Percepção e Iniciativa.'],
        ['1.4','Golpe Hidráulico','A','—',4,2,'Próximo ataque corpo a corpo causa +1d8 de dano.'],
        ['1.5','Mira Estabilizada','A','—',4,2,'Garante Vantagem no próximo ataque à distância.'],
        ['1.6','Pulso Regenerativo','A','—',5,3,'Recupera 1d6 de Vitalidade instantaneamente.'],
        ['1.7','Tecido Flexível','P','—',5,'—','+2 em testes de Atletismo e Acrobacia.'],
        ['1.8','Mente Analítica','P','—',6,'—','Pode usar Percepção para investigar em combate como ação bônus.'],
        ['1.9','Sangue Oxigenado','P','—',7,'—','Recupera +2 PC em descansos curtos.'],
        ['1.10','Estabilizador Nervoso','P','—',5,'—','Imunidade à condição: Abalado.'],
        ['1.11','Reação de Gatilho','A','—',5,3,'Realiza um ataque extra se um inimigo entrar em sua zona de alcance.'],
        ['1.12','Densidade Óssea','P','—',6,'—','+10 de Vitalidade Máxima.'],
        ['1.13','Salto de Impulso','A','—',3,2,'Salta até 6 metros verticalmente ou horizontalmente.'],
        ['1.14','Sentido de Vibração','P','—',5,'—','Detecta movimento em 9m mesmo através de paredes finas.'],
        ['1.15','Glicose de Guerra','A','—',4,3,'Remove uma condição de Fadiga ou Exaustão atual.'],
        ['1.16','Pele Mimetizada','A','—',6,4,'+5 em testes de Furtividade por 1 cena.'],
        ['1.17','Memória de Combate','P','—',7,'—','Escolha uma arma; você ignora penalidades de uso dela.'],
        ['1.18','Refluxo Ácido','A','—',5,3,'Cospe ácido em cone de 3m (2d6 de dano químico).'],
        ['1.19','Homeostase Térmica','P','—',5,'—','Resistência a dano de Fogo e Gelo.'],
        ['1.20','Adrenalina Pura','A','—',4,2,'Ganha +10 de Iniciativa nesta rodada.']
    ].map(toSkill('LHL','EB'));

    const T2 = [
        ['2.1','Passo de Vulto','A','1.1 OU 1.7',10,5,'Move-se até seu deslocamento sem provocar ataques de oportunidade.'],
        ['2.2','Inquebrável','P','1.2 OU 1.12',12,'—','Reduz em 2 a margem de acerto Crítico Natural sofrido.'],
        ['2.3','Visão de Fraqueza','P','1.3 OU 1.8',10,'—','Seus ataques ignoram 3 pontos de RD do inimigo.'],
        ['2.4','Rajada Bioelétrica','A','1.11',9,6,'Realiza 3 ataques com metade do dano em uma única ação.'],
        ['2.5','Casulo de Carne','A','1.6 OU 1.19',11,7,'Ganha RD 10 contra o próximo ataque sofrido.'],
        ['2.6','Processamento Tático','P','—',15,'—','Soma Intelecto na Defesa (Máximo +3).'],
        ['2.7','Crítico Aprimorado','P','1.17',12,'—','Margem de Crítico das suas armas reduz em 1 (Ex: 20 para 19).'],
        ['2.8','Grito de Atavismo','A','—',8,4,'Inimigos em 6m devem testar Vontade ou ficam Atordoados.'],
        ['2.9','Membros Alongados','P','1.13',10,'—','Aumenta o alcance de ataques corpo a corpo em +1,5m.'],
        ['2.10','Metabolismo de Cura','P','1.9',13,'—','Regenera 2 de Vitalidade por turno em combate.'],
        ['2.11','Rastreio de Fenda','P','1.14',9,'—','Sente a presença de Gene Êxodo em 50 metros.'],
        ['2.12','Sangue Corrosivo','P','1.18',11,'—','Quem te causar dano corpo a corpo sofre 1d10 de dano ácido.'],
        ['2.13','Carga Biocinética','A','1.4 E 1.1',12,6,'Atropela inimigos no caminho do movimento causando dano de Força.'],
        ['2.14','Mente Multiprocessada','P','1.8',14,'—','Pode manter duas ações de concentração simultaneamente.'],
        ['2.15','Vigor de Titã','P','1.12',12,'—','Pode carregar o dobro do peso e tem Vantagem em testes de Força bruta.'],
        ['2.16','Disparo Perfurante','A','1.5',9,5,'Projétil atravessa o primeiro alvo e atinge quem estiver atrás.'],
        ['2.17','Neutralizador de Dor','A','1.10 OU 1.15',8,4,'Ignora penalidades de vitalidade baixa por 1 cena.'],
        ['2.18','Sincronia de Grupo','P','—',13,'—','Aliados em 3m ganham +2 em testes de Perícia.'],
        ['2.19','Camuflagem Ativa','A','1.16',10,6,'Torna-se invisível se não se mover; dura até atacar.'],
        ['2.20','Evolução Adaptativa','P','—',15,'—','Escolha uma imunidade ambiental extra (Capítulo 6).']
    ].map(toSkill('LHL','PC'));

    const T3 = [
        ['3.1','Velocidade da Luz','P','2.1 OU 2.13',25,'—','Deslocamento triplicado; pode correr sobre água ou paredes.'],
        ['3.2','Imortalidade Atávica','P','2.10 E 2.5',30,'—','Se chegar a 0 PV, regenera 50% da vida (1x por semana).'],
        ['3.3','Olhar do Arquiteto','P','2.3 OU 2.14',22,'—','Sucesso automático em qualquer teste de Percepção.'],
        ['3.4','Colapso de Matéria','A','2.7 OU 2.16',20,10,'Ignora completamente a Defesa e RD do alvo em um ataque.'],
        ['3.5','Forma de Coletor','A','2.12 OU 2.9',24,15,'Transforma-se em uma besta de guerra por 1 cena (+5 em Atributos Físicos).'],
        ['3.6','Executor Perfeito','P','2.7 E 2.4',28,'—','Críticos causam o triplo do dano em vez do dobro.'],
        ['3.7','Mente Colmeia Solo','A','2.14',25,12,'Cria um clone físico com metade dos seus PVs por 3 rodadas.'],
        ['3.8','Reação Zero','P','2.1',20,'—','Pode realizar 1 Reação em cada turno de cada inimigo.'],
        ['3.9','Aura de Supressão','A','2.8',18,8,'Inimigos em 10m têm Desvantagem em todos os testes.'],
        ['3.10','Disparo Fantasma','A','2.16 OU 2.19',19,9,'Projétil atravessa objetos sólidos para atingir alvos cobertos.'],
        ['3.11','Homeostase Absoluta','P','2.2 OU 2.17',26,'—','Imunidade a Veneno, Doença, Sangramento e Atordoamento.'],
        ['3.12','Eco Temporal','A','2.6',30,20,'Refaz sua última ação principal imediatamente.'],
        ['3.13','Predador Alfa','P','2.7',22,'—','Sempre que matar um inimigo, recupera 10 PC.'],
        ['3.14','Adaptação Total','P','2.20',20,'—','Imunidade a todos os ambientes hostis da Terra e Fendas.'],
        ['3.15','Impacto de Meteoro','A','2.13 OU 2.15',21,12,'Salta e cai criando explosão de 6m (5d10 de dano).'],
        ['3.16','Manipulação Bio','A','2.11',18,10,'Controla o sistema nervoso de um animal ou mutante (Teste resistido).'],
        ['3.17','Escudo de Vácuo','A','2.5 OU 2.19',22,12,'Próximo ataque que te atingiria é reduzido a zero de dano.'],
        ['3.18','Tecido Mutável','A','1.16',15,6,'Altera aparência, voz e cheiro para qualquer humanoide.'],
        ['3.19','Fúria de Cinco Pontos','A','2.4',26,18,'Realiza 5 ataques em um único alvo instantaneamente.'],
        ['3.20','Ascensão do Sangue','P','(Três de Tier 3)',35,'—','Todos os seus Atributos Físicos aumentam em +2 permanentemente.']
    ].map(toSkill('LHL','PC'));

    function toSkill(cost1, cost2) {
        return row => ({ id: row[0], name: row[1], type: row[2], prereq: row[3], lhl: row[4], resource: row[5], resourceName: cost2, effect: row[6] });
    }

    const all = { 1: T1, 2: T2, 3: T3 };
    const byId = Object.fromEntries([...T1, ...T2, ...T3].map(s => [s.id, s]));
    const t1Ids = new Set(T1.map(s => s.id));
    const t2Ids = new Set(T2.map(s => s.id));
    const t3Ids = new Set(T3.map(s => s.id));
    const branchPositions = [
        { angle: -90, cls: 'up' },
        { angle: 0, cls: 'right' },
        { angle: 90, cls: 'down' },
        { angle: 180, cls: 'left' }
    ];

    // Layout radial fixo: cada ramificação ocupa seu próprio setor.
    // Isso evita sobreposição mesmo quando a árvore está totalmente preenchida.
    function radialPosition(angle, radius) {
        const rad = angle * Math.PI / 180;
        return { x: 50 + Math.cos(rad) * radius, y: 50 + Math.sin(rad) * radius };
    }

    let state = emptyState();
    let activeT1 = null;
    let activeT2 = null;
    let activeTierPanel = null;

    function emptyState() {
        return { t1: [], t2: {}, t3: {} };
    }

    function normalizeState(raw) {
        if (!raw) return emptyState();
        if (Array.isArray(raw)) {
            // Compatibilidade com a árvore antiga: IDs antigos não são convertidos para a nova estrutura.
            return emptyState();
        }
        return {
            t1: Array.isArray(raw.t1) ? raw.t1.filter(id => t1Ids.has(id)).slice(0,4) : [],
            t2: raw.t2 && typeof raw.t2 === 'object' ? Object.fromEntries(Object.entries(raw.t2).filter(([k,v]) => t1Ids.has(k) && Array.isArray(v)).map(([k,v]) => [k, v.filter(id => t2Ids.has(id)).slice(0,2)])) : {},
            t3: raw.t3 && typeof raw.t3 === 'object' ? Object.fromEntries(Object.entries(raw.t3).filter(([k,v]) => t1Ids.has(k) && typeof v === 'string' && t3Ids.has(v))) : {}
        };
    }

    function loadState() {
        try {
            const el = document.getElementById('tree-unlocked-data');
            if (el && el.value) return normalizeState(JSON.parse(el.value));
            if (typeof editingIndex !== 'undefined' && editingIndex !== null && typeof characters !== 'undefined' && characters[editingIndex]?.specificData?.['tree-unlocked-data']) {
                return normalizeState(JSON.parse(characters[editingIndex].specificData['tree-unlocked-data']));
            }
        } catch (e) { console.warn('Falha ao carregar árvore Linhagem Herdada:', e); }
        return emptyState();
    }

    function persist() {
        const el = document.getElementById('tree-unlocked-data');
        if (el) el.value = JSON.stringify(state);
    }

    function esc(value) {
        return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    }

    function prereqIds(prereq) {
        return (prereq.match(/\d+\.\d+/g) || []);
    }

    function prereqSatisfied(skill, selectedIds) {
        if (skill.prereq === '—') return true;
        if (skill.prereq === '(Três de Tier 3)') return Object.keys(state.t3).length >= 3;
        const ids = prereqIds(skill.prereq);
        if (/\bE\b/.test(skill.prereq)) return ids.every(id => selectedIds.has(id));
        return ids.some(id => selectedIds.has(id));
    }



    function skillCard(skill, selected, action, disabledReason) {
        const cost = skill.resource === '—' ? '—' : `${skill.resource} ${skill.resourceName}`;
        const disabled = !!disabledReason;
        return `<button type="button" class="lh-skill-card ${selected?'selected':''} ${disabled?'disabled':''}" ${disabled ? 'disabled' : `onclick="${action}"`}>
            <span class="lh-skill-id">${esc(skill.id)}</span>
            <span class="lh-skill-name">${esc(skill.name)}</span>
            <span class="lh-skill-meta"><b>${esc(skill.type)}</b> · LHL ${skill.lhl} · ${esc(cost)}</span>
            <span class="lh-skill-effect">${esc(skill.effect)}</span>
            <span class="lh-skill-prereq">Pré-requis: ${esc(skill.prereq)}</span>
            ${disabledReason ? `<span class="lh-skill-lock">${esc(disabledReason)}</span>` : ''}
        </button>`;
    }

    function baseMarkup() {
        return `<div class="lh-tree-shell lh-soulslike">
            <div class="lh-tree-head">
                <div><span class="eyebrow">EXPANSÃO · PROJETO ATAVISMO</span><h3>LINHAGEM HERDADA</h3><p>Uma árvore de evolução em três ascensões. O centro desperta a linhagem; cada círculo conquistado abre uma senda mais profunda.</p></div>
                <div class="lh-tree-counter"><strong id="lh-t1-count">0/4</strong><span>despertares</span></div>
            </div>
            <div class="lh-tree-legend" aria-label="Legenda dos tiers">
                <span class="lh-legend-t1">I · DESPERTAR</span><span class="lh-legend-t2">II · SENDA</span><span class="lh-legend-t3">III · ÁPICE</span>
            </div>
            <div class="lh-tree-canvas" id="lh-tree-canvas">
                <div class="lh-tree-ring ring-outer"></div><div class="lh-tree-ring ring-mid"></div><div class="lh-tree-ring ring-inner"></div>
                <svg id="lh-tree-lines" aria-hidden="true"></svg>
                <div id="lh-tree-nodes"></div>
                <button type="button" class="lh-root-node" id="lh-root-node" onclick="window.lhOpenTier1()"><span>◈ ATAVISMO</span><b>LINHAGEM<br>HERDADA</b><small>DESPERTAR</small></button>
            </div>
            <div id="lh-tree-info" class="lh-tree-info"><div class="lh-empty-state"><strong>O Despertar Aguarda</strong><span>Clique no círculo central para revelar as 20 habilidades do Tier I.</span></div></div>
            <input type="hidden" id="tree-unlocked-data" value="">
        </div>`;
    }

    function buildSkillTreeUI(nature) {
        const container = document.getElementById('specific-content-container');
        if (!container) return;
        if (nature !== 'Classer (Linhagem Herdada)') {
            const data = (typeof ruleset !== 'undefined' && ruleset[currentMode]?.natures?.[nature]);
            if (data?.tabHtml) container.innerHTML = data.tabHtml;
            return;
        }
        state = loadState();
        container.innerHTML = baseMarkup();
        activeT1 = null; activeT2 = null; activeTierPanel = null;
        persist();
        render();
    }

    function render() {
        const nodes = document.getElementById('lh-tree-nodes');
        const lines = document.getElementById('lh-tree-lines');
        if (!nodes || !lines) return;
        nodes.innerHTML = ''; lines.innerHTML = '';
        const count = document.getElementById('lh-t1-count');
        if (count) count.textContent = `${state.t1.length}/4`;

        state.t1.forEach((id, index) => {
            const skill = byId[id];
            const branch = branchPositions[index];
            const pos = radialPosition(branch.angle, 22);
            const node = document.createElement('button');
            node.type='button'; node.className=`lh-branch-node lh-tier1 ${branch.cls}`;
            node.style.left=`${pos.x}%`; node.style.top=`${pos.y}%`;
            node.innerHTML=`<span>I · ${esc(skill.id)}</span><b>${esc(skill.name)}</b><small>ABRIR SENDA</small>`;
            node.onclick=()=>openT1(skill.id); nodes.appendChild(node);
            line(50,50,pos.x,pos.y,true);

            const branchT2=state.t2[id]||[];
            branchT2.forEach((t2id,j)=>{
                const s2=byId[t2id], p2=t2Position(branch.angle,j);
                const n2=document.createElement('button'); n2.type='button'; n2.className=`lh-branch-node lh-tier2 ${j===0?'diag-left':'diag-right'}`;
                n2.style.left=`${p2.x}%`; n2.style.top=`${p2.y}%`;
                n2.innerHTML=`<span>II · ${esc(s2.id)}</span><b>${esc(s2.name)}</b><small>SENDA</small>`;
                n2.onclick=()=>openT2(id,s2.id); nodes.appendChild(n2);
                line(pos.x,pos.y,p2.x,p2.y,true);
            });

            const t3id=state.t3[id];
            if(t3id){
                const s3=byId[t3id], parentId=chooseT3Parent(id,s3.id), parentIndex=branchT2.indexOf(parentId);
                if(parentIndex>=0){
                    const p2=t2Position(branch.angle,parentIndex), p3=t3Position(branch.angle);
                    const n3=document.createElement('button'); n3.type='button'; n3.className='lh-branch-node lh-tier3';
                    n3.style.left=`${p3.x}%`; n3.style.top=`${p3.y}%`;
                    n3.innerHTML=`<span>III · ${esc(s3.id)}</span><b>${esc(s3.name)}</b><small>ÁPICE</small>`;
                    n3.onclick=()=>openT3(id,parentId); nodes.appendChild(n3); line(p2.x,p2.y,p3.x,p3.y,true);
                }
            }
        });
    }

    function t2Position(angle, index) {
        // Dois pontos simétricos dentro do setor da ramificação.
        return radialPosition(angle + (index === 0 ? -15 : 15), 37);
    }
    function t3Position(angle) {
        return radialPosition(angle, 42);
    }
    function chooseT3Parent(t1id, t3id) {
        const branch = state.t2[t1id] || [];
        const s3 = byId[t3id];
        const ids = prereqIds(s3.prereq);
        return branch.find(id => ids.includes(id)) || branch[0];
    }
    function line(x1,y1,x2,y2,active) {
        const svg=document.getElementById('lh-tree-lines'); if(!svg)return;
        const el=document.createElementNS('http://www.w3.org/2000/svg','line');
        el.setAttribute('x1',x1+'%'); el.setAttribute('y1',y1+'%'); el.setAttribute('x2',x2+'%'); el.setAttribute('y2',y2+'%'); el.classList.add('lh-tree-line'); if(active)el.classList.add('active'); svg.appendChild(el);
    }

    function infoHeader(title, subtitle) { return `<div class="lh-panel-title"><span class="eyebrow">${esc(subtitle)}</span><h4>${esc(title)}</h4></div>`; }
    function tierGate(label, onclick, count, disabled=false) { return `<button type="button" class="lh-tier-gate ${disabled?'disabled':''}" ${disabled?'disabled':''} onclick="${onclick}"><span>${esc(label)}</span>${count?`<b>${esc(count)}</b>`:''}</button>`; }
    function removeButton(label, onclick) { return `<button type="button" class="souls-btn small-btn danger lh-delete-btn" onclick="${onclick}">⌫ ${esc(label)}</button>`; }

    function openT1(id) {
        activeT1=id; activeT2=null; activeTierPanel=1;
        const s=byId[id], selected=state.t2[id]||[];
        let html=infoHeader(s.name,'TIER I · DESPERTAR LATENTE')+
            `<div class="lh-selected-detail"><span class="lh-type ${s.type==='A'?'active':'passive'}">${s.type==='A'?'ATIVA':'PASSIVA'}</span><p>${esc(s.effect)}</p><div><b>Custo:</b> ${s.lhl} LHL · ${esc(s.resource)} ${esc(s.resourceName||'')}</div></div>`+
            `<div class="lh-tier-gates">${tierGate('II · ESPECIALIZAÇÃO DE SENDA',`window.lhOpenTier2('${id}')`,`${selected.length}/2`)}</div>`+
            (selected.length?`<div class="lh-branch-summary"><b>Senhas abertas nesta ramificação</b>${selected.map(x=>`<span>${esc(byId[x].id)} · ${esc(byId[x].name)}</span>`).join('')}</div>`:'')+
            `<div class="lh-actions-row">${removeButton('REMOVER ESTA HABILIDADE E TODA A RAMIFICAÇÃO',`window.lhRemoveT1('${id}')`)}</div>`;
        document.getElementById('lh-tree-info').innerHTML=html; render();
    }

    function openTier1() {
        activeT1=null; activeT2=null; activeTierPanel=1;
        const selected=new Set(state.t1);
        let html=infoHeader('TIER I · DESPERTAR LATENTE','BASE DA REESTRUTURAÇÃO')+
            `<p class="lh-panel-intro">Escolha até <b>4</b> habilidades essenciais. Cada escolha ocupa um círculo na árvore. Seleções já conquistadas aparecem marcadas.</p>`+
            `<div class="lh-tier-gates centered">${tierGate('I · DESPERTAR LATENTE',`window.lhOpenTier1()`,`${selected.size}/4`)}</div>`+
            `<div class="lh-skill-grid">`;
        T1.forEach(s=>html+=skillCard(s,selected.has(s.id),`window.lhSelectT1('${s.id}')`));
        html+=`</div>`;
        if(selected.size) html+=`<div class="lh-actions-row centered-actions">${removeButton('LIMPAR TODA A ÁRVORE',`window.lhResetTree()`)}</div>`;
        document.getElementById('lh-tree-info').innerHTML=html;
    }

    function selectT1(id) {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        if(state.t1.includes(id)) { openT1(id); return; }
        if(state.t1.length>=4) { openTier1(); toast('Limite de 4 habilidades Tier 1 atingido.'); return; }
        state.t1.push(id); persist(); render(); openT1(id);
    }

    function removeT1(id) {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        state.t1=state.t1.filter(x=>x!==id); delete state.t2[id]; delete state.t3[id]; persist();
        activeT1=null; activeT2=null; render(); openTier1(); toast('Ramificação removida da Linhagem Herdada.');
    }

    function openT2(t1id,t2id) {
        activeT1=t1id; activeT2=t2id; activeTierPanel=2;
        const s=byId[t2id], t1=byId[t1id], selected=state.t2[t1id]||[];
        const t3=state.t3[t1id];
        let html=infoHeader(s.name,'TIER II · ESPECIALIZAÇÃO DE SENDA')+
            `<div class="lh-selected-detail"><span class="lh-type ${s.type==='A'?'active':'passive'}">${s.type==='A'?'ATIVA':'PASSIVA'}</span><p>${esc(s.effect)}</p><div><b>Pré-requisito:</b> ${esc(s.prereq)} · <b>Custo:</b> ${s.lhl} LHL · ${esc(s.resource)} ${esc(s.resourceName||'')}</div></div>`+
            `<div class="lh-tier-gates"><button type="button" class="lh-tier-gate" onclick="window.lhOpenTier3('${t1id}','${t2id}')"><span>III · ÁPICE DO COLETOR</span><b>${t3?'1/1':'0/1'}</b></button></div>`+
            `<div class="lh-actions-row"><button type="button" class="souls-btn small-btn" onclick="window.lhOpenTier2('${t1id}')">VOLTAR À SENDA</button>${removeButton('REMOVER HABILIDADE',`window.lhRemoveT2('${t1id}','${t2id}')`)}</div>`;
        document.getElementById('lh-tree-info').innerHTML=html;
    }

    function openTier2(t1id) {
        const t1=byId[t1id], selected=state.t2[t1id]||[], selectedSet=new Set(selected), allSelectedT1=new Set(state.t1);
        activeT1=t1id; activeT2=null; activeTierPanel=2;
        let html=infoHeader('TIER II · ESPECIALIZAÇÃO DE SENDA',`SENDA DE ${t1.name}`)+
            `<p class="lh-panel-intro">Até <b>2</b> habilidades podem ser conquistadas nesta ramificação. Somente uma delas poderá sustentar o Ápice do Coletor.</p>`+
            `<div class="lh-tier-gates centered">${tierGate('II · ESPECIALIZAÇÃO DE SENDA',`window.lhOpenTier2('${t1id}')`,`${selected.length}/2`)}</div>`+
            `<div class="lh-skill-grid">`;
        T2.forEach(s=>{
            const already=selectedSet.has(s.id), valid=prereqSatisfied(s,allSelectedT1); let reason='';
            if(!valid) reason='Pré-requisitos não atendidos.'; else if(!already&&selected.length>=2) reason='Esta ramificação já possui 2 habilidades Tier 2.';
            html+=skillCard(s,already,`window.lhSelectT2('${t1id}','${s.id}')`,reason);
        });
        html+=`</div><div class="lh-actions-row centered-actions"><button type="button" class="souls-btn small-btn" onclick="window.lhOpenT1('${t1id}')">VOLTAR AO DESPERTAR</button></div>`;
        document.getElementById('lh-tree-info').innerHTML=html; render();
    }

    function selectT2(t1id,t2id) {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        if(!state.t1.includes(t1id)) return;
        const arr=state.t2[t1id]||[];
        if(arr.includes(t2id)) { openT2(t1id,t2id); return; }
        if(arr.length>=2) { openTier2(t1id); toast('Cada ramificação Tier 1 pode possuir no máximo 2 habilidades Tier 2.'); return; }
        const s=byId[t2id];
        if(!prereqSatisfied(s,new Set(state.t1))) { openTier2(t1id); toast('Pré-requisitos da habilidade não atendidos.'); return; }
        state.t2[t1id]=[...arr,t2id]; persist(); render(); openT2(t1id,t2id);
    }

    function removeT2(t1id,t2id) {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        const arr=(state.t2[t1id]||[]).filter(id=>id!==t2id); state.t2[t1id]=arr;
        const t3id=state.t3[t1id];
        if(t3id){ const s3=byId[t3id]; const globalT2=new Set(Object.values(state.t2).flat()); const branchT2=new Set(arr);
            const valid=prereqSatisfied(s3,globalT2) && (t3id==='3.20'?Object.keys(state.t3).length>=3:prereqSatisfied(s3,branchT2));
            if(!valid) delete state.t3[t1id];
        }
        persist(); render(); openT1(t1id); toast('Habilidade Tier 2 removida.');
    }

    function openT3(t1id,t2id) {
        activeT1=t1id; activeT2=t2id; activeTierPanel=3;
        const s=byId[t2id], current=state.t3[t1id], branchT2=new Set(state.t2[t1id]||[]), globalT2=new Set(Object.values(state.t2).flat());
        let html=infoHeader(s.name,'TIER III · ÁPICE DO COLETOR')+
            `<div class="lh-selected-detail"><span class="lh-type ${s.type==='A'?'active':'passive'}">${s.type==='A'?'ATIVA':'PASSIVA'}</span><p>${esc(s.effect)}</p><div><b>Pré-requisito:</b> ${esc(s.prereq)} · <b>Custo:</b> ${s.lhl} LHL · ${esc(s.resource)} ${esc(s.resourceName||'')}</div></div>`+
            `<h5 class="lh-section-title">Escolha o ápice desta ramificação</h5><div class="lh-skill-grid">`;
        T3.forEach(x=>{
            const already=current===x.id, valid=prereqSatisfied(x,globalT2)&&(x.id==='3.20'?Object.keys(state.t3).length>=3:prereqSatisfied(x,branchT2)), occupied=current&&!already;
            let reason=''; if(!valid) reason=x.id==='3.20'?'Requer três habilidades de Tier 3 já selecionadas.':'Pré-requisitos não atendidos nesta senda.'; else if(occupied) reason='Esta ramificação já possui um Ápice do Coletor.';
            html+=skillCard(x,already,`window.lhSelectT3('${t1id}','${x.id}')`,reason);
        });
        html+=`</div><div class="lh-actions-row centered-actions"><button type="button" class="souls-btn small-btn" onclick="window.lhOpenTier2('${t1id}')">VOLTAR À SENDA</button>${current?removeButton('REMOVER ÁPICE',`window.lhRemoveT3('${t1id}')`):''}</div>`;
        document.getElementById('lh-tree-info').innerHTML=html; render();
    }

    function selectT3(t1id,t3id) {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        if((state.t3[t1id]||null)===t3id) { openT3(t1id, (state.t2[t1id]||[])[0]); return; }
        if(state.t3[t1id]) { toast('Esta ramificação já possui um Tier 3.'); return; }
        const s=byId[t3id], branchT2=new Set(state.t2[t1id]||[]), globalT2=new Set(Object.values(state.t2).flat());
        if(!(prereqSatisfied(s,globalT2)&&(t3id==='3.20'?Object.keys(state.t3).length>=3:prereqSatisfied(s,branchT2)))) { toast('Pré-requisitos do Tier 3 não atendidos.'); return; }
        state.t3[t1id]=t3id; persist(); render(); openT3(t1id,(state.t2[t1id]||[]).find(id=>prereqIds(s.prereq).includes(id))||(state.t2[t1id]||[])[0]);
    }

    function removeT3(t1id) {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        delete state.t3[t1id]; persist(); render(); openTier2(t1id); toast('Ápice removido da ramificação.');
    }

    function resetTree() {
        if (typeof isEditMode !== 'undefined' && !isEditMode) return;
        state=emptyState(); persist(); render(); openTier1();
    }

    function toast(msg) {
        if(typeof showToast==='function') { showToast(msg); return; }
        console.info(msg);
    }

    // API global para os botões criados dinamicamente.
    window.lhOpenTier1 = openTier1;
    window.lhSelectT1 = selectT1;
    window.lhOpenT1 = openT1;
    window.lhOpenTier2 = openTier2;
    window.lhSelectT2 = selectT2;
    window.lhOpenTier3 = openT3;
    window.lhSelectT3 = selectT3;
    window.lhResetTree = resetTree;
    window.lhRemoveT1 = removeT1;
    window.lhRemoveT2 = removeT2;
    window.lhRemoveT3 = removeT3;

    // Sobrescreve apenas a árvore da Linhagem Herdada; a árvore do Envolto continua usando o código existente.
    const originalBuild = window.buildSkillTreeUI;
    window.buildSkillTreeUI = function (nature) {
        if (nature === 'Classer (Linhagem Herdada)') return buildSkillTreeUI(nature);
        return originalBuild ? originalBuild(nature) : undefined;
    };
})();
