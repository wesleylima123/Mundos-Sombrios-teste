/* Mundos Sombrios — Autoridade de Ficha & Evolução Gradual V2.8.9 */
(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const user = () => window.currentUser || {};
  const authId = () => String(user().authUserId || user().auth_user_id || user().id || '');
  const role = () => String(user().role || 'jogador').toLowerCase();
  const ctx = () => window.msGetCurrentTableContext?.() || { table: null, asGM: false, players: [] };
  const progression = () => window.MS_SERVICES?.Progression;
  const canManage = () => role() === 'admin' || !!ctx().asGM || !!document.getElementById('ms-table-room')?.classList.contains('is-gm');

  let tableState = null;
  let viewerState = null;
  let proposalContext = null;

  function toast(message, type = 'info') {
    window.MS_PLATFORM?.toast?.(message, type);
  }

  function normalizeError(error) {
    const raw = String(error?.message || error || 'Erro desconhecido');
    const pairs = [
      ['CHARACTER_MECHANICS_LOCKED', 'A mecânica desta ficha está protegida. Use Evolução Gradual dentro de uma Mesa.'],
      ['INSUFFICIENT_TABLE_PROGRESSION', 'A Mesa não possui Evolução Gradual suficiente.'],
      ['INSUFFICIENT_CHARACTER_PROGRESSION', 'A ficha não possui Evolução Gradual suficiente.'],
      ['CHARACTER_LEVEL_MISMATCH', 'Esta ficha está fora do nível permitido pela Mesa.'],
      ['CHARACTER_NOT_IN_TABLE', 'A ficha precisa estar vinculada à Mesa.'],
      ['OWNER_REQUIRED', 'Somente o responsável da Mesa ou o ADM pode executar esta ação.'],
      ['GM_REQUIRED', 'Somente Mestre ou ADM pode executar esta ação.']
    ];
    for (const [code, message] of pairs) if (raw.includes(code)) return message;
    return raw;
  }

  function modeLabel(value) {
    return String(value || 'exodo').toLowerCase() === 'ocultatun'
      ? 'OCULTATUN · ECOS'
      : 'ÊXODO · ASSIMILAÇÃO';
  }

  // ---------------------------------------------------------------------------
  // VIEWER UNIVERSAL — leitura sem abrir a Forja.
  // ---------------------------------------------------------------------------
  function ensureViewer() {
    let modal = byId('ms-character-viewer');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ms-character-viewer';
    modal.className = 'ms-viewer-modal';
    modal.innerHTML = `
      <div class="ms-viewer-shell">
        <header class="ms-viewer-head">
          <div class="ms-viewer-avatar" data-view-avatar>◈</div>
          <div><small data-view-mode>FICHA</small><h2 data-view-name>Personagem</h2><p data-view-meta></p></div>
          <button class="ms-viewer-close" type="button" data-view-close>×</button>
        </header>
        <main class="ms-viewer-body" data-view-body></main>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-view-close]').addEventListener('click', closeViewer);
    modal.addEventListener('click', event => { if (event.target === modal) closeViewer(); });
    return modal;
  }

  function closeViewer() {
    byId('ms-character-viewer')?.classList.remove('open');
    viewerState = null;
  }

  function unwrapCharacter(input, fallback) {
    const isRpcRow = input && typeof input === 'object' && Object.prototype.hasOwnProperty.call(input, 'payload');
    const payload = isRpcRow ? (input.payload || {}) : ((typeof input === 'object' ? input : fallback) || {});
    return {
      id: input?.id || payload.id || payload.sourceCharId || fallback?.sourceCharId || fallback?.id || null,
      userId: input?.user_id || payload.userId || payload.participantUserId || fallback?.participantUserId || fallback?.userId || null,
      visibility: input?.visibility || 'full',
      payload
    };
  }

  async function openViewer(characterOrId, options = {}) {
    const modal = ensureViewer();
    modal.classList.add('open');
    modal.querySelector('[data-view-body]').innerHTML = '<section class="ms-viewer-section">Carregando registro…</section>';
    try {
      let raw = characterOrId;
      if (typeof characterOrId === 'string' && window.MS_DB?.ready && window.MS_SERVICES?.Characters?.view) {
        raw = await window.MS_SERVICES.Characters.view(characterOrId, options.tableId || null);
      } else if (typeof characterOrId === 'string') {
        raw = options.fallback || { id: characterOrId, name: 'Ficha vinculada' };
      }
      viewerState = { ...unwrapCharacter(raw, options.fallback), options };
      renderViewer(viewerState);
    } catch (error) {
      modal.querySelector('[data-view-body]').innerHTML = `
        <section class="ms-viewer-section"><h3>Visualização indisponível</h3><p>${esc(normalizeError(error))}</p></section>`;
    }
  }

  function statValue(payload, key) {
    return payload?.stats?.[key] ?? payload?.derived?.[key] ?? '—';
  }

  function viewerAccount(characterId, tableId) {
    if (!tableState || !tableId) return null;
    const managed = (tableState.accounts || []).find(item => String(item.character_id) === String(characterId));
    if (managed) return managed;
    if (String(tableState.myAccount?.character_id || '') === String(characterId)) return tableState.myAccount;
    return null;
  }

  function upgradeButtons(payload, balance) {
    const labels = { for: 'FOR', vig: 'VIG', agi: 'AGI', int: 'INT', prn: 'PRN', pre: 'PRE' };
    return `<div class="ms-progress-upgrades">${Object.entries(labels).map(([key, label]) => `
      <button type="button" data-upgrade-attr="${key}" ${balance <= 0 ? 'disabled' : ''}>
        <b>${label} +1</b><small>Custo calculado no servidor pelas regras de ${payload.mode === 'ocultatun' ? 'Ocultatun' : 'Êxodo'}.</small>
      </button>`).join('')}</div>`;
  }

  function resourceControls(manager) {
    return `<div class="ms-resource-controls">
      <select data-resource-key>
        <option>PV</option><option>CÊ</option><option>CR</option><option>EP</option><option>EN</option>
        <option>TR</option><option>LHL</option><option>Estresse</option><option>Assimilação</option>
        <option>Decadência</option><option>Saturação</option>
      </select>
      <input type="number" data-resource-delta placeholder="± valor">
      <input data-resource-reason placeholder="${manager ? 'Motivo obrigatório' : 'Justificativa da solicitação'}">
      <button type="button" data-resource-apply>${manager ? 'AJUSTAR' : 'SOLICITAR'}</button>
    </div>`;
  }

  function renderViewer(state) {
    const modal = ensureViewer();
    const payload = state.payload || {};
    const tableId = state.options?.tableId || null;
    const manager = !!tableId && canManage();
    const own = !state.userId || String(state.userId) === authId() ||
      String(payload.participantUserId || '') === authId() || state.options?.source === 'sanctuary';
    const account = viewerAccount(state.id, tableId);
    const balance = Number(account?.balance || 0);

    const avatar = modal.querySelector('[data-view-avatar]');
    if (payload.avatar) {
      avatar.style.backgroundImage = `url(${payload.avatar})`;
      avatar.textContent = '';
    } else {
      avatar.style.backgroundImage = '';
      avatar.textContent = '◈';
    }
    modal.querySelector('[data-view-mode]').textContent = modeLabel(payload.mode);
    modal.querySelector('[data-view-name]').textContent = payload.name || 'Personagem';
    modal.querySelector('[data-view-meta]').textContent = [payload.category, payload.nature, payload.className].filter(Boolean).join(' · ');

    const stats = [['FOR','for'],['VIG','vig'],['AGI','agi'],['INT','int'],['PRN','prn'],['PRE','pre']];
    const resources = payload.resources && typeof payload.resources === 'object' ? payload.resources : {};
    const concept = payload.concept || {};

    let html = `<section class="ms-viewer-section"><small>ATRIBUTOS</small><div class="ms-viewer-grid">${stats.map(([label,key]) => `
      <article class="ms-view-stat"><span>${label}</span><strong>${esc(statValue(payload,key))}</strong></article>`).join('')}</div></section>`;

    html += `<section class="ms-viewer-section"><small>RECURSOS E LIMITES</small><h3>Estado da ficha</h3><div class="ms-viewer-grid">${
      Object.entries(resources).map(([key,value]) => `<article class="ms-view-resource"><span>${esc(key)}</span><strong>${esc(value)}</strong></article>`).join('') || '<p>Sem recursos públicos nesta visualização.</p>'
    }</div></section>`;

    if (tableId && (own || manager)) {
      html += `<section class="ms-viewer-section"><small>EVOLUÇÃO GRADUAL</small>
        <div class="ms-progression-balance"><strong>${balance}</strong><span>PEG disponíveis nesta Mesa</span></div>
        ${own ? upgradeButtons(payload, balance) : ''}
        ${resourceControls(manager)}
      </section>`;
    }

    html += `<section class="ms-viewer-section"><small>IDENTIDADE</small>
      <h3>${esc(concept.occupation || concept.origin || 'Registro de personagem')}</h3>
      <p>${esc(concept.motivation || concept.bonds || concept.worldRelation || 'Nenhuma informação narrativa adicional registrada.')}</p>
    </section>`;

    const actions = [];
    if (own && state.options?.source === 'sanctuary') actions.push('<button type="button" data-view-edit>EDITAR IDENTIDADE</button>');
    if (tableId && manager) actions.push('<button type="button" class="primary" data-view-grant>CONCEDER PEG</button>');
    if (tableId && own && balance > 0) actions.push('<button type="button" class="primary" data-view-propose>EVOLUÇÃO COMPLEXA</button>');
    html += `<section class="ms-view-actions">${actions.join('')}</section>`;

    modal.querySelector('[data-view-body]').innerHTML = html;
    modal.querySelectorAll('[data-upgrade-attr]').forEach(button => {
      button.addEventListener('click', () => upgradeAttribute(tableId, state.id, button.dataset.upgradeAttr));
    });
    modal.querySelector('[data-view-edit]')?.addEventListener('click', () => openNarrativeEditor(state));
    modal.querySelector('[data-view-propose]')?.addEventListener('click', () => openEvolutionEditor(state, tableId, balance));
    modal.querySelector('[data-view-grant]')?.addEventListener('click', () => grantPrompt(state, tableId));
    modal.querySelector('[data-resource-apply]')?.addEventListener('click', () => submitResourceControl(state, tableId, manager));
  }

  async function upgradeAttribute(tableId, characterId, attribute) {
    try {
      await progression().upgradeAttribute(tableId, characterId, attribute);
      toast('Evolução aplicada e registrada no Ledger.', 'success');
      await refreshTableState(tableId);
      await openViewer(characterId, { tableId, source: 'vtt' });
    } catch (error) { toast(normalizeError(error), 'error'); }
  }

  async function submitResourceControl(state, tableId, manager) {
    const root = ensureViewer();
    const key = root.querySelector('[data-resource-key]')?.value;
    const delta = Number(root.querySelector('[data-resource-delta]')?.value || 0);
    const reason = root.querySelector('[data-resource-reason]')?.value.trim();
    if (!delta || !reason) return toast('Informe alteração e motivo.', 'error');
    try {
      if (manager) await progression().adjustResource(tableId, state.id, key, delta, reason);
      else await progression().requestResource(tableId, state.id, key, delta, reason);
      toast(manager ? 'Recurso ajustado com auditoria.' : 'Solicitação enviada ao Mestre.', 'success');
      closeViewer();
      await refreshTableState(tableId);
    } catch (error) { toast(normalizeError(error), 'error'); }
  }

  function openNarrativeEditor(state) {
    const chars = window.msGetCurrentCharacters?.() || [];
    const index = chars.findIndex(item => String(item.id) === String(state.id));
    if (index < 0) return toast('A edição narrativa está disponível no Santuário da própria ficha.', 'info');
    closeViewer();
    window.MS_FEATURES?.ensureBuilder?.().then(() => {
      window.loadCharacterToBuilder?.(index, chars, false);
      setTimeout(() => lockExistingBuilder(false), 80);
    });
  }

  function openEvolutionEditor(state, tableId, balance) {
    const chars = window.msGetCurrentCharacters?.() || [];
    const index = chars.findIndex(item => String(item.id) === String(state.id));
    if (index < 0) return toast('Abra a evolução pela sua ficha pessoal vinculada à Mesa.', 'error');
    proposalContext = { tableId, characterId: state.id, balance, original: clone(state.payload) };
    closeViewer();
    window.MS_FEATURES?.ensureBuilder?.().then(() => {
      window.loadCharacterToBuilder?.(index, chars, false);
      setTimeout(() => { lockExistingBuilder(true); installProposalBanner(); }, 80);
    });
  }

  function installProposalBanner() {
    const form = byId('char-form');
    if (!form || byId('ms-progression-builder-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'ms-progression-builder-banner';
    banner.className = 'ms-progression-builder-banner';
    banner.textContent = `MODO EVOLUÇÃO · saldo ${proposalContext?.balance || 0} PEG. Recursos protegidos continuam bloqueados. Ao salvar, a mudança será enviada ao Mestre/ADM.`;
    form.prepend(banner);
    const save = byId('btn-final-save');
    if (save) save.textContent = 'ENVIAR EVOLUÇÃO PARA AUTORIZAÇÃO';
  }

  function lockExistingBuilder(evolutionMode = false) {
    if (typeof editingIndex === 'undefined' || editingIndex === null) return;
    document.querySelectorAll('#resource-panel .res-val-input').forEach(input => {
      input.readOnly = true;
      input.setAttribute('aria-readonly', 'true');
      input.closest('.res-box')?.classList.add('ms-protected-resource');
    });
    if (!evolutionMode) {
      document.querySelectorAll('#tab-stats .attr-input,#tab-skills input,#tab-powers input,#tab-powers select,#tab-powers textarea').forEach(el => {
        el.disabled = true;
        el.title = 'Campo mecânico protegido pela autoridade da Mesa.';
      });
    }
  }

  // ---------------------------------------------------------------------------
  // ESTADO DA EVOLUÇÃO DA MESA.
  // ---------------------------------------------------------------------------
  async function refreshTableState(tableId) {
    if (!tableId || !progression() || !window.MS_DB?.ready) return null;
    try {
      tableState = await progression().state(tableId);
      window.MS_PLATFORM?.emit?.('progression:state-refreshed',{tableId});
      return tableState;
    } catch (error) {
      console.warn('[Mundos Sombrios] progressão da Mesa:', error);
      return null;
    }
  }

  async function grantPrompt(state,tableId){
    if(!canManage())return;
    const done=await window.MS_POINTS.open('grant',{tableId,characterId:state.id,name:state.payload?.name||state.name});
    if(!done)return;
    await refreshTableState(tableId);animateGrant(state.id,done.amount,true);
    try{await window.MS_TABLE_SESSION?.send?.('evolution_grant',{targetUserId:done.result?.targetUserId||done.result?.account?.user_id,characterId:state.id,characterName:state.payload?.name||state.name||'',amount:done.amount,reason:done.reason});}catch(_){}
    if(viewerState?.id===state.id)closeViewer();
  }

  async function resolveProposal(id, approved) {
    try {
      let finalCost = null;
      if (approved) {
        finalCost = Number(prompt('Custo final em PEG:', '1') || 0);
        if (!finalCost) return;
      }
      const reason = String(prompt('Decisão do Mestre:', approved ? 'Aprovado' : 'Recusado') || '').trim();
      await progression().resolveProposal(id, approved, finalCost, reason);
      toast(approved ? 'Evolução autorizada.' : 'Evolução recusada.', 'success');
      await refreshTableState(ctx().table?.id);
    } catch (error) { toast(normalizeError(error), 'error'); }
  }

  async function resolveResource(id, approved) {
    try {
      await progression().resolveResource(id, approved);
      toast(approved ? 'Ajuste de recurso autorizado.' : 'Solicitação recusada.', 'success');
      await refreshTableState(ctx().table?.id);
    } catch (error) { toast(normalizeError(error), 'error'); }
  }

  function animateGrant(characterId, amount) {
    const target=Array.from(document.querySelectorAll('[data-lobby-character]')).find(el=>el.dataset.lobbyCharacter===String(characterId));
    if(target){const badge=document.createElement('span');badge.className='ms-peg-award';badge.textContent='+'+Number(amount||0)+' PEG';target.appendChild(badge);setTimeout(()=>badge.remove(),2600);}
    toast('+'+Number(amount||0)+' PEG concedidos ao personagem.','success');
  }

  // ---------------------------------------------------------------------------
  // REQUISITOS DA MESA.
  // ---------------------------------------------------------------------------
  function ensureAdmissionUI() {
    const modal = byId('create-table-modal');
    if (!modal || byId('ms-table-admission-v289')) return;
    const anchor = byId('new-table-class-grid')?.closest('[data-create-section]') || modal.querySelector('.create-table-scroll');
    if (!anchor) return;
    const box = document.createElement('section');
    box.id = 'ms-table-admission-v289';
    box.className = 'ms-table-admission-v289';
    box.innerHTML = `
      <h4>REQUISITOS DE FICHA</h4><p>O servidor valida estes limites antes de permitir a entrada.</p>
      <div class="ms-admission-grid">
        <label>Visualização entre jogadores<select id="new-table-sheet-visibility"><option value="summary">Resumo</option><option value="full">Ficha completa</option><option value="private">Somente identidade</option></select></label>
        <label>Êxodo mínimo<select id="new-table-exodo-min"><option value="iniciado">Iniciado</option><option value="adaptado">Adaptado</option><option value="veterano">Veterano</option></select></label>
        <label>Êxodo máximo<select id="new-table-exodo-max"><option value="veterano">Veterano</option><option value="adaptado">Adaptado</option><option value="iniciado">Iniciado</option></select></label>
        <label>Ocultatun Nível mais fraco<select id="new-table-existence-min">${[5,4,3,2,1,0].map(n => `<option>${n}</option>`).join('')}</select></label>
        <label>Ocultatun Nível mais forte<select id="new-table-existence-max">${[0,1,2,3,4,5].map(n => `<option>${n}</option>`).join('')}</select></label>
        <label>Patamar mínimo<select id="new-table-patamar-min">${[1,2,3,4].map(n => `<option value="${n}">${['','I','II','III','IV'][n]}</option>`).join('')}</select></label>
        <label>Patamar máximo<select id="new-table-patamar-max">${[4,3,2,1].map(n => `<option value="${n}">${['','I','II','III','IV'][n]}</option>`).join('')}</select></label>
      </div>`;
    anchor.appendChild(box);
  }

  function admissionSettings() {
    return {
      sheetVisibility: byId('new-table-sheet-visibility')?.value || 'summary',
      levelRules: {
        exodoMin: byId('new-table-exodo-min')?.value || 'iniciado',
        exodoMax: byId('new-table-exodo-max')?.value || 'veterano',
        existenceMin: Number(byId('new-table-existence-min')?.value ?? 5),
        existenceMax: Number(byId('new-table-existence-max')?.value ?? 0),
        patamarMin: Number(byId('new-table-patamar-min')?.value || 1),
        patamarMax: Number(byId('new-table-patamar-max')?.value || 4)
      }
    };
  }

  function patchCreateTable() {
    ensureAdmissionUI();
    if (window.__msAdmissionPatched || typeof window.confirmCreateTable !== 'function') return;
    window.__msAdmissionPatched = true;
    const originalConfirm = window.confirmCreateTable;
    window.confirmCreateTable = function () {
      const extra = admissionSettings();
      const result = originalConfirm.apply(this, arguments);
      try {
        if (typeof currentDraftSettings !== 'undefined' && currentDraftSettings?.recruitment) Object.assign(currentDraftSettings.recruitment, extra);
      } catch (_) {}
      return result;
    };
    const originalOpen = window.openCreateTableModal;
    if (typeof originalOpen === 'function') {
      window.openCreateTableModal = function () {
        const result = originalOpen.apply(this, arguments);
        setTimeout(ensureAdmissionUI, 0);
        return result;
      };
    }
  }

  // ---------------------------------------------------------------------------
  // ARCONTE — concessão direta para reserva da Mesa.
  // ---------------------------------------------------------------------------
  function ensureArconte() {
    const modal = byId('admin-panel-modal');
    if (!modal || byId('admin-progression-panel')) return;
    const nav = modal.querySelector('.admin-arconte-tabs');
    const body = modal.querySelector('.admin-arconte-body');
    if (!nav || !body) return;
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.adminTab = 'progression'; button.textContent = 'EVOLUÇÃO';
    button.addEventListener('click', () => { window.switchAdminPanelTab?.('progression'); renderAdminProgression(); });
    nav.appendChild(button);
    const section = document.createElement('section');
    section.id = 'admin-progression-panel'; section.className = 'admin-arconte-panel'; section.dataset.adminPanel = 'progression';
    section.innerHTML = '<div class="admin-soul-placeholder">Carregando Reserva de Evolução…</div>';
    body.appendChild(section);
  }

  function arconteTxLabel(tx) {
    const names={SOUL_PURCHASE:'COMPRA PEG',ADMIN_TABLE_GRANT:'CONCESSÃO ARCONTE',ADMIN_TABLE_REMOVE:'REMOÇÃO ARCONTE',TABLE_GRANT_DEBIT:'DISTRIBUIÇÃO DA MESA',CHARACTER_GRANT:'PEG PARA PERSONAGEM',CHARACTER_GRANT_REVERSAL:'REVERSÃO',SEMANTIC_EVOLUTION:'EVOLUÇÃO APLICADA',EVOLUTION_ACCELERATION:'ACELERAÇÃO',DEVELOPMENT_APPROVED:'DESENVOLVIMENTO'};
    return names[String(tx?.tx_type||'')]||String(tx?.tx_type||'REGISTRO').replaceAll('_',' ');
  }

  async function renderArconteLedger(tableId, host, trigger) {
    if (!host) return;
    if (host.dataset.open === '1') { host.dataset.open='0'; host.innerHTML=''; trigger && (trigger.textContent='LEDGER'); return; }
    host.dataset.open='1'; host.innerHTML='<p>Carregando Ledger operacional…</p>'; if(trigger) trigger.textContent='FECHAR LEDGER';
    try {
      const data=await progression().adminLedger(tableId,120),tx=data?.transactions||[],events=data?.events||[],meta=data?.table||{};
      host.innerHTML=`<div class="ms-arconte-ledger-summary"><span>Saldo <b>${Number(meta.balance||0)} PEG</b></span><span>Comprado <b>${Number(meta.lifetime_purchased||0)}</b></span><span>Arconte <b>${Number(meta.lifetime_admin_granted||0)}</b></span><span>Distribuído <b>${Number(meta.lifetime_distributed||0)}</b></span></div>
        <div class="ms-arconte-ledger-columns"><section><header><small>ECONOMIA PEG</small><b>${tx.length} registro(s)</b></header><div class="ms-arconte-ledger-list">${tx.map(t=>`<article><div><b>${esc(arconteTxLabel(t))}</b><small>${esc(t.character_name||t.target_username||'Mesa')} · ${new Date(t.created_at||Date.now()).toLocaleString('pt-BR')}</small><p>${esc(t.reason||'Sem observação.')}</p></div><strong class="${Number(t.amount||0)>=0?'plus':'minus'}">${Number(t.amount||0)>=0?'+':''}${Number(t.amount||0)} PEG</strong></article>`).join('')||'<p>Nenhuma transação registrada.</p>'}</div></section>
        <section><header><small>MEMÓRIA DE EVOLUÇÃO</small><b>${events.length} evento(s)</b></header><div class="ms-arconte-ledger-list">${events.map(e=>{const rp=e.metadata?.riskProfile||e.metadata?.risk_profile||{};return`<article><div><b>${esc(String(e.event_type||'EVENTO').replaceAll('_',' '))}${e.capability_label?` · ${esc(e.capability_label)}`:''}</b><small>${esc(e.character_name||'Personagem')} · ${new Date(e.created_at||Date.now()).toLocaleString('pt-BR')}</small><p>${esc(e.note||e.metadata?.consequence||'Registro sistêmico.')}${rp.label?` · ${esc(rp.label)} (${esc(rp.severity||'')})`:''}</p></div>${Number(e.successes||0)>0?`<strong class="plus">+${Number(e.successes)} sucesso(s)</strong>`:''}</article>`}).join('')||'<p>Nenhum evento de evolução registrado.</p>'}</div></section></div>`;
    } catch (error) { host.innerHTML=`<p>${esc(normalizeError(error))}</p>`; }
  }

  async function renderAdminProgression() {
    if (role() !== 'admin') return;
    const host = byId('admin-progression-panel');
    if (!host) return;
    host.innerHTML = '<p>Carregando Mesas…</p>';
    try {
      const rows = await progression().adminTables();
      host.innerHTML = `<div class="ms-arconte-progression">
        <div class="ms-arconte-progression-head"><div><small>ARCONTE · PROGRESSÃO</small><h3>Reservas de Evolução das Mesas</h3></div><span>Concessões entram no Ledger.</span></div>
        <div class="ms-arconte-table-list">${rows.map(table => `
          <article class="ms-arconte-table"><div><b>${esc(table.table_name || table.name || table.table_id || table.id)}</b><small>${esc(table.game_mode)} · ${Number(table.balance || table.progression_balance || 0)} PEG · Mestre ${esc(table.owner_username || table.owner_name || table.owner_id || '—')}</small><small>${Number(table.participant_count || 0)} ficha(s) · ${Number(table.ready_count || 0)} pronta(s) para evoluir · ${Number(table.pending_evolution_count || 0)} pendência(s)</small></div>
          <div class="ms-arconte-table-controls"><input type="number" placeholder="± PEG" data-admin-peg-amount><input placeholder="Motivo" data-admin-peg-reason><button data-admin-peg="${esc(table.table_id || table.id)}">APLICAR</button><button class="ghost" data-admin-ledger="${esc(table.table_id || table.id)}">LEDGER</button></div><div class="ms-arconte-ledger-host" data-admin-ledger-host="${esc(table.table_id || table.id)}"></div></article>`).join('') || '<p>Nenhuma Mesa registrada.</p>'}</div></div>`;
      host.querySelectorAll('[data-admin-peg]').forEach(button => {
        button.addEventListener('click', async () => {
          const row = button.closest('.ms-arconte-table');
          const amount = Number(row.querySelector('[data-admin-peg-amount]').value || 0);
          const reason = row.querySelector('[data-admin-peg-reason]').value.trim();
          if (!amount || !reason) return toast('Informe PEG e motivo.', 'error');
          try {
            await progression().adminAdjustTable(button.dataset.adminPeg, amount, reason);
            toast('Reserva da Mesa ajustada pelo Arconte.', 'success');
            await renderAdminProgression();
          } catch (error) { toast(normalizeError(error), 'error'); }
        });
      });
      host.querySelectorAll('[data-admin-ledger]').forEach(button => {
        button.addEventListener('click', () => {
          const row=button.closest('.ms-arconte-table');
          renderArconteLedger(button.dataset.adminLedger,row?.querySelector('[data-admin-ledger-host]'),button);
        });
      });
    } catch (error) {
      host.innerHTML = `<p>${esc(normalizeError(error))}</p>`;
    }
  }

  function patchAdminTabs() {
    ensureArconte();
    if (window.__msProgAdminTabsPatched || typeof window.switchAdminPanelTab !== 'function') return;
    window.__msProgAdminTabsPatched = true;
    const original = window.switchAdminPanelTab;
    window.switchAdminPanelTab = function (tab = 'users') {
      const key = String(tab);
      if (key === 'progression') {
        const modal = byId('admin-panel-modal');
        modal?.querySelectorAll('[data-admin-tab]').forEach(button => button.classList.toggle('active', button.dataset.adminTab === key));
        modal?.querySelectorAll('[data-admin-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.adminPanel === key));
        renderAdminProgression();
        return;
      }
      return original.apply(this, arguments);
    };
  }

  // ---------------------------------------------------------------------------
  // BUILDER: pós-criação só narrativa; evolução mecânica precisa da Mesa.
  // ---------------------------------------------------------------------------
  function injectProgressionProfile() {
    const identity = byId('tab-identity'), classBox = byId('class-container');
    if (!identity || !classBox || byId('ms-progression-profile')) return;
    const box = document.createElement('section');
    box.id = 'ms-progression-profile';
    box.className = 'ms-category-panel ms-theme-plate';
    box.innerHTML = `<div class="ms-section-heading"><span>ESCALA DE CAMPANHA</span><h3>Perfil mecânico inicial</h3><p>Após concluir a criação, estes valores passam a ser governados pela Mesa.</p></div>
      <div class="ms-admission-grid">
        <label>Êxodo · escala<select id="char-campaign-tier"><option value="iniciado">Iniciado</option><option value="adaptado">Adaptado</option><option value="veterano">Veterano</option></select></label>
        <label>Ocultatun · Nível<select id="char-existence-level">${[5,4,3,2,1,0].map(n => `<option>${n}</option>`).join('')}</select></label>
        <label>Ocultatun · Patamar<select id="char-patamar">${[1,2,3,4].map(n => `<option value="${n}">${['','I','II','III','IV'][n]}</option>`).join('')}</select></label>
      </div>`;
    classBox.insertAdjacentElement('afterend', box);
  }

  function patchBuilderPayload() {
    if (window.__msProgressionPayloadPatched || typeof window.buildCharacterPayloadFromBuilder !== 'function') return;
    window.__msProgressionPayloadPatched = true;
    const original = window.buildCharacterPayloadFromBuilder;
    window.buildCharacterPayloadFromBuilder = function () {
      const payload = original.apply(this, arguments);
      payload.progression = {
        ...(payload.progression || {}),
        campaignTier: byId('char-campaign-tier')?.value || payload.progression?.campaignTier || 'iniciado',
        existenceLevel: Number(byId('char-existence-level')?.value ?? payload.progression?.existenceLevel ?? 5),
        patamar: Number(byId('char-patamar')?.value ?? payload.progression?.patamar ?? 1),
        locked: typeof editingIndex !== 'undefined' && editingIndex !== null
      };
      return payload;
    };
  }

  function patchBuilderSave() {
    if (window.__msProgressionSavePatched || typeof window.saveCharacter !== 'function') return;
    window.__msProgressionSavePatched = true;
    const original = window.saveCharacter;
    window.saveCharacter = async function (event) {
      if (!proposalContext) {
        lockExistingBuilder(false);
        return original.apply(this, arguments);
      }
      event?.preventDefault?.();
      try {
        const payload = window.buildCharacterPayloadFromBuilder?.();
        if (!payload) throw new Error('Não foi possível montar a proposta.');
        const requestedCost = Number(prompt(`Saldo: ${proposalContext.balance} PEG. Custo solicitado ao Mestre:`, '1') || 0);
        if (!requestedCost) return false;
        const note = String(prompt('Descreva a evolução e a justificativa:', 'Evolução após sessão') || '').trim();
        if (!note) return false;
        await progression().propose(proposalContext.tableId, proposalContext.characterId, payload, requestedCost, note);
        toast('Proposta enviada ao Mestre/ADM.', 'success');
        proposalContext = null;
        byId('ms-progression-builder-banner')?.remove();
        window.leaveBuilder?.();
        return true;
      } catch (error) {
        toast(normalizeError(error), 'error');
        return false;
      }
    };
  }

  function onBuilderReady() {
    injectProgressionProfile();
    patchBuilderPayload();
    patchBuilderSave();
    setTimeout(() => lockExistingBuilder(!!proposalContext), 50);
  }

  // ---------------------------------------------------------------------------
  // TEMPO REAL / entrada e saída de Mesa.
  // ---------------------------------------------------------------------------
  function installRealtimeGrant() {
    window.MS_PLATFORM?.on?.('progression:grant-event', async payload => {
      if (String(payload?.targetUserId || '') !== authId()) return;
      animateGrant(payload.characterId, payload.amount, false);
      const tableId = ctx().table?.id;
      if (tableId) await refreshTableState(tableId);
    });
  }

  async function onTableEntered(detail = {}) {
    const tableId = detail.tableId || ctx().table?.id;
    if (tableId) await refreshTableState(tableId);
  }

  let initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    ensureViewer(); ensureAdmissionUI(); ensureArconte();
    patchCreateTable(); patchAdminTabs(); patchBuilderSave();
    installRealtimeGrant();
    window.MS_PLATFORM?.on?.('vtt:entered', onTableEntered);
    window.MS_PLATFORM?.on?.('vtt:left', () => { tableState = null; });
    if (byId('screen-vtt')?.classList.contains('active')) onTableEntered();
    window.MS_PLATFORM?.on?.('builder:extensions-ready', onBuilderReady);
    if (window.MS_FEATURES?.isBuilderReady?.()) onBuilderReady();
    document.addEventListener('click', event => {
      const el = event.target.closest('[data-character-id]');
      if (el && !el.closest('#ms-character-viewer')) window.MS_PROGRESSION.openViewer(el.dataset.characterId, { tableId: el.dataset.tableId || ctx().table?.id || null });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
  window.MS_PROGRESSION = Object.freeze({
    version: '2.8.9', openViewer, closeViewer, refreshTableState,
    renderAdminProgression, animateGrant, lockExistingBuilder, resolveProposal, resolveResource
  });
})();
