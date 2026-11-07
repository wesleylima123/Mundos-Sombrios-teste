/*
 * Mundos Sombrios - Arquiteto de Linhagem (Aprimorador)
 * Implementação exclusiva da expansão do Aprimorador.
 * Fonte mecânica: PDF "ARQUÉTIPO ÚNICO: ARQUITETO DE LINHAGEM (APRIMORADOR)".
 */
(function(){
  'use strict';

  const NATURE = 'Arquiteto de Linhagem (Aprimorador)';
  const STATE_ID = 'aprimorador-state';
  const TECH_ID = 'spec-tecnologia';
  const MED_ID = 'spec-medicina';
  const TRAT_ID = 'spec-tratamento';

  const bioforge = [
    {id:'stability-injector', name:'Injetor de Estabilidade', cost:5, effect:'Consumível. Cura 1d6 no teste de TCG de um Nexo.'},
    {id:'suppressor-dart', name:'Dardo Supressor', cost:5, effect:'Ataque à distância. Desativa todos os Prodígios do alvo por 1 rodada.'},
    {id:'neural-sync', name:'Sincronizador Neural', cost:6, effect:'Permite que dois Nexos compartilhem um prodígio por 1d4 rodadas; exige TCG CD 25.'},
    {id:'rupture-stabilizer', name:'Estabilizador de Ruptura', cost:15, effect:'Impede uma Ruptura Genética quando o Nexo falhar no TCG; quebra após o uso.'}
  ];

  const mastery = [
    {level:1, pp:0, title:'Iniciado', bonus:0, unlock:'Protocolos Básicos, Injetores, Tutoria.'},
    {level:2, pp:20, title:'Especialista', bonus:5, unlock:'O Despertar, Dardos Supressores.'},
    {level:3, pp:50, title:'Mestre', bonus:10, unlock:'Catalisador de Ascendência, Sincronizadores.'},
    {level:4, pp:100, title:'Arquiteto', bonus:15, unlock:'Selo de Linhagem, Xeno-Bloqueio Permanente.'},
    {level:5, pp:200, title:'Iluminado', bonus:20, unlock:'Soberania Gênica (pode criar novos Estigmas).'}
  ];

  function num(v, fallback=0){ const n=Number(v); return Number.isFinite(n) ? n : fallback; }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg, type='info'){ window.MS_PLATFORM?.toast?.(msg, type); }
  function stateDefault(){
    return {
      tecnologia:0,
      medicina:0,
      tratamento:0,
      pp:0,
      dsAllocated:0,
      bioforge:[],
      protocols:[],
      customProtocols:[],
      procedures:[],
      awakened:{},
      ascendance:{},
      hereditary:{},
      xenoTemporary:{},
      xenoPermanent:{},
      masteryLevel:1
    };
  }
  function readState(){
    try{
      const el=document.getElementById(STATE_ID);
      if(el?.value){ const parsed=JSON.parse(el.value); return {...stateDefault(),...parsed}; }
    }catch(err){ console.warn('[Aprimorador] Falha ao ler estado:',err); }
    return stateDefault();
  }
  let state=stateDefault();

  function writeState(){
    const el=document.getElementById(STATE_ID);
    if(el) el.value=JSON.stringify(state);
    syncDerived();
  }

  function getInt(){ return num(document.getElementById('attr-int')?.value); }
  function dsMax(){
    const raw=(getInt()+state.tecnologia)*3;
    const bonus=(currentMastery()?.bonus||0);
    return Math.max(0,raw+bonus);
  }
  function dsAvailable(){ return Math.max(0, dsMax()-num(state.dsAllocated)); }
  function currentMastery(){
    let found=mastery[0];
    for(const row of mastery){ if(state.pp>=row.pp) found=row; }
    state.masteryLevel=found.level;
    return found;
  }

  function setResource(type,value){
    const el=document.querySelector(`#resource-panel .res-val-input[data-type="${CSS.escape(type)}"]`);
    if(el) el.value=String(value);
  }

  function syncDerived(){
    currentMastery();
    setResource('Dados de Seq. (DS)', dsAvailable());
    setResource('Pesquisa (PP %)', state.pp);
    setResource('Nível Maestria', state.masteryLevel);
    const ds=document.getElementById('ae-ds-available');
    const max=document.getElementById('ae-ds-max');
    const pp=document.getElementById('ae-pp');
    const ml=document.getElementById('ae-mastery');
    if(ds) ds.textContent=dsAvailable();
    if(max) max.textContent=dsMax();
    if(pp) pp.textContent=`${state.pp}%`;
    if(ml) ml.textContent=`N${state.masteryLevel} · ${currentMastery().title}`;
    refreshButtons();
  }

  function canSpend(cost){ return dsAvailable()>=cost; }
  function spendDS(cost, reason){
    cost=num(cost);
    if(cost<0) return false;
    if(!canSpend(cost)){ alert(`DS insuficientes. Disponível: ${dsAvailable()} · necessário: ${cost}.`); return false; }
    state.dsAllocated += cost;
    state.protocols.push({type:'allocation', cost, reason, at:new Date().toISOString()});
    writeState();
    return true;
  }

  function givePP(amount,source){
    amount=num(amount);
    if(amount<=0) return;
    state.pp = Math.min(200, state.pp + amount);
    state.procedures.push({type:'pp', amount, source, at:new Date().toISOString()});
    writeState();
    renderProgress();
    toast(`+${amount}% PP registrado: ${source}.`);
  }

  function rollDie(sides){ return Math.floor(Math.random()*sides)+1; }
  function rollD20(mod=0){ const d=rollDie(20); return {d, total:d+num(mod)}; }
  function addLog(text){
    state.procedures.push({type:'log', text, at:new Date().toISOString()});
    writeState();
    renderLogs();
  }


  function baseMarkup(){
    return `
      <div class="ae-lab" id="ae-lab">
        <textarea id="${STATE_ID}" hidden></textarea>
        <div class="ae-header">
          <div class="ae-brand"><span class="ae-chip">ÊXODO · EXPANSÃO</span><h3>ENGENHARIA DE LINHAGEM</h3><p>Laboratório de Genética Aplicada · Arquiteto de Linhagem</p></div>
          <div class="ae-status"><span class="ae-dot"></span><b>GENOMA ESTÉRIL · GENE ÊXODO INATIVO</b><small>Sem Assimilação · Sem Estresse Genético · Sem CÊ · Sem Prodígios</small></div>
        </div>

        <div class="ae-grid-top">
          <section class="ae-card ae-core">
            <div class="ae-card-title"><span>◉</span> NÚCLEO DE SEQUENCIAMENTO</div>
            <div class="ae-metrics">
              <div><small>DS DISPONÍVEL</small><strong id="ae-ds-available">0</strong><em>Dados de Sequenciamento</em></div>
              <div><small>RESERVA MÁXIMA</small><strong id="ae-ds-max">0</strong><em>(Intelecto + Tecnologia) × 3 + Mestria</em></div>
              <div><small>PESQUISA</small><strong id="ae-pp">0%</strong><em>Porcentagem de Pesquisa</em></div>
              <div><small>MAESTRIA</small><strong id="ae-mastery">N1 · Iniciado</strong><em>Progressão genética</em></div>
            </div>
            <div class="ae-input-grid">
              <label>TECNOLOGIA <input id="${TECH_ID}" type="number" min="0" value="0" inputmode="numeric"></label>
              <label>MEDICINA <input id="${MED_ID}" type="number" min="0" value="0" inputmode="numeric"></label>
              <label>TRATAMENTO <input id="${TRAT_ID}" type="number" min="0" value="0" inputmode="numeric"></label>
            </div>
            <p class="ae-note">O Aprimorador não manifesta Potências nem utiliza Carga Êxodo. O DS é uma reserva de alocação presa em protocolos, intervenções ou Bio-Forja.</p>
          </section>
          <section class="ae-card ae-procedure-board">
            <div class="ae-card-title"><span>⌬</span> MONITOR DE PROCEDIMENTOS</div>
            <div class="ae-board-line"><b>INTELLECTUS</b><span id="ae-int-readout">0</span></div>
            <div class="ae-board-line"><b>VIGOR-ALVO</b><input id="ae-target-vig" type="number" min="0" value="0"><span>limite de DS temporário</span></div>
            <div class="ae-board-actions">
              <button type="button" class="ae-btn" onclick="window.aeAnalyzeField()">ANÁLISE DE CAMPO · +1d6 DS</button>
              <button type="button" class="ae-btn" onclick="window.aeLongRest()">MANUTENÇÃO · RECUPERAR RESERVA</button>
            </div>
          </section>
        </div>

        <section class="ae-card ae-section">
          <div class="ae-card-title"><span>🧠</span> INTERVENÇÃO & TUTORIA</div>
          <div class="ae-two-col">
            <div class="ae-protocol">
              <h4>Tutoria Evolutiva</h4>
              <p><b>Otimização de Treino:</b> qualquer aliado sob supervisão direta reduz a CD de Evolução Gradual em valor igual ao Intelecto do Aprimorador, mínimo 1.</p>
              <p><b>Controle de TCG:</b> o Aprimorador usa sua ação para orientar um aliado em crise; o Nexo recebe Vantagem no Teste de Controle Genético.</p>
              <div class="ae-readout">Redução de CD: <strong id="ae-tutoria-bonus">1</strong> · Vantagem no TCG: <strong>ATIVA</strong></div>
            </div>
            <div class="ae-protocol">
              <h4>Protocolos de Alocação</h4>
              <label>DS por protocolo <input id="ae-alloc-ds" type="number" min="1" value="3"></label>
              <div class="ae-chip-row">
                <button type="button" class="ae-btn small" onclick="window.aeAllocate('Estabilidade',3)">ESTABILIDADE · 3 DS</button>
                <button type="button" class="ae-btn small" onclick="window.aeAllocate('Eficiência',5)">EFICIÊNCIA · 5 DS</button>
                <button type="button" class="ae-btn small" onclick="window.aeAllocate('Sobrevida',4)">SOBREVIDA · 4 DS</button>
              </div>
              <p class="ae-mini">Alocação temporária: até o Vigor do aliado por vez, duração de 1d4 rodadas.</p>
              <div class="ae-permanent-box">
                <b>ALTERAÇÃO PERMANENTE DE CARACTERÍSTICA</b>
                <label>Alvo <input id="ae-perm-target" placeholder="Nome do aliado"></label>
                <label>Estado/Característica a alterar <input id="ae-perm-effect" placeholder="Descreva o estado permanente"></label>
                <button type="button" class="ae-btn small" onclick="window.aePermanentProtocol()">EXECUTAR · TESTE DE VIGOR</button>
                <p class="ae-mini">Teste do aliado: Vigor CD 20 + DS alocados. Sucesso = alteração permanente; falha = 3º grau de Assimilação automático. Uma vez por personagem.</p>
              </div>
            </div>
          </div>
          <div class="ae-protocol-table">
            <div><b>Protocolo de Estabilidade</b><span>3 DS</span><p>+2 fixo em todos os TCGs do alvo, após sucesso em Vigor CD 20 + DS gasto.</p></div>
            <div><b>Protocolo de Eficiência</b><span>5 DS</span><p>Reduz o custo de CÊ de uma Potência específica do aliado em -2, mínimo 1.</p></div>
            <div><b>Protocolo de Sobrevida</b><span>4 DS</span><p>O aliado ignora a primeira penalidade de ferimento sofrida na cena.</p></div>
          </div>
        </section>

        <section class="ae-card ae-section">
          <div class="ae-card-title"><span>🧬</span> ENGENHARIA DE LINHAGEM · PROCEDIMENTOS-CHAVE</div>
          <div class="ae-procedure-grid">
            <article class="ae-procedure-card">
              <div class="ae-proc-head"><b>A · O DESPERTAR</b><span>15 DS</span></div>
              <p>Único método seguro para transformar um Nexo Passivo em Nexo Ativo.</p>
              <label>Alvo <input id="ae-awaken-target" placeholder="Nome do Nexo"></label>
              <label>Estigma escolhido <input id="ae-awaken-stigma" placeholder="Somático, Sensorial..."></label>
              <label>Primeira Potência <input id="ae-awaken-potency" placeholder="Potência do despertar"></label>
              <button type="button" class="ae-btn primary" onclick="window.aeAwaken()">EXECUTAR DESPERTAR · 15 DS</button>
            </article>
            <article class="ae-procedure-card">
              <div class="ae-proc-head"><b>B · CATALISADOR DE ASCENDÊNCIA</b><span>CD 25</span></div>
              <p>Exige Intelecto + Medicina e materiais raros (Vestígios). Sucesso desbloqueia a Partícula Nexo-Terminal e o acesso às tabelas de Nexos Superiores.</p>
              <label>Alvo <input id="ae-asc-target" placeholder="Nome do Nexo"></label>
              <label>Vestígios disponíveis <input id="ae-vestiges" placeholder="Descreva os materiais"></label>
              <button type="button" class="ae-btn primary" onclick="window.aeAscend()">TESTAR CATALISADOR · CD 25</button>
            </article>
            <article class="ae-procedure-card">
              <div class="ae-proc-head"><b>C · CONTROLE HEREDITÁRIO</b><span>SELO</span></div>
              <p>Editar o Gene Êxodo para torná-lo hereditário, garantindo que toda a descendência de um Nexo possua o mesmo Estigma e Prodígio.</p>
              <label>Alvo/linhagem <input id="ae-hered-target" placeholder="Nome do Nexo ou clã"></label>
              <label>Estigma/Prodígio herdado <input id="ae-hered-trait" placeholder="Defina a assinatura genética"></label>
              <button type="button" class="ae-btn primary" onclick="window.aeHereditary()">APLICAR SELO DE LINHAGEM</button>
            </article>
            <article class="ae-procedure-card">
              <div class="ae-proc-head"><b>D · XENO-BLOQUEIO</b><span>HUMANIZAÇÃO</span></div>
              <p><b>Temporário:</b> torna o Nexo "Humano" por dias ou meses. <b>Permanente:</b> 25 DS, Intelecto + Tratamento CD 30, 1d12 dias; remove o Gene Êxodo e todos os poderes. Em caso de falha, o alvo pode morrer.</p>
              <label>Alvo <input id="ae-xeno-target" placeholder="Nome do Nexo"></label>
              <div class="ae-chip-row"><button type="button" class="ae-btn small" onclick="window.aeXenoTemporary()">TEMPORÁRIO</button><button type="button" class="ae-btn small danger" onclick="window.aeXenoPermanent()">PERMANENTE · 25 DS</button></div>
            </article>
          </div>
        </section>

        <section class="ae-card ae-section">
          <div class="ae-card-title"><span>🧪</span> BIO-FORJA · DISPOSITIVOS ORGÂNICOS</div>
          <div class="ae-bio-grid" id="ae-bio-grid"></div>
          <div class="ae-readout-line">DS investidos na Bio-Forja: <strong id="ae-bio-spent">0</strong></div>
        </section>

        <section class="ae-card ae-section">
          <div class="ae-card-title"><span>📈</span> MESTRIA & PESQUISA</div>
          <div class="ae-pp-actions">
            <button type="button" class="ae-btn small" onclick="window.aeGivePP(1,'Análise de Nexo Ativo · 1% por nível analisado')">+1% · ANÁLISE</button>
            <button type="button" class="ae-btn small" onclick="window.aeGivePP(5,'Decifrar Artefatos · faixa mínima')">+5% · ARTEFATO</button>
            <button type="button" class="ae-btn small" onclick="window.aeGivePP(10,'Procedimento Bem-Sucedido · limite superior')">+10% · PROCEDIMENTO</button>
            <button type="button" class="ae-btn small" onclick="window.aeGivePP(5,'Coleta de Amostras Raras')">+5% · AMOSTRA</button>
          </div>
          <div class="ae-mastery-table">${mastery.map(m=>`<div class="ae-mastery-row ${m.level===state.masteryLevel?'active':''}"><span>N${m.level}</span><b>${m.title}</b><span>${m.pp}% PP</span><span>+${m.bonus} DS</span><em>${m.unlock}</em></div>`).join('')}</div>
          <div class="ae-progress-mechanics">
            <p><b>Expansão do Catálogo:</b> a cada nível de Mestria, desenvolva 1 novo Protocolo de Alocação customizado.</p>
            <p><b>Refinamento da Bio-Forja:</b> no nível 3, os itens passam a usar o modificador de Intelecto no efeito.</p>
            <p><b>Redução de Margem de Erro:</b> N2 pode repetir um teste de Medicina falho por cena; N4 Sucessos Críticos em Medicina não consomem DS do procedimento.</p>
          </div>
        </section>

        <section class="ae-card ae-section">
          <div class="ae-card-title"><span>🧾</span> REGISTRO DO LABORATÓRIO</div>
          <div id="ae-logs" class="ae-logs"></div>
        </section>
      </div>`;
  }

  function build(preserveMemoryState=false){
    const container=document.getElementById('specific-content-container');
    if(!container) return;
    if(currentNature!==NATURE) return;
    if(!preserveMemoryState) state=readState();
    container.innerHTML=baseMarkup();
    const tech=document.getElementById(TECH_ID); tech.value=state.tecnologia;
    const med=document.getElementById(MED_ID); med.value=state.medicina;
    const trat=document.getElementById(TRAT_ID); trat.value=state.tratamento;
    [tech,med,trat,document.getElementById('attr-int')].forEach(el=>{ el?.addEventListener('input',()=>{ state.tecnologia=num(tech?.value); state.medicina=num(med?.value); state.tratamento=num(trat?.value); writeState(); renderAll(); }); });
    writeState();
    renderAll();
  }

  function renderAll(){
    currentMastery();
    const int=document.getElementById('ae-int-readout'); if(int) int.textContent=getInt();
    const tut=document.getElementById('ae-tutoria-bonus'); if(tut) tut.textContent=Math.max(1,getInt());
    renderBioforge(); renderProgress(); renderLogs(); syncDerived();
  }

  function renderBioforge(){
    const grid=document.getElementById('ae-bio-grid'); if(!grid) return;
    const counts={}; state.bioforge.forEach(x=>counts[x.id]=(counts[x.id]||0)+1);
    grid.innerHTML=bioforge.map(item=>`<article class="ae-bio-card"><div class="ae-bio-head"><b>${esc(item.name)}</b><span>${item.cost} DS</span></div><p>${esc(item.effect)}</p><div class="ae-bio-footer"><span>Produzidos: ${counts[item.id]||0}</span><button type="button" class="ae-btn small" ${canSpend(item.cost)?'':'disabled'} onclick="window.aeBioforge('${item.id}')">FORJAR</button></div></article>`).join('');
    const spent=state.bioforge.reduce((a,x)=>a+num(x.cost),0); const el=document.getElementById('ae-bio-spent'); if(el) el.textContent=spent;
  }

  function renderProgress(){
    const root=document.querySelector('.ae-mastery-table'); if(!root) return;
    root.innerHTML=mastery.map(m=>`<div class="ae-mastery-row ${m.level===state.masteryLevel?'active':''}"><span>N${m.level}</span><b>${m.title}</b><span>${m.pp}% PP</span><span>+${m.bonus} DS</span><em>${m.unlock}</em></div>`).join('');
  }

  function renderLogs(){
    const el=document.getElementById('ae-logs'); if(!el)return;
    const logs=state.procedures.slice(-12).reverse();
    el.innerHTML=logs.length?logs.map(x=>`<div class="ae-log"><small>${new Date(x.at||Date.now()).toLocaleString('pt-BR')}</small><span>${esc(x.text||`${x.type||'evento'} · ${x.amount||''}`)}</span></div>`).join(''):'<div class="ae-empty">Nenhum procedimento registrado.</div>';
  }

  function refreshButtons(){
    const grid=document.getElementById('ae-bio-grid'); if(grid) renderBioforge();
  }

  function restore(data){
    if(currentNature!==NATURE) return;
    state=stateDefault();
    try{
      if(data?.[STATE_ID]) state={...state,...JSON.parse(data[STATE_ID])};
      state.tecnologia=num(data?.[TECH_ID],state.tecnologia);
      state.medicina=num(data?.[MED_ID],state.medicina);
      state.tratamento=num(data?.[TRAT_ID],state.tratamento);
    }catch(err){ console.warn('[Aprimorador] Falha ao restaurar ficha:',err); }
    build(true);
  }

  function analyzeField(){
    const gain=rollDie(6); state.dsAllocated=Math.max(0,state.dsAllocated-gain); state.procedures.push({type:'analysis',text:`Análise de Campo recuperou ${gain} DS.`,at:new Date().toISOString()}); writeState(); renderLogs(); toast(`Análise de Campo: +${gain} DS.`); }
  function longRest(){ state.dsAllocated=0; state.procedures.push({type:'rest',text:'Manutenção de Sistema: reserva de DS recuperada integralmente.',at:new Date().toISOString()}); writeState(); renderLogs(); toast('Reserva de DS restaurada.'); }
  function allocate(name,cost){
    if(name==='Estabilidade' && cost!==3) cost=3;
    if(name==='Eficiência' && cost!==5) cost=5;
    if(name==='Sobrevida' && cost!==4) cost=4;
    const targetVig=num(document.getElementById('ae-target-vig')?.value);
    if(targetVig>0 && cost>targetVig){ alert(`O DS alocado por vez não pode ultrapassar o Vigor do aliado (${targetVig}).`); return; }
    if(!spendDS(cost,`Protocolo de ${name}`)) return;
    const duration=rollDie(4); addLog(`Protocolo de ${name}: ${cost} DS alocados por ${duration} rodadas. A aplicação exige os testes definidos pelo protocolo.`);
    toast(`Protocolo de ${name} preparado.`);
  }
  function awaken(){
    if(state.masteryLevel<2){ alert('O Despertar exige Nível de Mestria 2.'); return; }
    const target=document.getElementById('ae-awaken-target')?.value.trim(); const stigma=document.getElementById('ae-awaken-stigma')?.value.trim(); const potency=document.getElementById('ae-awaken-potency')?.value.trim();
    if(!target||!stigma||!potency){ alert('Preencha alvo, Estigma e primeira Potência.'); return; }
    if(!spendDS(15,'O Despertar')) return;
    state.awakened[target]={stigma,potency,at:new Date().toISOString()}; writeState(); addLog(`O Despertar executado em ${target}: Estigma "${stigma}" · Potência "${potency}".`); givePP(10,'Procedimento Bem-Sucedido · O Despertar');
  }
  function ascend(){
    if(state.masteryLevel<3){ alert('O Catalisador de Ascendência exige Nível de Mestria 3.'); return; }
    const target=document.getElementById('ae-asc-target')?.value.trim(); const vest=document.getElementById('ae-vestiges')?.value.trim();
    if(!target||!vest){ alert('Informe o alvo e os Vestígios.'); return; }
    const mod=getInt()+state.medicina; const roll=rollD20(mod); const success=roll.total>=25;
    state.ascendance[target]={vestiges:vest,roll:roll.total,success,at:new Date().toISOString()}; writeState(); addLog(`Catalisador de Ascendência · ${target}: ${roll.d}+${mod} = ${roll.total} vs CD 25 · ${success?'SUCESSO: Partícula Nexo-Terminal desbloqueada.':'FALHA.'}`); if(success) givePP(10,'Procedimento Bem-Sucedido · Ascendência');
  }
  function hereditary(){
    if(state.masteryLevel<4){ alert('O Selo de Linhagem exige Nível de Mestria 4.'); return; }
    const target=document.getElementById('ae-hered-target')?.value.trim(); const trait=document.getElementById('ae-hered-trait')?.value.trim();
    if(!target||!trait){ alert('Informe alvo/linhagem e o Estigma/Prodígio hereditário.'); return; }
    state.hereditary[target]={trait,at:new Date().toISOString()}; writeState(); addLog(`Selo de Linhagem aplicado a ${target}: ${trait}.`);
  }
  function xenoTemporary(){
    if(state.masteryLevel<4){ alert('A Humanização faz parte da maestria superior; use a progressão do Aprimorador para desbloqueá-la.'); return; }
    const target=document.getElementById('ae-xeno-target')?.value.trim(); if(!target){alert('Informe o alvo.');return;}
    state.xenoTemporary[target]={active:true,at:new Date().toISOString()}; writeState(); addLog(`Xeno-Bloqueio temporário aplicado a ${target}: estado Humano por dias ou meses.`);
  }
  function xenoPermanent(){
    if(state.masteryLevel<4){ alert('O Xeno-Bloqueio Permanente exige Nível de Mestria 4.'); return; }
    const target=document.getElementById('ae-xeno-target')?.value.trim(); if(!target){alert('Informe o alvo.');return;}
    if(state.xenoPermanent[target]){alert('Este alvo já possui um procedimento permanente registrado.');return;}
    if(!spendDS(25,'Xeno-Bloqueio Permanente')) return;
    const mod=getInt()+state.tratamento; const roll=rollD20(mod); const days=rollDie(12); const success=roll.total>=30;
    state.xenoPermanent[target]={roll:roll.total,days,success,at:new Date().toISOString()}; writeState(); addLog(`Xeno-Bloqueio Permanente · ${target}: ${roll.d}+${mod}=${roll.total} vs CD 30 · duração de remoção: 1d12 = ${days} dias · ${success?'SUCESSO: Gene Êxodo removido permanentemente.':'FALHA: o alvo pode morrer.'}`);
  }
  function permanentProtocol(){
    const target=document.getElementById('ae-perm-target')?.value.trim();
    const effect=document.getElementById('ae-perm-effect')?.value.trim();
    const cost=num(document.getElementById('ae-alloc-ds')?.value,3);
    const vig=num(document.getElementById('ae-target-vig')?.value);
    if(!target||!effect){alert('Informe alvo e estado/característica.');return;}
    if(state.protocols.some(x=>x.type==='permanent-protocol' && x.target===target)){alert('Este personagem já recebeu uma alteração permanente por este procedimento.');return;}
    if(cost<=0||cost>vig){alert(`O DS alocado deve ser maior que 0 e não pode ultrapassar o Vigor do alvo (${vig}).`);return;}
    if(!canSpend(cost)){alert(`DS insuficientes. Disponível: ${dsAvailable()}.`);return;}
    const d=rollD20(vig);
    const cd=20+cost;
    const success=d.total>=cd;
    state.dsAllocated+=cost;
    state.protocols.push({type:'permanent-protocol',target,effect,cost,roll:d.total,cd,success,assimilationDegree:success?0:3,at:new Date().toISOString()});
    writeState();
    addLog(`Alteração Permanente · ${target}: Vigor ${d.d}+${vig}=${d.total} vs CD ${cd} · ${success?'SUCESSO: estado permanente aplicado.':'FALHA: 3º grau de Assimilação automático.'}`);
    toast(success?'Alteração permanente aplicada.':'Falha crítica: 3º grau de Assimilação registrado.');
  }

  function bioforgeMake(id){
    const item=bioforge.find(x=>x.id===id); if(!item) return; if(!spendDS(item.cost,`Bio-Forja · ${item.name}`)) return;
    state.bioforge.push({id:item.id,name:item.name,cost:item.cost,effect:item.effect,at:new Date().toISOString()}); writeState(); addLog(`Bio-Forja criou ${item.name} por ${item.cost} DS.`);
  }

  function restoreHook(){
    if(typeof window.aprimoradorRestoreFromData==='function') return;
    window.aprimoradorRestoreFromData=restore;
  }

  window.buildAprimoradorEngineeringUI=build;
  window.aprimoradorRestoreFromData=restore;
  window.aeAnalyzeField=analyzeField;
  window.aeLongRest=longRest;
  window.aeAllocate=allocate;
  window.aeAwaken=awaken;
  window.aeAscend=ascend;
  window.aeHereditary=hereditary;
  window.aeXenoTemporary=xenoTemporary;
  window.aeXenoPermanent=xenoPermanent;
  window.aeBioforge=bioforgeMake;
  window.aePermanentProtocol=permanentProtocol;
  window.aeGivePP=givePP;
  window.aprimoradorIsActive=()=>currentNature===NATURE;
  window.aprimoradorSyncResources=syncDerived;
  restoreHook();
})();
