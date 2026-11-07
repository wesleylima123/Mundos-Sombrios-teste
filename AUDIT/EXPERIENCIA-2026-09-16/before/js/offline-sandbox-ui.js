/* Mundos Sombrios — Offline QA Shell v2.10.1 */
(function(){
  'use strict';
  const isOffline=()=>window.MS_DB?.offline===true;
  const sandbox=()=>window.MS_RUNTIME_CONFIG?.sandboxMode===true || new URLSearchParams(location.search).get('sandbox')==='1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function showHints(){
    if(!isOffline())return;
    const hint=document.getElementById('offline-login-hint'),online=document.getElementById('online-login-hint');
    if(online)online.hidden=true;
    if(hint){
      hint.hidden=false;
      const rows=(window.MS_OFFLINE_DB?.credentials||[]).map(c=>`<div><b>${esc(c.role.toUpperCase())}</b> · usuário <code>${esc(c.username)}</code> · senha <code>${esc(c.password)}</code></div>`).join('');
      hint.innerHTML=`<b>MODO OFFLINE LOCAL ATIVO.</b> Nenhum Supabase/GitHub é usado. Contas de teste:<br>${rows}`;
    }
  }
  function currentLabel(){const u=window.currentUser;return u?`${u.username} · ${String(u.role||'').toUpperCase()}`:'sem sessão';}
  function installToolbar(){
    if(!sandbox()||document.getElementById('ms-offline-qa'))return;
    document.body.classList.add('ms-sandbox-mode');
    const root=document.createElement('aside');root.id='ms-offline-qa';root.className='ms-offline-qa';root.innerHTML=`
      <div class="ms-offline-qa-head"><div><strong>SANDBOX INTEGRAL</strong><br><small>V2.10.1 · mesma aplicação / backend local</small></div><button data-collapse>—</button></div>
      <div class="ms-offline-qa-body"><div class="ms-offline-qa-current"><span>Perfil ativo</span><b data-current>${esc(currentLabel())}</b></div>
      <div class="ms-offline-role-grid"><button data-role="jogador">JOGADOR</button><button data-role="mestre">MESTRE</button><button data-role="admin">ADM / ARCONTE</button></div>
      <div class="ms-offline-qa-actions"><button data-login>TELA DE LOGIN</button><button data-reset>RESETAR SANDBOX</button><button data-state>INSPECIONAR ESTADO</button></div>
      <p class="ms-offline-qa-note">Trocar o perfil usa o mesmo fluxo de autenticação e reidratação do site. Dados ficam apenas neste navegador.</p><div data-test></div></div>`;
    document.body.appendChild(root);
    const refresh=()=>{const n=root.querySelector('[data-current]');if(n)n.textContent=currentLabel();};
    root.querySelector('[data-collapse]').onclick=()=>root.classList.toggle('is-collapsed');
    root.querySelectorAll('[data-role]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{await window.msSwitchOfflineRole?.(btn.dataset.role);refresh();window.MS_PLATFORM?.toast?.(`Sandbox agora em ${btn.dataset.role.toUpperCase()}.`,'success')}catch(e){alert(e.message)}finally{btn.disabled=false}});
    root.querySelector('[data-login]').onclick=async()=>{try{await window.MS_DB?.signOut?.()}catch(_){};if(typeof window.returnToOfficialPortal==='function')window.returnToOfficialPortal();if(typeof window.showScreen==='function')window.showScreen('screen-login');refresh()};
    root.querySelector('[data-reset]').onclick=async()=>{if(!confirm('Resetar todos os dados locais deste sandbox?'))return;window.MS_DB?.__debug?.reset?.();try{await window.msSwitchOfflineRole?.('jogador')}catch(_){}refresh();location.reload()};
    root.querySelector('[data-state]').onclick=()=>{const s=window.MS_DB?.__debug?.snapshot?.();console.log('[Sandbox Integral] Estado local',s);alert(`Estado local: ${s?.users?.length||0} usuários · ${s?.characters?.length||0} fichas · ${s?.tables?.length||0} mesas · ${s?.progression?.transactions?.length||0} transações de progressão.`)};
    window.addEventListener('ms-auth-state',()=>setTimeout(refresh,50));
    setTimeout(refresh,150);
  }
  async function autoTest(){
    if(!sandbox()||new URLSearchParams(location.search).get('autotest')!=='1')return;
    const host=document.querySelector('#ms-offline-qa [data-test]');if(!host)return;
    host.className='ms-offline-autotest';const logs=[];let failed=false;
    const check=(name,ok,extra='')=>{logs.push(`${ok?'PASS':'FAIL'} · ${name}${extra?' · '+extra:''}`);if(!ok)failed=true;host.textContent=logs.join('\n');};
    try{
      check('MS_DB offline pronto',isOffline()&&window.MS_DB.ready===true);
      for(const role of ['jogador','mestre','admin']){await window.msSwitchOfflineRole(role);await sleep(80);check(`login ${role}`,window.currentUser?.role===role,window.currentUser?.username||'');}
      const users=await window.MS_DB.fetchUsers();check('3 perfis QA',Array.isArray(users)&&users.length>=3,String(users.length));
      await window.msSwitchOfflineRole('mestre');const tables=(await window.MS_DB.fetchMyTables()).data||[];check('mesa do mestre disponível',tables.some(t=>t.code==='QA2811'),String(tables.length));
      const t=tables.find(x=>x.code==='QA2811');const prog=t?await window.MS_DB.fetchProgressionTableState(t.id):null;check('carteira PEG local',Number(prog?.data?.wallet?.balance)>=0,String(prog?.data?.wallet?.balance));
      await window.msSwitchOfflineRole('admin');const adminTables=(await window.MS_DB.fetchProgressionAdminTables()).data||[];check('Arconte enxerga carteiras',adminTables.length>=1,String(adminTables.length));
      const soul=(await window.MS_DB.fetchSoulAccountState()).data;check('SoulDrakma offline',Number(soul?.wallet?.balance)>0,String(soul?.wallet?.balance));
    }catch(e){check('exceção no autoteste',false,e.message||String(e));}
    host.classList.add(failed?'fail':'pass');host.dataset.result=failed?'FAIL':'PASS';
    document.documentElement.dataset.msAutotest=failed?'fail':'pass';
  }
  const boot = async()=>{
    showHints(); installToolbar();
    if(sandbox()&&!window.currentUser){try{await window.msSwitchOfflineRole?.('jogador')}catch(e){console.warn('[Sandbox Integral] Falha ao assumir Jogador:',e)}}
    setTimeout(autoTest,300);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
