// PARTICLES — V2.4: conjunto fixo, sem churn contínuo de DOM
function createEmbers() {
    const container = document.getElementById('particles');
    if(!container || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    container.replaceChildren();
    const count = window.innerWidth < 700 ? 6 : 12;
    for(let i=0;i<count;i++) {
        const ember = document.createElement('div');
        ember.className = 'ember';
        ember.style.left = ((i * 83) % 97 + Math.random() * 3) + 'vw';
        ember.style.animationDuration = (4.2 + (i % 5) * .65) + 's';
        ember.style.animationDelay = (-Math.random() * 6) + 's';
        ember.style.opacity = String(.35 + (i % 4) * .12);
        container.appendChild(ember);
    }
}
createEmbers();

// ==========================================
// USER DATABASE & AUTHENTICATION
// ==========================================
function msRequireDependency(globalName, label, action) {
    if (typeof window[globalName] === 'undefined') {
        console.warn(`[Mundos Sombrios] Dependência indisponível: ${label}`);
        alert(`${label} não está disponível neste ambiente. ${action || 'Verifique a conexão ou a versão distribuída.'}`);
        return false;
    }
    return true;
}

function msReadStorageJSON(key, fallback) {
    if (window.MS_DB?.offline) {
        try { const raw=localStorage.getItem(`${window.MS_DB.namespace||'ms-offline'}:legacy:${key}`); return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
    }
    return fallback;
}

function msWriteStorageJSON(key, value) {
    if (window.MS_DB?.offline) {
        try { localStorage.setItem(`${window.MS_DB.namespace||'ms-offline'}:legacy:${key}`, JSON.stringify(value)); return true; } catch (_) { return false; }
    }
    return false;
}

let usersDB = msReadStorageJSON('mundosSombriosUsers', []);
let requestsDB = msReadStorageJSON('mundosSombriosRequests', []);

function normalizeStoredUser(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const normalized = { ...raw };
    normalized.role = normalizeUserRole(raw.role || raw.permission || 'jogador');
    normalized.username = String(raw.username || '').trim();
    normalized.email = String(raw.email || '').trim();
    normalized.banned = !!(raw.banned || raw.isBanned || raw.status === 'banned');
    normalized.status = raw.status || (normalized.banned ? 'banned' : 'active');
    if (!normalized.id && raw.user_id) normalized.id = raw.user_id;
    return normalized;
}

function mergeUsersFromSources(localList, remoteList) {
    const map = new Map();
    const all = [...(Array.isArray(localList) ? localList : []), ...(Array.isArray(remoteList) ? remoteList : [])];
    for (const entry of all) {
        const normalized = normalizeStoredUser(entry);
        if (!normalized || !normalized.id) continue;
        const existing = map.get(normalized.id);
        if (!existing) {
            map.set(normalized.id, normalized);
            continue;
        }
        const scoreCurrent = Number(existing.updatedAt || existing.updated_at || existing.createdAt || existing.created_at || 0);
        const scoreNext = Number(normalized.updatedAt || normalized.updated_at || normalized.createdAt || normalized.created_at || 0);
        map.set(normalized.id, scoreNext >= scoreCurrent ? normalized : existing);
    }
    const merged = [...map.values()];
    merged.sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')));
    return merged;
}

async function hydrateAuthState() {
    if (!window.MS_DB || !window.MS_DB.ready) return usersDB;
    try {
        const [remoteUsers, remoteRequests] = await Promise.all([
            window.MS_DB.fetchUsers(),
            window.MS_DB.fetchAdminRequests()
        ]);
        usersDB = mergeUsersFromSources(usersDB, remoteUsers);
        requestsDB = Array.isArray(remoteRequests) ? remoteRequests : requestsDB;
        msWriteStorageJSON('mundosSombriosUsers', usersDB);
        msWriteStorageJSON('mundosSombriosRequests', requestsDB);
    } catch (error) {
        console.warn('[Mundos Sombrios] Falha ao hidratar dados remotos:', error);
    }
    return usersDB;
}

// Segurança local de protótipo: NÃO existem mais contas padrão/credenciais embutidas.
// Em produção, autenticação/autorização deve ser feita no backend.
if (!Array.isArray(usersDB)) usersDB = [];
if (!Array.isArray(requestsDB)) requestsDB = [];

function normalizeRequestEntry(req) {
    if (!req || typeof req !== 'object') return null;
    const id = String(req.id ?? req.request_id ?? req.reqId ?? 'req-' + Date.now());
    const userId = String(req.userId ?? req.user_id ?? req.user ?? 'system');
    const username = String(req.username || req.userName || 'desconhecido').trim() || 'desconhecido';
    const status = String(req.status || 'pending').trim().toLowerCase();
    const createdAt = req.createdAt || req.created_at || new Date().toISOString();
    const updatedAt = req.updatedAt || req.updated_at || createdAt;
    return { ...req, id, userId, username, status, createdAt, updatedAt };
}

function dedupeRequests(list) {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((req) => {
        const normalized = normalizeRequestEntry(req);
        if (!normalized || !normalized.id) return;
        const existing = map.get(normalized.id);
        if (!existing) {
            map.set(normalized.id, normalized);
            return;
        }
        const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const nextTs = new Date(normalized.updatedAt || normalized.createdAt || 0).getTime();
        if (nextTs >= existingTs) map.set(normalized.id, normalized);
    });
    return [...map.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}


function normalizeUserRole(role) {
    const next = String(role || 'jogador').trim().toLowerCase();
    if (['jogador', 'mestre', 'admin'].includes(next)) return next;
    return 'jogador';
}

function isUserBanned(user) {
    if (!user) return false;
    return !!(user.banned || user.isBanned || user.status === 'banned');
}

let currentUser = null;
// Expõe o usuário autenticado como window.currentUser (somente leitura) para que
// os módulos do Portal (portal-core/portal-content/portal-admin) detectem login e papel de ADM.
Object.defineProperty(window, 'currentUser', { configurable: true, get: () => currentUser });

async function msSyncOnlineState() {
    // V2.8.1: autenticar/hidratar não deve escrever de volta no perfil.
    // Isso evita alterar IDs legados e mantém login como uma operação de leitura.
    if (!window.MS_DB || !window.MS_DB.ready || !currentUser) return;
    try { await window.MS_DB.syncUserState?.({ currentUser, characters }); }
    catch (error) { console.warn('[Mundos Sombrios] Sincronização pós-login:', error); }
}

// ==========================================
// GAME DATABASE
// ==========================================
let allCharactersDB = msReadStorageJSON('mundosSombriosChars', []);
let allTablesDB = msReadStorageJSON('mundosSombriosTables', []);
let allJoinedTablesDB = msReadStorageJSON('mundosSombriosJoined', []);

let characters = [];
window.msGetCurrentCharacters = () => Array.isArray(characters) ? JSON.parse(JSON.stringify(characters)) : [];
window.msOpenCharacterViewer = async (target, options={}) => {
    try { await window.MS_FEATURES?.ensureProgression?.(); return window.MS_PROGRESSION?.openViewer?.(target, options); }
    catch(error){ window.MS_PLATFORM?.toast?.(error?.message||'Não foi possível abrir o visualizador da ficha.','error'); return false; }
};
let myTables = [];
let joinedTables = [];
window.getMasterRoomState = function(){ return { tables: Array.isArray(myTables) ? msClone(myTables) : [], joined: Array.isArray(joinedTables) ? msClone(joinedTables) : [] }; };
window.msSoulRuntimeCounts = function(){ return { characters:Array.isArray(characters)?characters.length:0, tables:Array.isArray(myTables)?myTables.length:0 }; };
window.msSoulAdminUsers = function(){ return Array.isArray(usersDB)?usersDB.map(u=>({id:u.id,username:u.username,role:u.role})):[]; };
function msCharacterCapacity(){ return window.MS_SOUL?.characterCapacity?.() ?? (currentUser?.role==='admin' ? Infinity : currentUser?.role==='mestre' ? 5 : 3); }
function msTableCapacity(){ return window.MS_SOUL?.tableCapacity?.() ?? (currentUser?.role==='admin' ? Infinity : currentUser?.role==='mestre' ? 3 : 0); }
function msCapacityLabel(value){ return value===Infinity ? '∞' : String(value); }
function msCanCreateCharacter(){ return window.MS_SOUL?.canCreateCharacter?.(characters?.length||0) ?? ((characters?.length||0) < msCharacterCapacity()); }
function msCanCreateTable(){ return window.MS_SOUL?.canCreateTable?.(myTables?.length||0) ?? ((myTables?.length||0) < msTableCapacity()); }

let editingIndex = null;
let currentAvatarBase64 = '';
let currentGallery = [];
let isEditMode = true;
let isHydratingCharacter = false;
let editingArchetypeSnapshot = { mode: null, nature: null, className: null };
let selectedGameMode = '';
let currentMode = '';
// Builder selection state: must exist before extension modules execute their hooks.
let currentNature = '';
let currentClass = '';
// Cross-module compatibility helpers used by legacy Envolto hooks.
function isEnvolto() { return currentNature === 'O Envolto (Horror Cósmico)'; }
function envState() { return (window.__envRitualDraft && typeof window.__envRitualDraft === 'object') ? window.__envRitualDraft : { known: [] }; }
let activeCarouselIndex = 0;

let currentPowerDraft = [];
let currentEvolutionLog = [];
let currentDraftSettings = {};
let currentDraftIdentity = null;
let msDraftSavePromise = null;
Object.defineProperty(window, 'currentPowerDraft', { configurable: true, get(){ return currentPowerDraft; }, set(v){ currentPowerDraft = Array.isArray(v) ? v : []; } });

// VTT STATE
let vttCanvas = null;
let isVttGM = false;
let isDraftMode = false;
let currentTableData = null;
let currentVttTheme = 'default';
let currentDraftGameMode = 'exodo';
let chatLocked = false;
let tablePlayers = []; 
let myVttCharIndex = -1; 
let npcHpHidden = false;
let diceHistory = [];
let currentSheetEquipment = [];
window.msGetCurrentTableContext = () => ({
    table: currentTableData ? msClone(currentTableData) : null,
    asGM: !!isVttGM,
    isDraft: !!isDraftMode,
    players: Array.isArray(tablePlayers) ? msClone(tablePlayers) : [],
    myCharacterIndex: myVttCharIndex
});
window.msIsCurrentVttGM = () => !!isVttGM;
window.msGetCurrentTableId = () => currentTableData?.id || null;

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================
async function msBuildCurrentUser(profileOverride = null) {
    if (!window.MS_DB?.ready) return null;
    const session = await window.MS_DB.getSession();
    if (session.error) throw session.error;
    if (!session.user) return null;
    let profile = profileOverride;
    if (!profile) {
        const result = await window.MS_DB.fetchMyProfile();
        if (result?.error) throw result.error;
        profile = result?.data || null;
    }
    if (!profile) {
        const error = new Error('Perfil autenticado não encontrado.');
        error.code = 'PROFILE_NOT_FOUND';
        throw error;
    }
    if (profile.banned || profile.status === 'banned') { await window.MS_DB.signOut(); alert('Esta conta foi banida pelo Arconte.'); return null; }
    return { id:String(profile.id || session.user.id), authUserId:session.user.id, username:String(profile.username || 'jogador'), email:String(profile.email || session.user.email || ''), role:normalizeUserRole(profile.role || 'jogador'), banned:!!profile.banned, status:profile.status || 'active' };
}

async function msHydrateRemoteGameState() {
    if (!window.MS_SERVICES?.Characters || !currentUser) return;
    try {
        // V2.8.6: evita duas leituras completas de mesas em cada hidratação.
        // O resumo é a rota primária; listMine só é consultado quando o resumo não existe/retorna vazio.
        const [remoteChars, remoteSummaries] = await Promise.all([
            window.MS_SERVICES.Characters.listMine(),
            window.MS_SERVICES.Games.summaries ? window.MS_SERVICES.Games.summaries() : Promise.resolve([])
        ]);
        const charRows = remoteChars?.data || [];
        characters = charRows.map(c => {
            const payload = c?.payload && typeof c.payload === 'object' ? msClone(c.payload) : {};
            payload.id = c.id; payload.ownerId = currentUser.id; payload.userId = currentUser.id;
            payload.createdAt = payload.createdAt || c.created_at; payload.updatedAt = c.updated_at;
            return payload;
        });
        allCharactersDB = characters.map(msClone);

        // Supabase é a fonte de verdade. Antes de sincronizar a visão legada,
        // promove a hidratação remota ao cache por usuário para impedir que
        // um cache local vazio sobrescreva fichas acabadas de carregar.
        const repoStore = msEnsureRepoStore();
        const currentRepo = repoStore[currentUser.id] || { characters: [], joinedTables: [], ownedTables: [] };
        currentRepo.characters = characters.map(msClone);
        repoStore[currentUser.id] = currentRepo;
        msWriteJSON(MS_REPO_KEY, repoStore);

        const summaryRows = remoteSummaries?.data || remoteSummaries || [];
        let tableRows = Array.isArray(summaryRows) ? summaryRows : [];
        if (!tableRows.length && window.MS_SERVICES.Games.listMine) {
            const remoteTables = await window.MS_SERVICES.Games.listMine();
            tableRows = remoteTables?.data || remoteTables || [];
        }
        // Defesa adicional contra respostas duplicadas de views/RPCs legadas.
        tableRows = [...new Map((Array.isArray(tableRows)?tableRows:[]).filter(Boolean).map(row=>[String(row.id),row])).values()];
        allTablesDB = tableRows.map(t => msNormalizeTable({
            id:t.id,code:t.code,name:t.name,theme:t.theme,gameMode:t.game_mode,ownerId:t.owner_id,
            participants:[],banned:t.banned||[],settings:t.settings||{},status:t.status||'active',
            activeMembers:Number(t.active_members||0),myMemberRole:t.my_member_role||null,myCharacterId:t.my_character_id||null,isOwner:t.is_owner===true||String(t.owner_id)===String(currentUser.id),
            createdAt:t.created_at,updatedAt:t.updated_at
        }));
        window.__msTableMemberships=Object.fromEntries(allTablesDB.map(t=>[String(t.id),{role:t.myMemberRole,characterId:t.myCharacterId,isOwner:!!t.isOwner,activeMembers:Number(t.activeMembers||0)}]));
        msSyncCurrentUserView();
        window.MS_PLATFORM?.setStatus('persistence','success',null,{updated:true});
        window.MS_PLATFORM?.emit('character:hydrated',{count:characters.length});
        window.MS_PLATFORM?.emit('tables:hydrated',{owned:myTables.length,joined:joinedTables.length});
    } catch(error) {
        window.MS_PLATFORM?.setStatus('persistence','error',error);
        window.MS_PLATFORM?.toast('Não foi possível sincronizar suas fichas e mesas.','error');
        console.warn('[Mundos Sombrios] Falha ao hidratar mesas/fichas:',error);
    }
}

window.msHydrateRemoteGameState = msHydrateRemoteGameState;

let msAuthHydrationPromise = null;
async function msApplyAuthenticatedSession(profileOverride = null) {
    if (msAuthHydrationPromise) return msAuthHydrationPromise;
    msAuthHydrationPromise = (async()=>{
        const authenticated = await msBuildCurrentUser(profileOverride);
        if (!authenticated) return false;
        currentUser = authenticated;
        loadUserData();
        const displayName=document.getElementById('display-username'); if(displayName) displayName.innerText=currentUser.username;
        const emblem=document.getElementById('master-emblem'); if(emblem) emblem.style.display=(currentUser.role==='mestre'||currentUser.role==='admin')?'block':'none';
        const adminButton=document.getElementById('btn-admin-panel'); if(adminButton) adminButton.style.display=currentUser.role==='admin'?'block':'none';
        const gmTab=document.getElementById('tab-btn-gm'); if(gmTab) gmTab.style.display=(currentUser.role==='mestre'||currentUser.role==='admin')?'inline-block':'none';
        const shieldButton=document.getElementById('btn-master-shield'); if(shieldButton) shieldButton.style.display=(currentUser.role==='mestre'||currentUser.role==='admin')?'inline-block':'none';

        // Acesso à conta não fica bloqueado pela hidratação de mesas/fichas.
        showScreen('screen-portal');
        if(typeof window.renderOfficialPortal==='function') window.renderOfficialPortal();
        window.MS_PLATFORM?.emit('auth:profile-ready',{user:currentUser});

        // Dados secundários são carregados fora do caminho crítico do login.
        setTimeout(async()=>{
            if (currentUser?.role === 'admin') {
                try { usersDB = await window.MS_DB.fetchUsers(); } catch(error) { console.warn('[Mundos Sombrios] Perfis:',error); }
            }
            try { await msHydrateRemoteGameState(); } catch(error) { console.warn('[Mundos Sombrios] Hidratação:',error); }
            // syncUserState é read-only desde V2.8.1; não é necessário manter uma ida extra no caminho pós-login.
            try { await window.MS_SOUL?.fetchState?.({quiet:true}); } catch(error) { console.warn('[Mundos Sombrios] Soul:',error); }
        },0);
        return true;
    })();
    try { return await msAuthHydrationPromise; }
    finally { msAuthHydrationPromise = null; }
}

async function msBootstrapAuthSession() {
    if (!window.MS_DB?.ready) { window.MS_PLATFORM?.setStatus('auth','error',new Error('Supabase indisponível')); return; }
    window.MS_PLATFORM?.setStatus('auth','loading');
    try {
        const session=await window.MS_DB.getSession();
        if(session.user){ const profile=(await window.MS_DB.fetchMyProfile()).data; await msApplyAuthenticatedSession(profile); }
        window.MS_PLATFORM?.setStatus('auth','success');
    } catch(error){
        window.MS_PLATFORM?.setStatus('auth','error',error);
        console.warn('[Mundos Sombrios] Não foi possível restaurar a sessão:', error);
    }
}

window.addEventListener('ms-auth-state', (event)=>{
    // IMPORTANTE: este listener é chamado sincronamente a partir de onAuthStateChange.
    // Não faça chamadas async do Supabase aqui: isso pode bloquear o cliente Auth.
    const type=event.detail?.event;
    if(type==='SIGNED_OUT'){ currentUser=null; return; }
    if(type==='PASSWORD_RECOVERY'){
        setTimeout(async()=>{ try{ const next=window.prompt('Digite a nova senha (mínimo 10 caracteres):'); if(next){ if(String(next).length<10) throw new Error('Senha muito curta.'); const result=await window.MS_DB.updatePassword(next); if(result.error) throw result.error; alert('Senha atualizada com sucesso.'); } }catch(e){ alert(e.message||'Não foi possível atualizar a senha.'); } },0);
    }
    // SIGNED_IN é finalizado pelo fluxo que iniciou o login; a restauração de sessão
    // é responsabilidade de msBootstrapAuthSession(). Evita hidratação duplicada.
});

document.addEventListener('DOMContentLoaded',()=>{
    msBootstrapAuthSession();
    msRefreshInitialSetupButton();
    const loginPass=document.getElementById('login-pass');
    const loginUser=document.getElementById('login-user');
    [loginPass,loginUser].filter(Boolean).forEach(el=>{
        el.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();doLogin();}});
        el.addEventListener('input',()=>msSetLoginStatus('', ''));
    });
    window.MS_PLATFORM?.emit('ms:app:ready',{ version: window.MS_PLATFORM?.version || null });
});
let msLoginInFlight=false;
function msSetLoginStatus(message='', state='') {
    const status=document.getElementById('login-status');
    const box=document.querySelector('#screen-login .login-box');
    if(status){status.textContent=message;status.dataset.state=state||'';status.setAttribute('role',state==='error'?'alert':'status');status.setAttribute('aria-live',state==='error'?'assertive':'polite');}
    box?.classList.toggle('login-has-error',state==='error');
}
function toggleLoginPassword(){
    const input=document.getElementById('login-pass');const button=document.getElementById('login-pass-toggle');if(!input)return false;
    const showing=input.type==='text';input.type=showing?'password':'text';
    if(button){button.textContent=showing?'MOSTRAR':'OCULTAR';button.setAttribute('aria-pressed',String(!showing));button.setAttribute('aria-label',showing?'Mostrar senha':'Ocultar senha');}
    input.focus({preventScroll:true});return !showing;
}
window.toggleLoginPassword=toggleLoginPassword;
function msAuthErrorMessage(error){
    const code=String(error?.code||''); const message=String(error?.message||'').toLowerCase();
    if(code==='USERNAME_RESOLVER_UNAVAILABLE') return 'Login por usuário indisponível neste banco. Tente com o e-mail da conta ou aplique a migração V2.8.1.';
    if(code==='PROFILE_LINK_REQUIRED'||code==='PROFILE_NOT_FOUND') return 'A autenticação ocorreu, mas o perfil do site não está vinculado. Aplique a migração V2.8.1.';
    if(code==='email_not_confirmed'||message.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if(code==='invalid_credentials'||code==='INVALID_LOGIN_IDENTIFIER'||message.includes('invalid login credentials')||message.includes('invalid credentials')) return 'Senha ou usuário/e-mail incorretos. Confira os dados e tente novamente.';
    if(message.includes('failed to fetch')||message.includes('network')) return 'Não foi possível alcançar o Supabase. Verifique sua conexão.';
    return error?.message || 'Não foi possível autenticar.';
}
async function doLogin() {
    if(msLoginInFlight) return false;
    const identifier=document.getElementById('login-user').value.trim(); const password=document.getElementById('login-pass').value;
    const button=document.getElementById('login-submit'); const status=document.getElementById('login-status');
    window.MS_PLATFORM?.setStatus('auth','loading');
    if(!identifier||!password){window.MS_PLATFORM?.setStatus('auth','error',new Error('Credenciais incompletas')); msSetLoginStatus('Preencha usuário/e-mail e senha.','error'); window.MS_PLATFORM?.toast('Preencha usuário/e-mail e senha.','error'); return false;}
    if(!window.MS_DB?.ready){window.MS_PLATFORM?.setStatus('auth','error',new Error('Supabase indisponível')); msSetLoginStatus('O serviço online de autenticação não está disponível.','error'); window.MS_PLATFORM?.toast('O serviço online de autenticação não está disponível.','error'); return false;}
    msLoginInFlight=true; if(button){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='ATRAVESSANDO...';} msSetLoginStatus('Autenticando...','loading');
    try{
        const result=await window.MS_DB.signIn(identifier,password);
        if(result?.error) throw result.error;
        const ok=await msApplyAuthenticatedSession();
        if(!ok) throw Object.assign(new Error('Perfil não encontrado ou bloqueado.'),{code:'PROFILE_NOT_FOUND'});
        window.MS_PLATFORM?.setStatus('auth','success'); window.MS_PLATFORM?.emit('auth:signed-in',{user: currentUser}); msSetLoginStatus('',''); return true;
    } catch(error){
        window.MS_PLATFORM?.setStatus('auth','error',error); console.warn('[Mundos Sombrios] Login:',error);
        const friendly=msAuthErrorMessage(error); msSetLoginStatus(friendly,'error'); window.MS_PLATFORM?.toast(friendly,'error'); return false;
    } finally {
        msLoginInFlight=false; if(button){button.disabled=false;button.textContent=button.dataset.originalText||'ATRAVESSAR PORTAL';}
    }
}

window.msSwitchOfflineRole = async function(role) {
    if (!window.MS_DB?.offline || !window.MS_OFFLINE_DB) throw new Error('Modo offline não está ativo.');
    const credential=window.MS_OFFLINE_DB.credentials.find(item=>item.role===String(role));
    if(!credential) throw new Error('Perfil de teste inexistente.');
    try { await window.MS_DB.signOut(); } catch (_) {}
    const result=await window.MS_DB.signIn(credential.username,credential.password);
    if(result?.error) throw result.error;
    const ok=await msApplyAuthenticatedSession();
    if(!ok) throw new Error('Não foi possível assumir o perfil offline.');
    window.MS_SOUL?.fetchState?.({quiet:true});
    return window.currentUser;
};

async function doLogout() {
    if(!confirm('Deseja desconectar do Vazio?')) return;
    try{if(window.MS_DB?.ready) await window.MS_DB.signOut();}catch(error){console.warn('[Mundos Sombrios] Logout:',error);}
    currentUser=null; const emblem=document.getElementById('master-emblem'); if(emblem) emblem.style.display='none'; const req=document.getElementById('admin-requests-container'); if(req) req.innerHTML='';
    if(typeof window.openOfficialPortal==='function') window.openOfficialPortal(); else showScreen('screen-portal'); msRefreshInitialSetupButton();
}

function openRegister() {
    document.getElementById('reg-user').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-pass').value = '';
    document.getElementById('reg-req-master').checked = false;
    document.getElementById('register-modal').style.display = 'flex';
}

function closeRegister() {
    document.getElementById('register-modal').style.display = 'none';
}

async function doRegister() {
    const user=document.getElementById('reg-user').value.trim(); const email=document.getElementById('reg-email').value.trim(); const pass=document.getElementById('reg-pass').value; const reqMaster=document.getElementById('reg-req-master').checked;
    if(!user||!pass||!email){alert('Preencha todos os campos.');return;}
    if(user.length<3||pass.length<10||!email.includes('@')){alert('Use usuário com pelo menos 3 caracteres, e-mail válido e senha com pelo menos 10 caracteres.');return;}
    if(!window.MS_DB?.ready){alert('O serviço online de cadastro não está disponível.');return;}
    try{ const {data,error}=await window.MS_DB.signUp({username:user,email,password:pass,requestMaster:reqMaster}); if(error) throw error; closeRegister(); if(data?.session){await msApplyAuthenticatedSession(); alert('Alma despertada e autenticada.');}else{alert('Alma despertada. Verifique o e-mail para confirmar a conta antes de atravessar o portal.');} }
    catch(error){console.error('[Mundos Sombrios] Cadastro online:',error);alert(error.message||'Não foi possível criar a conta.');}
}

function openRecover() {
    document.getElementById('rec-email').value = '';
    document.getElementById('recover-modal').style.display = 'flex';
}

function closeRecover() {
    document.getElementById('recover-modal').style.display = 'none';
}

async function doRecover() {
    const email=document.getElementById('rec-email').value.trim().toLowerCase(); if(!email){alert('Informe o e-mail da conta.');return;}
    if(!window.MS_DB?.ready){alert('O serviço online de recuperação não está disponível.');return;}
    try{const {error}=await window.MS_DB.resetPasswordForEmail(email,window.location.href.split('#')[0]);if(error)throw error;alert('Enviamos as instruções de recuperação para o e-mail informado, caso exista uma conta.');closeRecover();}
    catch(error){console.warn('[Mundos Sombrios] Recuperação:',error);alert('Não foi possível solicitar a recuperação agora.');}
}

async function openInitialSetup() {
    await hydrateAuthState();
    document.getElementById('setup-admin-user').value = '';
    document.getElementById('setup-admin-email').value = '';
    document.getElementById('setup-admin-pass').value = '';
    document.getElementById('initial-setup-modal').style.display = 'flex';
    document.body.classList.add('admin-setup-open');
}

function closeInitialSetup() {
    const modal = document.getElementById('initial-setup-modal');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('admin-setup-open');
}

// Mostra/oculta o botão "CONFIGURAR ADM INICIAL" na tela de login:
// só aparece quando o Supabase responde que AINDA NÃO existe administrador.
async function msRefreshInitialSetupButton() {
    const btn = document.getElementById('btn-initial-setup');
    if (!btn) return;
    if (!window.MS_DB?.ready || typeof window.MS_DB.adminExists !== 'function') { btn.style.display = 'none'; return; }
    const exists = await window.MS_DB.adminExists();
    // null = não foi possível verificar -> esconde por segurança
    btn.style.display = exists === false ? 'inline-block' : 'none';
}

// Cria o primeiro ADM: cadastra no Supabase Auth, faz login e promove via RPC
// bootstrap_first_admin (só funciona enquanto não existir nenhum admin).
async function createInitialAdmin() {
    const user = document.getElementById('setup-admin-user').value.trim();
    const email = document.getElementById('setup-admin-email').value.trim();
    const pass = document.getElementById('setup-admin-pass').value;
    if (!user || !email || !pass) { alert('Preencha usuário, e-mail e senha.'); return false; }
    if (user.length < 3 || !email.includes('@') || pass.length < 10) {
        alert('Use usuário com pelo menos 3 caracteres, e-mail válido e senha com pelo menos 10 caracteres.');
        return false;
    }
    if (!window.MS_DB?.ready) { alert('O serviço online não está disponível.'); return false; }
    try {
        const exists = typeof window.MS_DB.adminExists === 'function' ? await window.MS_DB.adminExists() : null;
        if (exists === true) { alert('Já existe um Arconte configurado. Faça login normalmente.'); closeInitialSetup(); msRefreshInitialSetupButton(); return false; }

        // 1) Cria a conta no Supabase Auth
        const { data: signData, error: signError } = await window.MS_DB.signUp({ username: user, email, password: pass, requestMaster: false });
        if (signError) throw signError;

        // 2) Garante sessão ativa (se a confirmação de e-mail estiver desligada, signUp já retorna sessão)
        if (!signData?.session) {
            const { error: loginError } = await window.MS_DB.signIn(email, pass);
            if (loginError) {
                closeInitialSetup();
                alert('Conta criada! Confirme o e-mail e faça login: ao entrar, esta conta poderá ser promovida a Arconte.');
                return false;
            }
        }

        // 3) Garante o perfil e promove a ADM via RPC seguro
        await window.MS_DB.ensureMyProfile({ username: user, email });
        const { error: bootError } = await window.MS_DB.bootstrapFirstAdmin(user);
        if (bootError) {
            if (String(bootError.message || '').includes('ADMIN_ALREADY_EXISTS')) {
                alert('Já existe um Arconte configurado. Faça login normalmente.');
            } else {
                throw bootError;
            }
            closeInitialSetup(); msRefreshInitialSetupButton(); return false;
        }

        closeInitialSetup();
        msRefreshInitialSetupButton();
        const ok = await msApplyAuthenticatedSession();
        if (ok) alert('Arconte inicial configurado e autenticado. O portal é seu.');
        else alert('Arconte criado. Faça login para assumir o portal.');
        return true;
    } catch (error) {
        console.error('[Mundos Sombrios] Setup inicial do ADM:', error);
        alert(error.message || 'Não foi possível criar o Arconte inicial.');
        return false;
    }
}

// ==========================================
// ADMIN PANEL
// ==========================================
function isCurrentAdmin() {
    return !!(currentUser && currentUser.role === 'admin');
}

function switchAdminPanelTab(tab = 'users') {
    const modal = document.getElementById('admin-panel-modal');
    if (!modal) return false;
    const key = tab === 'soul' ? 'soul' : 'users';
    modal.querySelectorAll('[data-admin-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminTab === key));
    modal.querySelectorAll('[data-admin-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.adminPanel === key));
    if (key === 'soul') window.MS_SOUL?.refreshAdminConsole?.();
    return true;
}
window.switchAdminPanelTab = switchAdminPanelTab;

async function openAdminPanel() {
    window.MS_FEATURES?.ensureProgression?.().catch(()=>{});
    if (!isCurrentAdmin()) {
        alert('Acesso restrito ao ADM.');
        return false;
    }

    // Abre imediatamente com o estado já autenticado; a sincronização remota ocorre
    // em paralelo e atualiza a interface sem bloquear o Arconte.
    renderAdminPanel();
    renderAdminRequestsWindows();
    switchAdminPanelTab('users');
    const modal=document.getElementById('admin-panel-modal');
    if(modal)modal.style.display='flex';
    setTimeout(()=>window.MS_SOUL?.refreshAdminConsole?.(),0);

    Promise.all([
        window.MS_DB?.ready ? window.MS_DB.fetchUsers() : Promise.resolve([]),
        window.MS_DB?.ready ? window.MS_DB.fetchAdminRequests() : Promise.resolve([])
    ]).then(([remoteUsers,remoteRequests])=>{
        usersDB=mergeUsersFromSources(usersDB,Array.isArray(remoteUsers)?remoteUsers:[]);
        requestsDB=dedupeRequests(Array.isArray(remoteRequests)?remoteRequests:requestsDB);
        renderAdminPanel();
        renderAdminRequestsWindows();
    }).catch(error=>{
        console.warn('[Mundos Sombrios] Sincronização do Arconte:',error);
        window.MS_PLATFORM?.toast('O painel abriu, mas a sincronização remota falhou.','error');
    });
    return true;
}

function renderAdminPanel() {
    if (!isCurrentAdmin()) return false;
    const tbody = document.getElementById('admin-users-list');
    if (!tbody) return false;
    tbody.innerHTML = '';
    usersDB.forEach((u, index) => {
        const role = normalizeUserRole(u.role);
        const status = isUserBanned(u) ? 'BANIDA' : 'ATIVA';
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td><input type="text" id="edit-user-${index}" value="${u.username}"></td>
                <td>
                    <select id="edit-role-${index}">
                        <option value="jogador" ${role==='jogador'?'selected':''}>Jogador</option>
                        <option value="mestre" ${role==='mestre'?'selected':''}>Mestre</option>
                        <option value="admin" ${role==='admin'?'selected':''}>Admin</option>
                    </select>
                </td>
                <td>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="souls-btn small-btn" style="border-color:#00ffcc; color:#00ffcc;" onclick="saveUserRow(${index})">Salvar</button>
                        <button class="souls-btn small-btn" style="border-color:${isUserBanned(u) ? '#ffcc00' : '#ff3333'}; color:${isUserBanned(u) ? '#ffcc00' : '#ff3333'};" onclick="toggleUserBan(${index})">${isUserBanned(u) ? 'Desbanir' : 'Banir'}</button>
                    </div>
                </td>
                <td style="color:${isUserBanned(u) ? '#ff6666' : '#7af1c4'}; font-weight:bold;">${status}</td>
            </tr>
        `;
    });
    return true;
}

async function saveUserRow(index) {
    if(!isCurrentAdmin()){alert('Acesso restrito ao ADM.');return false;}
    const targetUser=usersDB[index]; if(!targetUser){alert('Usuário inválido.');return false;}
    const nextRole=normalizeUserRole(document.getElementById(`edit-role-${index}`).value);
    const nextUsername=document.getElementById(`edit-user-${index}`).value.trim();
    if(!nextUsername){alert('O nome do usuário não pode ficar vazio.');return false;}
    try{
        const nameResult=await window.MS_DB.adminUpdateUsername(targetUser.id,nextUsername); if(nameResult.error)throw nameResult.error;
        if(nextRole!==normalizeUserRole(targetUser.role)){ const roleResult=await window.MS_DB.adminSetUserRole(targetUser.id,nextRole); if(roleResult.error)throw roleResult.error; }
        usersDB=await window.MS_DB.fetchUsers(); renderAdminPanel(); alert('Registro Akáshico alterado com segurança.'); return true;
    }catch(error){console.error('[Mundos Sombrios] Alteração administrativa:',error);alert(error.message||'Não foi possível alterar o usuário.');return false;}
}

async function toggleUserBan(index) {
    if(!isCurrentAdmin()){alert('Acesso restrito ao ADM.');return false;}
    const targetUser=usersDB[index]; if(!targetUser){alert('Usuário inválido.');return false;}
    if(targetUser.role==='admin'&&targetUser.id===currentUser.id){alert('O Arconte principal não pode ser banido.');return false;}
    try{ const result=await window.MS_DB.adminSetUserBanned(targetUser.id,!isUserBanned(targetUser)); if(result.error)throw result.error; usersDB=await window.MS_DB.fetchUsers(); renderAdminPanel(); return true; }
    catch(error){console.error('[Mundos Sombrios] Banimento administrativo:',error);alert(error.message||'Não foi possível alterar o status do usuário.');return false;}
}

function renderAdminRequestsWindows() {
    if (!isCurrentAdmin()) return false;
    const container = document.getElementById('admin-requests-container');
    if (!container) return false;

    if (window.MS_DB && window.MS_DB.ready) requestsDB = dedupeRequests(requestsDB);
    const visibleRequests = requestsDB.filter(req => String(req.status || 'pending').toLowerCase() === 'pending');
    container.innerHTML = '';

    visibleRequests.forEach((req, idx) => {
        const requestType = String(req?.data?.type || 'master_role').toLowerCase();
        const isAtlasRequest = requestType === 'atlas_change';
        const top = 100 + (idx * 30);
        const left = 100 + (idx * 30);
        const win = document.createElement('div');
        win.id = `req-win-${req.id}`;
        win.className = 'vtt-floating-window admin-request-window';
        win.style.setProperty('--request-offset', `${Math.min(idx, 8) * 18}px`);
        win.style.cssText += `position:absolute; top:${top}px !important; left:${left}px !important; transform:none !important; width:${isAtlasRequest ? 360 : 300}px; display:flex; pointer-events:auto; z-index:9500;`;

        const header = document.createElement('div');
        header.className = 'vtt-window-header';
        header.id = `req-header-${req.id}`;
        header.style.cursor = 'move';

        const title = document.createElement('span');
        title.className = 'vtt-font';
        title.style.fontSize = '0.9rem';
        title.textContent = isAtlasRequest ? 'Solicitação Cartográfica' : 'Elevação de Mestre';

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'win-close-btn';
        closeBtn.textContent = 'X';
        closeBtn.title = 'Silenciar solicitação';
        closeBtn.setAttribute('aria-label', 'Silenciar solicitação');
        closeBtn.addEventListener('click', () => silenceAdminRequest(req.id));
        header.appendChild(title); header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'vtt-window-body';
        body.style.textAlign = isAtlasRequest ? 'left' : 'center';

        const text = document.createElement('div');
        text.style.marginBottom = '15px';
        text.style.fontSize = '0.9rem';
        if (isAtlasRequest) {
            const kindLabels = { correction:'Correção', lore:'Lore', position:'Posição', economy:'Economia', art:'Arte / visitação', other:'Outra' };
            const location = String(req?.data?.atlasPointName || 'Registro do Atlas');
            const kind = kindLabels[String(req?.data?.kind || 'other')] || 'Alteração';
            const who = String(req.username || 'Mestre');
            const reason = String(req?.data?.reason || 'Sem justificativa.');
            const suggestion = String(req?.data?.suggestion || 'Sem proposta detalhada.');
            const titleLine = document.createElement('p');
            titleLine.style.margin = '0 0 8px';
            titleLine.innerHTML = `<b>${who.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b> solicita revisão de <b>${location.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b>.`;
            const meta = document.createElement('p'); meta.style.margin = '0 0 8px'; meta.style.color = '#69e8ff'; meta.textContent = `Tipo: ${kind}`;
            const reasonEl = document.createElement('p'); reasonEl.style.margin = '0 0 8px'; reasonEl.textContent = `Justificativa: ${reason}`;
            const suggestionEl = document.createElement('p'); suggestionEl.style.margin = '0'; suggestionEl.textContent = `Sugestão: ${suggestion}`;
            text.append(titleLine, meta, reasonEl, suggestionEl);
        } else {
            const p = document.createElement('p'); p.style.margin = '0';
            const strong = document.createElement('b'); strong.textContent = String(req.username || 'desconhecido');
            p.append(strong, document.createTextNode(' deseja forjar Fendas (Mestre).')); text.appendChild(p);
        }

        const actions = document.createElement('div');
        actions.style.display = 'flex'; actions.style.gap = '8px'; actions.style.justifyContent = 'center'; actions.style.flexWrap = 'wrap';
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button'; acceptBtn.className = 'souls-btn small-btn'; acceptBtn.style.borderColor = '#a8ff00'; acceptBtn.style.color = '#a8ff00';
        acceptBtn.textContent = isAtlasRequest ? 'Revisar no Atlas' : 'Aceitar';
        acceptBtn.addEventListener('click', () => isAtlasRequest ? reviewAtlasRequest(req.id) : handleReq(req.id, true));
        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button'; rejectBtn.className = 'souls-btn small-btn'; rejectBtn.style.borderColor = '#ff3333'; rejectBtn.style.color = '#ff3333'; rejectBtn.textContent = 'Negar';
        rejectBtn.addEventListener('click', () => handleReq(req.id, false));
        const silenceBtn = document.createElement('button');
        silenceBtn.type = 'button'; silenceBtn.className = 'souls-btn small-btn'; silenceBtn.style.borderColor = '#d4af37'; silenceBtn.style.color = '#d4af37'; silenceBtn.textContent = 'Silenciar';
        silenceBtn.addEventListener('click', () => silenceAdminRequest(req.id));
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button'; deleteBtn.className = 'souls-btn small-btn'; deleteBtn.style.borderColor = '#8f1f1f'; deleteBtn.style.color = '#ff7474'; deleteBtn.textContent = 'Excluir';
        deleteBtn.addEventListener('click', () => deleteAdminRequest(req.id));
        actions.append(acceptBtn, rejectBtn, silenceBtn, deleteBtn); body.append(text, actions); win.append(header, body); container.appendChild(win);
        makeDraggable(win, header, false);
    });
    return true;
}

async function reviewAtlasRequest(reqId) {
    if (!isCurrentAdmin()) { alert('Acesso restrito ao ADM.'); return false; }
    const req = (Array.isArray(requestsDB) ? requestsDB : []).find(r => String(r.id) === String(reqId)) ||
        (window.MS_DB?.ready ? await window.MS_DB.fetchAdminRequests().then(items => (Array.isArray(items) ? items : []).find(r => String(r.id) === String(reqId))) : null);
    if (!req) { alert('Solicitação cartográfica não encontrada.'); return false; }
    window.MS_ATLAS_REVIEW_REQUEST = req;
    try {
        await Promise.resolve(window.openMasterShield?.());
        setTimeout(() => {
            window.msShieldNavigate?.('mapa');
            if (window.MSAtlas?.reviewRequest) {
                window.MSAtlas.reviewRequest(req);
                delete window.MS_ATLAS_REVIEW_REQUEST;
            }
        }, 180);
    } catch (error) {
        console.error('[Mundos Sombrios] Revisão do Atlas:', error);
        alert(error.message || 'Não foi possível abrir o Atlas.');
        return false;
    }
    return true;
}

async function refreshAdminRequestsAfterAction(reqId) {
    requestsDB = dedupeRequests((await window.MS_DB.fetchAdminRequests()) || []);
    usersDB = await window.MS_DB.fetchUsers();
    msWriteStorageJSON('mundosSombriosRequests', requestsDB);
    document.getElementById(`req-win-${reqId}`)?.remove();
    renderAdminRequestsWindows();
    renderAdminPanel?.();
    return true;
}

async function silenceAdminRequest(reqId) {
    if (!isCurrentAdmin()) { alert('Acesso restrito ao ADM.'); return false; }
    const win = document.getElementById(`req-win-${reqId}`);
    const buttons = win?.querySelectorAll('button') || [];
    buttons.forEach(b => b.disabled = true);
    try {
        if (!window.MS_DB?.ready || typeof window.MS_DB.silenceAdminRequestSecure !== 'function') throw new Error('A operação segura de silenciamento não está disponível no backend.');
        const result = await window.MS_DB.silenceAdminRequestSecure(reqId);
        if (result?.error) throw result.error;
        if (!result?.data) throw new Error('O servidor não confirmou o silenciamento.');
        await refreshAdminRequestsAfterAction(reqId);
        window.MS_PLATFORM?.toast('Solicitação silenciada. Ela não aparecerá como pendente.', 'success');
        return true;
    } catch (error) {
        buttons.forEach(b => b.disabled = false);
        console.error('[Mundos Sombrios] silenciamento administrativo:', error);
        window.MS_PLATFORM?.toast(error?.message || 'Não foi possível silenciar a solicitação.', 'error');
        return false;
    }
}

async function deleteAdminRequest(reqId) {
    if (!isCurrentAdmin()) { alert('Acesso restrito ao ADM.'); return false; }
    if (!confirm('Excluir definitivamente esta solicitação administrativa?')) return false;
    const win = document.getElementById(`req-win-${reqId}`);
    const buttons = win?.querySelectorAll('button') || [];
    buttons.forEach(b => b.disabled = true);
    try {
        if (!window.MS_DB?.ready || typeof window.MS_DB.deleteAdminRequestSecure !== 'function') throw new Error('A operação segura de exclusão não está disponível no backend.');
        const result = await window.MS_DB.deleteAdminRequestSecure(reqId);
        if (result?.error) throw result.error;
        if (result?.data !== true) throw new Error('O servidor não confirmou a exclusão.');
        await refreshAdminRequestsAfterAction(reqId);
        window.MS_PLATFORM?.toast('Solicitação excluída definitivamente.', 'success');
        return true;
    } catch (error) {
        buttons.forEach(b => b.disabled = false);
        console.error('[Mundos Sombrios] exclusão de solicitação administrativa:', error);
        window.MS_PLATFORM?.toast(error?.message || 'Não foi possível excluir a solicitação.', 'error');
        return false;
    }
}

async function handleReq(reqId, approved) {
    if (!isCurrentAdmin()) { alert('Acesso restrito ao ADM.'); return false; }
    const req = (Array.isArray(requestsDB) ? requestsDB : []).find(r => String(r.id) === String(reqId)) ||
        (window.MS_DB?.ready ? await window.MS_DB.fetchAdminRequests().then(items => (Array.isArray(items) ? items : []).find(r => String(r.id) === String(reqId))) : null);
    if (!req) return false;
    const normalizedReq=normalizeRequestEntry(req);const requestType=String(normalizedReq?.data?.type||'master_role').toLowerCase();
    if(requestType==='atlas_change'&&approved)return reviewAtlasRequest(reqId);
    const win=document.getElementById(`req-win-${reqId}`);const buttons=win?.querySelectorAll('button')||[];buttons.forEach(b=>b.disabled=true);
    try{
        if(!window.MS_DB?.ready||typeof window.MS_DB.resolveAdminRequestSecure!=='function')throw new Error('A migração V2.8 de solicitações administrativas ainda não está disponível.');
        const result=await window.MS_DB.resolveAdminRequestSecure(reqId,approved);if(result?.error)throw result.error;if(!result?.data)throw new Error('O servidor não confirmou a decisão.');
        await refreshAdminRequestsAfterAction(reqId);
        window.MS_PLATFORM?.toast(approved?'Solicitação aprovada e confirmada pelo servidor.':'Solicitação recusada e confirmada pelo servidor.','success');return true;
    }catch(error){buttons.forEach(b=>b.disabled=false);console.error('[Mundos Sombrios] decisão administrativa:',error);window.MS_PLATFORM?.toast(error?.message||'Não foi possível concluir a solicitação.','error');return false;}
}

// ==========================================
// DATA ISOLATION
// ==========================================
/* Removed duplicate declaration of a consolidated function: loadUserData */
/* Removed duplicate declaration of a consolidated function: saveGlobalCharacters */
/* Removed duplicate declaration of a consolidated function: saveGlobalJoinedTables */


// DADOS CANÔNICOS DE CARD — MERCADOR DA MORTE
// A patente pertence à ficha e é renderizada diretamente a partir de mercadoDaMorte.rankId.
const MERCADOR_RANK_CARD_DATA = Object.freeze({
    cadete:   { name: 'Cadete de Limiar', symbol: '<path d="M10 17l22 30 22-30-22 13z"/>' },
    executor: { name: 'Executor de Silêncio', symbol: '<path d="M9 15l23 30 23-30-23 13z"/><path d="M9 27l23 30 23-30-23 13z"/>' },
    tenente:  { name: 'Tenente da Queda', symbol: '<path d="M14 13h36v8H14zM14 29h36v8H14z"/><path d="M20 46h24"/>' },
    capitao:  { name: 'Capitão Sombrio', symbol: '<path d="M11 10h42v8H11zM11 25h42v8H11zM11 40h42v8H11z"/>' },
    mestre:   { name: 'Mestre do Véu', symbol: '<path d="M12 12h40v25c0 10-8 16-20 21-12-5-20-11-20-21z"/><path d="M32 17l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z"/>' },
    arauto:   { name: 'Arauto da Morte', symbol: '<path d="M8 17l15 7 9-12 9 12 15-7-7 19 7 11-16-4-8 13-8-13-16 4 7-11z"/><circle cx="27" cy="33" r="3"/><circle cx="37" cy="33" r="3"/><path d="M28 42h8"/>' }
});

function mercadorRankCardMarkup(rankId) {
    const rank = MERCADOR_RANK_CARD_DATA[rankId] || MERCADOR_RANK_CARD_DATA.cadete;
    return `<span class="mercador-rank-card" title="Patente: ${rank.name}" aria-label="Patente: ${rank.name}"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${rank.symbol}</svg></span>`;
}

function syncMercadorPatentFromUI() {
    if (currentClass !== 'Mercador da Morte') return;
    const select = document.querySelector('#v16-rank-select');
    if (!select) return;
    window.__mmDraft = window.__mmDraft || {};
    window.__mmDraft.rankId = select.value || 'cadete';
    const existing = editingIndex !== null && editingIndex !== undefined ? characters[editingIndex] : null;
    if (existing) {
        existing.mercadoDaMorte = msClone({ ...(existing.mercadoDaMorte || {}), ...(window.__mmDraft || {}) });
    }
    document.querySelectorAll('#character-list .card-wrapper').forEach((wrapper, index) => {
        if (index !== editingIndex) return;
        const badge = wrapper.querySelector('.mercador-rank-card');
        if (badge) badge.outerHTML = mercadorRankCardMarkup(window.__mmDraft.rankId);
    });
}

document.addEventListener('change', (event) => {
    if (event.target?.matches('#v16-rank-select')) {
        syncMercadorPatentFromUI();
    }
}, true);

// DICIONÁRIOS
const classDescDict = {
    "Combatente": "Focado em letalidade e resistência linha de frente. Recebe bônus em testes de Força e Vigor ao conjurar o Gene.",
    "Especialista": "Mente tática e analítica. Usa o ambiente e dispositivos criados com o Gene para superar obstáculos impensáveis.",
    "Sobrevivente": "Especialista em evasão, ocultamento e furtividade. Sobrevive às piores caçadas das Entidades.",
    "Engenheiro Biológico": "O cérebro tático. Modifica o gene de aliados através de Bio-Forja e injetores.",
    "IA Virtudes": "Focada em suporte e manipulação de campo de batalha. Otimiza recursos e protege a vida do receptáculo.",
    "IA Domínios": "Focada em combate tático e subjugação de inimigos. Transforma o hospedeiro em uma arma letal impecável.",
    "IA Principados": "Focada em hacking, controle de sistemas e manipulação da própria realidade virtual Kafra.",
    "Velocitus Bellator": "Mutação focada em reflexos beirando o teletransporte e agilidade predatória.",
    "Aeternus Vitalis": "Regeneração atávica absurda. A carne ignora ferimentos mortais e reconstrói ossos em segundos.",
    "Mentis Aurorae": "Expansão neural. Percebe o mundo em câmera lenta, antecipando movimentos e vulnerabilidades.",
    "Mercador da Morte": "Especialista em armamento pesado, explosivos e eliminação de alvos de alto risco.",
    "Carrasco Cinzento": "Inquisidores temidos até pela própria Ordem. Focados em tortura, intimidação e supressão.",
    "Alquerino": "Estudiosos do oculto armados com a ciência da Sala Branca. Usam a anomalia contra ela mesma.",
    "Taumatúrgico": "Canaliza a EP de forma bruta e explosiva. O dano é colossal, mas a corrupção é iminente.",
    "Hermético": "Usa Geometria Esotérica para prender, banir e selar entidades. Focado em controle de área.",
    "Esotérico": "Molda a energia e a carne. Focado em Cirurgia Aberrante e suporte profano.",
    "O Arauto": "O porta-voz do Vazio. Espalha o terror e converte a mente dos inimigos em loucura.",
    "O Tocado": "A carne já não é humana. Absorve golpes mortais e se adapta aos ataques inimigos.",
    "O Condenado": "Sabe que seu fim é iminente e usa a entropia e o azar para arrastar seus inimigos com ele.",
    "Inquisidor (A Lança)": "Focado em caçar hereges. Golpes divinos, força implacável e destruição da matéria negra.",
    "Intérprete (Os Olhos)": "Lê os Códigos da Criação. Revela o oculto, entende línguas mortas e percebe falhas.",
    "Sentinela (A Parede)": "Escudo absoluto. Absorve dano por aliados e é inabalável contra o medo e a corrupção.",
    "Juízo (A Voz)": "Comanda a realidade através do verbo. Suas palavras forçam a verdade sobre a ilusão."
};

const descDict = {
    skills: { "Atletismo": "Baseado em Força.", "Tecnologia": "Baseado em Intelecto." },
    advantages: { "Riqueza": "Permite adquirir equipamentos." },
    talents: { "Destemido": "Imunidade a medo." },
    powers: { "Física": "Força e tração brutas." }
};

const lists = {
    exodo: {
        skills: ["Atletismo", "Tecnologia", "Tratamento", "Luta", "Pontaria", "Intuição", "Persuasão", "Investigação", "Furtividade"],
        advantages: ["Riqueza", "Contatos", "Imunidade Diplomática", "Inventor", "Equipamento Único", "Bem Relacionado", "Atraente", "Identidade Falsa", "Base de Operações", "Autoridade"],
        talents: ["Destemido", "Tolerância à Dor", "Duro de matar", "Resistência Térmica", "Sumir em Vista", "Prodígio", "Sono Leve", "Ambidestria", "Memória eidética", "Equilíbrio Ágil", "Vontade de Ferro", "Sobrevivente"],
        powers: ["Física", "Energética", "Destrutiva", "Protetiva", "Cinesia", "Domínio", "Alteração", "Projeção", "Restauração", "Saturação", "Sistêmica", "Cinética"]
    },
    ocultatun: {
        skills: ["Pontaria", "Luta", "Investigação", "Furtividade", "Ocultismo", "Medicina", "Geometria Esotérica", "Fortitude", "Reflexos", "Vontade", "Intimidação", "Diplomacia", "Mecânica/Artífice", "Linguística", "Navegação Euclidiana", "Sintonia Ontológica", "Criptografia Blasfema", "Cirurgia Aberrante", "Dissimulação Cósmica", "Fé"],
        advantages: ["Fortuna", "Arquivo Confidencial", "Acesso Secreto", "Contatos na Ocultatun", "Santuário", "Biblioteca Proibida", "Veículo de Operações", "Laboratório Pessoal", "Patente de Comando", "Sangue de Nexo", "Rede de Informantes", "Arsenal Privado", "Identidade Civil", "Imunidade Diplomática", "Backup da Sala Branca"],
        talents: ["Duro de Matar", "Sangue Frio", "Gatilho Rápido", "Anatomia de Campo", "Resiliência Biológica", "Mente Blindada", "Sentido de Aranha", "Soco de Impacto", "Recarga Tática", "Pragmático", "Estômago de Aço", "Corredor do Limiar", "Olhar Analítico", "Sacrifício Heroico", "Sobrevivente Urbano"],
        powers: {
            "Agente Designado (Ocultatun)": ["Destrutiva", "Fluxo", "Fissura", "Decadência", "Manipulação", "Propagação", "Pactual", "Quebra"],
            "O Envolto (Horror Cósmico)": ["O Colapso", "A Quimera", "O Véu/Fenda", "Oblívio", "A Inércia", "A Ressonância", "A Anomalia", "O Paradoxo", "A Entropia", "A Gravidade", "O Sangue Negro", "A Emanação", "O Vértice"],
            "A Ordem dos Sete (Alta Glória)": ["Arkhé", "Ex-Nihilo", "Poesis Pleroma"]
        }
    }
};

const ruleset = {
    exodo: {
        natures: {
            "Nexo Padrão (Livro Base)": {
                snippet: "Usuários primários da mutação gênica controlada.",
                desc: "Usuário padrão do Gene Êxodo. Sofre com Assimilação e Estresse Genético. Equilibra seu lado humano com o monstro adormecido em seu DNA.",
                classes: {
                    "Combatente": { attr: {for: 3, vig: 2, agi: 1, int: 0, prn: -1, pre: 0}, skills: ["Atletismo", "Pontaria", "Luta"] },
                    "Especialista": { attr: {for: 0, vig: 1, agi: 2, int: 3, prn: -1, pre: 0}, skills: ["Tecnologia", "Investigação"] },
                    "Sobrevivente": { attr: {for: 1, vig: 3, agi: 2, int: 0, prn: -1, pre: 0}, skills: ["Furtividade", "Tratamento", "Intuição"] }
                },
                resources: ["PV", "Carga Êxodo (CÊ)", "Assimilação", "Estresse Genético"],
                tabName: "O Motor do Gene",
                tabHtml: `
                    <div class="form-group"><label>Estigma Primário:</label><select id="spec-estigma"><option>Somático</option><option>Sensorial</option><option>Metabólico</option><option>Cognitivo</option><option>Entópico</option><option>Singularidade</option></select></div>
                    <div class="form-group"><label>Arquétipo de Destino:</label><select id="spec-arquetipo"><option>Ícone</option><option>Justiceiro</option><option>Inventor</option><option>Mentor</option></select></div>
                    <div class="form-group"><label>Detalhes do Estigma (Rupturas / Mutação):</label><textarea id="spec-mutacoes" rows="2" placeholder="O que acontece com o corpo quando o estigma é ativado..."></textarea></div>
                `
            },
            "Arquiteto de Linhagem (Aprimorador)": {
                snippet: "Humanos puros, manipuladores de DNA.",
                desc: "Humano puro. Imune à assimilação. Usa Dados de Sequenciamento (DS) para Bio-Forja, buffando aliados e aplicando debuffs.",
                classes: { "Engenheiro Biológico": { attr: {for: 0, vig: 1, agi: 1, int: 4, prn: 1, pre: 0}, skills: ["Medicina", "Tecnologia"] } },
                resources: ["PV", "Dados de Seq. (DS)", "Pesquisa (PP %)", "Nível Maestria"],
                tabName: "Engenharia de Linhagem",
                tabHtml: `
                    <div class="form-group" style="text-align:center;">
                        <label style="display:inline-block;">Porcentagem de Pesquisa (PP):</label>
                        <input type="number" id="spec-pp" value="0" min="0" max="200" style="width:100px; display:inline-block; border-color:var(--theme-color); color:var(--theme-color); text-align:center;">
                    </div>
                `
            },
            "Operador de Sistema (Proj. Player)": {
                snippet: "Hackers biológicos ligados à Matrix Kafra.",
                desc: "Interface viva guiada por IAs. Usa Sincronia (PS) e acessa Repositório Kafra para materializar dados no mundo real.",
                classes: {
                    "IA Virtudes": { attr: {for: 2, vig: 2, agi: 2, int: 1, prn: 0, pre: 0}, skills: [] },
                    "IA Domínios": { attr: {for: 3, vig: 2, agi: 2, int: 0, prn: 0, pre: -1}, skills: [] },
                    "IA Principados": { attr: {for: 1, vig: 1, agi: 2, int: 4, prn: 1, pre: -1}, skills: [] }
                },
                resources: ["PV", "Sincronia (PS %)", "CÊ Residual", "Nível Sincronia"],
                tabName: "Interface & Kafra",
                tabHtml: `<div id="player-interface-root"></div><input type="hidden" id="pp-interface-state" value="{}">`
            },
            "Classer (Linhagem Herdada)": {
                snippet: "O ápice da evolução dos coletores.",
                desc: "O ápice genético dos Coletores. Recebe 75 LHL para comprar atributos. Não usa Prodígios normais, focando inteiramente em Mutações passivas.",
                classes: {
                    "Velocitus Bellator": { attr: {for: 1, vig: 0, agi: 1, int: 0, prn: 0, pre: 0}, pts: 75 },
                    "Aeternus Vitalis": { attr: {for: 0, vig: 2, agi: 0, int: 0, prn: 0, pre: 0}, pts: 75 },
                    "Mentis Aurorae": { attr: {for: 0, vig: 0, agi: 0, int: 1, prn: 1, pre: 0}, pts: 75 }
                },
                resources: ["PV", "Estamina (EB)", "LHL Gasto", "Teto LHL"],
                tabName: "Árvore LHL",
                tabHtml: `
                    <div class="form-group"><label>Vantagens Inatas (Classer):</label><textarea id="spec-inatas" rows="2" style="color:var(--theme-color);">Adaptação Extrema, Recuperação Rápida, Resiliência Instintiva</textarea></div>
                `
            }
        }
    },
    ocultatun: {
        natures: {
            "Agente de Carreira (Ocultatun)": {
                snippet: "Humanos puros, treinados no limite militar.",
                desc: "Humanos que resistem ao horror usando tecnologia e treinamento extremo na Sala Branca. Imunes à corrupção.",
                classes: {
                    "Mercador da Morte": { attr: {for: 3, vig: 3, agi: 2, int: 0, prn: 1, pre: -1}, skills: ["Luta", "Pontaria"] },
                    "Carrasco Cinzento": { attr: {for: 4, vig: 4, agi: 0, int: -1, prn: 0, pre: 1}, skills: ["Luta", "Intimidação"] },
                    "Alquerino": { attr: {for: 0, vig: 1, agi: 1, int: 4, prn: 2, pre: 2}, skills: ["Ocultismo", "Medicina"] }
                },
                resources: ["PV", "Estamina/Ameaça", "Patamar (I a IV)", "Sucessos Acum."],
                tabName: "Treino & Arsenal",
                tabHtml: `
                    <div class="form-group"><label>Patamar de Ameaça (I a IV):</label><input type="number" id="spec-patamar" value="1" min="1" max="4" style="border-color:var(--theme-color); color:var(--theme-color);"></div>
                    <div class="form-group"><label>Arsenal Anômalo e Ritualístico:</label><textarea id="spec-arsenal" rows="4"></textarea></div>
                `
            },
            "Agente Designado (Ocultatun)": {
                snippet: "Abençoados e amaldiçoados pela Energia Paranormal.",
                desc: "Portadores da anomalia. Canalizam a Energia Paranormal (EP) correndo risco de virar Herege através da Saturação e Cicatrizes da Alma.",
                classes: {
                    "Taumatúrgico": { attr: {for: 1, vig: 2, agi: 1, int: 2, prn: 1, pre: 3}, skills: ["Vontade", "Ocultismo"] },
                    "Hermético": { attr: {for: 0, vig: 1, agi: 1, int: 4, prn: 3, pre: 1}, skills: ["Geometria Esotérica", "Ocultismo"] },
                    "Esotérico": { attr: {for: 1, vig: 3, agi: 0, int: 4, prn: 1, pre: 0}, skills: ["Cirurgia Aberrante", "Ocultismo"] }
                },
                resources: ["PV", "Energia Paranormal (EP)", "Decadência", "Saturação (%)"],
                tabName: "Anomalias",
                tabHtml: `
                    <div class="form-group"><label>Saturação Paranormal (0 a 100%):</label><input type="number" id="spec-saturacao" value="0" min="0" max="100" style="border-color:var(--theme-color); color:var(--theme-color);"></div>
                    <div class="form-group"><label>Escriptas / Rituais Herméticos:</label><textarea id="spec-magias" rows="4"></textarea></div>
                `
            },
            "O Envolto (Horror Cósmico)": {
                snippet: "Cultistas que abraçam o vazio e a anti-existência.",
                desc: "Cultistas e caçadores que abraçam a anti-existência. Usam as 13 Árvores do Espaço Final e trocam sua sanidade por poder proibido.",
                classes: {
                    "O Arauto": { attr: {for: 0, vig: 1, agi: 1, int: 3, prn: 1, pre: 4}, skills: [] },
                    "O Tocado": { attr: {for: 2, vig: 4, agi: 1, int: 0, prn: 3, pre: 0}, skills: [] },
                    "O Condenado": { attr: {for: 4, vig: 2, agi: 2, int: 2, prn: 0, pre: 0}, skills: [] }
                },
                resources: ["PV", "Energia do Envolto (EE)", "Corrupção Ont. (CO)", "Estágio CO"],
                tabName: "Espaço Final",
                tabHtml: `
                    <div class="form-group"><label>Pontos de Corrupção Ontológica (CO - Máx 100):</label><input type="number" id="spec-co" value="0" min="0" max="100" style="border-color:var(--theme-color); color:var(--theme-color);"></div>
                `
            },
            "A Ordem dos Sete (Alta Glória)": {
                snippet: "Anjos amnésicos conjurando milagres sobre a matéria.",
                desc: "Anjos caídos amnésicos. Despertam a Recordação e conjuram milagres divinos. Suas Dádivas reescrevem as leis do universo.",
                classes: {
                    "Inquisidor (A Lança)": { attr: {for: 3, vig: 3, agi: 1, int: 0, prn: 1, pre: 0}, skills: ["Intimidação", "Luta", "Atletismo"] },
                    "Intérprete (Os Olhos)": { attr: {for: 0, vig: 1, agi: 0, int: 3, prn: 3, pre: 1}, skills: ["Ocultismo", "Investigação", "Linguística"] },
                    "Sentinela (A Parede)": { attr: {for: 1, vig: 4, agi: 0, int: 0, prn: 1, pre: 3}, skills: ["Fortitude", "Intuição"] },
                    "Juízo (A Voz)": { attr: {for: 0, vig: 1, agi: 1, int: 2, prn: 2, pre: 4}, skills: ["Diplomacia", "Intuição", "Pragmático"] }
                },
                resources: ["PV", "Recordação (%)", "Capacidade Max", "Transm. Sim."],
                tabName: "Luz & Glória",
                tabHtml: `
                    <div class="form-group"><label>Porcentagem de Recordação (0 a 100%):</label><input type="number" id="spec-recordacao" value="0" min="0" max="100" style="border-color:var(--theme-color); color:var(--theme-color);"></div>
                    <div class="form-group"><label>Dádivas Forjadas (Arsenal Divino):</label><textarea id="spec-dadivas" rows="2"></textarea></div>
                `
            }
        }
    }
};

window.MS_TABLE_RULE_CATALOG = Object.freeze(Object.fromEntries(Object.entries(ruleset).map(([mode,data])=>[mode,Object.freeze({
    expansions:Object.freeze(Object.keys(data?.natures||{})),
    classes:Object.freeze(Object.fromEntries(Object.entries(data?.natures||{}).map(([nature,def])=>[nature,Object.freeze(Object.keys(def?.classes||{}))])))
})])));

function getNatureCardClass(nature) {
    if(!nature) return "";
    if(nature.includes("Nexo Padrão")) return "card-nexo";
    if(nature.includes("Arquiteto")) return "card-aprimorador";
    if(nature.includes("Operador")) return "card-player";
    if(nature.includes("Classer")) return "card-classer";
    if(nature.includes("Carreira")) return "card-carreira";
    if(nature.includes("Designado")) return "card-designado";
    if(nature.includes("Envolto")) return "card-envolto";
    if(nature.includes("Ordem")) return "card-ordem";
    return "";
}

function applyNatureTheme(nature) {
    const layout = document.getElementById('pdf-content');
    layout.className = 'builder-layout'; 
    if(!nature) return;
    if(nature.includes("Nexo Padrão")) layout.classList.add('theme-exodo-padrao');
    else if(nature.includes("Arquiteto")) layout.classList.add('theme-arquiteto');
    else if(nature.includes("Operador")) layout.classList.add('theme-operador');
    else if(nature.includes("Classer") || nature.includes("Herdada")) layout.classList.add('theme-exodo-classer');
    else if(nature.includes("Carreira")) layout.classList.add('theme-ocultatun-carreira');
    else if(nature.includes("Designado")) layout.classList.add('theme-ocultatun-designado');
    else if(nature.includes("Envolto")) layout.classList.add('theme-ocultatun-envolto');
    else if(nature.includes("Ordem")) layout.classList.add('theme-ocultatun-ordem');
}

// NAVIGATION
function showScreen(id, options = {}) {
    window.MS_PLATFORM?.emit('screen:changing',{screen:id});
    if((id==='screen-char-select'||id==='screen-builder') && window.MS_FEATURES && !window.MS_FEATURES.isBuilderReady()) { window.MS_FEATURES.ensureBuilder().catch(error=>window.MS_PLATFORM?.toast(error.message||'Falha ao carregar a Forja.','error')); }
    const target = document.getElementById(id);
    if(!target) {
        console.error('[Mundos Sombrios] Tela não encontrada:', id);
        return false;
    }
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active', 'overlay'); s.setAttribute('aria-hidden','true'); });
    target.classList.add('active');
    target.setAttribute('aria-hidden','false');
    
    if(id === 'screen-char-select') {
        isEditMode = true; 
        if(typeof renderCharList === 'function') renderCharList();
        if(currentUser) document.getElementById('sanctuary-limits').innerText = `Almas Vivas: ${characters.length} / ${msCapacityLabel(msCharacterCapacity())}`;
    }
    if(id === 'screen-ancoragem' && !options.skipAncoragemRender && typeof renderAncoragem === 'function') {
        renderAncoragem();
    }
    if(id === 'screen-master-shield') setTimeout(()=>window.syncMasterShieldReturnUI?.(),0);
    return true;
}


// Autoridade de direção é contextual à mesa. Um usuário globalmente Mestre não ganha
// poderes em uma mesa de terceiro se ali estiver apenas como jogador/observador.
function msCanUseMasterAuthority(table = null) {
    try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (role === 'admin') return true;
        const target = table || currentTableData || null;
        if (!target) return role === 'mestre';
        if (target.isOwner === true || target.is_owner === true || String(target.ownerId || target.owner_id || '') === String(currentUser?.id || '')) return true;
        const memberRole = String(target.myMemberRole || target.my_member_role || '').toLowerCase();
        return memberRole === 'mestre' || memberRole === 'co_mestre';
    } catch (_) { return false; }
}
window.msCanUseMasterAuthority = msCanUseMasterAuthority;

// Acesso ao acervo é um privilégio da conta Mestre/ADM e também pode ser
// delegado contextualmente a um Co-Mestre. Isso é diferente de poder dirigir
// a mesa atual: um Mestre visitante pode consultar o Escudo sem ganhar controles GM.
function msCanAccessMasterShield(table = null) {
    try {
        const role = String(currentUser?.role || '').toLowerCase();
        if (role === 'mestre' || role === 'admin') return true;
        return msCanUseMasterAuthority(table || currentTableData || null);
    } catch (_) { return false; }
}
window.msCanAccessMasterShield = msCanAccessMasterShield;

function msRefreshCurrentTableAuthority(summary = null) {
    if (currentTableData && summary && typeof summary === 'object') {
        const role = summary.myMemberRole ?? summary.my_member_role;
        const charId = summary.myCharacterId ?? summary.my_character_id;
        const owner = summary.isOwner ?? summary.is_owner;
        if (role !== undefined) currentTableData.myMemberRole = role;
        if (charId !== undefined) currentTableData.myCharacterId = charId;
        if (owner !== undefined) currentTableData.isOwner = !!owner;
        if (summary.status) currentTableData.status = summary.status;
    }
    const previous = !!isVttGM;
    const next = !!msCanUseMasterAuthority(currentTableData);
    isVttGM = next;
    try { window.__msVttIsGM = next; } catch(_) {}
    document.querySelectorAll('.gm-only-btn').forEach(el => el.style.display = next ? 'flex' : 'none');
    if (previous !== next) {
        window.MS_TABLE_SHELL?.mount?.(currentTableData, next);
        window.MasterTools?.mountShield?.(next);
        window.MS_PLATFORM?.toast?.(next ? 'Autoridade de direção concedida nesta mesa.' : 'Sua autoridade de direção nesta mesa foi atualizada.', next ? 'success' : 'info');
    }
    return next;
}
window.msRefreshCurrentTableAuthority = msRefreshCurrentTableAuthority;

// ESCUDO DO MESTRE ↔ MESA AO VIVO
// Mantém a sessão multiplayer conectada enquanto o Mestre/ADM consulta o Escudo.
const MS_SHIELD_RETURN_KEY = 'ms:ui:shield-return:v2';
function msCloneShieldContext(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch(_) { return value || null; }
}
function persistMasterShieldReturnContext(ctx) {
    window.__msShieldReturnContext = ctx || null;
    try {
        if(ctx) sessionStorage.setItem(MS_SHIELD_RETURN_KEY, JSON.stringify(ctx));
        else sessionStorage.removeItem(MS_SHIELD_RETURN_KEY);
    } catch(_) {}
    return ctx;
}
function readMasterShieldReturnContext() {
    if(window.__msShieldReturnContext) return window.__msShieldReturnContext;
    try {
        const stored = JSON.parse(sessionStorage.getItem(MS_SHIELD_RETURN_KEY) || 'null');
        if(stored && typeof stored === 'object') window.__msShieldReturnContext = stored;
    } catch(_) {}
    return window.__msShieldReturnContext || null;
}
function captureMasterShieldReturnContext() {
    const active = document.querySelector('.screen.active')?.id || 'screen-mode-select';
    const existing = readMasterShieldReturnContext();
    if(active === 'screen-master-shield' && existing) {
        syncMasterShieldReturnUI();
        return existing;
    }
    const fromTable = active === 'screen-vtt' && (!!currentTableData || !!isDraftMode);
    const ctx = {
        screen: fromTable ? 'screen-vtt' : active,
        fromTable,
        tableId: currentTableData?.id || (isDraftMode ? 'draft' : null),
        table: fromTable && currentTableData ? msCloneShieldContext(currentTableData) : null,
        isDraft: !!isDraftMode,
        asGM: !!isVttGM,
        capturedAt: Date.now()
    };
    persistMasterShieldReturnContext(ctx);
    syncMasterShieldReturnUI();
    return ctx;
}

function syncMasterShieldReturnUI() {
    const btn = document.getElementById('master-shield-back');
    if(!btn) return;
    const ctx = readMasterShieldReturnContext();
    const recoverableTable = ctx?.fromTable && (currentTableData || ctx?.table || ctx?.tableId === 'draft' || (ctx?.tableId && msGetTableByCodeOrId(ctx.tableId)));
    const canReturnToTable = !!recoverableTable;
    btn.innerHTML = canReturnToTable ? '&#8646; RETORNAR À MESA' : '&#8592; VOLTAR';
    btn.classList.toggle('master-shield-table-return', canReturnToTable);
    btn.setAttribute('aria-label', canReturnToTable ? 'Retornar à Mesa ao Vivo' : 'Voltar à tela anterior');
}

function returnFromMasterShield() {
    const ctx = readMasterShieldReturnContext();
    if(ctx?.fromTable) {
        if(!currentTableData && ctx.tableId && ctx.tableId !== 'draft') {
            currentTableData = msClone(msGetTableByCodeOrId(ctx.tableId) || ctx.table || null);
        }
        if(!currentTableData && ctx.table) currentTableData = msClone(ctx.table);
        if(ctx.tableId === 'draft' || ctx.isDraft) isDraftMode = true;
        // Nunca confia em sessionStorage para restaurar privilégios. A autoridade é
        // recalculada a partir da conta/vínculo atual; o contexto só restaura navegação.
        const returnRole = String(currentUser?.role || '').toLowerCase();
        isVttGM = isDraftMode ? (returnRole === 'mestre' || returnRole === 'admin') : msCanUseMasterAuthority(currentTableData);
        try { window.__msVttIsGM = !!isVttGM; } catch(_) {}
        document.querySelectorAll('.gm-only-btn').forEach(el => el.style.display = isVttGM ? 'flex' : 'none');
        if(currentTableData || isDraftMode) {
            showScreen('screen-vtt');
            const screen = document.getElementById('screen-vtt');
            screen?.classList.add('ms-table-v3-active');
            window.MS_TABLE_SHELL?.mount?.(currentTableData || {name:document.getElementById('vtt-table-name')?.textContent||'Nova Fenda',code:'RASCUNHO'}, isVttGM);
            window.MasterTools?.mountShield?.(isVttGM, currentTableData);
            window.MasterTools?.restoreVttState?.();
            setTimeout(()=>{
                try{
                    window.initVttGrid?.();
                    window.vttCanvas?.calcOffset?.();
                    window.vttCanvas?.requestRenderAll?.();
                }catch(_){}
            },60);
            persistMasterShieldReturnContext(null);
            return true;
        }
        window.MS_PLATFORM?.toast?.('A Mesa anterior não pôde ser recuperada nesta sessão.','error');
    }
    const target = ctx?.screen && ctx.screen !== 'screen-master-shield' && document.getElementById(ctx.screen) ? ctx.screen : 'screen-mode-select';
    persistMasterShieldReturnContext(null);
    showScreen(target);
    return true;
}
window.captureMasterShieldReturnContext = captureMasterShieldReturnContext;
window.syncMasterShieldReturnUI = syncMasterShieldReturnUI;
window.returnFromMasterShield = returnFromMasterShield;

function selectGameMode(mode) {
    window.MS_PLATFORM?.emit('mode:changing',{mode});
    window.MS_PLATFORM?.setCache('selectedGameMode', mode);
    if (mode !== 'exodo' && mode !== 'ocultatun') {
        console.error('[Mundos Sombrios] Modo inválido selecionado:', mode);
        alert('Modo de jogo inválido. Escolha Êxodo ou Ocultatun.');
        return false;
    }
    selectedGameMode = mode;
    currentMode = mode;
    window.__mundosSelectedMode = mode;
    const titleEl = document.getElementById('sanctuary-title');
    titleEl.innerText = mode === 'exodo' ? "Santuário de Êxodo" : "Santuário de Ocultatun";
    showScreen('screen-char-select');
}

// MESA / ANCORAGEM
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
/* Removed duplicate declaration of a consolidated function: openCreateTableModal */
/* Removed duplicate declaration of a consolidated function: confirmCreateTable */
/* Removed duplicate declaration of a consolidated function: saveDraftTable */
/* Removed duplicate declaration of a consolidated function: renderAncoragem */

function copyCode(code) {
    const value = String(code || '');
    const fallback = () => {
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); alert('Código copiado para a área de transferência!'); }
        finally { area.remove(); }
    };
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(() => alert('Código copiado para a área de transferência!')).catch(fallback);
    } else { fallback(); }
}
/* Removed duplicate declaration of a consolidated function: deleteTable */
/* Removed duplicate declaration of a consolidated function: leaveJoinedTable */
/* Removed duplicate declaration of a consolidated function: openJoinTableModal */
/* Removed duplicate declaration of a consolidated function: confirmJoinTable */

// BUILDER FUNCTIONS (RESTRUCTURED CLASSES AND EXPANSIONS)
/* Removed duplicate declaration of a consolidated function: initBuilderForSelectedMode */

function updateSkillSelects() {
    const typeSelect = document.getElementById('select-skill-type');
    const nameSelect = document.getElementById('select-skill-name');
    if (!typeSelect || !nameSelect) return;
    const mode = currentMode || selectedGameMode || 'exodo';
    const source = lists[mode] || lists.exodo;
    const key = typeSelect.value === 'Perícia' ? 'skills' : typeSelect.value === 'Vantagem' ? 'advantages' : 'talents';
    const values = Array.isArray(source?.[key]) ? source[key] : [];
    nameSelect.innerHTML = values.map(item => `<option value="${String(item).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}">${String(item).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`).join('');
    updateSkillDesc();
}

function exportCharacterJSON() {
    const sourceArray = document.getElementById('screen-vtt')?.classList.contains('active') ? tablePlayers : characters;
    const char = sourceArray[editingIndex] || sourceArray[0];
    if (!char) {
        window.MS_PLATFORM?.toast('Nenhuma alma selecionada para exportar.','error');
        return false;
    }
    const exported = window.MS_PLATFORM?.exportCharacter(char,'json');
    if (exported) window.MS_PLATFORM?.toast('Ficha exportada em JSON.','success');
    return exported !== false;
}

function importCharacterJSON(evt) {
    const file = evt?.target?.files?.[0];
    if (!file) return;
    if (!currentUser) { alert('Faça login antes de importar uma ficha.'); evt.target.value=''; return; }
    const limit = msCharacterCapacity();
    if (!msCanCreateCharacter()) { alert(window.MS_SOUL?.slotMessage?.('character') || `O limite de ${msCapacityLabel(limit)} almas forjadas foi atingido.`); window.MS_SOUL?.openVault?.('store','character_slot'); evt.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const data = JSON.parse(String(reader.result || '{}'));
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID_JSON');
            if (window.MS_SOUL && !window.MS_SOUL.canUseNature?.(data.nature)) {
                window.MS_SOUL.showLockedExpansion?.(data.nature);
                throw new Error('EXPANSION_LOCKED');
            }
            data.id = (globalThis.crypto?.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
            data.ownerId = currentUser.id;
            data.userId = currentUser.id;
            const confirmed = await msPersistCharacterToRepo(data, currentUser.id, data.id);
            if (!confirmed) throw new Error('SAVE_NOT_CONFIRMED');
            loadUserData();
            renderCharList();
            window.MS_SOUL?.fetchState?.({ quiet:true });
            alert('Ficha importada e sincronizada com sucesso.');
        } catch (error) {
            const code=String(error?.message||error||'');
            if(code.includes('EXPANSION_LOCKED')) alert('Esta ficha usa uma expansão ainda não desbloqueada para sua conta. O arquivo continua intacto; desbloqueie a expansão no Cofre SoulDrakma para importá-lo.');
            else if(code.includes('CHARACTER_SLOT_LIMIT')) alert(window.MS_SOUL?.slotMessage?.('character') || 'Sua capacidade de fichas foi atingida.');
            else if(code.includes('INVALID_JSON') || error instanceof SyntaxError) alert('Não foi possível importar a ficha: JSON inválido.');
            else alert(`Não foi possível importar a ficha com segurança: ${error?.message || 'falha de persistência'}.`);
        } finally { evt.target.value=''; }
    };
    reader.readAsText(file);
}

function openCodex() {
    if (typeof showScreen === 'function') showScreen('screen-codex');
}

/* Editor de corte pertence a js/gallery-editor.js.
 * Estas funções não devem ser reintroduzidas neste arquivo.
 */

function populateSelects(mode) {
    const skSelect = document.getElementById('select-skill-name');
    const typeSelect = document.getElementById('select-skill-type');
    if (!skSelect || !typeSelect) return;
    skSelect.innerHTML = '';
    
    typeSelect.onchange = () => {
        skSelect.innerHTML = '';
        const listToUse = typeSelect.value === 'Perícia' ? lists[mode].skills : 
                          typeSelect.value === 'Vantagem' ? lists[mode].advantages : lists[mode].talents;
        listToUse.forEach(item => skSelect.innerHTML += `<option value="${item}">${item}</option>`);
        updateSkillDesc();
    };
    typeSelect.onchange(); 

    const pwSelect = document.getElementById('pb-potency-name');
    if (pwSelect) pwSelect.innerHTML = '';
}

function archetypeSlug(value) {
    return String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

function archetypeAccent(mode, name, kind) {
    if (window.MS_ARCHETYPE_ART) {
        const art = window.MS_ARCHETYPE_ART.get(name, kind);
        if (art?.palette?.length >= 2) return art.palette;
    }
    const themes = {
        exodo: {
            'arquétipo-existente': ['#7cf7ff','#79a7ff'],
            'nexo-fonte-viva': ['#67f5ff','#8c7bff']
        },
        ocultatun: {
            'o-envolto-horror-cosmico': ['#d6b66e','#8c5b2e'],
            'a-ordem-dos-sete-alta-gloria': ['#9fd3b5','#d6b66e']
        }
    };
    const exact = themes[mode] || {};
    const slug = archetypeSlug(name);
    if (exact[slug]) return exact[slug];
    const palettes = mode === 'exodo'
        ? [['#6de8ff','#8a7cff'],['#72ffc9','#4ec7ff'],['#b9a7ff','#67d7ff'],['#7ce8ff','#5ad1b4']]
        : [['#c8a86b','#6f4934'],['#b8a07a','#5c6f7e'],['#d5bf87','#7b3f4d'],['#a8b18f','#574b36']];
    let hash = 0; for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const pair = palettes[hash % palettes.length];
    return pair;
}

function renderArchetypeCards(gridId, entries, options = {}) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const mode = currentMode || 'exodo';
    const type = options.type || 'class';
    const selected = options.selected || '';
    const disabled = !!options.disabled;
    const artType = type === 'expansion' ? 'nature' : 'class';
    const entriesList = Object.entries(entries || {});
    const safe = value => window.escHtml ? window.escHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    if (!entriesList.length) { grid.innerHTML = '<div class="archetype-empty">Nenhuma opção disponível.</div>'; return; }

    grid.className = `archetype-grid archetype-grid-${mode} archetype-grid-${type} archetype-carousel`;
    grid.innerHTML = '';
    const selectedIndex = Math.max(0, entriesList.findIndex(([name]) => name === selected));
    let index = selectedIndex >= 0 ? selectedIndex : 0;

    const stageKicker = type === 'expansion' ? (mode === 'exodo' ? 'ARQUIVO DE ORIGEM' : 'REGISTRO DE ARQUIVO') : 'FORJA DE PERSONAGEM';
    const stageTitle = type === 'expansion' ? (mode === 'exodo' ? 'Escolha sua linhagem de Êxodo' : 'Abra o arquivo que moldará sua ficha') : 'Escolha sua classe';
    const stageNote = type === 'expansion'
        ? (mode === 'exodo' ? 'Cada linhagem muda a fantasia, os recursos e o ritmo mecânico da ficha.' : 'Cada arquivo altera sua relação com o paranormal, seus riscos e sua função em campo.')
        : 'Uma opção por vez. Use as setas para comparar função, atributos e estilo antes de confirmar.';

    const head = document.createElement('div');
    head.className = 'archetype-stage-head';
    head.innerHTML = `<div class="archetype-stage-copy"><span class="archetype-stage-kicker">${stageKicker}</span><h3 class="archetype-stage-title">${stageTitle}</h3><p class="archetype-stage-note">${stageNote}</p></div><div class="archetype-stage-meta"><span class="archetype-stage-chip">${mode === 'exodo' ? 'ÊXODO' : 'OCULTATUN'}</span><span class="archetype-stage-chip" data-carousel-counter></span><span class="archetype-stage-chip">${disabled ? 'ESCOLHA FIXADA' : 'NAVEGUE E CONFIRME'}</span></div>`;
    grid.appendChild(head);

    const carousel = document.createElement('div');
    carousel.className = 'archetype-carousel-shell ms-archetype-carousel';
    carousel.innerHTML = `<button type="button" class="archetype-nav archetype-nav-prev" aria-label="Opção anterior">‹</button><div class="archetype-carousel-viewport" aria-live="polite"></div><button type="button" class="archetype-nav archetype-nav-next" aria-label="Próxima opção">›</button>`;
    grid.appendChild(carousel);
    const viewport = carousel.querySelector('.archetype-carousel-viewport');
    const prev = carousel.querySelector('.archetype-nav-prev');
    const next = carousel.querySelector('.archetype-nav-next');
    const counter = head.querySelector('[data-carousel-counter]');

    function attrsSummary(data) {
        const attrs = data?.attr || {};
        const labels = {for:'FOR',vig:'VIG',agi:'AGI',int:'INT',prn:'PRN',pre:'PRE'};
        return Object.entries(labels).map(([key,label]) => `<span><b>${label}</b>${safe(attrs[key] ?? 0)}</span>`).join('');
    }

    function renderCurrent(direction = 0) {
        const [name, data] = entriesList[index];
        const art = window.MS_ARCHETYPE_ART ? window.MS_ARCHETYPE_ART.get(name, artType) : null;
        const [accent, glow] = art?.palette?.length >= 2 ? art.palette : archetypeAccent(mode, name, type);
        head.style.setProperty('--builder-accent', accent);
        head.style.setProperty('--builder-glow', glow);
        counter.textContent = `${index + 1} / ${entriesList.length}`;
        const isSelected = name === (document.getElementById(type === 'expansion' ? 'char-nature' : 'char-class')?.value || selected);
        const label = type === 'expansion' ? (mode === 'exodo' ? 'LINHAGEM / ORIGEM' : 'ARQUIVO / EXPANSÃO') : (art?.role || 'CLASSE');
        const summary = type === 'expansion' ? (data?.desc || data?.snippet || art?.tone || '') : (classDescDict[name] || data?.desc || art?.tone || '');
        const mechanics = type === 'expansion'
            ? `<div class="archetype-mechanics"><strong>Recursos</strong><div>${(data?.resources || []).map(x => `<span>${safe(x)}</span>`).join('') || '<span>Recursos definidos pela classe</span>'}</div></div>`
            : `<div class="archetype-mechanics"><strong>Atributos base</strong><div class="archetype-attr-strip">${attrsSummary(data)}</div>${Array.isArray(data?.skills)&&data.skills.length?`<small>Perícias nativas: ${safe(data.skills.join(' · '))}</small>`:''}</div>`;
        viewport.dataset.direction = direction > 0 ? 'next' : direction < 0 ? 'prev' : 'idle';
        viewport.innerHTML = `<article class="archetype-card ${isSelected?'active':''} ${disabled?'archetype-locked':''}" data-archetype="${safe(archetypeSlug(name))}" data-mode="${safe(mode)}" data-type="${safe(type)}" data-art-family="${safe(art?.family || 'unknown')}" style="--archetype-accent:${accent};--archetype-glow:${glow};--art-accent:${accent};--art-glow:${glow}">
          <div class="archetype-portrait-stage"><img class="archetype-portrait" src="${safe(art?.image || '')}" alt="Personagem representativo de ${safe(name)}" loading="lazy" decoding="async"><span class="archetype-portrait-vignette" aria-hidden="true"></span><span class="archetype-scanline" aria-hidden="true"></span><div class="archetype-card-top"><span class="archetype-seal" aria-hidden="true">${safe(art?.icon || (type === 'expansion' ? '▣' : '◇'))}</span><span class="archetype-art-classcode"><span>${safe(art?.codename || name.toUpperCase())}</span>${safe(art?.shot || art?.kicker || '')}</span></div></div>
          <div class="archetype-card-copy"><span class="archetype-kind">${safe(label)}</span><h4>${safe(name)}</h4><p>${safe(summary)}</p><span class="archetype-art-tagline">${safe(art?.call || art?.tone || 'A identidade começa aqui.')}</span>${mechanics}<div class="archetype-select-row"><span>${safe(art?.tag || art?.token || (mode === 'exodo' ? 'GENE' : 'CÓDICE'))}</span><button type="button" class="archetype-confirm" ${disabled?'disabled':''}>${isSelected ? 'SELECIONADO' : (disabled ? 'ESCOLHA FIXADA' : `SELECIONAR ${type === 'expansion' ? 'EXPANSÃO' : 'CLASSE'}`)}</button></div></div>
        </article>`;
        const confirm = viewport.querySelector('.archetype-confirm');
        if (confirm && !disabled) confirm.addEventListener('click', () => {
            const fn = options.onSelect;
            if (fn) fn(name);
            renderCurrent(0);
        });
        const card = viewport.querySelector('.archetype-card');
        if (card && !disabled) card.addEventListener('dblclick', () => confirm?.click());
        if (type === 'expansion') queueMicrotask(() => window.MS_SOUL?.decorateExpansionCard?.());
        prev.disabled = disabled || entriesList.length < 2;
        next.disabled = disabled || entriesList.length < 2;
    }

    function move(delta) {
        if (disabled || entriesList.length < 2) return;
        index = (index + delta + entriesList.length) % entriesList.length;
        renderCurrent(delta);
    }
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    carousel.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
    carousel.tabIndex = 0;
    renderCurrent(0);
}

function startBuilder(mode) {
    if(window.MS_FEATURES && !window.MS_FEATURES.isBuilderReady()) { window.MS_FEATURES.ensureBuilder().then(()=>startBuilder(mode)).catch(error=>window.MS_PLATFORM?.toast(error.message||'Falha ao carregar a Forja.','error')); return true; }
    if(mode !== 'exodo' && mode !== 'ocultatun' || !ruleset[mode]) {
        console.error('[Mundos Sombrios] Modo inválido ao abrir o construtor:', mode);
        return false;
    }
    currentMode = mode;
    const modeInput = document.getElementById('char-mode');
    if(!modeInput) return false;
    modeInput.value = mode;
    const natureGrid = document.getElementById('nature-grid');
    if(!natureGrid) return false;
    natureGrid.innerHTML = '';
    document.getElementById('char-nature').value = '';
    document.getElementById('nature-description').style.display = 'none';
    document.getElementById('class-container').style.display = 'none';
    document.getElementById('char-class').value = '';
    renderArchetypeCards('nature-grid', ruleset[mode].natures, { type: 'expansion', selected: '', onSelect: selectNature });
    setTimeout(()=>window.MS_SOUL?.decorateExpansionCard?.(),0);
    showScreen('screen-builder');
    openTab('tab-identity');
    return true;
}

function selectNature(natureName) {
    if (editingIndex !== null && !isHydratingCharacter) return;
    if(!isEditMode && !document.getElementById('screen-builder').classList.contains('overlay')) return;
    if (!isHydratingCharacter && window.MS_SOUL && !window.MS_SOUL.canUseNature(natureName)) {
        window.MS_SOUL.showLockedExpansion(natureName);
        return false;
    }
    currentNature = natureName;
    document.getElementById('char-nature').value = natureName;
    
    document.querySelectorAll('#nature-grid .archetype-card').forEach(c => {
        c.classList.toggle('active', c.dataset.archetype === archetypeSlug(natureName));
    });

    const natureData = ruleset[currentMode].natures[natureName];
    
    const descBox = document.getElementById('nature-description');
    descBox.innerText = natureData.desc;
    descBox.style.display = 'block';

    applyNatureTheme(currentNature);
    
    const classGrid = document.getElementById('class-grid');
    classGrid.innerHTML = '';
    document.getElementById('char-class').value = '';
    document.getElementById('subclass-description').style.display = 'none';
    
    renderArchetypeCards('class-grid', natureData.classes, { type: 'class', selected: '', onSelect: selectClass });
    
    document.getElementById('class-container').style.display = 'block';
    setupResources(natureData.resources);
    
    const tabsContainer = document.getElementById('dynamic-tabs');
    const existing = document.getElementById('btn-tab-specific');
    if(existing) existing.remove();
    
    if(natureData.tabName) {
        // Inserção incremental: não reconstrói #dynamic-tabs nem seus botões existentes.
        tabsContainer.insertAdjacentHTML('beforeend', `<button id="btn-tab-specific" class="tab-btn special-tab" type="button" onclick="openTab('tab-specific')">${natureData.tabName}</button>`);
        
        if(natureName === 'O Envolto (Horror Cósmico)' || natureName === 'Classer (Linhagem Herdada)') {
             buildSkillTreeUI(natureName);
        } else if (natureName === 'Arquiteto de Linhagem (Aprimorador)' && typeof window.buildAprimoradorEngineeringUI === 'function') {
             window.buildAprimoradorEngineeringUI();
        } else if (natureName === 'Operador de Sistema (Proj. Player)' && typeof window.renderProjetoPlayerInterface === 'function') {
             window.renderProjetoPlayerInterface();
        } else {
             document.getElementById('specific-content-container').innerHTML = natureData.tabHtml;
        }
    }
    
    updatePowerSelects(currentNature);
    applyEquipmentProfile({mode:currentMode,nature:currentNature,name:document.getElementById('char-name')?.value||''});
    renderEquipmentSheet();
    recalculateStats();
}

function selectClass(className, skipAutofill = false) {
    if (editingIndex !== null && !isHydratingCharacter) return;
    if(!isEditMode && !document.getElementById('screen-builder').classList.contains('overlay')) return;
    
    currentClass = className;
    document.getElementById('char-class').value = className;
    
    document.querySelectorAll('#class-grid .archetype-card').forEach(c => {
        c.classList.toggle('active', c.dataset.archetype === archetypeSlug(className));
    });

    const classData = ruleset[currentMode].natures[currentNature].classes[className];
    const classDescBox = document.getElementById('subclass-description');
    if(classDescDict[className]) {
        classDescBox.innerText = classDescDict[className];
        classDescBox.style.display = 'block';
    } else {
        classDescBox.style.display = 'none';
    }

    if (!skipAutofill) {
        document.getElementById('attr-for').value = classData.attr.for || 0;
        document.getElementById('attr-vig').value = classData.attr.vig || 0;
        document.getElementById('attr-agi').value = classData.attr.agi || 0;
        document.getElementById('attr-int').value = classData.attr.int || 0;
        document.getElementById('attr-prn').value = classData.attr.prn || 0;
        document.getElementById('attr-pre').value = classData.attr.pre || 0;
    }

    if(isEditMode) {
        document.querySelectorAll('.attr-input').forEach(i => i.removeAttribute('readonly'));
    }

    if(classData.pts) {
        document.getElementById('points-tracker').style.display = 'block';
        if (!skipAutofill) document.getElementById('pts-count').value = classData.pts;
    } else {
        document.getElementById('points-tracker').style.display = 'block';
        if (!skipAutofill) document.getElementById('pts-count').value = 0;
    }

    if (!skipAutofill) {
        const skillsList = document.getElementById('skills-list');
        skillsList.innerHTML = '';
        if(classData.skills && classData.skills.length > 0) {
            classData.skills.forEach(sk => {
                skillsList.innerHTML += `
                    <div class="list-item locked">
                        <div class="list-item-header">
                            <input type="text" value="${sk} (Nativo da Casca)" readonly>
                        </div>
                    </div>`;
            });
        }
    }
    recalculateStats();

    // Projeto Player: a Interface & Kafra depende da classe/IA já selecionada.
    // Re-renderiza após a escolha da IA para garantir que o painel não permaneça vazio.
    if (currentNature === 'Operador de Sistema (Proj. Player)' && typeof window.renderProjetoPlayerInterface === 'function') {
        try {
            window.renderProjetoPlayerInterface();
            // A Interface & Kafra é a tela específica da natureza; após a seleção
            // da IA, mostrá-la imediatamente evita deixar o usuário preso na aba
            // Identidade com o conteúdo já renderizado, porém invisível.
            openTab('tab-specific');
        } catch (err) {
            console.warn('[Mundos Sombrios] Falha ao renderizar Interface & Kafra após seleção de IA:', err);
        }
    }
    if (['Arquiteto de Linhagem (Aprimorador)','Operador de Sistema (Proj. Player)','Classer (Linhagem Herdada)','Agente de Carreira (Ocultatun)','Agente Designado (Ocultatun)','O Envolto (Horror Cósmico)'].includes(currentNature) && document.getElementById('tab-powers')?.classList.contains('active') && typeof window.MundosPowerRegistry?.render === 'function') {
        setTimeout(() => window.MundosPowerRegistry.render(), 0);
    }
}

function updateSkillDesc() {
    const type = document.getElementById('select-skill-type').value;
    const name = document.getElementById('select-skill-name').value;
    const box = document.getElementById('skill-desc-box');
    
    let dict = null;
    if(type === 'Perícia') dict = descDict.skills;
    else if(type === 'Vantagem') dict = descDict.advantages;
    else if(type === 'Talento') dict = descDict.talents;

    if(dict && dict[name]) box.innerText = dict[name];
    else box.innerText = "Descrição indisponível nos registros primários.";
}

function updatePowerSelects(nature) {
    const pwSelect = document.getElementById('pb-potency-name');
    if(!pwSelect) return;
    pwSelect.innerHTML = '';
    let powersToUse = [];
    
    if(currentMode === 'exodo') {
        powersToUse = lists.exodo.powers;
    } else {
        if(lists.ocultatun.powers[nature]) {
            powersToUse = lists.ocultatun.powers[nature];
        } else {
            powersToUse = ["Habilidades Manuais"];
        }
    }
    powersToUse.forEach(p => pwSelect.innerHTML += `<option value="${p}">${p}</option>`);
    updatePowerDesc();
}

function updatePowerDesc() {
    const name = document.getElementById('pb-potency-name').value;
    const box = document.getElementById('power-desc-box');
    if(descDict.powers[name]) box.innerText = descDict.powers[name];
    else box.innerText = "";
}

function setupResources(resList) {
    const panel = document.getElementById('resource-panel');
    panel.innerHTML = '';
    resList.forEach(res => {
        panel.innerHTML += `
            <div class="res-box">
                <h4>${res}</h4>
                <input type="text" class="res-val-input" data-type="${res}" id="res-val-${res.replace(/[^a-zA-Z]/g, '')}">
            </div>`;
    });
}

function recalculateStats() {
    if(!currentNature) return;
    
    const vig = parseInt(document.getElementById('attr-vig').value) || 0;
    const int = parseInt(document.getElementById('attr-int').value) || 0;
    const pre = parseInt(document.getElementById('attr-pre').value) || 0;
    const prn = parseInt(document.getElementById('attr-prn').value) || 0;
    
    const panel = document.getElementById('resource-panel');
    
    panel.querySelectorAll('.res-val-input').forEach(inp => {
        const type = inp.getAttribute('data-type');
        const val = window.MS_PLATFORM?.calculateBaseResource(type, {
            vig, int, pre, currentClass, currentNature
        }) ?? '-';
        window.MS_PLATFORM?.emit('resource:calculated', { type, value: val, context: { vig, int, pre, currentClass, currentNature } });
        
        inp.placeholder = "Base: " + val;
        
        if(isEditMode) {
             inp.value = val !== "-" ? val : "";
        }
    });
    // A reserva do Aprimorador é uma reserva de alocação própria; não usar a fórmula genérica de DS.
    if (currentNature === 'Arquiteto de Linhagem (Aprimorador)' && typeof window.aprimoradorSyncResources === 'function') {
        try { window.aprimoradorSyncResources(); } catch (err) { console.warn('[Aprimorador] Falha ao sincronizar DS/PP:', err); }
    }
}

function openTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // Aba específica: garantir que módulos dinâmicos tenham sido montados
    // antes de exibir a tela. Isto também corrige fichas carregadas/retomadas.
    if (tabId === 'tab-specific' && currentNature === 'Operador de Sistema (Proj. Player)' && typeof window.renderProjetoPlayerInterface === 'function') {
        try { window.renderProjetoPlayerInterface(); }
        catch (err) { console.warn('[Mundos Sombrios] Falha ao abrir Interface & Kafra:', err); }
    }
    if (tabId === 'tab-powers' && window.MundosNexo) {
        if (window.MundosNexo.isNexo()) window.MundosNexo.render();
        else window.MundosNexo.restoreGeneric();
    }
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    toggleEditUI();
}
/* Removed duplicate declaration of a consolidated function: toggleEditUI */

function closeBuilder() {
    const builder = document.getElementById('screen-builder');
    isHydratingCharacter = false;
    if(builder.classList.contains('overlay')) {
        builder.classList.remove('active', 'overlay');
    } else {
        showScreen('screen-char-select');
    }
}

function previewAvatar(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => openCropModal(evt.target.result, 'avatar');
    reader.readAsDataURL(file);
    e.target.value = '';
}

function addGalleryImages(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => openCropModal(evt.target.result, 'gallery');
    reader.readAsDataURL(file);
    e.target.value = '';
}

let fsZoom = 1;
function viewFullscreen(src) {
    const modal = document.getElementById('fs-modal');
    const img = document.getElementById('fs-img');
    img.src = src;
    fsZoom = 1;
    img.style.transform = `scale(${fsZoom})`;
    modal.style.display = 'flex';
}

function closeFullscreen() {
    document.getElementById('fs-modal').style.display = 'none';
}

function bootAuthScreen() {
    const login = document.getElementById('screen-login');
    const portal = document.getElementById('screen-portal');
    if (!login || !portal) return;
    if (!currentUser) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active', 'overlay'));
        portal.classList.add('active');
        portal.setAttribute('data-portal-ready', 'true');
        const emblem = document.getElementById('master-emblem');
        if (emblem) emblem.style.display = 'none';
        const adminBtn = document.getElementById('btn-admin-panel');
        if (adminBtn) adminBtn.style.display = 'none';
        const gmTab = document.getElementById('tab-btn-gm');
        if (gmTab) gmTab.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    bootAuthScreen();
    document.getElementById('char-form')?.addEventListener('input', () => validateCurrentCharacterDraft(), { passive: true });
    const fsModal = document.getElementById('fs-modal');
    if(fsModal) {
        fsModal.addEventListener('wheel', (e) => {
            e.preventDefault();
            fsZoom += e.deltaY * -0.002;
            fsZoom = Math.min(Math.max(0.5, fsZoom), 5);
            document.getElementById('fs-img').style.transform = `scale(${fsZoom})`;
        });
    }
});

function addSkillFromSelect() {
    const type = document.getElementById('select-skill-type').value;
    const name = document.getElementById('select-skill-name').value;
    const grau = document.getElementById('select-skill-grau').value;
    if(!name) return;

    const container = document.getElementById('skills-list');
    const div = document.createElement('div');
    div.className = 'list-item';
    let descText = descDict.skills[name] || descDict.advantages[name] || descDict.talents[name] || '';
    div.innerHTML = `
        <div class="list-item-header">
            <input type="text" value="${type}: ${name} (G${grau})" readonly>
            <button type="button" class="hide-on-view" onclick="this.closest('.list-item').remove()">&#10006;</button>
        </div>
        <div class="desc-box" style="margin-top:5px; border-left:none;">${descText}</div>
    `;
    container.appendChild(div);
}

function addPotencyToDraft() {
    const pName = document.getElementById('pb-potency-name').value;
    const pCap = document.getElementById('pb-potency-cap').value;
    if(!pName) return;
    currentPowerDraft.push({ potency: pName, cap: pCap });
    
    const ul = document.getElementById('pb-draft-list');
    ul.innerHTML = '';
    currentPowerDraft.forEach((p, idx) => {
        ul.innerHTML += `<li>${p.potency} [Cap: ${p.cap}] <button type="button" onclick="currentPowerDraft.splice(${idx},1); this.parentElement.remove();" style="background:none; border:none; color:red; cursor:pointer;">(x)</button></li>`;
    });
}

function msFieldValue(id) { const el=document.getElementById(id); return el ? String(el.value||'').trim() : ''; }

function renderPowerItem(power) {
    const safe = window.escHtml || (v=>String(v??''));
    const div = document.createElement('div');
    div.className = 'list-item';
    div.dataset.power = JSON.stringify(power || {});
    const formula = (power.components||[]).map(p => `<span class="nature-text">${safe(p.potency)} (Cap:${safe(p.cap)})</span>`).join(' + ');
    const data = [['Efeito',power.effect],['Alcance',power.range],['Duração',power.duration],['Alvos',power.targets],['Custo',power.cost],['Teste',power.test]].filter(([,v])=>v);
    div.innerHTML = `
        <div class="list-item-header">
            <input type="text" value="${safe(power.name)}" class="power-name-input" readonly style="flex:1;font-weight:bold;color:var(--theme-color);">
            <input type="text" value="${safe(power.modifiers||'')}" class="power-mod-input" placeholder="S/Modificadores" readonly style="flex:1;color:#aaa;">
            <button type="button" class="hide-on-view" onclick="this.closest('.list-item').remove()">&#10006;</button>
        </div>
        ${formula?`<div style="font-size:.85rem;margin-top:5px;color:#00ffcc;">Fórmula: ${formula}</div>`:''}
        <div class="ms-power-data">${data.map(([k,v])=>`<span><b>${k}:</b> ${safe(v)}</span>`).join('')}${power.consequences?`<span class="wide"><b>Consequências:</b> ${safe(power.consequences)}</span>`:''}</div>
        <textarea readonly class="power-desc-input">${safe(power.description||'')}</textarea>`;
    return div;
}

function commitPower() {
    const power = {
        id: (crypto.randomUUID ? crypto.randomUUID() : 'pow-'+Date.now()),
        name: msFieldValue('pb-name'), modifiers: msFieldValue('pb-mod'), description: msFieldValue('pb-desc'),
        effect: msFieldValue('pb-effect'), range: msFieldValue('pb-range'), duration: msFieldValue('pb-duration'),
        targets: msFieldValue('pb-targets'), cost: msFieldValue('pb-cost'), test: msFieldValue('pb-test'),
        consequences: msFieldValue('pb-consequence'), components: msClone(currentPowerDraft || [])
    };
    if(!power.name) { alert("Dê um nome ao poder/ritual."); return; }
    if(currentPowerDraft.length === 0 && !power.effect) { alert("Defina o efeito ou anexe ao menos uma potência à fórmula."); return; }
    document.getElementById('powers-list')?.appendChild(renderPowerItem(power));
    ['pb-name','pb-mod','pb-desc','pb-effect','pb-range','pb-duration','pb-targets','pb-cost','pb-test','pb-consequence'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    currentPowerDraft = [];
    const draft=document.getElementById('pb-draft-list'); if(draft) draft.innerHTML='';
    window.MS_ONLINE_UI?.saveBuilderDraft?.();
}

function renderEvolutionEntries() {
    const box=document.getElementById('evolution-list'); if(!box) return;
    const safe=window.escHtml || (v=>String(v??''));
    box.innerHTML = currentEvolutionLog.length ? currentEvolutionLog.map((entry,i)=>`<article class="ms-evolution-entry" data-evolution-index="${i}"><div><h4>${safe(entry.capability||'Capacidade')}</h4><p>${safe(entry.notes||'Sem observações.')}</p><div class="ms-evolution-meta"><span>${safe(entry.session||'Sessão não informada')}</span><span>${Number(entry.successes)||0} sucessos</span>${entry.authorized?'<span class="authorized">✓ autorizado</span>':'<span>aguardando autorização</span>'}</div></div><button type="button" class="hide-on-view" onclick="removeEvolutionEntry(${i})" aria-label="Remover evolução">×</button></article>`).join('') : '<p class="empty-state">Nenhuma prática registrada nesta ficha.</p>';
}
function addEvolutionEntry(){
    const capability=msFieldValue('evolution-capability'); if(!capability){window.MS_PLATFORM?.toast('Informe a capacidade exercitada.','error');return;}
    currentEvolutionLog.push({id:(crypto.randomUUID?crypto.randomUUID():'evo-'+Date.now()),session:msFieldValue('evolution-session'),capability,successes:Number(document.getElementById('evolution-successes')?.value||0),authorized:!!document.getElementById('evolution-authorized')?.checked,notes:msFieldValue('evolution-notes'),createdAt:new Date().toISOString()});
    ['evolution-session','evolution-capability','evolution-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); const suc=document.getElementById('evolution-successes');if(suc)suc.value=0;const auth=document.getElementById('evolution-authorized');if(auth)auth.checked=false;renderEvolutionEntries();window.MS_ONLINE_UI?.saveBuilderDraft?.();
}
function removeEvolutionEntry(i){ currentEvolutionLog.splice(i,1);renderEvolutionEntries();window.MS_ONLINE_UI?.saveBuilderDraft?.(); }
window.addEvolutionEntry=addEvolutionEntry; window.removeEvolutionEntry=removeEvolutionEntry; window.renderEvolutionEntries=renderEvolutionEntries;
/* Removed duplicate declaration of a consolidated function: saveCharacter */
/* Removed duplicate declaration of a consolidated function: loadCharacterToBuilder */

function renderCharList() {
    const container = document.getElementById('character-list');
    container.innerHTML = '';

    const btnNew = document.getElementById('btn-new-char');
    const LIMIT = msCharacterCapacity();

    if (!msCanCreateCharacter()) {
        btnNew.disabled = false;
        btnNew.innerText = `AMPLIAR SANTUÁRIO (${characters.length}/${msCapacityLabel(LIMIT)})`;
        btnNew.onclick = () => window.MS_SOUL?.openVault?.('store','character_slot');
    } else {
        btnNew.onclick = beginNewCharacter;
        btnNew.disabled = false;
        btnNew.innerText = 'DESPERTAR NOVA ALMA';
    }

    if (characters.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#555; width:100%;">O Santuário está vazio. O abismo aguarda.</p>';
        document.getElementById('carousel-prev').style.display = 'none';
        document.getElementById('carousel-next').style.display = 'none';
        return;
    }

    characters.forEach((char, index) => {
        const animClass = getNatureCardClass(char.nature);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        wrapper.innerHTML = `
            <button class="delete-soul" onclick="deleteCharacter(${index}, event)" title="Excluir Ficha">X</button>
            <div class="soul-card ${animClass}">
                <div class="ornament"></div>
                ${char.avatar ? `<img src="${char.avatar}" class="card-bg-img">` : ''}
                <div class="soul-card-icon" style="${char.avatar ? 'background-image:url('+char.avatar+')' : ''}"></div>
                ${char.className === 'Mercador da Morte' ? mercadorRankCardMarkup(char.mercadoDaMorte?.rankId) : ''}
                <h3>${char.name}</h3>
                <p>${char.className || 'Desconhecido'}</p>
                <div class="selection-glow">VISUALIZAR</div>
            </div>`;
        wrapper.onclick = () => handleCardClick(index, wrapper);
        container.appendChild(wrapper);
    });

    if(activeCarouselIndex >= characters.length) activeCarouselIndex = characters.length - 1;
    updateCarousel();
}

function deleteCharacter(index, e) {
    e.stopPropagation();
    if(confirm("Deseja expurgar esta alma para sempre do Vazio? A ficha será deletada e as informações apagadas.")) {
        characters.splice(index, 1);
        saveGlobalCharacters();
        renderCharList();
        document.getElementById('sanctuary-limits').innerText = `Almas Vivas: ${characters.length} / ${msCapacityLabel(msCharacterCapacity())}`;
    }
}

function handleCardClick(index, wrapperEl) {
    if (index === activeCarouselIndex) {
        const cardEl = wrapperEl.querySelector('.soul-card');
        cardEl.classList.add('spin-out');
        setTimeout(() => {
            cardEl.classList.remove('spin-out');
            const char = characters[index];
            window.msOpenCharacterViewer?.(char,{source:'sanctuary',localIndex:index});
        }, 420);
    } else {
        activeCarouselIndex = index;
        updateCarousel();
    }
}

function nextCard() {
    if (activeCarouselIndex < characters.length - 1) {
        activeCarouselIndex++;
        updateCarousel();
    }
}

function prevCard() {
    if (activeCarouselIndex > 0) {
        activeCarouselIndex--;
        updateCarousel();
    }
}

function updateCarousel() {
    const wrappers = document.querySelectorAll('#character-list .card-wrapper');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if(wrappers.length === 0) return;

    if(prevBtn) prevBtn.style.display = activeCarouselIndex > 0 ? 'block' : 'none';
    if(nextBtn) nextBtn.style.display = activeCarouselIndex < wrappers.length - 1 ? 'block' : 'none';

    wrappers.forEach((wrapper, index) => {
        wrapper.classList.remove('active', 'prev', 'next');
        let offset = 0;
        let scale = 1;
        let rotateY = 0;
        let zIndex = 1;
        let opacity = 1;

        let distance = Math.abs(index - activeCarouselIndex);
        let sign = Math.sign(index - activeCarouselIndex);

        if (distance === 0) {
            wrapper.classList.add('active');
            offset = 0; scale = 1.1; opacity = 1; zIndex = 10; rotateY = 0;
            wrapper.style.display = 'block';
        } else {
            offset = sign * (250 + (distance - 1) * 200);
            scale = 0.8; opacity = 0.4; zIndex = 5 - distance; rotateY = sign * -25;
            if(distance > 2) { wrapper.style.display = 'none'; } 
            else { wrapper.style.display = 'block'; }
        }

        wrapper.style.transform = `translateX(${offset}px) scale(${scale}) rotateY(${rotateY}deg)`;
        wrapper.style.zIndex = zIndex;
        wrapper.style.opacity = opacity;
    });
}

// PDF DOWNLOAD E EXPORTAÇÃO JSON
async function downloadPDF() {
    try { if(!window.html2pdf) await window.MS_VENDOR?.ensure('html2pdf'); } catch(error) { window.MS_PLATFORM?.toast(error.message||'Não foi possível carregar a exportação PDF.','error'); return; }
    if (!msRequireDependency('html2pdf', 'Exportação PDF', 'A biblioteca de PDF não foi carregada.')) return;
    const wasEdit = isEditMode;
    isEditMode = false;
    toggleEditUI();
    const builder = document.getElementById('screen-builder');
    builder.classList.add('pdf-print-mode');
    const name = document.getElementById('char-name').value || 'Alma_Desconhecida';
    const opt = { margin: 10, filename: `${name}_Ficha.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#111' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }};
    await html2pdf().set(opt).from(builder).save();
    builder.classList.remove('pdf-print-mode');
    isEditMode = wasEdit;
    toggleEditUI();
}


// ==========================================
// ARSENAL / DISPOSITIVOS & EQUIPAMENTOS
// ==========================================
const PREMADE_EQUIPMENT = [
 {name:'Pistola “NULO”', faction:'ALFA-01 — Os Ceifadores', category:'Ritualístico', chassis:'Ligeiro', pe:6, stage:2, charges:null, effect:'Base 1d6. VF Silenciamento: sem estampido convencional; identificação da origem -5. VF Marca Fantasma: 1 Pressão para marcar alvo; +2 para rastreá-lo até fim da cena.'},
 {name:'Kit de Apagamento', faction:'ALFA-01 — Os Ceifadores', category:'Ritualístico', chassis:'Utilitário', pe:7, stage:2, effect:'Apaga digitais, sangue, resíduos de EP, registros eletrônicos simples e evidências de presença.'},
 {name:'Rifle Predador', faction:'SIGMA-33 — Os Predadores', category:'Ritualístico', chassis:'Padrão', pe:16, stage:3, effect:'Base 1d10. VF Munição de Linhagem: +2 dano contra criaturas anômalas. VF Rompe-Regeneração: alvo com regeneração perde regeneração até próximo turno.'},
 {name:'Kit de Caça Anômala', faction:'SIGMA-33 — Os Predadores', category:'Ritualístico', chassis:'Utilitário', pe:7, stage:2, effect:'+2 em Investigação e Sobrevivência para rastrear criaturas anômalas.'},
 {name:'Escopeta Exorcista', faction:'ECTA-44 — Os Últimos Caçadores', category:'Ritualístico', chassis:'Massivo', pe:14, stage:3, effect:'Base 1d12. VF Cinza Consagrada: +2 dano contra entidades infernais. VF Quebra-Pacto: acerto reduz em 2 resistência espiritual até próximo turno.'},
 {name:'Selo de Ruptura', faction:'ECTA-44 — Os Últimos Caçadores', category:'Ritualístico', chassis:'Utilitário', pe:7, stage:2, effect:'Bloqueia possessão, invocação, teleporte infernal ou fuga planar menor.'},
 {name:'Rifle de Fase', faction:'C-137 — Os Desbravadores do Além', category:'Anômalo', chassis:'Padrão', pe:23, stage:4, effect:'Base 1d10. Ativação: 1d4 Mental ou -5 PV. VF Penetração Dimensional: ignora cobertura física comum. VF Fase Instável: alvo -2 Defesa Passiva contra próximo ataque.'},
 {name:'Âncora Temporal', faction:'C-137 — Os Desbravadores do Além', category:'Anômalo', chassis:'Utilitário', pe:14, stage:3, effect:'Ativação: 1d4 Mental ou -5 PV. Impede teleporte, deslocamento ou arrastamento temporal por 1 rodada.'},
 {name:'Canhão de Estaca', faction:'SIGMA-02 — Os Bate-Estaca', category:'Ritualístico', chassis:'Massivo', pe:19, stage:3, effect:'Base 1d12. VF Perfurador de Colosso: +1 dado de dano contra criaturas Grandes ou superiores. VF Âncora Cinética: acerto reduz deslocamento em 3m.'},
 {name:'Lança-Âncora', faction:'SIGMA-02 — Os Bate-Estaca', category:'Ritualístico', chassis:'Padrão', pe:9, stage:2, effect:'Prende criatura grande a uma estrutura.'},
 {name:'Injetor de Calma', faction:'EPSILON-00 — Mente Sã', category:'Ritualístico', chassis:'Utilitário', pe:7, stage:2, effect:'Remove 1d6 Estresse ou concede +2 Vontade por 1 cena.'},
 {name:'Kit de Lacuna', faction:'EPSILON-00 — Mente Sã', category:'Anômalo', chassis:'Utilitário', pe:14, stage:3, effect:'Ativação: 1d4 Mental ou -5 PV. Permite apagar uma memória específica de baixa complexidade.'},
 {name:'Pistola de Identidade', faction:'DELTA-02 — Olho do Saber', category:'Ritualístico', chassis:'Ligeiro', pe:6, stage:2, effect:'Base 1d6. VF Arma de Serviço: assume aparência de arma pequena mundana. VF Assinatura Limpa: investigação balística -5.'},
 {name:'Máscara Biométrica', faction:'DELTA-02 — Olho do Saber', category:'Anômalo', chassis:'Utilitário', pe:19, stage:3, effect:'Ativação: 1d4 Mental ou -5 PV. +5 para evitar reconhecimento.'},
 {name:'Rifle Funerário', faction:'TÂNATOS-01 — Os Coveiros', category:'Ritualístico', chassis:'Padrão', pe:11, stage:3, effect:'Base 1d10. VF Cinza Terminal: +2 dano contra mortos-vivos. VF Não Retorne: morto-vivo derrotado não pode realizar reanimação simples até fim da cena.'},
 {name:'Caixa de Sepultamento', faction:'TÂNATOS-01 — Os Coveiros', category:'Ritualístico', chassis:'Utilitário', pe:7, stage:2, effect:'Sela restos, objetos ou manifestações menores.'},
 {name:'Maleta de Selagem', faction:'ÔMEGA-01 — O Relicário', category:'Ritualístico', chassis:'Utilitário', pe:9, stage:3, effect:'Pode conter objeto anômalo pequeno, documento, componente, amostra ou artefato de baixa Capacidade.'},
 {name:'Chave do Pináculo', faction:'ÔMEGA-01 — O Relicário', category:'Anômalo', chassis:'Ligeiro', pe:18, stage:3, effect:'Ativação: 1d4 Mental ou -5 PV. Pode abrir acesso para armazenamento da Ocultatun, se o Mestre determinar disponibilidade.'},
 {name:'Lâmina da Agonia Veloz', faction:'Exemplo de Forja', category:'Ritualístico', chassis:'Padrão', pe:11, stage:3, effect:'Espada de oficial da Ocultatun. Causa dano Cap 3; após o combate, corre risco de enferrujar e perder corte.'},
 {name:'O Olho de Vidro do Abismo', faction:'Exemplo de Forja', category:'Anômalo', chassis:'Utilitário', pe:23, stage:5, effect:'Amuleto com cristal de um Nexo que permite ver através de paredes. Ao ativar, usuário perde 5 PV.'}
];

function getEquipmentProfile(char=currentBuilderCharacter()){
    const nature=char?.nature||currentNature||'';
    const inferredMode=(char?.mode)||(nature.includes('Ocultatun')||nature.includes('Envolto')||nature.includes('Ordem dos Sete')?'ocultatun':null)||currentMode||'exodo';
    const mode=inferredMode;
    if(mode==='ocultatun') return {
        mode:'ocultatun', key:'ocultatun', eyebrow:'OCULTATUN · ARSENAL ANÔMALO', title:'Arsenal Anômalo & Ritualístico',
        subtitle:'Itens construídos por Chassi + Vetores de Manifestação + Estágio + Categoria. O item mantém PE, ES e Cargas de Integridade.',
        addTitle:'Registrar equipamento da Ocultatun', addSubtitle:'Use os campos técnicos do sistema PE.',
        labels:['Nome do item','Categoria / tipo','PE · ES · Cargas','Efeito / VF / observações'],
        placeholders:['Lâmina, rifle, dispositivo...','Ritualístico ou Anômalo · Chassi','Ex.: 11 PE · ES 3 · 10 cargas','Descreva Chassi, VM, VF, efeito e particularidades.'],
        fields:'ocultatun'
    };
    if(nature.includes('Operador de Sistema')) return {
        mode:'exodo', key:'kafra', eyebrow:'ÊXODO · PROJETO PLAYER', title:'Repositório Kafra & Dispositivos',
        subtitle:'Inventário de dispositivos vinculados à interface. Registre Smart-Link, PCs, origem e efeito de cada item.',
        addTitle:'Registrar dispositivo Kafra', addSubtitle:'A ficha mantém o inventário separado das Potências.',
        labels:['Nome do dispositivo','Tipo / Smart-Link','PC / vínculo / estado','Efeito / função'],
        placeholders:['Ex.: Faca Fractal','Smart-Link · IA · dispositivo','Ex.: 2 PC · IA Domínios · íntegro','Função, bônus, interface ou observações.'],
        fields:'kafra'
    };
    if(nature.includes('Classer')) return {
        mode:'exodo', key:'linhagem', eyebrow:'ÊXODO · LINHAGEM HERDADA', title:'Equipamento de Campo & Atavismo',
        subtitle:'Registro de equipamento compatível com o Classer, mantendo a evolução da linhagem separada da árvore LHL.',
        addTitle:'Registrar equipamento de campo', addSubtitle:'O item não altera automaticamente LHL ou EB.',
        labels:['Nome do equipamento','Tipo / função','Estado / vínculo','Efeito / observações'],
        placeholders:['Ex.: arma, proteção, ferramenta...','Armamento · proteção · utilitário','Ex.: íntegro · vinculado à linhagem','Descrição do uso e efeitos.'],
        fields:'linhagem'
    };
    return {
        mode:'exodo', key:'exodo', eyebrow:'ÊXODO · DISPOSITIVOS DE CAMPO', title:'Dispositivos & Equipamentos de Êxodo',
        subtitle:'Inventário de campo do Gene Êxodo. Registre o dispositivo, sua função, vínculo e estado sem misturar a economia PE da Ocultatun.',
        addTitle:'Registrar dispositivo de Êxodo', addSubtitle:'CÊ, Assimilação e Estigma continuam sendo recursos da ficha; o item fica no inventário.',
        labels:['Nome do dispositivo','Tipo / função','Vínculo / estado','Efeito / descrição'],
        placeholders:['Ex.: equipamento de campo','Armamento · proteção · ferramenta · dispositivo','Ex.: CÊ · Estigma · íntegro','Descrição do uso, bônus ou limitações.'],
        fields:'exodo'
    };
}
function currentBuilderCharacter(){
    return {mode:currentMode||document.getElementById('char-mode')?.value||'exodo', nature:currentNature||document.getElementById('char-nature')?.value||'', name:document.getElementById('char-name')?.value||''};
}
function applyEquipmentProfile(char=currentBuilderCharacter()){
    const p=getEquipmentProfile(char);
    const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val;};
    set('equipment-sheet-eyebrow',p.eyebrow); set('equipment-sheet-title',p.title); set('equipment-sheet-subtitle',p.subtitle);
    set('equipment-add-eyebrow',p.eyebrow); set('equipment-add-title',p.addTitle); set('equipment-add-subtitle',p.addSubtitle);
    ['name','type','meta','effect'].forEach((k,i)=>{set('sheet-eq-'+k+'-label',p.labels[i]); const e=document.getElementById('sheet-eq-'+k); if(e)e.placeholder=p.placeholders[i];});
    const profile=document.getElementById('equipment-sheet-profile');
    if(profile) profile.innerHTML=p.key==='ocultatun'
      ? '<span>PE de Arsenal</span><span>Chassi + VM + ES</span><span>Ritualístico / Anômalo</span><span>Cargas de Integridade / Gamma Lock</span>'
      : p.key==='kafra' ? '<span>Smart-Link</span><span>Repositório Kafra</span><span>PC / vínculo de interface</span><span>Dispositivo de sistema</span>'
      : '<span>Dispositivo de campo</span><span>Vínculo e estado</span><span>Função narrativa</span><span>Sem PE/ES de Ocultatun</span>';
    const add=document.getElementById('equipment-add-modal'); if(add) add.dataset.profile=p.key;
}
function renderEquipmentSheet(){
 const c=document.getElementById('equipment-sheet-list'); if(!c)return;
 applyEquipmentProfile(); c.innerHTML='';
 if(!currentSheetEquipment.length){ c.innerHTML='<div class="equipment-empty">Nenhum item registrado nesta ficha.</div>'; return; }
 const p=getEquipmentProfile();
 currentSheetEquipment.forEach((it,i)=>{
   const meta=p.key==='ocultatun'
      ? `<span><b>PE</b>${escHtml(it.pe ?? '—')}</span><span><b>ES</b>${escHtml(it.stage ?? '—')}</span>${it.charges!==null&&it.charges!==undefined?`<span><b>Cargas</b>${escHtml(it.charges)}</span>`:''}`
      : `<span><b>VÍNCULO</b>${escHtml(it.link||it.notes||'—')}</span><span><b>ESTADO</b>${escHtml(it.status||'Íntegro')}</span>`;
   c.innerHTML += `<article class="equipment-item-card ${it.category==='Anômalo'?'anomalous':''} mode-${p.key}"><div class="equipment-item-main"><span class="equipment-tag">${escHtml(it.category||'Equipamento')}</span><h4>${escHtml(it.name)}</h4><p>${escHtml(it.effect||'Sem descrição.')}</p></div><div class="equipment-item-meta">${meta}<button class="hide-on-view equipment-remove" onclick="removeEquipmentFromCurrentSheet(${i})">×</button></div></article>`;
 });
}
function openEquipmentAddModal(){ applyEquipmentProfile(); document.getElementById('equipment-add-modal').style.display='flex'; }
function addEquipmentToCurrentSheet(){
 const p=getEquipmentProfile(); const name=document.getElementById('sheet-eq-name').value.trim(); if(!name)return alert('Dê um nome ao item.');
 const type=document.getElementById('sheet-eq-type').value.trim()||'Equipamento'; const meta=document.getElementById('sheet-eq-meta').value.trim(); const effect=document.getElementById('sheet-eq-effect').value.trim()||'Sem descrição.';
 let item={name,category:type,effect,notes:meta,source:p.mode==='ocultatun'?'Registro manual da Ocultatun':'Registro manual de Êxodo'};
 if(p.key==='ocultatun'){ item.pe='—'; item.stage='—'; item.charges=null; item.notes=meta; }
 else { item.link=meta; item.status='Íntegro'; }
 currentSheetEquipment.push(normalizeEquipment(item)); renderEquipmentSheet(); document.getElementById('equipment-add-modal').style.display='none'; ['sheet-eq-name','sheet-eq-type','sheet-eq-meta','sheet-eq-effect'].forEach(id=>document.getElementById(id).value='');
}
function removeEquipmentFromCurrentSheet(i){ if(!isEditMode)return; currentSheetEquipment.splice(i,1); renderEquipmentSheet(); }
function getVttCharById(id){ return tablePlayers.find(c=>String(c.id)===String(id)); }
function renderVttEquipment(){
 const c=document.getElementById('vtt-equipment-list'); if(!c)return; c.innerHTML='';
 if(!tablePlayers.length){c.innerHTML='<div class="equipment-empty">Nenhuma ficha presente na mesa.</div>';return;}
 tablePlayers.forEach((p,i)=>{ const items=Array.isArray(p.equipment)?p.equipment:[], prof=getEquipmentProfile(p);
   const meta=prof.key==='ocultatun'?'PE · ES · Cargas de Integridade':'Vínculo · Estado · Função';
   c.innerHTML+=`<section class="vtt-player-arsenal mode-${prof.key}"><div class="vtt-player-arsenal-head"><div><span class="eyebrow">${escHtml(prof.eyebrow)}</span><h4>${escHtml(p.name)}</h4><p>${escHtml(meta)}</p></div><button class="souls-btn small-btn" onclick="openCharacterEquipmentFromVtt(${i})">ABRIR FICHA</button></div>${items.length?items.map(it=>`<div class="vtt-eq-row"><div><b>${escHtml(it.name)}</b><span>${escHtml(it.category||'Equipamento')} · ${prof.key==='ocultatun'?`PE ${escHtml(it.pe??'—')} · ES ${escHtml(it.stage??'—')}`:`${escHtml(it.link||'sem vínculo')} · ${escHtml(it.status||'Íntegro')}`}</span></div><p>${escHtml(it.effect||'')}</p></div>`).join(''):'<div class="equipment-empty compact">Sem equipamentos registrados.</div>'}</section>`;
 });
}
function openVttEquipmentWindow(){ renderVttEquipment(); toggleVttWindow('vtt-equipment-window'); }
function openCharacterEquipmentFromVtt(index){ const char=tablePlayers[index]; window.msOpenCharacterViewer?.(char?.sourceCharId||char?.id||char,{tableId:currentTableData?.id,source:'vtt',fallback:char,focus:'equipment'}); }

function getTableGameMode(){ const modes=tablePlayers.map(p=>p.mode || ((p.nature||'').includes('Ocultatun')||(p.nature||'').includes('Envolto')||(p.nature||'').includes('Ordem dos Sete')?'ocultatun':'exodo')).filter(Boolean); return modes[0]||currentMode||'ocultatun'; }
function openEquipmentShop(){ renderEquipmentShop(); document.getElementById('equipment-shop-modal').style.display='flex'; }
function closeEquipmentShop(){ document.getElementById('equipment-shop-modal').style.display='none'; }
function renderEquipmentShop(){
 const c=document.getElementById('equipment-shop-list'); if(!c)return; const mode=getTableGameMode();
 const eyebrow=document.getElementById('equipment-shop-eyebrow'), title=document.getElementById('equipment-shop-title'), sub=document.getElementById('equipment-shop-subtitle');
 if(mode!=='ocultatun'){
   if(eyebrow)eyebrow.textContent='ÊXODO · CATÁLOGO DE CAMPO'; if(title)title.textContent='Loja de Dispositivos de Êxodo'; if(sub)sub.textContent='Nenhum catálogo pré-pronto de equipamentos de Êxodo está registrado nesta versão dos arquivos do site.';
   c.innerHTML='<div class="equipment-empty shop-empty">O catálogo pré-pronto disponível nos arquivos atuais é o Arsenal Anômalo/Ritualístico da Ocultatun. A loja de Êxodo permanece separada para não importar regras do sistema PE para este modo.</div>'; return;
 }
 if(eyebrow)eyebrow.textContent='SALA BRANCA · LOJA DO MERCADOR'; if(title)title.textContent='Loja de Arsenal da Ocultatun'; if(sub)sub.textContent='Itens pré-prontos do sistema Chassi + Vetores + Estágio + Categoria.';
 c.innerHTML=PREMADE_EQUIPMENT.map((it,i)=>`<article class="shop-item ${it.category==='Anômalo'?'anomalous':''}"><div><span class="equipment-tag">${escHtml(it.category)}</span><h4>${escHtml(it.name)}</h4><small>${escHtml(it.faction)} · ${escHtml(it.chassis)} · ${it.pe} PE · ES ${it.stage}</small><p>${escHtml(it.effect)}</p></div><button class="souls-btn small-btn" onclick="givePremadeEquipment(${i})">ENTREGAR</button></article>`).join('');
}
function givePremadeEquipment(i){ if(!isVttGM)return; const it=PREMADE_EQUIPMENT[i]; const targets=tablePlayers.filter(p=>!p.isNPC && (p.mode || ((p.nature||'').includes('Ocultatun')||(p.nature||'').includes('Envolto')||(p.nature||'').includes('Ordem dos Sete')?'ocultatun':'exodo'))==='ocultatun'); if(!targets.length)return alert('A loja da Ocultatun só pode entregar itens a uma ficha do modo Ocultatun.'); const names=targets.map((p,idx)=>`${idx+1}. ${p.name}`).join('\n'); const choice=prompt(`Entregar ${it.name} para:\n${names}\n\nDigite o número:`); const n=Number(choice)-1; if(!Number.isInteger(n)||!targets[n])return; const target=targets[n]; target.equipment=Array.isArray(target.equipment)?target.equipment:[]; const item=normalizeEquipment({...it,charges:10+(Number(target.stats?.vig)||0)-Number(it.stage||0),source:'Loja da Ocultatun'}); target.equipment.push(item); syncVttCharacterToOwner(target); renderVttCards(); renderVttEquipment(); renderEquipmentShop(); alert(`${it.name} entregue a ${target.name}.`); }
/* Removed duplicate declaration of a consolidated function: syncVttCharacterToOwner */
function openForgeWindow(){
 const mode=getTableGameMode();
 const eyebrow=document.getElementById('forge-eyebrow'), title=document.getElementById('forge-title'), sub=document.getElementById('forge-subtitle');
 const grid=document.getElementById('forge-grid'), msg=document.getElementById('forge-exodo-message'), submit=document.querySelector('#forge-modal .modal-actions .souls-btn');
 if(mode!=='ocultatun') { if(eyebrow)eyebrow.textContent='ÊXODO · FORJA DE DISPOSITIVOS'; if(title)title.textContent='Registro de Dispositivos de Êxodo'; if(sub)sub.textContent='A forja técnica Chassi + VM + ES é exclusiva do sistema de equipamentos da Ocultatun.'; if(grid)grid.style.display='none'; if(msg){msg.style.display='block';msg.innerHTML='<strong>Modo Êxodo</strong><span>Os arquivos atuais não definem aqui uma fórmula de forja equivalente ao sistema PE da Ocultatun. Registre o dispositivo diretamente na janela de equipamentos da ficha para não importar regras entre os modos.</span>';} if(submit)submit.style.display='none'; }
 else { if(eyebrow)eyebrow.textContent='ENGENHARIA DE CONSTRUÇÃO · PE'; if(title)title.textContent='Forja de Itens da Ocultatun'; if(sub)sub.textContent='Chassi + Vetores de Manifestação + Estágio + Categoria.'; if(grid)grid.style.display='grid'; if(msg)msg.style.display='none'; if(submit)submit.style.display=''; }
 populateForgeRecipients(); updateForgeCost(); document.getElementById('forge-modal').style.display='flex';
}
function closeForgeWindow(){ document.getElementById('forge-modal').style.display='none'; }
function populateForgeRecipients(){ const s=document.getElementById('forge-recipient'); s.innerHTML=tablePlayers.filter(p=>!p.isNPC && (getTableGameMode()!=='ocultatun'||(p.mode || ((p.nature||'').includes('Ocultatun')||(p.nature||'').includes('Envolto')||(p.nature||'').includes('Ordem dos Sete')?'ocultatun':'exodo'))==='ocultatun')).map(p=>`<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`).join(''); if(!s.innerHTML)s.innerHTML='<option value="">Nenhum jogador compatível</option>'; }
function updateForgeCost(){ const ch=document.getElementById('forge-chassis'); const pe=Number(ch?.selectedOptions[0]?.dataset.pe||0); const vm=[...document.getElementById('forge-vectors')?.selectedOptions||[]].length*5; const es=Math.min(10,Math.max(1,Number(document.getElementById('forge-stage')?.value||1))); const cat=document.getElementById('forge-category')?.value; const total=pe+vm+(es*2)+(cat==='Ritualístico'?-5:0); const preview=document.getElementById('forge-preview'); if(preview)preview.innerHTML=`<b>Custo estimado: ${total} PE</b><span>Chassi ${pe} + ${vm} PE em VM + ${es*2} PE em ES ${es} ${cat==='Ritualístico'?'− 5 PE ritualísticos':''}</span>`; }
function forgeItemForTable(){ if(!isVttGM)return; if(getTableGameMode()!=='ocultatun')return alert('A forja técnica Chassi + VM + ES desta janela pertence ao sistema de equipamentos da Ocultatun. Para Êxodo, registre o dispositivo na ficha sem importar PE/ES.'); const name=document.getElementById('forge-name').value.trim(), recipientId=document.getElementById('forge-recipient').value, target=getVttCharById(recipientId); if(!name||!target)return alert('Defina nome e destinatário.'); const chassis=document.getElementById('forge-chassis').value, category=document.getElementById('forge-category').value, stage=Math.min(10,Math.max(1,Number(document.getElementById('forge-stage').value||1))), vectors=[...document.getElementById('forge-vectors').selectedOptions].map(o=>o.value), base={Ligeiro:2,Padrão:5,Massivo:8,Proteção:4,Utilitário:3}[chassis], pe=base+vectors.length*5+stage*2+(category==='Ritualístico'?-5:0), charges=10+(Number(target.stats?.vig)||0)-stage, item=normalizeEquipment({name,category,chassis,stage,pe,charges,vectors,effect:document.getElementById('forge-effect').value.trim(),source:'Forja da Mesa'}); target.equipment=Array.isArray(target.equipment)?target.equipment:[]; target.equipment.push(item); syncVttCharacterToOwner(target); currentTableData=currentTableData||{}; currentTableData.forgedItems=Array.isArray(currentTableData.forgedItems)?currentTableData.forgedItems:[]; currentTableData.forgedItems.push(item); renderVttCards(); renderVttEquipment(); closeForgeWindow(); alert(`${name} foi forjado e entregue a ${target.name}.`); }

// ---------------------------------------------------------------------
// VTT - VIRTUAL TABLETOP LOGIC (JANELAS E MESAS)
// ---------------------------------------------------------------------
/* Removed duplicate declaration of a consolidated function: enterVTT */

function centerWindow(el) {
    el.style.left = (window.innerWidth / 2 - el.offsetWidth / 2) + 'px';
    el.style.top = (window.innerHeight / 2 - el.offsetHeight / 2) + 'px';
}

function toggleVttWindow(id) {
    const shellMode=document.getElementById('screen-vtt')?.classList.contains('ms-table-v3-active');
    const pinned=['vtt-cards-window','vtt-grid-window','vtt-dice-box','vtt-chat-box'];
    if(shellMode && pinned.includes(id)){
        const el=document.getElementById(id); if(el)el.style.display='flex';
        if(id==='vtt-grid-window')setTimeout(initVttGrid,50); return;
    }
    document.querySelectorAll(shellMode?'.ms-table-v3-overlays .vtt-floating-window':'.vtt-floating-window').forEach(el => { if(el.id !== id) el.style.display = 'none'; });
    const el = document.getElementById(id); if(!el)return;
    if(el.style.display === 'none' || el.style.display === '') { el.style.display = 'flex'; el.style.zIndex = 600; if(!shellMode)centerWindow(el); if(id === 'vtt-grid-window') setTimeout(initVttGrid, 50); }
    else el.style.display = 'none';
}

async function leaveVTT(options = {}) {
    const force = options === true || options?.force === true;
    if(!force && !confirm("Sair da sessão ao vivo? Sua vinculação com a campanha será preservada.")) return false;
    try { await window.MS_TABLE_SESSION?.disconnect?.(); } catch(error) { console.warn('[Mundos Sombrios] encerramento de sessão:',error); }
    persistMasterShieldReturnContext(null);
    isDraftMode=false; document.getElementById('screen-vtt')?.classList.remove('ms-table-v3-active'); showScreen('screen-ancoragem'); tablePlayers=[]; currentTableData=null;
    if (window.MasterTools && typeof window.MasterTools.unmountShield === 'function') window.MasterTools.unmountShield();
    if(typeof window.renderAncoragem==='function') window.renderAncoragem();
    if(force && options?.reason==='membership_revoked') window.MS_PLATFORM?.toast?.('Seu vínculo com esta Mesa foi encerrado pelo Mestre.','error');
    return true;
}

function openManagePlayers() {
    const list = document.getElementById('manage-players-list');
    list.innerHTML = '';
    tablePlayers.forEach((p, idx) => {
        if(!p.isMe) {
            list.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:10px; border:1px solid #444; margin-bottom:10px;">
                    <span style="color:#fff;">${p.name} ${p.isNPC ? '(NPC)' : ''}</span>
                    <div>
                        <button class="souls-btn small-btn" style="padding:5px;" onclick="kickPlayer(${idx}, 'temp')">Expulsar</button>
                        <button class="souls-btn small-btn" style="padding:5px; border-color:red; color:red;" onclick="kickPlayer(${idx}, 'perm')">Banir</button>
                    </div>
                </div>
            `;
        }
    });
    if(list.innerHTML === '') list.innerHTML = '<p>Nenhum outro jogador presente.</p>';
    document.getElementById('manage-players-modal').style.display = 'flex';
}

async function kickPlayer(index, type) {
    const p = tablePlayers[index];
    if(!p || p.isNPC || !currentTableData?.id) return;
    if(!confirm(`Deseja ${type === 'perm' ? 'BANIR' : 'EXPULSAR'} ${p.name}?`)) return;
    try {
        const confirmed=await window.MS_SERVICES?.Games?.setMemberStatus(currentTableData.id, p.participantUserId || p.userId, type === 'perm' ? 'banned' : 'left');
        if(confirmed!==true) throw new Error('O servidor não confirmou a alteração do participante.');
        tablePlayers.splice(index, 1);
        renderVttCards(); openManagePlayers();
        window.MS_PLATFORM?.toast(type === 'perm' ? 'Jogador banido da mesa.' : 'Jogador removido da mesa.','success');
    } catch(error) { window.MS_PLATFORM?.toast(error.message||'Não foi possível alterar o acesso do jogador.','error'); }
}

// VTT THEMES
function openThemeEditor() { document.getElementById('theme-modal').style.display = 'flex'; }
function cancelVttTheme() { document.getElementById('theme-modal').style.display = 'none'; }
function previewVttTheme() {
    const theme = document.getElementById('vtt-theme-select').value;
    const font = document.getElementById('vtt-font-select').value;
    const vttScreen = document.getElementById('screen-vtt');
    vttScreen.setAttribute('data-theme', theme);
    vttScreen.style.setProperty('--vtt-font-family', font);
    
    // Theme colors
    if(theme === 'cyber') { vttScreen.style.setProperty('--vtt-accent', '#00ffcc'); vttScreen.style.setProperty('--vtt-bg', '#001111'); }
    else if(theme === 'gothic') { vttScreen.style.setProperty('--vtt-accent', '#ff3333'); vttScreen.style.setProperty('--vtt-bg', '#110000'); }
    else if(theme === 'cosmic') { vttScreen.style.setProperty('--vtt-accent', '#9933ff'); vttScreen.style.setProperty('--vtt-bg', '#0a001a'); }
    else { vttScreen.style.setProperty('--vtt-accent', '#d4af37'); vttScreen.style.setProperty('--vtt-bg', '#050505'); }
}
async function applyVttTheme() { 
    if(currentTableData) {
        currentTableData.theme = document.getElementById('vtt-theme-select').value;
        const idx = allTablesDB.findIndex(t => t.id === currentTableData.id);
        if(idx !== -1) allTablesDB[idx].theme = currentTableData.theme;
        if(isVttGM && window.MS_SERVICES?.Games) {
            try { await window.MS_SERVICES.Games.updateSettings(currentTableData.id, { ...(currentTableData.settings||{}), theme: currentTableData.theme, font: document.getElementById('vtt-font-select')?.value || "'Cinzel', serif" }); }
            catch(error) { window.MS_PLATFORM?.toast(error.message||'Tema alterado apenas localmente; sincronização falhou.','error'); }
        }
    }
    cancelVttTheme(); 
}

// VTT DRAGGABLES

function makeDraggable(el, header, requiresGM) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if(requiresGM && !isVttGM) {
            alert("Apenas o Mestre dita onde os dados caem.");
            return;
        }
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        
        if (el.id === 'master-emblem') {
            el.style.zIndex = 10001; 
        } else {
            el.style.zIndex = 600; // bring to front
        }
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = el.offsetTop - pos2;
        let newLeft = el.offsetLeft - pos1;
        
        // Prevent getting stuck outside viewport
        if(el.id === 'master-emblem') {
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - el.offsetHeight));
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - el.offsetWidth));
        }
        
        el.style.top = newTop + "px";
        el.style.left = newLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// VTT GRID (Fabric.js)
function msVttObjectOwnedByCurrentUser(obj) {
    if (isVttGM) return true;
    const myProfileId = String(currentUser?.id || '');
    const myAuthId = String(currentUser?.authUserId || '');
    if(!obj)return false;
    const tokenAuthId=String(obj.ownerAuthId||'');
    if(tokenAuthId)return !!myAuthId&&tokenAuthId===myAuthId;
    return !!myProfileId&&String(obj.ownerId||'')===myProfileId;
}
function msVttPlayerInteractionBlocked() { return !isVttGM && !!window.__msTableLivePaused; }
async function initVttGrid() {
    try { if(!window.fabric) await window.MS_VENDOR?.ensure('fabric'); } catch(error) { window.MS_PLATFORM?.toast(error.message||'Não foi possível carregar o mapa do VTT.','error'); return; }
    if (!msRequireDependency('fabric', 'VTT/Mapa', 'A biblioteca Fabric.js não foi carregada.')) return;
    const container = document.getElementById('canvas-wrapper');
    document.getElementById('vtt-table-name-display').innerText = document.getElementById('vtt-table-name').innerText;
    
    if(!vttCanvas) {
        vttCanvas = new fabric.Canvas('vtt-canvas', {
            width: container.clientWidth,
            height: container.clientHeight,
            selection: false
        });
        
        drawGridLines();
        
        let moveTimer = null;
        vttCanvas.on('object:moving', function(e) {
            const target=e.target;
            if(msVttPlayerInteractionBlocked() || !msVttObjectOwnedByCurrentUser(target)) { target.set({left:e.transform.original.left, top:e.transform.original.top}); vttCanvas.renderAll(); return; }
            if(window.__msGridSnap && target && !target.isGridLine && !target.isRuler){const gs=Math.max(20,Math.min(120,Number(window.__msGridSize)||50));target.set({left:Math.round((Number(target.left)||0)/gs)*gs,top:Math.round((Number(target.top)||0)/gs)*gs});}
            if(window.__msApplyingRemoteToken || !target?.msTokenId || !currentTableData?.id || !window.MS_SERVICES?.VTT) return;
            clearTimeout(moveTimer);
            moveTimer=setTimeout(()=>{
                window.MS_TABLE_SESSION?.send?.('token_move',{tokenId:String(target.msTokenId),left:Number(target.left)||0,top:Number(target.top)||0,angle:Number(target.angle)||0,scaleX:Number(target.scaleX)||1,scaleY:Number(target.scaleY)||1});
            },60);
        });
        vttCanvas.on('object:added',e=>{
            const target=e.target;if(window.__msRestoringGrid||window.__msApplyingRemoteToken||!target?.msTokenId)return;
            const props=['owner','ownerId','ownerAuthId','characterId','msTokenId','borderColor','isGridLine','isRuler'];
            if(currentTableData?.id) window.MS_TABLE_SESSION?.send?.('token_add',{tokenId:String(target.msTokenId),characterId:target.characterId||null,token:target.toObject(props)}).catch(err=>window.MS_PLATFORM?.toast?.(err?.message||'Totem não foi compartilhado.','error'));
            if(isVttGM&&window.MasterTools?.saveGrid) window.MasterTools.saveGrid(vttCanvas);
        });
        vttCanvas.on('object:removed',e=>{
            const target=e.target;if(window.__msRestoringGrid||window.__msApplyingRemoteToken||!target?.msTokenId)return;
            if(currentTableData?.id) window.MS_TABLE_SESSION?.send?.('token_remove',{tokenId:String(target.msTokenId)}).catch(err=>window.MS_PLATFORM?.toast?.(err?.message||'Remoção do totem não foi compartilhada.','error'));
            if(isVttGM&&window.MasterTools?.saveGrid) window.MasterTools.saveGrid(vttCanvas);
        });
        vttCanvas.on('object:modified',()=>{if(isVttGM&&window.MasterTools?.saveGrid&&!window.__msRestoringGrid&&!window.__msApplyingRemoteToken)window.MasterTools.saveGrid(vttCanvas);});
    } else {
        vttCanvas.setWidth(container.clientWidth);
        vttCanvas.setHeight(container.clientHeight);
        vttCanvas.calcOffset(); 
    }
    if (window.MasterTools && typeof window.MasterTools.restoreGrid === 'function') window.MasterTools.restoreGrid(vttCanvas);
    applyVttSceneContext();
}

function applyVttSceneContext(){
    try{
        const w=window.MasterTools?.getWorkbench?.();const c=w?.command;const scene=c?.scenes?.find?.(x=>x.id===c.activeSceneId);
        const label=document.getElementById('vtt-table-name-display');if(label&&scene?.title)label.dataset.scene=scene.title;
        if(!vttCanvas||!scene?.mapUrl||window.__msSceneMapApplied===scene.mapUrl)return;
        if(!window.fabric?.Image?.fromURL)return;
        fabric.Image.fromURL(scene.mapUrl,function(img){if(!img)return;vttCanvas.setBackgroundImage(img,vttCanvas.renderAll.bind(vttCanvas),{scaleX:vttCanvas.width/img.width,scaleY:vttCanvas.height/img.height});window.__msSceneMapApplied=scene.mapUrl;},{crossOrigin:'anonymous'});
    }catch(e){console.warn('[Mundos Sombrios] contexto da cena no VTT:',e);}
}
window.applyVttSceneContext=applyVttSceneContext;

function drawGridLines() {
    if(!vttCanvas) return;
    const objects = vttCanvas.getObjects('line');
    objects.forEach(obj => { if(obj.isGridLine) vttCanvas.remove(obj); });

    const gridSize = Math.max(20, Math.min(120, Number(window.__msGridSize)||50));
    for (let i = 0; i < (vttCanvas.width / gridSize); i++) {
        vttCanvas.add(new fabric.Line([ i * gridSize, 0, i * gridSize, vttCanvas.height], { stroke: '#333', selectable: false, isGridLine: true }));
    }
    for (let i = 0; i < (vttCanvas.height / gridSize); i++) {
        vttCanvas.add(new fabric.Line([ 0, i * gridSize, vttCanvas.width, i * gridSize], { stroke: '#333', selectable: false, isGridLine: true }));
    }
    vttCanvas.getObjects('line').filter(o=>o.isGridLine).forEach(o=>o.set({visible:window.__msGridVisible!==false}));
    vttCanvas.sendToBack(...vttCanvas.getObjects('line'));
    vttCanvas.requestRenderAll();
}
function canvasToggleGridVisibility(){if(!vttCanvas)return false;window.__msGridVisible=window.__msGridVisible===false;vttCanvas.getObjects('line').filter(o=>o.isGridLine).forEach(o=>o.set({visible:window.__msGridVisible}));vttCanvas.requestRenderAll();return window.__msGridVisible;}
function canvasToggleSnapToGrid(){window.__msGridSnap=!window.__msGridSnap;window.MS_PLATFORM?.toast?.(window.__msGridSnap?'Encaixe na grade ativado.':'Encaixe na grade desativado.','info');return window.__msGridSnap;}
function canvasClearMeasurements(){if(!vttCanvas)return;vttCanvas.getObjects().filter(o=>o.isRuler||o.msMeasureShape).forEach(o=>vttCanvas.remove(o));if(window.__msRulerActive)msSetRulerActive(false);vttCanvas.requestRenderAll();}
window.canvasToggleGridVisibility=canvasToggleGridVisibility;window.canvasToggleSnapToGrid=canvasToggleSnapToGrid;window.canvasClearMeasurements=canvasClearMeasurements;

function canvasSetMode(mode) {
    if(!vttCanvas) return;
    if(window.__msRulerActive) msSetRulerActive(false);
    vttCanvas.isDrawingMode = false;
    vttCanvas.selection = mode === 'select';
    vttCanvas.getObjects().forEach(o => o.set('selectable', mode === 'select' && !o.isGridLine && !o.isRuler && (isVttGM || !o.owner || o.owner === 'me' || String(o.ownerId||'')===String(currentUser?.id||''))));
    vttCanvas.requestRenderAll();
}

function canvasAddPCToken() {
    if(msVttPlayerInteractionBlocked()){window.MS_PLATFORM?.toast?.('A sessão está pausada pelo Mestre.','error');return;}
    if(!tablePlayers.length) return;
    const myChar = tablePlayers.find(p => p.isMe) || tablePlayers[0];
    
    fabric.Image.fromURL(myChar.avatar || '', function(img) {
        if(!img) {
            const circle = new fabric.Circle({ radius: 25, fill: '#00ffcc', stroke: '#fff', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 10, offsetX: 5, offsetY: 5 }) });
            createTokenGroup(circle, myChar.name, 'player', '#00ffcc', null, myChar.sourceCharId||myChar.id||null, myChar.sourceOwnerId||currentUser?.id||myChar.ownerId||null, myChar.participantUserId||currentUser?.authUserId||null);
        } else {
            img.scaleToWidth(50);
            img.scaleToHeight(50);
            img.set({clipPath: new fabric.Circle({radius:25, originX:'center', originY:'center'})});
            const circle = new fabric.Circle({ radius: 26, fill: 'transparent', stroke: '#00ffcc', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 10, offsetX: 5, offsetY: 5 }) });
            createTokenGroup(img, myChar.name, 'player', '#00ffcc', circle, myChar.sourceCharId||myChar.id||null, myChar.sourceOwnerId||currentUser?.id||myChar.ownerId||null, myChar.participantUserId||currentUser?.authUserId||null);
        }
    });
}

function canvasAddNPCToken() {
    if(!isVttGM) return;
    const color = prompt("Cor do Monstro/NPC (Ex: red, #ff00ff):", "#ff3333");
    const name = prompt("Nome do Monstro:", "Goblin Abissal");
    const circle = new fabric.Circle({ radius: 25, fill: color, stroke: '#000', strokeWidth: 2, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 10, offsetX: 5, offsetY: 5 }) });
    createTokenGroup(circle, name, 'gm', color, null, null, currentUser?.id||null, currentUser?.authUserId||null);
}

function createTokenGroup(mainObj, nameText, owner, color, borderObj = null, characterId = null, ownerId = null, ownerAuthId = null) {
    const text = new fabric.Text(nameText, { fontSize: 12, fill: '#fff', originX: 'center', top: 30, backgroundColor: 'rgba(0,0,0,0.7)' });
    const objs = borderObj ? [mainObj, borderObj, text] : [mainObj, text];
    const group = new fabric.Group(objs, { left: 100, top: 100, owner, ownerId, ownerAuthId, characterId, msTokenId: (crypto.randomUUID ? crypto.randomUUID() : 'tok-'+Date.now()+'-'+Math.random().toString(36).slice(2)), borderColor: color, cornerColor: color, transparentCorners: false });
    vttCanvas.add(group); vttCanvas.setActiveObject(group); vttCanvas.requestRenderAll();
}

function canvasSetBackground(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            vttCanvas.setBackgroundImage(img, vttCanvas.renderAll.bind(vttCanvas), {
                scaleX: vttCanvas.width / img.width,
                scaleY: vttCanvas.height / img.height
            });
        });
    };
    reader.readAsDataURL(file);
}

function canvasAddShape(type) {
    let shape;
    if(type === 'cone') {
        shape = new fabric.Triangle({ width: 100, height: 100, fill: 'rgba(255,51,51,0.3)', stroke: '#ff3333', left: 150, top: 150, owner: isVttGM?'gm':'me', msMeasureShape:true });
    } else if (type === 'line') {
        shape = new fabric.Rect({ width: 200, height: 10, fill: 'rgba(0,255,204,0.5)', stroke: '#00ffcc', left: 150, top: 150, owner: isVttGM?'gm':'me', msMeasureShape:true });
    } else if (type === 'radius') {
        shape = new fabric.Circle({ radius: 100, fill: 'rgba(212,175,55,0.3)', stroke: '#d4af37', left: 150, top: 150, owner: isVttGM?'gm':'me', msMeasureShape:true });
    }
    vttCanvas.add(shape);
}

function msRulerScale(){ const n=Number(document.getElementById('vtt-grid-scale')?.value||1.5); return Number.isFinite(n)&&n>0?n:1.5; }
function msRulerStatus(text, active=window.__msRulerActive){ const el=document.getElementById('vtt-ruler-status');if(el){el.textContent=text;el.classList.toggle('active',!!active);} const btn=document.getElementById('vtt-ruler-btn');if(btn)btn.classList.toggle('active',!!active); }
function msClearRulerObjects(){ if(!vttCanvas)return; vttCanvas.getObjects().filter(o=>o.isRuler).forEach(o=>vttCanvas.remove(o));vttCanvas.requestRenderAll(); }
function msSetRulerActive(active){
    if(!vttCanvas)return; window.__msRulerActive=!!active; window.__msRulerStart=null;
    vttCanvas.selection=!active; vttCanvas.skipTargetFind=!!active;
    vttCanvas.getObjects().forEach(o=>o.set('selectable',!active && !o.isGridLine && !o.isRuler && msVttObjectOwnedByCurrentUser(o)));
    if(!active) msClearRulerObjects();
    msRulerStatus(active?'Clique e arraste sobre o mapa para medir.':'Régua desligada',active);vttCanvas.requestRenderAll();
}
function msInstallRulerHandlers(){
    if(!vttCanvas || vttCanvas.__msRulerInstalled)return; vttCanvas.__msRulerInstalled=true;
    vttCanvas.on('mouse:down',opt=>{if(!window.__msRulerActive)return;msClearRulerObjects();const p=vttCanvas.getPointer(opt.e);window.__msRulerStart=p;const line=new fabric.Line([p.x,p.y,p.x,p.y],{stroke:'#00ffcc',strokeWidth:3,selectable:false,evented:false,isRuler:true});const label=new fabric.Text('0 m',{left:p.x+8,top:p.y+8,fontSize:14,fill:'#fff',backgroundColor:'rgba(0,0,0,.75)',selectable:false,evented:false,isRuler:true});vttCanvas.add(line,label);window.__msRulerLine=line;window.__msRulerLabel=label;});
    vttCanvas.on('mouse:move',opt=>{if(!window.__msRulerActive||!window.__msRulerStart||!window.__msRulerLine)return;const p=vttCanvas.getPointer(opt.e),st=window.__msRulerStart;window.__msRulerLine.set({x2:p.x,y2:p.y});const px=Math.hypot(p.x-st.x,p.y-st.y),cells=px/50,meters=cells*msRulerScale();window.__msRulerLabel.set({left:p.x+8,top:p.y+8,text:`${meters.toFixed(1)} m · ${cells.toFixed(1)} células`});msRulerStatus(`${meters.toFixed(1)} m (${cells.toFixed(1)} células)`,true);vttCanvas.requestRenderAll();});
    vttCanvas.on('mouse:up',()=>{if(window.__msRulerActive)window.__msRulerStart=null;});
}
function canvasToggleRuler() { if(!vttCanvas){window.MS_PLATFORM?.toast('Abra o mapa antes de ativar a régua.','error');return;} msInstallRulerHandlers(); msSetRulerActive(!window.__msRulerActive); }

function canvasDeleteSelected() {
    const active = vttCanvas.getActiveObject();
    if(active) {
        if(msVttPlayerInteractionBlocked()){window.MS_PLATFORM?.toast?.('A sessão está pausada pelo Mestre.','error');return;}
        if(!msVttObjectOwnedByCurrentUser(active)) { alert("Você não pode apagar isso."); return; }
        vttCanvas.remove(active);
    }
}

// VTT CARDS & QUICK ACCESS
function renderVttCards() {
    const container = document.getElementById('vtt-active-cards-container');
    const qaContainer = document.getElementById('vtt-quick-access');
    if(!container) return;
    
    container.innerHTML = '';
    if(qaContainer) qaContainer.innerHTML = '';

    tablePlayers.forEach((char, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        
        let hpVal = char.resources && char.resources['PV'] ? char.resources['PV'] : 10;
        
        let hpVisibility = "";
        if(char.isNPC && npcHpHidden && !isVttGM) {
            hpVisibility = "display:none;";
        }
        
        if(char.isRosterOnly){
            wrapper.classList.add('vtt-roster-only');
            wrapper.innerHTML = `
                <div class="soul-card vtt-public-participant">
                    <div class="ornament"></div>
                    <div class="soul-card-icon vtt-public-participant-icon">◈</div>
                    <small>PARTICIPANTE · ${escHtml(String(char.memberRole||'jogador').replace('_',' ')).toUpperCase()}</small>
                    <h3 style="font-size:0.8rem">${escHtml(char.name||'Alma vinculada')}</h3>
                    <span class="vtt-public-participant-user">@${escHtml(char.username||'jogador')}</span>
                    <em>Ficha completa privada</em>
                </div>`;
            wrapper.onclick=()=>window.msOpenCharacterViewer?.(char.sourceCharId||char.id,{tableId:currentTableData?.id,source:'vtt',fallback:char});
        } else {
            wrapper.innerHTML = `
                <div class="soul-card ${getNatureCardClass(char.nature)}">
                    <div class="ornament"></div>
                    ${char.avatar ? `<img src="${char.avatar}" class="card-bg-img">` : ''}
                    <div class="soul-card-icon" style="${char.avatar ? 'background-image:url('+char.avatar+')' : ''}"></div>
                    ${char.className === 'Mercador da Morte' ? mercadorRankCardMarkup(char.mercadoDaMorte?.rankId) : ''}
                    <h3 style="font-size:0.8rem">${escHtml(char.name||'Alma')}</h3>
                    <div class="card-hp-bar-container" style="${hpVisibility}"><div class="card-hp-bar" style="width: 100%;"></div></div>
                    <span style="font-size:10px; color:#fff; z-index:2; position:relative; ${hpVisibility}">PV: ${hpVal}/${hpVal}</span>
                    <button type="button" class="vtt-card-eq-btn" onclick="event.stopPropagation(); window.msOpenCharacterViewer?.(tablePlayers[${index}]?.sourceCharId||tablePlayers[${index}]?.id||tablePlayers[${index}],{tableId:currentTableData?.id,source:'vtt',fallback:tablePlayers[${index}],focus:'equipment'});">⚙ Arsenal</button>
                </div>`;
            wrapper.onclick = () => {
                window.msOpenCharacterViewer?.(char.sourceCharId||char.id||char,{tableId:currentTableData?.id,source:'vtt',fallback:char,tableIndex:index});
            };
        }
        container.appendChild(wrapper);

        // GM Quick Access Buttons
        if(isVttGM && !char.isNPC) {
            const qaBtn = document.createElement('div');
            qaBtn.className = 'qa-btn';
            qaBtn.style.backgroundImage = `url(${char.avatar || ''})`;
            qaBtn.title = char.name;
            qaBtn.onclick = () => wrapper.click();
            if(qaContainer) qaContainer.appendChild(qaBtn);
        }
    });
}


// Ponte mínima para a Central Operacional atualizar o roster sem reabrir a Mesa.
window.msApplyVttRosterSnapshot = function(rows){tablePlayers=Array.isArray(rows)?msClone(rows):[];renderVttCards();window.MS_PLATFORM?.emit?.('table:roster-refreshed',{tableId:currentTableData?.id||null,count:tablePlayers.length});return msClone(tablePlayers);};

function toggleNPCHealthVisibility() {
    npcHpHidden = !npcHpHidden;
    document.getElementById('npc-hp-status').innerText = npcHpHidden ? "Oculto" : "Público";
    renderVttCards();
}


// VTT DICE ROLL — V2.4: malhas poliédricas 3D reais por Canvas
let diceRollInProgress = false;
function secureDieResult(max) {
    if (window.crypto?.getRandomValues) {
        const a = new Uint32Array(1); window.crypto.getRandomValues(a);
        return (a[0] % max) + 1;
    }
    return Math.floor(Math.random() * max) + 1;
}
async function roll3DDice(type) {
    if (diceRollInProgress) return;
    const resultText = document.getElementById('dice-result-text');
    if (!resultText) return;
    const max = Number.parseInt(String(type).slice(1), 10);
    if (!Number.isFinite(max) || max < 2) return;
    diceRollInProgress = true;
    const buttons = document.querySelectorAll('#vtt-dice-box .souls-btn');
    buttons.forEach(b => { if (/^d\d+$/i.test(b.textContent.trim())) b.disabled = true; });
    const finalResult = secureDieResult(max);
    resultText.textContent = `Rolando ${type.toUpperCase()}...`;
    resultText.classList.add('rolling');
    try {
        try{await window.MS_FEATURES?.ensureDice?.();}catch(_){}
        if(window.MS_DICE_3D?.play) await window.MS_DICE_3D.play(type, finalResult, {duration:1050});
        else await new Promise(resolve=>setTimeout(resolve,220));
        resultText.classList.remove('rolling');
        resultText.textContent = `Resultado: ${finalResult}`;
        let sender = 'Mestre';
        if(!isVttGM) {
            const me = tablePlayers.find(p => p.isMe);
            sender = me ? me.name : 'Jogador';
        }
        addDiceRollToHistory(type, finalResult, sender);
        addChatMessage('Sistema', `(${sender}) Rolou um ${type} e tirou ${finalResult}!`, '#d4af37');
        if (window.MasterTools && typeof window.MasterTools.onDiceRoll === 'function') { try { await window.MasterTools.onDiceRoll(type, finalResult, sender); } catch(_){} }
    } finally {
        buttons.forEach(b => { if (/^d\d+$/i.test(b.textContent.trim())) b.disabled = false; });
        diceRollInProgress = false;
    }
}

function addDiceRollToHistory(type, result, sender) {
    const id = Date.now();
    diceHistory.push({ id, type, result, sender });
    renderDiceHistory();
}

function renderDiceHistory() {
    const list = document.getElementById('dice-history-list');
    list.innerHTML = '';
    
    [...diceHistory].reverse().forEach(roll => {
        let delBtn = isVttGM ? `<button style="background:none; border:none; color:red; cursor:pointer; margin-left:10px;" onclick="deleteDiceRoll(${roll.id})">(X)</button>` : '';
        list.innerHTML += `<li style="padding:5px; border-bottom:1px solid #333;"><b style="color:var(--vtt-accent)">${roll.sender}</b>: ${roll.type} ➔ <b>${roll.result}</b> ${delBtn}</li>`;
    });
}

function deleteDiceRoll(id) {
    diceHistory = diceHistory.filter(r => r.id !== id);
    renderDiceHistory();
    if (window.MasterTools?.syncDice) window.MasterTools.syncDice(diceHistory);
}

function clearDiceHistory() {
    if(confirm("Apagar todo o histórico de rolagens?")) {
        diceHistory = [];
        renderDiceHistory();
        if (window.MasterTools?.syncDice) window.MasterTools.syncDice(diceHistory);
    }
}

// VTT CHAT
async function sendChatMessage() {
    if(chatLocked && !isVttGM) {
        alert("O Mestre bloqueou o chat.");
        return;
    }
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if(msg) {
        let sender = "Mestre";
        if(!isVttGM) {
            const me = tablePlayers.find(p => p.isMe);
            sender = me ? me.name : "Jogador";
        }
        addChatMessage(sender, msg, isVttGM ? '#ff00ff' : '#00ffcc');
        if (window.MasterTools && typeof window.MasterTools.onChatMessage === 'function') { try { await window.MasterTools.onChatMessage(sender, msg, isVttGM); } catch(_){} }
        input.value = '';
    }
}
function addChatMessage(sender, msg, color) {
    const chat = document.getElementById('chat-messages');
    if(!chat) return;
    const row=document.createElement('div'); row.style.marginBottom='8px';
    const who=document.createElement('b'); who.style.color=/^#[0-9a-f]{3,8}$/i.test(String(color||''))?color:'#00ffcc'; who.textContent=String(sender||'Sistema')+':';
    const text=document.createElement('span'); text.style.color='#ddd'; text.textContent=' '+String(msg||'');
    row.append(who,text); chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
}
function toggleChatLock() {
    if(!isVttGM) return;
    chatLocked = !chatLocked;
    const btn = document.getElementById('btn-lock-chat');
    if(btn) btn.innerText = chatLocked ? '🔏' : '🔓';
    addChatMessage('Sistema', chatLocked ? 'O chat foi bloqueado pelo Mestre.' : 'O chat foi liberado.', '#ff3333');
    if(window.MasterTools?.saveTableControlState) window.MasterTools.saveTableControlState({chatLocked});
    if(currentTableData?.id) window.MS_TABLE_SESSION?.send?.('control',{chatLocked}).catch(()=>{});
}

// VTT GALLERY
function addCampGalleryImage(e) {
    const file = e.target.files[0];
    if(!file) return;
    if(!isVttGM){ e.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
        const src = String(evt.target.result || '');
        const container = document.getElementById('camp-gallery-container');
        container.innerHTML += `
            <div class="gallery-thumb"><img src="${src}" alt="Imagem da campanha" onclick="viewFullscreen(this.src)">
            <button type="button" class="delete-btn hide-on-view" data-gallery-src="${encodeURIComponent(src)}">X</button></div>`;
        if (window.MasterTools && typeof window.MasterTools.saveGalleryImage === 'function') window.MasterTools.saveGalleryImage(src, file.name);
        container.querySelectorAll('[data-gallery-src]').forEach(btn=>{ if(!btn.__bound){ btn.__bound=true; btn.addEventListener('click',()=>{ const src=decodeURIComponent(btn.dataset.gallerySrc||''); if(window.MasterTools?.removeGalleryImage) window.MasterTools.removeGalleryImage(src); btn.parentElement?.remove(); }); }});
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const attrs = ['for', 'vig', 'agi', 'int', 'prn', 'pre'];
    attrs.forEach(a => {
        const el = document.getElementById('attr-' + a);
        if(el) el.addEventListener('input', recalculateStats);
    });
});

const tierData = {
    'O Envolto (Horror Cósmico)': [
        {
            tier: 1, name: 'I. Despertar', options: [
                { id: 'e1_1', name: 'A Quimera', desc: 'Abre sua percepção para a anti-existência. Visão no escuro anômala.' },
                { id: 'e1_2', name: 'O Véu/Fenda', desc: 'Permite interagir com objetos etéreos e atravessar frestas.' },
                { id: 'e1_3', name: 'O Paradoxo', desc: 'Confunde o tempo local. +2 em Iniciativa e Reflexos.' }
            ]
        },
        {
            tier: 2, name: 'II. Aprofundamento', options: [
                { id: 'e2_1', name: 'O Colapso', desc: 'Ataques causam necrose instantânea (+1d6 Dano Entrópico).' },
                { id: 'e2_2', name: 'A Ressonância', desc: 'Vozes ancestrais aterrorizam inimigos próximos.' },
                { id: 'e2_3', name: 'A Anomalia', desc: 'Seu corpo ignora o primeiro ataque físico recebido por cena.' },
                { id: 'e2_4', name: 'A Inércia', desc: 'Reduz o deslocamento de inimigos em 3m num raio de 9m.' }
            ]
        },
        {
            tier: 3, name: 'III. Ruptura', options: [
                { id: 'e3_1', name: 'O Sangue Negro', desc: 'Sangue corrosivo. Atacantes sofrem 1d4 de dano corpo-a-corpo.' },
                { id: 'e3_2', name: 'Oblívio', desc: 'Apaga temporariamente memórias de um alvo.' },
                { id: 'e3_3', name: 'A Emanação', desc: 'Pode projetar sua consciência intangível até 18m.' },
                { id: 'e3_4', name: 'A Entropia', desc: 'Estruturas e materiais mundanos apodrecem ao seu toque.' }
            ]
        },
        {
            tier: 4, name: 'IV. O Abismo', options: [
                { id: 'e4_1', name: 'A Gravidade', desc: 'Controle de massa. Pode flutuar e andar nas paredes.' },
                { id: 'e4_2', name: 'O Vértice', desc: 'Ponto focal da anti-existência. Pode conjurar um buraco negro anômalo.' }
            ]
        }
    ],
    'Classer (Linhagem Herdada)': [
        {
            tier: 1, name: 'I. Mutação Primária', options: [
                { id: 'c1_1', name: 'Adaptação Extrema', desc: 'Seu DNA é reescrito. Imune a doenças e venenos comuns.' },
                { id: 'c1_2', name: 'Aeternus Vitalis', desc: 'Regeneração celular brutal. Recupera 2 PV por rodada ativo.' },
                { id: 'c1_3', name: 'Velocitus Bellator', desc: 'Reflexos predatórios. Ganha +3 metros de Deslocamento Base.' }
            ]
        },
        {
            tier: 2, name: 'II. Adaptação Celular', options: [
                { id: 'c2_1', name: 'Resiliência Instintiva', desc: 'Seus ossos densificam. +2 Defesa Passiva Natural.' },
                { id: 'c2_2', name: 'Sangue Fervente', desc: 'Cura PV com base em dano sofrido no mesmo turno.' },
                { id: 'c2_3', name: 'Mentis Aurorae', desc: 'Expansão neural. Percebe o mundo em câmera lenta (+5 Prontidão).' }
            ]
        },
        {
            tier: 3, name: 'III. Evolução Forçada', options: [
                { id: 'c3_1', name: 'Predador Perfeito', desc: 'Ataques corpo-a-corpo recebem Margem de Crítico +1.' },
                { id: 'c3_2', name: 'Reconstrução', desc: 'Pode recolocar membros decepados em campo.' },
                { id: 'c3_3', name: 'Força Titânica', desc: 'Sua capacidade de carga e dano de impacto dobram.' }
            ]
        },
        {
            tier: 4, name: 'IV. O Ápice', options: [
                { id: 'c4_1', name: 'Visão Preditiva', desc: 'Anula penalidades de ataque surpresa ou flanqueamento.' },
                { id: 'c4_2', name: 'Ápice Genético', desc: 'Ultrapassa o teto biológico para testes heroicos.' }
            ]
        }
    ]
};

let currentUnlockedNodes = [];
/* Removed duplicate declaration of a consolidated function: buildSkillTreeUI */
/* Removed duplicate declaration of a consolidated function: renderTree */

function handleTierClick(tierObj, index, selectedOpt, nature) {
    const infoBox = document.getElementById('tree-node-info');
    
    let isLocked = false;
    if(index > 0) {
        const prevTier = tierData[nature][index - 1];
        const hasPrev = prevTier.options.some(o => currentUnlockedNodes.includes(o.id));
        if(!hasPrev) isLocked = true;
    }

    if(isLocked) {
        infoBox.innerHTML = `<strong style="color:red; font-size:1.2rem;">[BLOQUEADO] ${tierObj.name}</strong><br><br><span style="color:#aaa;">Desbloqueie e selecione uma ramificação no Tier anterior primeiro para avançar na sua evolução.</span>`;
        return;
    }

    let html = `<strong style="font-size:1.1rem; color:var(--theme-color);">${tierObj.name}</strong> - Escolha sua Ramificação:<br><div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:10px;">`;
    
    tierObj.options.forEach(opt => {
        const isSelected = currentUnlockedNodes.includes(opt.id);
        const btnColor = isSelected ? '#a8ff00' : 'var(--theme-color)';
        const borderStyle = isSelected ? `border-color:#a8ff00; box-shadow:0 0 10px #a8ff00 inset; background:rgba(168,255,0,0.1);` : `border-color:#555;`;
        
        if(isEditMode) {
            html += `<div class="choice-card" style="padding:10px; width:45%; ${borderStyle}" onclick="selectTierOption('${opt.id}', ${index}, '${nature}')">
                        <h4 style="color:${btnColor}; font-size:0.9rem;">${opt.name}</h4>
                        <p style="font-size:0.75rem;">${opt.desc}</p>
                     </div>`;
        } else {
             if(isSelected) {
                 html += `<div class="choice-card active" style="padding:10px; width:45%;">
                            <h4>${opt.name}</h4>
                            <p style="font-size:0.75rem;">${opt.desc}</p>
                          </div>`;
             }
        }
    });

    html += `</div>`;
    if(selectedOpt && isEditMode) {
        html += `<button type="button" class="souls-btn small-btn" style="margin-top:15px; border-color:red; color:red;" onclick="relockTier(${index}, '${nature}')">Desfazer Ramificação</button>`;
    }
    
    infoBox.innerHTML = html;
}

function selectTierOption(optId, tierIndex, nature) {
    if(!isEditMode) return;
    
    const tierObj = tierData[nature][tierIndex];
    tierObj.options.forEach(o => {
        currentUnlockedNodes = currentUnlockedNodes.filter(id => id !== o.id);
    });

    currentUnlockedNodes.push(optId);
    
    for(let i = tierIndex + 1; i < tierData[nature].length; i++) {
        tierData[nature][i].options.forEach(o => {
            currentUnlockedNodes = currentUnlockedNodes.filter(id => id !== o.id);
        });
    }

    document.getElementById('tree-unlocked-data').value = JSON.stringify(currentUnlockedNodes);
    renderTree(nature);
    
    const selOpt = tierObj.options.find(o => o.id === optId);
    handleTierClick(tierObj, tierIndex, selOpt, nature);
}

function relockTier(tierIndex, nature) {
    if(!isEditMode) return;
    
    for(let i = tierIndex; i < tierData[nature].length; i++) {
        tierData[nature][i].options.forEach(o => {
            currentUnlockedNodes = currentUnlockedNodes.filter(id => id !== o.id);
        });
    }
    
    document.getElementById('tree-unlocked-data').value = JSON.stringify(currentUnlockedNodes);
    renderTree(nature);
    handleTierClick(tierData[nature][tierIndex], tierIndex, null, nature);
}const advancedTreeData = {
    'O Envolto (Horror Cósmico)': [
        {
            treeId: 'colapso',
            name: 'ÁRVORE 1: O COLAPSO (Potência Destrutiva)',
            desc: 'O apagamento puro. Não é dano físico, é a remoção da matéria da equação existencial.\nFoco de Build: DPS extremo, críticos automáticos, destruição de armaduras.\nInterconexão (Pré-requisitos Externos): Para acessar o Tier 3 do Colapso, o usuário precisa possuir pelo menos o Tier 1 da Árvore de Oblívio.',
            tiers: {
                1: [
                    { id: 'col1', cap: 1, name: 'Dano Singular', effect: 'Causa 1d6 de Dano Ontológico (ignora RD física). Alcance de Toque.', cost: 2, example: 'Um soco onde a mão do Arauto atravessa a densidade da armadura inimiga.' },
                    { id: 'col2', cap: 2, name: 'Dano Brutal', effect: 'Causa 2d6 de Dano. Acertos Críticos tem uma redução de crítico natural de 18-20 no dado.', cost: 4, example: 'Uma rajada de estática negra projetada das palmas das mãos.' },
                    { id: 'col3', cap: 3, name: 'Estilhaço Constante', effect: 'Causa 3d6. O alvo sofre 1d4 de Dano contínuo por 2 rodadas, crítico de todos os ataques sobe para 3% durante o uso da capacidade.', cost: 6, example: 'O sangue do inimigo entra em ebulição fria, corroendo as veias por dentro.' }
                ],
                2: [
                    { id: 'col4', cap: 4, name: 'Cone de Negação', effect: 'Causa 4d6 de Dano. Passa a ser em Área (Cone 9m). Teste de Reflexos divide, reduz crítico natural em -2.', cost: 12, example: 'Um grito silencioso que desintegra portas e a pele de quem estiver à frente.' },
                    { id: 'col5', cap: 5, name: 'Fratura Perfurante', effect: 'Causa 5d6. Qualquer acerto reduz a Defesa Passiva do alvo em -2 permanentemente até a cura e alimenta o dano crítico em 7%.', cost: 15, example: 'Lâminas feitas do próprio Espaço Final que mutilam não só o corpo, mas o instinto de esquiva.' },
                    { id: 'col6', cap: 6, name: 'Aniquilação Seletiva', effect: 'Causa 6d6. O usuário pode escolher quem não recebe dano dentro de uma área de explosão de 6m reduzindo o crítico natural em -3.', cost: 18, example: 'Uma chuva de cinzas geométricas que queima cultistas, mas ignora aliados no centro.' }
                ],
                3: [
                    { id: 'col7', cap: 7, name: 'Ruptura de Casca', effect: 'Causa 7d8. Inimigos que sofram dano perdem a capacidade de cura/regeneração por 1 cena, aumentando dano crítico em 13%.', cost: 35, example: 'Um feixe ocular que cauteriza as células em uma frequência impossível.' },
                    { id: 'col8', cap: 8, name: 'Colapso Atômico', effect: 'Causa 8d10. Inimigos reduzidos a 0 PV são apagados da existência (não deixam corpo ou itens) reduzindo o crítico natural em -5.', cost: 40, example: 'O usuário toca no peito do alvo, e ele simplesmente deixa de ter acontecido.' },
                    { id: 'col9', cap: 9, name: 'Falha Crítica do Universo', effect: 'Causa 10d10. Alcance visual. CD +5 para resistir, com aumento de dano crítico em 30%.', cost: 45, example: 'Um buraco negro do tamanho de uma moeda invocado dentro do crânio do alvo.' },
                    { id: 'col10', cap: 10, name: 'DECRETO DO ELDER', effect: 'Causa 15d10. Dano Irresistível. O usuário ganha 10 Pontos de Corrupção Ontológica instantâneos, aumentando o dano crítico em 50%.', cost: 50, example: 'O Céu se abre. A gravidade esmaga o alvo transformando-o em uma poça de antimatéria.' }
                ]
            }
        },
        {
            treeId: 'quimera',
            name: 'ÁRVORE 2: A QUIMERA (Mutação)',
            desc: 'Moldar a própria carne (ou a dos outros) ignorando a biologia evolutiva.\nFoco de Build: Tanking, Adaptação, Sobrevivência, Alteração de Status.\nInterconexão: Para liberar o Tier 2 de Quimera, exige-se o Tier 1 de Anomalia (Criação).',
            tiers: {
                1: [
                    { id: 'qui1', cap: 1, name: 'Endurecimento Aberrante', effect: '+2 na Defesa Passiva e RD 2. Dura 3 rodadas.', cost: 2, example: 'A pele adquire a textura de basalto que chora sangue negro.' },
                    { id: 'qui2', cap: 2, name: 'Anatomia Improvisada', effect: 'O usuário ganha deslocamento alternativo (Ex: Escalar paredes em velocidade normal ou guelras).', cost: 4, example: 'Dedos se alongam em ganchos ósseos; fendas se abrem no pescoço para respirar miasma.' },
                    { id: 'qui3', cap: 3, name: 'Armamento Carnal', effect: 'O corpo gera uma Arma Natural. Causa Dano equivalente a uma arma pesada (1d10), mas usa VIG para atacar.', cost: 6, example: 'O braço se torce e estilhaça, formando uma foice de cálcio cristalizado.' }
                ],
                2: [
                    { id: 'qui4', cap: 4, name: 'Reestruturação Regenerativa', effect: 'Cura imediata de 3d8 PV. Pode recolocar membros decepados (se segurados).', cost: 12, example: 'Fibras de estática negra costuram um braço amputado de volta ao tronco em segundos.' },
                    { id: 'qui5', cap: 5, name: 'Densidade Paradoxal', effect: 'O usuário ignora acertos críticos (todo crítico conta como acerto normal) e ganha RD 10.', cost: 15, example: 'O corpo do personagem se torna parcialmente translúcido e resistente como chumbo.' },
                    { id: 'qui6', cap: 6, name: 'Metamorfose Invasiva', effect: 'Força uma mutação em um alvo (Toque). O alvo sofre desvantagem em testes de AGI e FOR (CD Fortitude).', cost: 18, example: 'Tocar no joelho do inimigo e fazer com que a articulação dobre para trás.' }
                ],
                3: [
                    { id: 'qui7', cap: 7, name: 'Casca do Devorador', effect: 'Crescimento colossal (Tamanho Enorme). +10 em FOR, alcance natural aumenta para 4,5m. Defesa cai pela metade.', cost: 35, example: 'O peito rasga e uma abominação de músculos deformados engole a forma original do jogador.' },
                    { id: 'qui8', cap: 8, name: 'Células Falsas', effect: 'Se os PV caírem a 0, o corpo evapora e se reconstrói em um raio de 9m com 50% dos PV totais (1x por dia).', cost: 40, example: 'Ao receber um tiro fatal, o corpo se desfaz em fumaça cinza e reaparece atrás do atirador.' },
                    { id: 'qui9', cap: 9, name: 'Parasita Ontológico', effect: 'Funde-se fisicamente com outro ser (aliado ou inimigo). Se inimigo, drena 2d10 PV por rodada e assume o controle.', cost: 45, example: 'Transformar-se em um lodo vivo que invade o corpo do alvo pelas vias respiratórias.' },
                    { id: 'qui10', cap: 10, name: 'AVATAR DE XAL-MHYR', effect: 'O corpo não possui mais biologia. Imunidade a Dano Físico, Veneno, Doença. Só sofre dano Ontológico ou Mental.', cost: 50, example: 'O jogador se torna uma silhueta bidimensional cortada do tecido da realidade.' }
                ]
            }
        },
        {
            treeId: 'fenda',
            name: 'ÁRVORE 3: O VÉU / A FENDA (Potência Espacial)',
            desc: 'O espaço não é uma distância, é uma ilusão que pode ser dobrada ou rasgada.\nFoco de Build: Mobilidade absoluta, controle de campo, reposicionamento tático.\nInterconexão: Exige Tier 2 de Gravidade para o Tier 3.',
            tiers: {
                1: [
                    { id: 'fen1', cap: 1, name: 'Passo Deslizado', effect: 'Teletransporte para qualquer lugar visível até 9m de distância. Ação de Movimento.', cost: 2, example: 'Dar um passo para dentro de uma sombra e sair na sombra do inimigo.' },
                    { id: 'fen2', cap: 2, name: 'Troca Equivalente', effect: 'Troca de lugar com um aliado ou objeto até 15m.', cost: 4, example: 'Uma bala está vindo; o usuário troca de lugar com um pneu de carro a 10 metros dali.' },
                    { id: 'fen3', cap: 3, name: 'Distensão Mínima', effect: 'Alcance de ataques corpo a corpo aumenta em 3 metros (o braço "estica" através do espaço).', cost: 6, example: 'Dar um soco no ar, e o impacto atingir o rosto do inimigo do outro lado da sala.' }
                ],
                2: [
                    { id: 'fen4', cap: 4, name: 'Buraco de Minhoca', effect: 'Abre um portal que dura 3 rodadas. Pode ligar dois pontos a até 100m de distância.', cost: 12, example: 'Desenhar um círculo no ar com sangue e abrir passagem para o teto de um prédio vizinho.' },
                    { id: 'fen5', cap: 5, name: 'Isolamento Euclidiano', effect: 'Prende um alvo em um "canto" do espaço. O alvo não pode se mover ou atacar além de 1m (CD Vontade).', cost: 15, example: 'Dobrar o ar ao redor do inimigo, prendendo-o em uma caixa invisível e asfixiante.' },
                    { id: 'fen6', cap: 6, name: 'Evasão Dimensional', effect: 'Como Reação a um ataque, o usuário sai da realidade por 1 rodada. Dano e efeitos são anulados.', cost: 18, example: 'No momento de uma explosão, o personagem "pisca" para o Espaço Final, retornando ileso.' }
                ],
                3: [
                    { id: 'fen7', cap: 7, name: 'Dilaceração de Área', effect: 'Rasga o espaço num raio de 9m. Todos dentro são teletransportados aleatoriamente até 300m (sofrem dano/desorientação).', cost: 35, example: 'O chão vira vidro quebrado, engolindo e cuspindo todos pelo cenário.' },
                    { id: 'fen8', cap: 8, name: 'Sala Branca', effect: 'Teletransporta o usuário e 1 alvo para dimensão de bolso (1 hora). Ninguém de fora intervém.', cost: 40, example: 'Puxar o chefão do culto para um vazio branco absoluto.' },
                    { id: 'fen9', cap: 9, name: 'Ubiqüidade Parcial', effect: 'Existe em 3 lugares. Ganha 3 ações padrão, mas sofre triplo de dano em áreas.', cost: 45, example: 'Três cópias exatas atacando de ângulos mortos.' },
                    { id: 'fen10', cap: 10, name: 'ONIPRESENÇA ASSASSINA', effect: 'Teletransporte sem limite de distância/visão. Qualquer alvo adjacente à chegada é destruído instantaneamente.', cost: 50, example: 'Pensar no imperador em Paris, surgir nas suas costas e explodir seu crânio atómicamente.' }
                ]
            }
        },
        {
            treeId: 'oblivio',
            name: 'ÁRVORE 4: OBLÍVIO (Decadência / Aflição)',
            desc: 'Enfraquecer mentes, maldições, apodrecimento da alma e apagar memórias.\nFoco de Build: Debuffer Supremo, Assassinato Silencioso, Tortura.\nInterconexão: Exige Tier 1 de Ressonância (Mente) para progredir ao Tier 2.',
            tiers: {
                1: [
                    { id: 'obl1', cap: 1, name: 'Fadiga Antológica', effect: 'Alvo sofre penalidade de -2 em todos os testes e ataques (CD Fortitude).', cost: 2, example: 'Um sussurro que faz o inimigo sentir o peso de mil anos em seus ombros de uma só vez.' },
                    { id: 'obl2', cap: 2, name: 'Cegueira/Surdez Existencial', effect: 'Alvo perde um sentido à escolha (CD Vontade). Falha nos testes que dependem do sentido.', cost: 4, example: 'Os olhos da vítima ficam brancos; ela não fica cega pela luz, ela esquece o que é "ver".' },
                    { id: 'obl3', cap: 3, name: 'Apatia Causal', effect: 'O alvo não pode realizar Ações de Reação ou Ações Rápidas por 2 rodadas.', cost: 6, example: 'O cérebro do inimigo atrasa o reconhecimento de que está em perigo.' }
                ],
                2: [
                    { id: 'obl4', cap: 4, name: 'Necrose Lógica', effect: 'O alvo sofre 2d4 de dano permanente nos PV totais a cada rodada (Dano incurável na cena).', cost: 12, example: 'Um toque podre que transforma a carne do inimigo em carvão esfarelento.' },
                    { id: 'obl5', cap: 5, name: 'Apagamento de Habilidade', effect: 'O alvo esquece como usar uma de suas Perícias base por 24h.', cost: 15, example: 'O atirador de elite olha para o rifle; de repente, parece um idioma alienígena.' },
                    { id: 'obl6', cap: 6, name: 'Aura de Desespero', effect: 'Área de 9m. Inimigos que entrarem devem fazer Teste de Vontade ou fugirão aterrorizados.', cost: 18, example: 'Uma fumaça densa emanando do jogador que induz um ataque de pânico primordial.' }
                ],
                3: [
                    { id: 'obl7', cap: 7, name: 'Murchar a Casca', effect: 'Reduz 2 pontos de um Atributo Base do inimigo permanentemente (CD Extrema de Fortitude).', cost: 35, example: 'O braço musculoso do carrasco seca e atrofia em segundos.' },
                    { id: 'obl8', cap: 8, name: 'Morte Lenta e Certeira', effect: 'Define um prazo (ex: 3 rodadas). Se o alvo não matar o usuário até lá, seus PV caem a 0 instantaneamente.', cost: 40, example: 'Uma marca de ampulheta cravada no peito da vítima, pulsando até o infarto.' },
                    { id: 'obl9', cap: 9, name: 'Contágio Memético', effect: 'Maldição. Se o alvo infectado tocar em outro, o segundo recebe os mesmos debuffs e dano.', cost: 45, example: 'Doença de pele de olhos que piscam e transferem paralisia pelo toque.' },
                    { id: 'obl10', cap: 10, name: 'O SOM DO FIM', effect: 'O usuário decreta o fim de um conceito na cena. Ninguém pode usar testes daquele Atributo/Perícia.', cost: 50, example: 'Arrancar a própria garganta para falar, paralisando uma horda inteira que "esqueceu" como andar.' }
                ]
            }
        },
        {
            treeId: 'inercia',
            name: 'ÁRVORE 5: A INÉRCIA (Potência Temporal)',
            desc: 'O tempo não passa; a percepção humana é que é linear. Ensina a parar, acelerar ou quebrar essa linha.\nFoco de Build: Controlo de ações, buffs de velocidade, anulação de danos por rebobinar.\nInterconexão: Exige o Tier 1 de O Véu / A Fenda para aceder ao Tier 3.',
            tiers: {
                1: [
                    { id: 'ine1', cap: 1, name: 'Atraso Cognitivo', effect: 'O alvo é relegado para o fim da ordem de Iniciativa (CD Vontade).', cost: 2, example: 'Um olhar que faz o atirador hesitar meio segundo.' },
                    { id: 'ine2', cap: 2, name: 'Aceleração Entrópica', effect: 'O utilizador ganha uma Ação de Movimento extra na sua rodada.', cost: 4, example: 'Os músculos vibram e o Arauto percorre o triplo da distância como um borrão.' },
                    { id: 'ine3', cap: 3, name: 'Eco Recente', effect: 'Permite ver o que aconteceu num espaço confinado nas últimas 24 horas.', cost: 6, example: 'Olhar para as cinzas e ver o incêndio a acontecer ao contrário.' }
                ],
                2: [
                    { id: 'ine4', cap: 4, name: 'Estase Localizada', effect: 'Paralisa um alvo no tempo por 1d4 rodadas (CD Fortitude Extrema). O alvo é imune a danos.', cost: 12, example: 'Prender um cultista numa bolha onde o ar e a luz deixaram de fluir.' },
                    { id: 'ine5', cap: 5, name: 'Rebobinar Carnal', effect: 'Desfaz o dano sofrido por 1 alvo na última rodada, devolvendo os PV perdidos.', cost: 15, example: 'A bala sai do peito do aliado e volta para a arma do inimigo.' },
                    { id: 'ine6', cap: 6, name: 'Envelhecimento Precoce', effect: 'Causa 4d8 de Dano Ontológico. Objetos/armas apodrecem e enferrujam instantaneamente.', cost: 18, example: 'Tocar na caçadeira do inimigo e vê-la transformar-se em pó.' }
                ],
                3: [
                    { id: 'ine7', cap: 7, name: 'Paragem Total (Zaragoza)', effect: 'O tempo para num raio de 15m. Apenas o utilizador pode agir durante 2 rodadas.', cost: 35, example: 'O mundo fica cinzento. A chuva para no ar.' },
                    { id: 'ine8', cap: 8, name: 'Desvio de Linha Temporal', effect: 'O utilizador obriga o Mestre a rolar de novo um dado importante e aceitar o segundo resultado.', cost: 40, example: 'O golpe letal acerta; os olhos do Arauto brilham e, de repente, o monstro falhou.' },
                    { id: 'ine9', cap: 9, name: 'Cicatriz Crónica', effect: 'Causa 8d10 de Dano. O dano é aplicado de novo automaticamente no início do próximo turno do alvo.', cost: 45, example: 'Um corte de espada que sangra duas vezes: no presente e no futuro imediato.' },
                    { id: 'ine10', cap: 10, name: 'ABORTO EXISTENCIAL', effect: 'Remove permanentemente a próxima rodada de um alvo principal. Ele não pode agir, e defesas caem a 0.', cost: 50, example: 'O Elder apaga os 6 segundos seguintes da vida do alvo.' }
                ]
            }
        },
        {
            treeId: 'ressonancia',
            name: 'ÁRVORE 6: A RESSONÂNCIA (Potência Mental)',
            desc: 'Não se trata de ler a mente, mas de a reescrever com as frequências do Espaço Final.\nFoco de Build: Dominação, interrogatórios absolutos, ataques furtivos psicológicos.\nInterconexão: Exige o Tier 2 de Oblívio para aceder ao Tier 3.',
            tiers: {
                1: [
                    { id: 'res1', cap: 1, name: 'Estática Superficial', effect: 'Lê pensamentos ou intenções imediatas (Ação Rápida).', cost: 2, example: 'Ouvir o plano de ataque do inimigo antes de puxar a faca.' },
                    { id: 'res2', cap: 2, name: 'Ruído de Xal-Mhyr', effect: 'Causa 2d6 de Dano Mental. O alvo fica Confuso (50% chance de atacar o alvo errado).', cost: 4, example: 'Injetar o som de estrelas a morrer diretamente no córtex.' },
                    { id: 'res3', cap: 3, name: 'Ligação de Colmeia', effect: 'Cria telepatia perfeita entre até 5 aliados durante uma cena inteira.', cost: 6, example: 'A equipa comunica sem palavras, partilhando visões periféricas.' }
                ],
                2: [
                    { id: 'res4', cap: 4, name: 'Comando Soberano', effect: 'O alvo obedece a uma instrução simples de até 5 palavras (CD Vontade). Não suicídio direto.', cost: 12, example: '"Larga a arma e dorme." O segurança desaba.' },
                    { id: 'res5', cap: 5, name: 'Agonia Fantasma', effect: 'Cérebro acredita que o corpo arde. Sofre 4d6 de Dano e fica Atordoado.', cost: 15, example: 'A vítima contorce-se a gritar a tentar apagar um fogo inexistente.' },
                    { id: 'res6', cap: 6, name: 'Edição de Memória', effect: 'Apaga ou reescreve até 10 minutos de memória de um alvo humano mundano.', cost: 18, example: 'Faz a testemunha acreditar que um cão atacou a vítima.' }
                ],
                3: [
                    { id: 'res7', cap: 7, name: 'Marioneta Carnal', effect: 'Assume controlo total do corpo físico do alvo durante 3 rodadas.', cost: 35, example: 'O líder ataca os próprios seguidores a chorar, incapaz de parar.' },
                    { id: 'res8', cap: 8, name: 'Morte Cerebral', effect: 'Dano Massivo Mental de 8d8. A 0 PV, estado vegetativo permanente.', cost: 40, example: 'Apagar o "eu" do inimigo da existência com um olhar.' },
                    { id: 'res9', cap: 9, name: 'Parasita de Conhecimento', effect: 'Rouba permanentemente uma Perícia ou Segredo do alvo.', cost: 45, example: 'Sugar a perícia "Medicina" do médico inimigo.' },
                    { id: 'res10', cap: 10, name: 'DOMÍNIO DO DEVORADOR', effect: 'Dominação em área (15m). Quem falhar CD Extrema torna-se devoto suicida por 1 hora.', cost: 50, example: 'A sala inteira ajoelha-se, pronta para se sacrificar ao comando do Arauto.' }
                ]
            }
        },
        {
            treeId: 'anomalia',
            name: 'ÁRVORE 7: A ANOMALIA (Criação Material)',
            desc: 'O princípio da conservação da massa é uma mentira; a matéria é geometria à espera de ser corrompida.\nFoco de Build: Crafting, armadilhas, barreiras.\nInterconexão: Exige Tier 1 de Quimera para desbloquear Tier 2.',
            tiers: {
                1: [
                    { id: 'ano1', cap: 1, name: 'Massa Impossível', effect: 'Cria objetos pequenos (até 2kg) de materiais anómalos. Dura 1 hora.', cost: 2, example: 'Manifestar uma chave feita de gelo que não derrete e queima a pele.' },
                    { id: 'ano2', cap: 2, name: 'Munição Ontológica', effect: 'Gera munições que ignoram RD mundana. Aumenta o dano da arma de fogo em +1d6.', cost: 4, example: 'Balas formadas por dentes afiados que sorriem.' },
                    { id: 'ano3', cap: 3, name: 'Transmutação Simples', effect: 'Altera propriedades de uma superfície 2x2m (pedra vira lodo, madeira vira vidro).', cost: 6, example: 'Transformar a barricada de cimento em vidro quebradiço.' }
                ],
                2: [
                    { id: 'ano4', cap: 4, name: 'Barreira de Não-Espaço', effect: 'Cria um muro 3x3m (50 PV/RD 10). Se quebrado, explode (3d6 Dano).', cost: 12, example: 'Muro de geometria negra a proteger aliados.' },
                    { id: 'ano5', cap: 5, name: 'Armamento Primordial', effect: 'Manifesta Arma do Envolto letal e temporária.', cost: 15, example: 'Invocar espada feita de estática e ódio.' },
                    { id: 'ano6', cap: 6, name: 'Anatomia do Ambiente', effect: 'Cria armadilhas ambientais animadas na área.', cost: 18, example: 'O soalho cria braços que esmagam invasores.' }
                ],
                3: [
                    { id: 'ano7', cap: 7, name: 'Estrutura Viva', effect: 'Cria fortificação ou veículo orgânico (150 PV) que obedece a comandos mentais.', cost: 35, example: 'Jipe com motor de coração gigante e carapaça de osso.' },
                    { id: 'ano8', cap: 8, name: 'Criação de Singularidade', effect: 'Gera objeto com gravidade própria que atrai inimigos (9m, Teste de FOR).', cost: 40, example: 'Sol negro atirado atrai tudo para o centro.' },
                    { id: 'ano9', cap: 9, name: 'Transmutação Viva', effect: 'Transmuta inimigo em objeto inanimado permanentemente (CD Extrema Fortitude). Consciente.', cost: 45, example: 'Transformar soldado blindado em estátua de sal.' },
                    { id: 'ano10', cap: 10, name: 'ARQUITETURA ELDER', effect: 'Altera topografia de 1km (ex: montanha na cidade). Exige CO e sacrifício.', cost: 50, example: 'Catedral gótica invertida ergue-se dos escombros urbanos num instante.' }
                ]
            }
        },
        {
            treeId: 'paradoxo',
            name: 'ÁRVORE 8: O PARADOXO (Ilusão Absoluta)',
            desc: 'Quando os sentidos mentem com convicção suficiente, a realidade curva-se para pedir desculpa.\nFoco de Build: Engano, dano indireto, labirintos mentais.\nInterconexão: Exige Tier 1 de Fenda e Tier 1 de Ressonância.',
            tiers: {
                1: [
                    { id: 'par1', cap: 1, name: 'Falha Ótica', effect: 'Cria ilusão visual/sonora simples (Percepção vs CD da Ilusão).', cost: 2, example: 'Som de metralhadora ou demónio a rastejar pelo teto.' },
                    { id: 'par2', cap: 2, name: 'Camuflagem Geométrica', effect: 'Invisível enquanto não atacar, fundindo-se com o conceito do espaço.', cost: 4, example: 'A luz dobra-se, sendo "esquecido" pela ótica local.' },
                    { id: 'par3', cap: 3, name: 'Isca Psíquica', effect: 'Duplo perfeito. Inimigos atacam o duplo se falharem em Vontade.', cost: 6, example: 'O inimigo corta a ilusão, o verdadeiro está atrás dele.' }
                ],
                2: [
                    { id: 'par4', cap: 4, name: 'Pesadelo Tátil', effect: 'A ilusão tem consistência física momentânea. Pode causar 3d6 de Dano.', cost: 12, example: 'Ilusão de besta morde; o cérebro fabrica a ferida e sangra.' },
                    { id: 'par5', cap: 5, name: 'Labirinto Sensorial', effect: 'Cega, ensurdece e retira o tato de até 3 alvos (CD Vontade Extrema). Paralisados.', cost: 15, example: 'Alvos veem-se lançados no vazio escuro sem gravidade.' },
                    { id: 'par6', cap: 6, name: 'Miragem Inversa', effect: 'Esconde o que está lá (pontes, chamas, ferimentos).', cost: 18, example: 'Esconder ravina de 20m parecendo chão liso.' }
                ],
                3: [
                    { id: 'par7', cap: 7, name: 'Recreação Histórica', effect: 'Ilusão de área (50m) que reproduz exatamente o ambiente como era noutra época.', cost: 35, example: 'Armazém vira matadouro de 1920 a funcionar em pleno.' },
                    { id: 'par8', cap: 8, name: 'Morte por Convicção', effect: 'Decreta alvo executado. Falha Vontade = Dano Massivo (10d10).', cost: 40, example: 'Som da lâmina; a cabeça cai, cortada pelo paradoxo.' },
                    { id: 'par9', cap: 9, name: 'Realidade Subscrita', effect: 'Transfere ilusão para matéria permanente (fogo falso fica real).', cost: 45, example: 'Parede de chumbo ilusória forçada por átomos a ser verdadeira.' },
                    { id: 'par10', cap: 10, name: 'O TEATRO DOS CEGOS', effect: 'Reescreve regras da física para os inimigos (30m) por 3 rodadas.', cost: 50, example: 'Gravidade no teto, respirar queima os pulmões.' }
                ]
            }
        },
        {
            treeId: 'entropia',
            name: 'ÁRVORE 9: A ENTROPIA (Azar / Sorte Reversa)',
            desc: 'A probabilidade viciada. Entropia reescreve a sorte como força agressiva.\nFoco de Build: Debuff de área, controlo de rolagens, anular críticos.\nInterconexão: Exige Tier 1 de Inércia para Tier 2.',
            tiers: {
                1: [
                    { id: 'ent1', cap: 1, name: 'Falha Menor', effect: 'Obriga alvo a rerolar ataque/perícia e ficar com pior resultado.', cost: 2, example: 'A arma escorrega das mãos no momento do disparo.' },
                    { id: 'ent2', cap: 2, name: 'Desvio Cinético', effect: '+3 na Defesa Passiva contra ataques à distância por 1 cena.', cost: 4, example: 'Balas recusam-se a seguir trajetória reta perto do Arauto.' },
                    { id: 'ent3', cap: 3, name: 'Sorte Macabra', effect: 'Próximo ataque do utilizador é Crítico automático.', cost: 6, example: 'Faca atirada às cegas ricocheteia e acerta a jugular.' }
                ],
                2: [
                    { id: 'ent4', cap: 4, name: 'Colapso de Ferramenta', effect: 'Arma, rádio ou mecânica inimiga avaria permanentemente.', cost: 12, example: 'Motor do carro de fuga derrete numa poça radioativa.' },
                    { id: 'ent5', cap: 5, name: 'Propagação de Azar', effect: 'Raio de 9m, todos os inimigos rolam resistência com Desvantagem por 3 rodadas.', cost: 15, example: 'Névoa transforma passos em tropeções e respiração em tosse.' },
                    { id: 'ent6', cap: 6, name: 'Maldição do Destino', effect: 'O alvo perde a capacidade de Críticos; críticos viram falhas/críticas.', cost: 18, example: 'Quanto melhor o golpe do espadachim inimigo, mais ele corta a própria perna.' }
                ],
                3: [
                    { id: 'ent7', cap: 7, name: 'Ruína Probabilística', effect: 'Causa 7d8 de Dano. Maximizado se o alvo falhar Teste Vontade.', cost: 35, example: 'Teto, janela e viga desabam ao mesmo tempo sobre o alvo.' },
                    { id: 'ent8', cap: 8, name: 'Milagre Invertido', effect: 'Transforma a cura do alvo em Dano Ontológico igual ao valor.', cost: 40, example: 'Ritual de cura inimigo vira ácido nas veias.' },
                    { id: 'ent9', cap: 9, name: 'Zona de Entropia Morta', effect: 'Área 15m. Teste d20 falha automaticamente se natural não for 15+.', cost: 45, example: 'A realidade desiste. Nada funciona perfeitamente.' },
                    { id: 'ent10', cap: 10, name: 'O ÚNICO RESULTADO', effect: 'Dita uma ação incontestável para o inimigo (sem rolagem).', cost: 50, example: 'Xal-Mhyr dita; alvo atira na própria cabeça ou sofre evento predeterminado.' }
                ]
            }
        },
        {
            treeId: 'gravidade',
            name: 'ÁRVORE 10: A GRAVIDADE (Potência Cinética)',
            desc: 'A gravidade é definida pelo peso das fendas no ar.\nFoco de Build: Controlo de Multidões, esmagamento físico.\nInterconexão: Exige Tier 1 de Colapso para desbloquear Tier 3.',
            tiers: {
                1: [
                    { id: 'gra1', cap: 1, name: 'Peso Emocional', effect: 'Reduz o deslocamento de um alvo a metade (CD Fortitude).', cost: 2, example: 'A culpa materializa-se, pesando como chumbo as botas da vítima.' },
                    { id: 'gra2', cap: 2, name: 'Repulsão Singular', effect: 'Afasta inimigo adjacente em 6m e o deita ao chão.', cost: 4, example: 'Onda de choque silenciosa partindo das palmas.' },
                    { id: 'gra3', cap: 3, name: 'Queda Horizontal', effect: 'O utilizador pode caminhar pelas paredes/teto por 1 hora.', cost: 6, example: 'A gravidade pessoal vira 90 graus à sua vontade.' }
                ],
                2: [
                    { id: 'gra4', cap: 4, name: 'Esmagamento Euclidiano', effect: 'Causa 4d8 de Dano contusão (Área 6m). Quem falhar fica Caído.', cost: 12, example: 'Ar pesado esmaga capacetes e ossos dos adversários.' },
                    { id: 'gra5', cap: 5, name: 'Campo de Suspensão', effect: 'Levita objetos/criaturas desprevenidas num raio de 9m no ar.', cost: 15, example: 'A sala flutua num vácuo gravitacional.' },
                    { id: 'gra6', cap: 6, name: 'Vetor Cortante', effect: 'Causa 6d6 Cortante. Ignora RD física, fatiando pela gravidade.', cost: 18, example: 'Puxa o ar com tanta violência que cria uma lâmina de vácuo transparente.' }
                ],
                3: [
                    { id: 'gra7', cap: 7, name: 'Singularidade Menor', effect: 'Atrai todos (15m) para ponto central, causando 7d8 Esmagamento.', cost: 35, example: 'Poço gravitacional do tamanho de um punho absorve o salão.' },
                    { id: 'gra8', cap: 8, name: 'Inversão Planetária', effect: 'Área 30m, gravidade inverte-se. Todos caem "para cima" (3 rodadas).', cost: 40, example: 'O céu converte-se no chão temporário.' },
                    { id: 'gra9', cap: 9, name: 'Densidade de Anã Branca', effect: 'Corpo imovível/indestrutível. RD 30, imune a quedas/repulsão.', cost: 45, example: 'A carne vira estrela morta, partindo as armas de quem a ataca.' },
                    { id: 'gra10', cap: 10, name: 'BURACO NEGRO ONTOLÓGICO', effect: 'Rasgão de 1 min. Criatura puxada sofre morte instantânea ao centro.', cost: 50, example: 'Orbe estático que engole som, luz e vida no vazio.' }
                ]
            }
        },
        {
            treeId: 'sangue_negro',
            name: 'ÁRVORE 11: O SANGUE NEGRO (Necromancia)',
            desc: 'O Espaço Final não conhece a vida nem a morte. Reanima a carne falhada.\nFoco de Build: Exército, autossustento, resiliência aterradora.\nInterconexão: Exige Tier 2 de Quimera para aceder ao Tier 2.',
            tiers: {
                1: [
                    { id: 'san1', cap: 1, name: 'Animação Falsa', effect: 'Reanima cadáver pequeno/médio para seguir ordens por 1h.', cost: 2, example: 'Cão/cultista morto levanta vertendo lodo negro.' },
                    { id: 'san2', cap: 2, name: 'Sifão de Vida', effect: 'Causa 2d6 Dano e cura utilizador em metade (Toque).', cost: 4, example: 'Arrancar a vitalidade através de um toque parasitário.' },
                    { id: 'san3', cap: 3, name: 'Memória do Sangue', effect: 'Tocar no sangue fresco revela últimos 5 min de vida do cadáver.', cost: 6, example: 'Provar sangue e ver assassino pelos olhos da vítima.' }
                ],
                2: [
                    { id: 'san4', cap: 4, name: 'Marionetas de Alcatrão', effect: 'Reanima até 3 cadáveres para combate (atributos originais, metade dos PV).', cost: 12, example: 'Levantar patrulha abatida como escudos de carne.' },
                    { id: 'san5', cap: 5, name: 'Podridão Inversa', effect: 'Cura 4d8 PV de aliado, mas aliado adquire 2 Pontos Corrupção.', cost: 15, example: 'Costurar ferida com fios negros que murmuram à noite.' },
                    { id: 'san6', cap: 6, name: 'Eco do Caído', effect: 'Arranca sombra do cadáver para ataque (5d8 Dano Ontológico) no assassino.', cost: 18, example: 'A sombra estica-se na parede e estrangula o agressor.' }
                ],
                3: [
                    { id: 'san7', cap: 7, name: 'Legião do Espaço Final', effect: 'Reanima todos os cadáveres (30m). Explodem (4d6 Dano) quando mortos.', cost: 35, example: 'Cemitério acorda como vasos de estática destrutivos.' },
                    { id: 'san8', cap: 8, name: 'Casca Imortal', effect: 'Se PV cair < 0, utilizador luta por 3 rodadas antes do corpo falir.', cost: 40, example: 'Coração não bate, mas ataca impiedosamente.' },
                    { id: 'san9', cap: 9, name: 'Partilha de Morte', effect: 'Liga utilizador ao alvo. Dano sofrido pelo utilizador também passa ao alvo.', cost: 45, example: 'Arauto perfurado = coração do inimigo também sofre dano.' },
                    { id: 'san10', cap: 10, name: 'O ÚLTIMO SUSPIRO DE XAL-MHYR', effect: 'Ressuscita morto recente (<10min). Ele perde classe original e vira "Tocado".', cost: 50, example: 'Arraste a alma de volta envolta em contaminação ontológica.' }
                ]
            }
        },
        {
            treeId: 'emanacao',
            name: 'ÁRVORE 12: A EMANAÇÃO (Invocação)',
            desc: 'Abrir comportas para formas de vida do abismo passearem pela Terra.\nFoco de Build: Pets, dano colateral massivo.\nInterconexão: Exige Tier 2 de O Véu / Fenda para Tier 3.',
            tiers: {
                1: [
                    { id: 'ema1', cap: 1, name: 'Sussurro Invocado', effect: 'Invoca entidade invisível/inofensiva para espionar até 1km.', cost: 2, example: 'Olho flutuante que sussurra segredos através da sala.' },
                    { id: 'ema2', cap: 2, name: 'Familiar Aberrante', effect: 'Invoca construto bizarro menor para combate ou investigação.', cost: 4, example: 'Aranha de pernas com dedos humanos.' },
                    { id: 'ema3', cap: 3, name: 'Enxame Geomêtrico', effect: 'Invoca bando de agulhas/espelhos flutuantes causando 3d4 Dano Área 6m.', cost: 6, example: 'Estilhaços rasgam quem atravessa o corredor.' }
                ],
                2: [
                    { id: 'ema4', cap: 4, name: 'Invocar o Devorador', effect: 'Invoca cão do Envolto (50 PV) que causa Dano Ontológico.', cost: 12, example: 'Cão de músculos e dentes de cristal a emergir do chão.' },
                    { id: 'ema5', cap: 5, name: 'Porta-Voz Involuntário', effect: 'Força alvo a canalizar ataque de área de dentro do corpo.', cost: 15, example: 'Refém flutua disparando raio gélido da boca.' },
                    { id: 'ema6', cap: 6, name: 'Manifestação de Horror', effect: 'Invoca presença invisível gigante (15m). Inimigos perdem -5 de Defesa.', cost: 18, example: 'Mentes fraquejam só com o peso do colossal.' }
                ],
                3: [
                    { id: 'ema7', cap: 7, name: 'Guardião do Limiar', effect: 'Invoca abominação nível Boss menor por 3 rodadas (9x9m).', cost: 35, example: 'Massa de tentáculos a espalhar caos pela barricada.' },
                    { id: 'ema8', cap: 8, name: 'Fenda de Invocação Múltipla', effect: 'Portais enviam feixes em 4 alvos, causando 6d8 Dano cada.', cost: 40, example: '4 Lanças de outra dimensão rasgam o ar.' },
                    { id: 'ema9', cap: 9, name: 'Avatar Partilhado', effect: 'Funde-se à invocação maior, duplicando PV e golpes corpo-a-corpo.', cost: 45, example: 'Arauto usa monstro como exoesqueleto imensurável.' },
                    { id: 'ema10', cap: 10, name: 'A CHEGADA', effect: 'A Mão do Elder limpa 50m. Morte instantânea <100 PV. Entra em coma por 2d4 dias.', cost: 50, example: 'Céu quebra como vidro e a mão apaga exércitos inteiros.' }
                ]
            }
        },
        {
            treeId: 'vertice',
            name: 'ÁRVORE 13: O VÉRTICE (Defesa Absoluta)',
            desc: 'O controlo definitivo do Não. O Vértice rege o colapso das intenções.\nFoco de Build: Invulnerabilidade pontual, reflexão de danos.\nInterconexão: Exige Tier 2 de A Anomalia para Tier 3.',
            tiers: {
                1: [
                    { id: 'ver1', cap: 1, name: 'Negação Superficial', effect: 'Reduz o dano do próximo ataque recebido a metade (Reação).', cost: 2, example: 'Escudo hexagonal cinza surge entre faca e garganta.' },
                    { id: 'ver2', cap: 2, name: 'Armadura de Vazio', effect: 'Garante RD 5 e imunidade a danos críticos durante 3 rodadas.', cost: 4, example: 'Pele escurece absorvendo impactos cinéticos.' },
                    { id: 'ver3', cap: 3, name: 'Passo Lateral Dimensional', effect: 'Bónus passivo de +4 em todos Testes de Reflexo e Agilidade.', cost: 6, example: 'O corpo do personagem sempre um micro-centímetro noutra dimensão.' }
                ],
                2: [
                    { id: 'ver4', cap: 4, name: 'Redirecionamento', effect: '(Reação). Alvo atirador à distância vê ataque redirecionado num raio de 6m.', cost: 12, example: 'Agarra bala do ar com dobra espacial atirando em outro inimigo.' },
                    { id: 'ver5', cap: 5, name: 'Bolha de Fuga', effect: 'Cria refúgio 3x3m ao redor do grupo (Dura 2 rodadas). Nada físico entra.', cost: 15, example: 'Cúpula protege a equipe do desabamento do teto.' },
                    { id: 'ver6', cap: 6, name: 'Rejeição de Conceito', effect: 'Torna-se imune a um tipo de dano (Fogo, Cortante, Mental) pela cena.', cost: 18, example: 'Caminha em labaredas de lança-chamas ignorando calor.' }
                ],
                3: [
                    { id: 'ver7', cap: 7, name: 'O Muro do Fim', effect: 'Cria barreira de 15m. Atravessar sofre 5d10 Dano Ontológico, para movimento.', cost: 35, example: 'Divide o campo com falha na renderização do mundo.' },
                    { id: 'ver8', cap: 8, name: 'Intocável', effect: 'Por 2 rodadas, todas as rolagens de ataque inimigas falham imeditamente.', cost: 40, example: 'Desfaz linha do alvo na matriz existencial. Balas atravessam o ar.' },
                    { id: 'ver9', cap: 9, name: 'Espelho de Xal-Mhyr', effect: '(Reação Absoluta). Devolve 100% de Dano ou Efeito de volta ao atacante (sem perda de PV).', cost: 45, example: 'Absorve magia e explode de volta ao rosto do mago.' },
                    { id: 'ver10', cap: 10, name: 'A RECUSA EXISTENCIAL', effect: 'Diz "Não" a um evento (morte aliado, bomba) e reverte o turno (1x por campanha).', cost: 50, example: 'Supremo poder de edição. O jogador recusa a visão do mestre e força o universo a mudar.' }
                ]
            }
        }
    ],
    'Classer (Linhagem Herdada)': [
        {
            treeId: 'classer_main',
            name: 'LINHAGEM HERDADA (4 Níveis)',
            desc: 'A evolução máxima e adaptação biológica dos coletores de Gene Êxodo.\nFoco de Build: Sobrevivência, Regeneração, Mobilidade e Força Bruta.',
            tiers: {
                1: [
                    { id: 'c1_1', cap: 1, name: 'Adaptação Extrema', effect: 'Seu DNA é reescrito. Imune a doenças e venenos comuns.', cost: 0, example: '' },
                    { id: 'c1_2', cap: 1, name: 'Aeternus Vitalis', effect: 'Regeneração celular brutal. Recupera 2 PV por rodada ativo.', cost: 0, example: '' },
                    { id: 'c1_3', cap: 1, name: 'Velocitus Bellator', effect: 'Reflexos predatórios. Ganha +3 metros de Deslocamento Base.', cost: 0, example: '' }
                ],
                2: [
                    { id: 'c2_1', cap: 2, name: 'Resiliência Instintiva', effect: 'Seus ossos densificam. +2 Defesa Passiva Natural.', cost: 0, example: '' },
                    { id: 'c2_2', cap: 2, name: 'Sangue Fervente', effect: 'Cura PV com base em dano sofrido no mesmo turno.', cost: 0, example: '' },
                    { id: 'c2_3', cap: 2, name: 'Mentis Aurorae', effect: 'Expansão neural. Percebe o mundo em câmera lenta (+5 Prontidão).', cost: 0, example: '' }
                ],
                3: [
                    { id: 'c3_1', cap: 3, name: 'Predador Perfeito', effect: 'Ataques corpo-a-corpo recebem Margem de Crítico +1.', cost: 0, example: '' },
                    { id: 'c3_2', cap: 3, name: 'Reconstrução', effect: 'Pode recolocar membros decepados em campo.', cost: 0, example: '' },
                    { id: 'c3_3', cap: 3, name: 'Força Titânica', effect: 'Sua capacidade de carga e dano de impacto dobram.', cost: 0, example: '' }
                ],
                4: [
                    { id: 'c4_1', cap: 4, name: 'Visão Preditiva', effect: 'Anula penalidades de ataque surpresa ou flanqueamento.', cost: 0, example: '' },
                    { id: 'c4_2', cap: 4, name: 'Ápice Genético', effect: 'Ultrapassa o teto biológico para testes heroicos.', cost: 0, example: '' }
                ]
            }
        }
    ]
};

// currentUnlockedNodes já declarado acima; bloco legado preservado sem redeclaração.


function buildSkillTreeUI(nature) {
    const container = document.getElementById('specific-content-container');
    if(!advancedTreeData[nature]) {
        const natureData = ruleset[currentMode].natures[nature];
        if(natureData && natureData.tabHtml) { container.innerHTML = natureData.tabHtml; }
        return;
    }

    if(nature === 'O Envolto (Horror Cósmico)') {
        container.innerHTML = `
            <section id="ef-space-final" aria-label="Espaço Final — Árvore de Habilidades do Envolto">
                <header class="ef-header">
                    <div class="ef-seal" aria-hidden="true">∅</div>
                    <div class="ef-heading">
                        <span class="ef-kicker">OCULTATUN · ENVOLTO</span>
                        <h2>Engenharia do Blasfemo</h2>
                        <p>Monte, mova e navegue livremente pelas 13 árvores do Espaço Final. Cada nodo pode ser reposicionado sem deslocar os demais.</p>
                    </div>
                    <div class="ef-progress"><span>NODOS DESPERTOS</span><strong id="ef-progress-value">0 / ${advancedTreeData[nature].length * 3}</strong></div>
                </header>

                <div class="ef-view-controls" role="toolbar" aria-label="Controles de navegação da árvore">
                    <button type="button" class="ef-view-btn" id="ef-fit-tree">CENTRALIZAR ÁREA</button>
                    <button type="button" class="ef-view-btn" id="ef-zoom-out" aria-label="Diminuir escala">−</button>
                    <span class="ef-zoom-value" id="ef-zoom-value">100%</span>
                    <button type="button" class="ef-view-btn" id="ef-zoom-in" aria-label="Aumentar escala">+</button>
                    <button type="button" class="ef-view-btn" id="ef-toggle-info">OCULTAR PAINEL</button>
                    <button type="button" class="ef-view-btn hide-on-view" id="ef-reset-tree-layout">RESETAR POSIÇÕES</button>
                </div>

                <div class="ef-main">
                    <div class="ef-tree-frame ef-free-pan" id="ef-tree-frame" aria-label="Viewport da árvore do Espaço Final">
                        <div class="ef-tree-scroll" id="tree-scroll-wrapper">
                            <div class="ef-paper-noise" aria-hidden="true"></div>
                            <div class="ef-infection" aria-hidden="true"></div>
                            <svg class="tree-svg" id="tree-svg" aria-hidden="true"></svg>
                            <div class="tree-nodes" id="tree-nodes"></div>
                        </div>
                    </div>

                    <aside class="ef-info" id="ef-tree-info-panel">
                        <div class="ef-info-head">
                            <div>
                                <span class="ef-info-label">REGISTRO DE POTÊNCIA / MUTAÇÃO</span>
                                <strong>Detalhes do nodo selecionado</strong>
                            </div>
                            <button type="button" class="ef-info-collapse hide-on-view" id="ef-close-info" aria-label="Ocultar painel">×</button>
                        </div>
                        <div id="tree-node-info" class="ef-info-body">Selecione uma Tabela (Nodo Raiz) para iniciar.</div>
                    </aside>
                </div>

                <div class="ef-frame-note">ARRASTE O FUNDO PARA NAVEGAR · ARRASTE QUALQUER NODO PARA REPOSICIONÁ-LO · CLIQUE PARA VER DETALHES</div>
                <input type="hidden" id="tree-unlocked-data" value="">
                <input type="hidden" id="ef-table-layout-data" value="{}">
                <input type="hidden" id="ef-tree-layout-version" value="32">
            </section>
        `;
        setTimeout(() => renderTree(nature), 50);
        return;
    }

    container.innerHTML = `
        <h3 style="color:var(--theme-color);font-family:'Cinzel',serif;margin-bottom:10px;text-align:center;">Tabelas de Potência e Mutação</h3>
        <p style="color:#aaa;font-size:.85rem;text-align:center;margin-bottom:15px;">Selecione os Nodos Iniciais (Tabelas) para visualizar as opções e ramificar suas Habilidades.</p>
        <div class="tree-ui-container envolto-skilltree-window" style="height:860px;overflow:auto;border:1px solid #333;position:relative;background:rgba(0,0,0,.6);">
            <div id="tree-scroll-wrapper" style="position:relative;height:100%;min-width:100%;">
                <svg class="tree-svg" id="tree-svg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></svg>
                <div class="tree-nodes" id="tree-nodes" style="position:absolute;top:0;left:0;width:100%;height:100%;"></div>
            </div>
        </div>
        <div id="tree-node-info" class="desc-box envolto-table-info" style="margin-top:15px;min-height:150px;text-align:left;">Selecione uma Tabela (Nodo Raiz) para iniciar.</div>
        <input type="hidden" id="tree-unlocked-data" value="">
        <input type="hidden" id="ef-table-layout-data" value="{}">
    `;
    setTimeout(() => renderTree(nature), 50);
}
function renderTree(nature) {
    const nodesContainer = document.getElementById('tree-nodes');
    const svgContainer = document.getElementById('tree-svg');
    const scrollWrapper = document.getElementById('tree-scroll-wrapper');
    if(!nodesContainer || !svgContainer || !scrollWrapper) return;
    
    nodesContainer.innerHTML = '';
    svgContainer.innerHTML = '';
    
    const trees = advancedTreeData[nature];
    if(!trees) return;
    
    if(editingIndex !== null && characters[editingIndex] && characters[editingIndex].specificData && characters[editingIndex].specificData['tree-unlocked-data']) {
        try { currentUnlockedNodes = JSON.parse(characters[editingIndex].specificData['tree-unlocked-data']); } catch(e){}
    } else {
        const savedDataEl = document.getElementById('spec-tree-unlocks');
        if(savedDataEl && savedDataEl.value) {
            try { currentUnlockedNodes = JSON.parse(savedDataEl.value); } catch(e){}
        } else if (!currentUnlockedNodes.length) {
            currentUnlockedNodes = [];
        }
    }
    document.getElementById('tree-unlocked-data').value = JSON.stringify(currentUnlockedNodes);
    
        if(nature === 'O Envolto (Horror Cósmico)') {
        renderEnvoltoTree(trees, nature, nodesContainer, svgContainer, scrollWrapper);
        return;
    }

    const countTrees = trees.length;
    // Calculate the width needed so trees don't overlap. Min 100%, but 15vw per tree.
    const requiredWidth = Math.max(100, countTrees * 15); 
    scrollWrapper.style.minWidth = requiredWidth + "%";

    const spacingX = 100 / (countTrees + 1);

    trees.forEach((tree, idx) => {
        const rootX = spacingX * (idx + 1);
        const rootY = 15;
        
        drawNode('root_'+tree.treeId, 'TBL', tree.name.substring(0,8)+'...', rootX, rootY, true, () => handleRootClick(tree, nature), nodesContainer);
        
        let prevX = rootX;
        let prevY = rootY;
        
        const maxTiers = Object.keys(tree.tiers).length;
        
        for(let lvl = 1; lvl <= maxTiers; lvl++) {
            if(!tree.tiers[lvl]) break;
            
            let unlocked = tree.tiers[lvl].find(o => currentUnlockedNodes.includes(o.id));
            if(unlocked) {
                let currentX = rootX;
                let currentY = rootY + (lvl * 20); // space them vertically
                
                // Add slight diagonal aesthetic for deeper tiers
                if (lvl % 2 === 0) {
                    currentX = rootX + (idx % 2 === 0 ? 2 : -2); 
                } else if (lvl > 1) {
                    currentX = rootX + (idx % 2 === 0 ? -2 : 2);
                }
                
                drawLine(prevX, prevY, currentX, currentY, svgContainer, true);
                drawNode(unlocked.id, 'T'+lvl, unlocked.name.substring(0,10)+'...', currentX, currentY, true, () => handleNodeLevelClick(tree, lvl, unlocked, nature), nodesContainer);
                
                prevX = currentX;
                prevY = currentY;
            } else {
                break;
            }
        }
    });
}





/* =====================================================================
   ESPAÇO FINAL — PROPRIETÁRIO CANÔNICO DE NAVEGAÇÃO E POSICIONAMENTO
   Cada nodo do Envolto pode ser movido individualmente. O viewport do
   Espaço Final controla o pan; a árvore controla apenas os próprios nodos.
   ===================================================================== */
const EF_TABLE_LAYOUT_KEY = 'ef-table-layout-data';
const EF_LAYOUT_VERSION = 32;
let envoltoNodeDragState = null;

function efReadTableLayout() {
    const input = document.getElementById(EF_TABLE_LAYOUT_KEY);
    let raw = input && input.value ? input.value : '';
    if (!raw && editingIndex !== null && characters[editingIndex]?.specificData?.[EF_TABLE_LAYOUT_KEY]) {
        raw = characters[editingIndex].specificData[EF_TABLE_LAYOUT_KEY];
    }
    try {
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
}

function efWriteTableLayout(layout) {
    const input = document.getElementById(EF_TABLE_LAYOUT_KEY);
    if (input) input.value = JSON.stringify(layout);
}

function efDefaultTablePosition(index, count, W, H) {
    const cx = W / 2, cy = H / 2;
    const radius = Math.min(W, H) * 0.3625;
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / Math.max(1, count));
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function efClampNodePosition(pos, W, H, margin = 64) {
    return {
        x: Math.max(margin, Math.min(W - margin, Number(pos?.x) || W / 2)),
        y: Math.max(margin, Math.min(H - margin, Number(pos?.y) || H / 2))
    };
}

function efGetNodePosition(layout, treeId, key, fallback) {
    const branch = layout?.[treeId];
    if (!branch) return fallback;
    if (key === 'root' && Number.isFinite(Number(branch.x)) && Number.isFinite(Number(branch.y))) {
        return {x:Number(branch.x), y:Number(branch.y)};
    }
    const p = branch.nodes?.[key];
    if (p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) return {x:Number(p.x), y:Number(p.y)};
    return fallback;
}

function efStoreNodePosition(treeId, key, pos) {
    const layout = efReadTableLayout();
    layout[treeId] = layout[treeId] || {};
    if (key === 'root') {
        layout[treeId].x = pos.x;
        layout[treeId].y = pos.y;
    } else {
        layout[treeId].nodes = layout[treeId].nodes || {};
        layout[treeId].nodes[key] = {x:pos.x, y:pos.y};
    }
    efWriteTableLayout(layout);
}

function efNodePositionFromStyle(node) {
    return {x:Number.parseFloat(node?.style.left || '0'), y:Number.parseFloat(node?.style.top || '0')};
}

function efAttachNodeDrag(node, tree, nature, nodeKey, W, H) {
    if (!node) return;
    node.classList.add('ef-node-draggable');
    node.dataset.efNodeKey = nodeKey;
    node.setAttribute('title', nodeKey === 'root' ? `Arraste para mover ${tree.name}` : 'Arraste este nodo livremente');

    node.addEventListener('pointerdown', function (ev) {
        if (!isEditMode || ev.button !== 0) return;
        const layout = efReadTableLayout();
        const current = efGetNodePosition(layout, tree.treeId, nodeKey, efNodePositionFromStyle(node));
        envoltoNodeDragState = {
            treeId: tree.treeId,
            nature,
            nodeKey,
            W,
            H,
            start: {x: ev.clientX, y: ev.clientY},
            startPos: current,
            moved: false,
            pointerId: ev.pointerId
        };
        node.classList.add('ef-node-dragging');
        node.dataset.efPointerDragging = '1';
        try { node.setPointerCapture(ev.pointerId); } catch (_) {}
        ev.preventDefault();
        ev.stopPropagation();
    }, {passive:false});
}

function efGetNodeForKey(treeId, nodeKey) {
    const selector = nodeKey === 'root'
        ? `#node_root_${CSS.escape(treeId)}`
        : `.ef-node[data-tree-id="${CSS.escape(treeId)}"][data-node-key="${CSS.escape(nodeKey)}"]`;
    return document.querySelector(selector);
}

function efPathBetween(a, b, theme, idx, active=true, svg=null) {
    if (!a || !b || !svg) return;
    const ns='http://www.w3.org/2000/svg';
    const dx=b.x-a.x, dy=b.y-a.y;
    const len=Math.max(1,Math.hypot(dx,dy)), nx=-dy/len, ny=dx/len;
    const wiggle=18+(idx%3)*5;
    const sign=(idx%2?1:-1);
    const p1={x:a.x+dx*.28+nx*wiggle*sign,y:a.y+dy*.28+ny*wiggle*sign};
    const p2={x:a.x+dx*.58-nx*wiggle*.7*sign,y:a.y+dy*.58-ny*wiggle*.7*sign};
    const d=`M ${a.x} ${a.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${b.x} ${b.y}`;
    const under=document.createElementNS(ns,'path'); under.setAttribute('d',d); under.classList.add('ef-path-ink'); svg.appendChild(under);
    const main=document.createElementNS(ns,'path'); main.setAttribute('d',d); main.classList.add('ef-path'); main.style.setProperty('--ef-branch',theme.color); if(active) main.classList.add('active'); svg.appendChild(main);
}

function efRedrawTreeLinks() {
    const svg=document.getElementById('tree-svg');
    if(!svg || !document.getElementById('ef-space-final')) return;
    const W=1600,H=1180,cx=W/2,cy=H/2;
    const trees=advancedTreeData?.['O Envolto (Horror Cósmico)'] || [];
    const themes=[
      {color:'#8f32c8'},{color:'#214f9b'},{color:'#cf1730'},{color:'#b7d629'},{color:'#d0b45b'},
      {color:'#8d2daf'},{color:'#d18b24'},{color:'#267b73'},{color:'#b92f64'},{color:'#5575bf'},
      {color:'#8f923a'},{color:'#d61c25'},{color:'#5d3a8b'}
    ];
    svg.innerHTML='';
    trees.forEach((tree,idx)=>{
        const theme=themes[idx%themes.length];
        const get=key=>{
            const n=efGetNodeForKey(tree.treeId,key);
            return n ? efNodePositionFromStyle(n) : null;
        };
        let prev=get('root');
        if(!prev) return;
        for(let lvl=1;lvl<=3;lvl++){
            const p=get(`tier-${lvl}`);
            if(!p) break;
            const active=!!efGetNodeForKey(tree.treeId,`tier-${lvl}`)?.classList.contains('awakened');
            efPathBetween(prev,p,theme,idx,active,svg);
            prev=p;
        }
        const completion=get('completion');
        if(completion){
            const lastUnlocked = [...document.querySelectorAll(`.ef-node[data-tree-id="${CSS.escape(tree.treeId)}"]`)].some(n=>n.dataset.nodeKey?.startsWith('tier-') && n.classList.contains('awakened'));
            efPathBetween(prev,completion,theme,idx,lastUnlocked,svg);
            if(lastUnlocked) efPathBetween(completion,{x:cx,y:cy},theme,idx,true,svg);
        }
    });
}

if (!window.__efFreeNodeDragBound) {
    window.__efFreeNodeDragBound = true;
    document.addEventListener('pointermove', function(ev) {
        const state=envoltoNodeDragState;
        if(!state) return;
        const zoom=Math.max(0.25, Number(efTreeZoom)||1);
        const dx=(ev.clientX-state.start.x)/zoom;
        const dy=(ev.clientY-state.start.y)/zoom;
        if(Math.hypot(dx,dy)<=4 && !state.moved) return;
        state.moved=true;
        const next=efClampNodePosition({x:state.startPos.x+dx,y:state.startPos.y+dy},state.W,state.H,48);
        const node=efGetNodeForKey(state.treeId,state.nodeKey);
        if(node){node.style.left=next.x+'px';node.style.top=next.y+'px';}
        efStoreNodePosition(state.treeId,state.nodeKey,next);
        efRedrawTreeLinks();
        ev.preventDefault();
    }, {passive:false});

    document.addEventListener('pointerup', function(ev) {
        const state=envoltoNodeDragState;
        if(!state) return;
        const moved=state.moved;
        const node=efGetNodeForKey(state.treeId,state.nodeKey);
        envoltoNodeDragState=null;
        if(node){
            node.classList.remove('ef-node-dragging');
            if(moved){
                node.dataset.efDragged='1';
                setTimeout(()=>delete node.dataset.efDragged,120);
            }
        }
        if(moved){ev.preventDefault();ev.stopPropagation();}
    }, true);

    document.addEventListener('click', function(ev) {
        const node=ev.target.closest && ev.target.closest('#ef-space-final .ef-node-draggable');
        if(node && node.dataset.efDragged==='1'){ev.preventDefault();ev.stopImmediatePropagation();}
    }, true);
}

function efResetTablePositions(nature) {
    if (!isEditMode) return;
    efWriteTableLayout({});
    renderTree(nature);
}

let efTreeZoom = null;
let efTreeZoomManual = false;
/* Removed duplicate declaration of a consolidated function: efApplyTreeZoom */
/* Removed duplicate declaration of a consolidated function: efFitTreeViewport */
/* Removed duplicate declaration of a consolidated function: efBindTreeViewControls */

function renderEnvoltoTree(trees, nature, nodesContainer, svgContainer, scrollWrapper) {
    // Área interna do Espaço Final: 1024×768. A arte da árvore mantém a
    // proporção do projeto-base 800×700 e é ampliada uniformemente para
    // ocupar o novo espaço sem esticar horizontal ou verticalmente.
    const W = 1600, H = 1180, cx = W / 2, cy = H / 2;
    const BASE_W = 800, BASE_H = 700;
    const designScale = 1;
    const count = Math.max(1, trees.length);
    const tierRadii = [235, 190, 150].map(r => r * designScale);
    const completionRadius = 82 * designScale;

    const savedLayoutRaw = efReadTableLayout();
    const layoutVersionEl = document.getElementById('ef-tree-layout-version');
    const layoutVersion = Number(layoutVersionEl?.value || 0);
    const savedLayout = {};
    Object.entries(savedLayoutRaw || {}).forEach(([id, p]) => {
        if (!p || typeof p !== 'object') return;
        const px = Number(p.x);
        const py = Number(p.y);
        const convert = (x, y) => {
            if (layoutVersion >= 31) return {x:Number(x), y:Number(y)};
            if (layoutVersion >= 30) return {
                x: cx + (Number(x) - 1024 / 2) * (W / 1024),
                y: cy + (Number(y) - 768 / 2) * (H / 768)
            };
            return {
                x: cx + (Number(x) - BASE_W / 2) * (W / BASE_W),
                y: cy + (Number(y) - BASE_H / 2) * (H / BASE_H)
            };
        };
        if (Number.isFinite(px) && Number.isFinite(py)) {
            savedLayout[id] = {...convert(px, py)};
        }
        if (p.nodes && typeof p.nodes === 'object') {
            savedLayout[id] = savedLayout[id] || {};
            savedLayout[id].nodes = {};
            Object.entries(p.nodes).forEach(([key, np]) => {
                if (!np || typeof np !== 'object') return;
                const nx=Number(np.x), ny=Number(np.y);
                if (Number.isFinite(nx) && Number.isFinite(ny)) savedLayout[id].nodes[key]=convert(nx,ny);
            });
        }
    });
    if (layoutVersion < 31 && Object.keys(savedLayout).length) efWriteTableLayout(savedLayout);
    if (layoutVersionEl) layoutVersionEl.value = String(EF_LAYOUT_VERSION);
    const glyphs = ['☉','◈','⟡','◌','⟁','⌁','∆','◇','✦','✧','✥','✺','✣'];
    const completion = ['✦','✧','◇','◆','◈','✥','✣','✤','✺','✹','✷','✶','✵'];
    const themes = [
      {name:'Warp de Carne', color:'#8f32c8', ink:'#050006', bg:'#d0a4ed', shape:'flesh'},
      {name:'Sussurro do Vazio', color:'#214f9b', ink:'#02050d', bg:'#9db4df', shape:'void'},
      {name:'Linhas de Sangue', color:'#cf1730', ink:'#070102', bg:'#eda0aa', shape:'blood'},
      {name:'Miasma Ácido', color:'#b7d629', ink:'#071000', bg:'#e5ef9b', shape:'acid'},
      {name:'Ossatura Invertida', color:'#d0b45b', ink:'#110d02', bg:'#efe2ae', shape:'bone'},
      {name:'Nervo Abissal', color:'#8d2daf', ink:'#050005', bg:'#d2a0e3', shape:'nerve'},
      {name:'Fenda de Âmbar', color:'#d18b24', ink:'#100700', bg:'#f0cf93', shape:'amber'},
      {name:'Pupila Morta', color:'#267b73', ink:'#00100e', bg:'#a7dbd7', shape:'eye'},
      {name:'Geometria Doente', color:'#b92f64', ink:'#090106', bg:'#e6a8bf', shape:'geo'},
      {name:'Costura Parasita', color:'#5575bf', ink:'#02050e', bg:'#b8c7ed', shape:'suture'},
      {name:'Eco Calcificado', color:'#8f923a', ink:'#101000', bg:'#d7d999', shape:'calc'},
      {name:'Fome Carmesim', color:'#d61c25', ink:'#0c0101', bg:'#ef9ca1', shape:'hunger'},
      {name:'Raiz do Nada', color:'#5d3a8b', ink:'#040109', bg:'#c0acd9', shape:'root'}
    ];

    scrollWrapper.style.width = W + 'px';
    scrollWrapper.style.height = H + 'px';
    scrollWrapper.style.minWidth = W + 'px';
    scrollWrapper.style.minHeight = H + 'px';
    scrollWrapper.style.zoom = '1';
    svgContainer.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgContainer.setAttribute('width', W); svgContainer.setAttribute('height', H);
    nodesContainer.style.width = W + 'px'; nodesContainer.style.height = H + 'px';
    svgContainer.innerHTML=''; nodesContainer.innerHTML='';

    const core=document.createElement('button');
    core.type='button';
    core.className='ef-core';
    core.style.left=cx+'px'; core.style.top=cy+'px';
    core.innerHTML='<span class="ef-core-glyph">∅</span><strong>ENVOLTO</strong><small>ESPAÇO FINAL</small>';
    nodesContainer.appendChild(core);

    let awakened=0;
    const safeOption=(tree,lvl)=>tree.tiers[lvl]?.find(o=>currentUnlockedNodes.includes(o.id)) || null;
    const pos=(angle,r)=>({x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r});

    const addOrganicPath=(a,b,theme,idx,lvl,active=true)=>{
        const ns='http://www.w3.org/2000/svg';
        const dx=b.x-a.x, dy=b.y-a.y, len=Math.max(1,Math.hypot(dx,dy)), nx=-dy/len, ny=dx/len;
        const wiggle=18+(idx%3)*5+(lvl*2); const sign=((idx+lvl)%2?1:-1);
        const p1={x:a.x+dx*.28+nx*wiggle*sign,y:a.y+dy*.28+ny*wiggle*sign};
        const p2={x:a.x+dx*.58-nx*wiggle*.7*sign,y:a.y+dy*.58-ny*wiggle*.7*sign};
        const d=`M ${a.x} ${a.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${b.x} ${b.y}`;
        const under=document.createElementNS(ns,'path'); under.setAttribute('d',d); under.classList.add('ef-path-ink'); svgContainer.appendChild(under);
        const main=document.createElementNS(ns,'path'); main.setAttribute('d',d); main.classList.add('ef-path'); main.style.setProperty('--ef-branch',theme.color); if(active)main.classList.add('active'); svgContainer.appendChild(main);
        if(lvl>=2){
          const bx=a.x+dx*.43+nx*sign*wiggle*.6, by=a.y+dy*.43+ny*sign*wiggle*.6;
          const twig=document.createElementNS(ns,'path');
          twig.setAttribute('d',`M ${bx} ${by} q ${nx*sign*22} ${ny*sign*22} ${nx*sign*42} ${ny*sign*4}`);
          twig.classList.add('ef-twig'); twig.style.setProperty('--ef-branch',theme.color); svgContainer.appendChild(twig);
        }
    };

    trees.forEach((tree,idx)=>{
      const theme=themes[idx%themes.length];
      const defaultRoot=efDefaultTablePosition(idx,count,W,H);
      const rootPos=efClampNodePosition(efGetNodePosition(savedLayout,tree.treeId,'root',defaultRoot),W,H,88);
      const base=Math.atan2(rootPos.y-cy,rootPos.x-cx);
      const branch=`ef-branch-${idx}`;
      const root=document.createElement('button'); root.type='button';
      root.className=`ef-node ef-root ef-shape-${theme.shape}`;
      root.style.left=rootPos.x+'px'; root.style.top=rootPos.y+'px';
      root.style.setProperty('--ef-branch',theme.color); root.style.setProperty('--ef-ink',theme.ink); root.style.setProperty('--ef-paper',theme.bg);
      root.dataset.branch=branch; root.dataset.tier='0'; root.dataset.treeId=tree.treeId; root.dataset.nodeKey='root'; root.id='node_root_'+tree.treeId;
      root.innerHTML=`<span class="ef-icon">${glyphs[idx%glyphs.length]}</span><small>ÁRVORE ${idx+1}</small><strong>${tree.name.replace(/^ÁRVORE\s+\d+:\s*/i,'')}</strong><em class="ef-drag-mark" aria-hidden="true">✣</em>`;
      root.onclick=(ev)=>{ if(root.dataset.efDragged==='1') return; handleRootClick(tree,nature); };
      nodesContainer.appendChild(root);
      efAttachNodeDrag(root,tree,nature,'root',W,H);

      let prev=rootPos;
      let lastUnlocked=null;
      for(let lvl=1;lvl<=3;lvl++){
        const tier=tree.tiers[lvl]||[];
        const selected=safeOption(tree,lvl);
        const radius=tierRadii[lvl-1];
        const angle=base + (lvl===1?-0.05:(lvl===2?0.05:0));
        const defaultNodePos=pos(angle,radius);
        const p=efClampNodePosition(efGetNodePosition(savedLayout,tree.treeId,`tier-${lvl}`,defaultNodePos),W,H,48);
        const node=document.createElement('button'); node.type='button';
        node.className=`ef-node ef-tier ef-tier-${lvl} ef-shape-${theme.shape}`;
        node.style.left=p.x+'px'; node.style.top=p.y+'px';
        node.style.setProperty('--ef-branch',theme.color); node.style.setProperty('--ef-ink',theme.ink); node.style.setProperty('--ef-paper',theme.bg);
        node.dataset.branch=branch; node.dataset.tier=String(lvl); node.dataset.treeId=tree.treeId; node.dataset.nodeKey=`tier-${lvl}`;
        if(selected){
          awakened++; lastUnlocked=selected;
          node.classList.add('awakened'); node.innerHTML=`<span class="ef-icon">${glyphs[(idx+lvl)%glyphs.length]}</span><small>TIER ${lvl} · CAP ${selected.cap}</small><strong>${selected.name}</strong><i class="ef-tentacle ef-t1"></i><i class="ef-tentacle ef-t2"></i>`;
          node.onclick=()=>handleNodeLevelClick(tree,lvl,selected,nature);
        } else {
          node.classList.add('dormant');
          node.innerHTML=`<span class="ef-icon">?</span><small>TIER ${lvl}</small><strong>${tier.length?'BLOQUEADO':'VAZIO'}</strong>`;
          node.onclick=()=>handleRootClick(tree,nature);
        }
        nodesContainer.appendChild(node);
        efAttachNodeDrag(node,tree,nature,`tier-${lvl}`,W,H);
        addOrganicPath(prev,p,theme,idx,lvl,!!selected);
        prev=p;
      }

      const defaultCompletion=pos(base,completionRadius);
      const cp=efClampNodePosition(efGetNodePosition(savedLayout,tree.treeId,'completion',defaultCompletion),W,H,48);
      const finish=document.createElement('button'); finish.type='button';
      finish.className=`ef-node ef-completion ef-shape-${theme.shape}`;
      finish.style.left=cp.x+'px'; finish.style.top=cp.y+'px';
      finish.style.setProperty('--ef-branch',theme.color); finish.style.setProperty('--ef-ink',theme.ink); finish.innerHTML=`<span>${completion[idx%completion.length]}</span><small>CONCLUSÃO</small>`;
      finish.dataset.treeId=tree.treeId; finish.dataset.nodeKey='completion'; finish.dataset.tier='4';
      finish.onclick=(ev)=>{ if(finish.dataset.efDragged==='1') return; handleRootClick(tree,nature); }; nodesContainer.appendChild(finish);
      efAttachNodeDrag(finish,tree,nature,'completion',W,H);
      if(lastUnlocked){ addOrganicPath(prev,cp,theme,idx,4,true); addOrganicPath(cp,{x:cx,y:cy},theme,idx,5,true); }
    });

    const prog=document.getElementById('ef-progress-value'); if(prog)prog.textContent=`${awakened} / ${trees.length*3}`;
    efBindTreeViewControls();
    const frame = document.querySelector('#ef-space-final .ef-tree-frame');
    if (frame && !efTreeZoomManual) efFitTreeViewport(scrollWrapper, frame);
    else if (frame) efApplyTreeZoom(scrollWrapper, frame, efTreeZoom || 1);
}

function drawNode(id, badge, label, x, y, active, onClick, container) {
    const div = document.createElement('div');
    div.className = 'tree-node';
    if(active) div.classList.add('unlocked');
    div.style.left = x + '%';
    div.style.top = y + '%';
    div.id = 'node_' + id;
    div.innerHTML = `<span>${badge}</span><div class="tree-node-label">${label}</div>`;
    div.onclick = onClick;
    container.appendChild(div);
}

function drawLine(x1, y1, x2, y2, container, active) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1 + '%');
    line.setAttribute('y1', y1 + '%');
    line.setAttribute('x2', x2 + '%');
    line.setAttribute('y2', y2 + '%');
    line.setAttribute('class', 'tree-line');
    if(active) line.classList.add('unlocked');
    container.appendChild(line);
}

function handleRootClick(tree, nature) {
    const infoBox = document.getElementById('tree-node-info');
    let html = `<strong style="font-size:1.1rem; color:var(--theme-color);">${tree.name}</strong><br><p style="margin-top:5px; font-size:0.85rem; color:#bbb;">${tree.desc}</p>`;
    
    let t1Selected = tree.tiers[1] ? tree.tiers[1].find(o => currentUnlockedNodes.includes(o.id)) : null;
    
    if(tree.tiers[1]) {
        html += `<h4 style="margin-top:15px; color:#fff; border-bottom:1px solid #444; padding-bottom:5px;">Habilidades Disponíveis - Nível 1:</h4>`;
        html += `<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:flex-start; margin-top:10px;">`;
        
        tree.tiers[1].forEach(opt => {
            const isSel = currentUnlockedNodes.includes(opt.id);
            const borderStyle = isSel ? 'border-color:#a8ff00; background:rgba(168,255,0,0.1); box-shadow:inset 0 0 10px #a8ff00;' : 'border-color:#555; background:rgba(0,0,0,0.5);';
            
            let costLabel = opt.cost ? `<span style="color:#ff3333; font-weight:bold;">Custo: ${opt.cost} EE</span>` : '';

            if(isEditMode) {
                html += `<div class="choice-card" style="padding:15px; width:48%; text-align:left; align-items:flex-start; cursor:pointer; transition:all 0.3s; ${borderStyle}" onclick="selectTreeNode('${opt.id}', 1, '${tree.treeId}', '${nature}')">
                            <h4 style="color:${isSel?'#a8ff00':'var(--theme-color)'}; font-size:1rem; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">[Cap ${opt.cap}] ${opt.name}</h4>
                            <p style="font-size:0.8rem; color:#ccc; line-height:1.4;"><strong>Efeito:</strong> ${opt.effect}</p>
                            <p style="font-size:0.75rem; color:#aaa; margin-top:8px;"><em>Ex: ${opt.example}</em></p>
                            <p style="font-size:0.8rem; margin-top:8px;">${costLabel}</p>
                         </div>`;
            } else if (isSel) {
                 html += `<div class="choice-card active" style="padding:15px; width:100%; text-align:left; align-items:flex-start;">
                            <h4 style="color:#a8ff00; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">[Cap ${opt.cap}] ${opt.name}</h4>
                            <p style="font-size:0.8rem;">${opt.effect}</p>
                            <p style="font-size:0.75rem; margin-top:8px;"><em>Ex: ${opt.example}</em></p>
                          </div>`;
            }
        });
        html += `</div>`;
    }
    
    if(t1Selected && isEditMode) {
         html += `<button type="button" class="souls-btn small-btn" style="margin-top:20px; border-color:red; color:red; width:100%;" onclick="relockTree('${tree.treeId}', 1, '${nature}')">Revogar Toda a Ramificação</button>`;
    }
    infoBox.innerHTML = html;
}

function handleNodeLevelClick(tree, level, selectedOpt, nature) {
    const infoBox = document.getElementById('tree-node-info');
    
    let costLabel = selectedOpt.cost ? `<span style="color:#ff3333; font-weight:bold;">Custo: ${selectedOpt.cost} EE</span>` : '';
    
    let html = `<strong style="font-size:1.1rem; color:#a8ff00;">NODO ATUAL: [Cap ${selectedOpt.cap}] ${selectedOpt.name}</strong>`;
    html += `<p style="font-size:0.85rem; color:#ccc; margin-top:8px;"><strong>Efeito:</strong> ${selectedOpt.effect}</p>`;
    html += `<p style="font-size:0.8rem; color:#aaa; margin-top:5px;"><em>Ex: ${selectedOpt.example}</em></p>`;
    if(costLabel) html += `<p style="font-size:0.85rem; margin-top:5px;">${costLabel}</p>`;
    
    const nextLevel = level + 1;
    if(tree.tiers[nextLevel]) {
        html += `<h4 style="margin-top:20px; color:#fff; border-bottom:1px solid #444; padding-bottom:5px;">Habilidades Desbloqueadas - Nível ${nextLevel}:</h4>`;
        html += `<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:flex-start; margin-top:10px;">`;
        
        tree.tiers[nextLevel].forEach(opt => {
            const isSel = currentUnlockedNodes.includes(opt.id);
            const borderStyle = isSel ? 'border-color:#a8ff00; background:rgba(168,255,0,0.1); box-shadow:inset 0 0 10px #a8ff00;' : 'border-color:#555; background:rgba(0,0,0,0.5);';
            
            let nCostLabel = opt.cost ? `<span style="color:#ff3333; font-weight:bold;">Custo: ${opt.cost} EE</span>` : '';

            if(isEditMode) {
                html += `<div class="choice-card" style="padding:15px; width:48%; text-align:left; align-items:flex-start; cursor:pointer; transition:all 0.3s; ${borderStyle}" onclick="selectTreeNode('${opt.id}', ${nextLevel}, '${tree.treeId}', '${nature}')">
                            <h4 style="color:${isSel?'#a8ff00':'var(--theme-color)'}; font-size:0.9rem; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">[Cap ${opt.cap}] ${opt.name}</h4>
                            <p style="font-size:0.75rem; color:#ccc; line-height:1.4;"><strong>Efeito:</strong> ${opt.effect}</p>
                            <p style="font-size:0.7rem; color:#aaa; margin-top:8px;"><em>Ex: ${opt.example}</em></p>
                            <p style="font-size:0.75rem; margin-top:8px;">${nCostLabel}</p>
                         </div>`;
            } else if (isSel) {
                 html += `<div class="choice-card active" style="padding:15px; width:100%; text-align:left; align-items:flex-start;">
                            <h4 style="color:#a8ff00; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); width:100%;">[Cap ${opt.cap}] ${opt.name}</h4>
                            <p style="font-size:0.8rem;">${opt.effect}</p>
                            <p style="font-size:0.75rem; margin-top:8px;"><em>Ex: ${opt.example}</em></p>
                          </div>`;
            }
        });
        html += `</div>`;
    } else {
        html += `<h4 style="margin-top:20px; color:#d4af37;">[ ÁPICE ALCANÇADO ]</h4>`;
    }
    
    if(isEditMode) {
         html += `<button type="button" class="souls-btn small-btn" style="margin-top:20px; border-color:red; color:red; width:100%;" onclick="relockTree('${tree.treeId}', ${level}, '${nature}')">Revogar Deste Ponto em Diante</button>`;
    }
    infoBox.innerHTML = html;
}

function selectTreeNode(optId, level, treeId, nature) {
    if(!isEditMode) return;
    const trees = advancedTreeData[nature];
    const tree = trees.find(t => t.treeId === treeId);
    
    // Remove existing selection at this level and subsequent levels for this tree
    for(let l = level; l <= Object.keys(tree.tiers).length; l++) {
        if(tree.tiers[l]) {
            tree.tiers[l].forEach(o => {
                currentUnlockedNodes = currentUnlockedNodes.filter(id => id !== o.id);
            });
        }
    }
    currentUnlockedNodes.push(optId);
    document.getElementById('tree-unlocked-data').value = JSON.stringify(currentUnlockedNodes);
    renderTree(nature);
    
    // Refresh view: if level 1, click root. If >1, click previous level node to see selections.
    if(level === 1) {
        handleRootClick(tree, nature);
    } else {
        const prevOpt = tree.tiers[level-1].find(o => currentUnlockedNodes.includes(o.id));
        if(prevOpt) handleNodeLevelClick(tree, level-1, prevOpt, nature);
    }
}

function relockTree(treeId, level, nature) {
    if(!isEditMode) return;
    const trees = advancedTreeData[nature];
    const tree = trees.find(t => t.treeId === treeId);
    
    for(let l = level; l <= Object.keys(tree.tiers).length; l++) {
        if(tree.tiers[l]) {
            tree.tiers[l].forEach(o => {
                currentUnlockedNodes = currentUnlockedNodes.filter(id => id !== o.id);
            });
        }
    }
    document.getElementById('tree-unlocked-data').value = JSON.stringify(currentUnlockedNodes);
    renderTree(nature);
    
    if(level === 1) {
        handleRootClick(tree, nature);
    } else {
        const prevOpt = tree.tiers[level-1].find(o => currentUnlockedNodes.includes(o.id));
        if(prevOpt) handleNodeLevelClick(tree, level-1, prevOpt, nature);
    }
}


/* =====================================================================
   COMPATIBILITY CACHE — state efêmero por conta + mesa; Supabase é a fonte de verdade
   ===================================================================== */

const MS_REPO_KEY = 'mundosSombriosCharacterReposV3';
const MS_TABLE_MIGRATION_KEY = 'mundosSombriosTableMigrationV3';
const MS_CHAR_MIGRATION_KEY = 'mundosSombriosCharMigrationV3';
const msInMemoryStore = {};

function msClone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function msReadJSON(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(msInMemoryStore, key)) return msClone(msInMemoryStore[key]);
    if (window.MS_DB?.offline) {
        try { const raw=localStorage.getItem(`${window.MS_DB.namespace||'ms-offline'}:cache:${key}`); if(raw!==null){const parsed=JSON.parse(raw);msInMemoryStore[key]=parsed;return msClone(parsed);} } catch (_) {}
    }
    return msClone(fallback);
}

function msWriteJSON(key, value) {
    msInMemoryStore[key] = msClone(value);
    if (window.MS_DB?.offline) { try { localStorage.setItem(`${window.MS_DB.namespace||'ms-offline'}:cache:${key}`, JSON.stringify(value)); } catch (_) {} }
    return true;
}

function msEnsureRepoStore() {
    const store = msReadJSON(MS_REPO_KEY, {});
    return (store && typeof store === 'object') ? store : {};
}

function msEnsureUserRepo(userId) {
    const store = msEnsureRepoStore();
    if (!store[userId]) {
        store[userId] = {
            characters: [],
            joinedTables: [],
            ownedTables: []
        };
        msWriteJSON(MS_REPO_KEY, store);
    }
    return store[userId];
}


function msGetAllRepoCharacters(store = msEnsureRepoStore()) {
    return Object.values(store).flatMap(repo => Array.isArray(repo.characters) ? repo.characters : []);
}

function msGetAllRepoJoinedTables(store = msEnsureRepoStore()) {
    return Object.values(store).flatMap(repo => Array.isArray(repo.joinedTables) ? repo.joinedTables : []);
}


function msNormalizeTable(table) {
    if (!table) return null;
    if (!Array.isArray(table.participants)) table.participants = []; // legado; não é fonte de associação na V2.7
    if (!Array.isArray(table.banned)) table.banned = [];
    table.status = table.status || 'active';
    table.activeMembers = Number(table.activeMembers ?? table.active_members ?? 0);
    table.myMemberRole = table.myMemberRole ?? table.my_member_role ?? null;
    table.myCharacterId = table.myCharacterId ?? table.my_character_id ?? null;
    table.isOwner = table.isOwner === true || table.is_owner === true || (currentUser && String(table.ownerId||table.owner_id||'')===String(currentUser.id));
    return table;
}

function msRefreshLegacyCharacterUnion() {
    const store = msEnsureRepoStore();
    allCharactersDB = msGetAllRepoCharacters(store).map(msClone);
    msWriteJSON('mundosSombriosChars', allCharactersDB);
}

function msRefreshLegacyJoinedUnion(userId) {
    const repo = msEnsureUserRepo(userId);
    allJoinedTablesDB = (repo.joinedTables || []).map(t => msClone(t));
    msWriteJSON('mundosSombriosJoined', allJoinedTablesDB);
}

function msSeedRepoStoreFromLegacyCharacters() {
    if (msReadJSON(MS_CHAR_MIGRATION_KEY, null)) return;
    const store = msEnsureRepoStore();
    let changed = false;

    if (Object.keys(store).length === 0 && Array.isArray(allCharactersDB) && allCharactersDB.length) {
        allCharactersDB.forEach(char => {
            const ownerId = char.ownerId || (currentUser && currentUser.id) || 'u3';
            if (!store[ownerId]) store[ownerId] = { characters: [], joinedTables: [], ownedTables: [] };
            store[ownerId].characters.push(msClone(char));
            changed = true;
        });
    }

    if (changed) msWriteJSON(MS_REPO_KEY, store);
    msWriteJSON(MS_CHAR_MIGRATION_KEY, '1');
}

function msSeedTablesFromLegacy() {
    if (msReadJSON(MS_TABLE_MIGRATION_KEY, null)) return;
    if (!Array.isArray(allTablesDB)) allTablesDB = [];
    // V2.7: participants permanece apenas para leitura de backups antigos.
    // Associação e autoridade são resolvidas exclusivamente por table_members/fetch_my_table_summaries.
    allTablesDB = allTablesDB.map(t => msNormalizeTable(msClone(t)));
    msWriteJSON('mundosSombriosTables', allTablesDB);
    msWriteJSON(MS_TABLE_MIGRATION_KEY, '1');
}

function msSyncCurrentUserView() {
    if (!currentUser) return;
    const store = msEnsureRepoStore();
    const repo = msEnsureUserRepo(currentUser.id);
    characters = msClone(repo.characters || []);
    myTables = (allTablesDB || []).filter(t => t.status!=='archived' && (t.isOwner || String(t.ownerId) === String(currentUser.id))).map(msClone);
    joinedTables = (allTablesDB || []).filter(t => t.status!=='archived' && !t.isOwner && String(t.ownerId) !== String(currentUser.id) && !!t.myMemberRole).map(msClone);
    allCharactersDB = msGetAllRepoCharacters(store).map(msClone);
    allJoinedTablesDB = msGetAllRepoJoinedTables(store).map(msClone);
    msWriteJSON('mundosSombriosChars', allCharactersDB);
    msWriteJSON('mundosSombriosJoined', allJoinedTablesDB);
}


function msGetTableByCodeOrId(idOrCode) {
    const token = String(idOrCode || '').trim();
    if (!token) return null;
    const byId = (allTablesDB || []).find(t => String(t.id) === token);
    if (byId) return msNormalizeTable(msClone(byId));
    const byCode = (allTablesDB || []).find(t => String(t.code || '').toUpperCase() === token.toUpperCase());
    return byCode ? msNormalizeTable(msClone(byCode)) : null;
}

function msUpsertTable(table) {
    window.MS_PLATFORM?.emit('table:cache-updated',{table:msClone(table)});
    const normalized = msNormalizeTable(msClone(table));
    const idx = (allTablesDB || []).findIndex(t => String(t.id) === String(normalized.id));
    if (idx >= 0) allTablesDB[idx] = normalized;
    else allTablesDB.push(normalized);
    msWriteJSON('mundosSombriosTables', allTablesDB);
    return normalized;
}

async function msPersistCharacterToRepo(char, ownerId, charIdOverride = null) {
    if (!ownerId) ownerId = currentUser ? currentUser.id : null;
    if (!ownerId) throw new Error('Proprietário da ficha não identificado.');

    const saved = msClone(char);
    saved.ownerId = ownerId;
    const charId = charIdOverride !== null && charIdOverride !== undefined ? charIdOverride : char.id;
    if (charId !== undefined && charId !== null) saved.id = charId;

    // Persistência remota primeiro: o cache local só é promovido após confirmação.
    if (!window.MS_DB?.ready || !window.MS_SERVICES?.Characters?.save) throw new Error('Supabase indisponível para persistir a ficha.');
    const result = await window.MS_SERVICES.Characters.save(saved);
    if (!result) throw new Error('O Supabase não confirmou o salvamento da ficha. O rascunho foi mantido para recuperação.');

    const store = msEnsureRepoStore();
    const repo = store[ownerId] || { characters: [], joinedTables: [], ownedTables: [] };
    const idx = (repo.characters || []).findIndex(c => String(c.id) === String(saved.id));
    if (idx >= 0) repo.characters[idx] = saved; else repo.characters.push(saved);
    store[ownerId] = repo;
    msWriteJSON(MS_REPO_KEY, store);
    msRefreshLegacyCharacterUnion();
    window.MS_PLATFORM?.emit('character:saved',{character: saved, remote: result});
    return result;
}





function loadUserData() {
    if (!currentUser) return;
    msSeedRepoStoreFromLegacyCharacters();
    msSeedTablesFromLegacy();
    msSyncCurrentUserView();
}

function saveGlobalCharacters() {
    if (!currentUser) return;
    const store = msEnsureRepoStore();
    store[currentUser.id] = {
        characters: msClone(Array.isArray(characters) ? characters : []),
        joinedTables: (store[currentUser.id]?.joinedTables || []),
        ownedTables: (store[currentUser.id]?.ownedTables || [])
    };
    msWriteJSON(MS_REPO_KEY, store);
    msRefreshLegacyCharacterUnion();
}

function saveGlobalJoinedTables() {
    if (!currentUser) return;
    const joined = Array.isArray(joinedTables) ? joinedTables : [];
    const store = msEnsureRepoStore();
    const repo = store[currentUser.id] || { characters: [], joinedTables: [], ownedTables: [] };
    repo.joinedTables = joined.map(t => ({
        code: t.code,
        name: t.name,
        tableId: t.id || t.tableId || null,
        joinedAt: t.joinedAt || Date.now()
    }));
    store[currentUser.id] = repo;
    msWriteJSON(MS_REPO_KEY, store);
    msRefreshLegacyJoinedUnion(currentUser.id);
}

function openCreateTableModal() {
    window.MS_FEATURES?.ensureProgression?.().catch(()=>{});
    if (!currentUser) {
        alert('Faça login antes de forjar uma fenda.');
        return;
    }
    if (currentUser.role === 'jogador') {
        alert('Contas de Jogador não possuem slots de criação de mesa.');
        return;
    }
    if (!msCanCreateTable()) {
        alert(window.MS_SOUL?.slotMessage?.('table') || 'Capacidade de mesas atingida.');
        window.MS_SOUL?.openVault?.('store','master_table_slot');
        return;
    }
    document.getElementById('new-table-name').value = '';
    currentDraftIdentity = null;
    msDraftSavePromise = null;
    const saveButton=document.getElementById('btn-save-table');if(saveButton){saveButton.disabled=false;saveButton.removeAttribute('aria-busy');saveButton.textContent='SALVAR FENDA';}
    const modeInput=document.getElementById('new-table-mode');if(modeInput)modeInput.value='exodo';
    const expInput=document.getElementById('new-table-expansions'),clsInput=document.getElementById('new-table-classes');if(expInput)expInput.value='';if(clsInput)clsInput.value='';
    document.querySelectorAll('[data-create-mode]').forEach(btn=>btn.onclick=()=>{if(modeInput){modeInput.value=btn.dataset.createMode;updateCreateTableModeGuide();}});
    const modal=document.getElementById('create-table-modal');
    modal.style.display = 'flex';
    const scroll=modal.querySelector('.create-table-scroll'); if(scroll)scroll.scrollTop=0;
    updateCreateTableModeGuide();
    msBindCreateTableComposer();
    msUpdateCreateTablePreview();
}

function msUpdateCreateTablePreview(){
    const name=(document.getElementById('new-table-name')?.value||'').trim()||'Fenda sem nome';
    const mode=document.getElementById('new-table-mode')?.value||'exodo';
    const max=Math.max(1,Math.min(20,Number(document.getElementById('new-table-max-players')?.value||6)));
    const theme=document.getElementById('new-table-theme');
    const label=mode==='hybrid'?'HÍBRIDA':mode.toUpperCase();
    const n=document.querySelector('[data-create-preview-name]'),m=document.querySelector('[data-create-preview-mode]'),t=document.querySelector('[data-create-preview-theme]');
    if(n)n.textContent=name;if(m)m.textContent=`${label} · ${max} vaga${max===1?'':'s'}`;if(t)t.textContent=(theme?.selectedOptions?.[0]?.textContent||'Clássico / Ouro').toUpperCase();
}
function msBindCreateTableComposer(){
    const modal=document.getElementById('create-table-modal');if(!modal||modal.dataset.v286Bound==='1')return;modal.dataset.v286Bound='1';
    modal.querySelectorAll('[data-create-jump]').forEach(b=>b.addEventListener('click',()=>{modal.querySelectorAll('[data-create-jump]').forEach(x=>x.classList.toggle('active',x===b));modal.querySelector(`[data-create-section="${b.dataset.createJump}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});}));
    ['new-table-name','new-table-max-players','new-table-theme','new-table-mode'].forEach(id=>document.getElementById(id)?.addEventListener('input',msUpdateCreateTablePreview));
    document.getElementById('new-table-theme')?.addEventListener('change',msUpdateCreateTablePreview);
}

function msCreateRuleValues(id) {
    return String(document.getElementById(id)?.value || '').split('||').map(x => x.trim()).filter(Boolean);
}
function renderCreateTableRecruitmentRules(resetInvalid = false) {
    const mode = document.getElementById('new-table-mode')?.value || 'exodo';
    const modes = mode === 'hybrid' ? ['exodo','ocultatun'] : [mode];
    const expansions = [...new Set(modes.flatMap(m => window.MS_TABLE_RULE_CATALOG?.[m]?.expansions || []))];
    let selectedExp = new Set(msCreateRuleValues('new-table-expansions'));
    let selectedCls = new Set(msCreateRuleValues('new-table-classes'));
    if (resetInvalid) {
        selectedExp = new Set([...selectedExp].filter(x => expansions.includes(x)));
        const possible = [...new Set(modes.flatMap(m => Object.values(window.MS_TABLE_RULE_CATALOG?.[m]?.classes || {}).flat()))];
        selectedCls = new Set([...selectedCls].filter(x => possible.includes(x)));
    }
    const expRoot = document.getElementById('new-table-expansion-grid');
    if (expRoot) expRoot.innerHTML = expansions.map(x => `<button type="button" data-create-exp="${String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" class="${selectedExp.has(x)?'active':''}">${String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</button>`).join('');
    const classEntries = [];
    modes.forEach(m => Object.entries(window.MS_TABLE_RULE_CATALOG?.[m]?.classes || {}).forEach(([nature,list]) => { if (!selectedExp.size || selectedExp.has(nature)) list.forEach(c => classEntries.push(c)); }));
    const classes = [...new Set(classEntries)];
    selectedCls = new Set([...selectedCls].filter(x => classes.includes(x)));
    const clsRoot = document.getElementById('new-table-class-grid');
    if (clsRoot) clsRoot.innerHTML = classes.map(x => `<button type="button" data-create-cls="${String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" class="${selectedCls.has(x)?'active':''}">${String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</button>`).join('');
    const expInput=document.getElementById('new-table-expansions'),clsInput=document.getElementById('new-table-classes');
    if(expInput)expInput.value=[...selectedExp].join('||');if(clsInput)clsInput.value=[...selectedCls].join('||');
    document.querySelectorAll('[data-create-mode]').forEach(b=>b.classList.toggle('active',b.dataset.createMode===mode));
    expRoot?.querySelectorAll('[data-create-exp]').forEach(b=>b.onclick=()=>{const set=new Set(msCreateRuleValues('new-table-expansions'));set.has(b.dataset.createExp)?set.delete(b.dataset.createExp):set.add(b.dataset.createExp);if(expInput)expInput.value=[...set].join('||');renderCreateTableRecruitmentRules(false);});
    clsRoot?.querySelectorAll('[data-create-cls]').forEach(b=>b.onclick=()=>{const set=new Set(msCreateRuleValues('new-table-classes'));set.has(b.dataset.createCls)?set.delete(b.dataset.createCls):set.add(b.dataset.createCls);if(clsInput)clsInput.value=[...set].join('||');renderCreateTableRecruitmentRules(false);});
}
function updateCreateTableModeGuide() {
    const mode = document.getElementById('new-table-mode')?.value || 'exodo';
    const ex = document.getElementById('new-table-exodo-profile');
    const oc = document.getElementById('new-table-ocultatun-profile');
    if (ex) ex.hidden = mode === 'ocultatun';
    if (oc) oc.hidden = mode === 'exodo';
    renderCreateTableRecruitmentRules(true);
    msUpdateCreateTablePreview();
}

function confirmCreateTable() {
    if (!currentUser) {
        alert('Faça login para criar mesas.');
        return;
    }
    if (!msCanCreateTable()) {
        const message=window.MS_SOUL?.slotMessage?.('table') || `Você atingiu o limite de ${msCapacityLabel(msTableCapacity())} Fendas.`;
        alert(message); window.MS_SOUL?.openVault?.('store','master_table_slot'); return;
    }
    const nameInput = document.getElementById('new-table-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        alert("A fenda precisa de um nome.");
        return;
    }

    currentVttTheme = document.getElementById('new-table-theme').value;
    currentDraftGameMode = ['exodo','ocultatun','hybrid'].includes(document.getElementById('new-table-mode')?.value) ? document.getElementById('new-table-mode').value : 'exodo';
    currentDraftSettings = {
        description: msFieldValue('new-table-description'), era: msFieldValue('new-table-era'), region: msFieldValue('new-table-region'),
        expansions: msCreateRuleValues('new-table-expansions'),
        recruitment: { published: !!document.getElementById('new-table-published')?.checked, acceptingRequests: !!document.getElementById('new-table-accepting')?.checked, maxPlayers: Math.max(1, Math.min(20, Number(msFieldValue('new-table-max-players') || 6))), allowedExpansions: msCreateRuleValues('new-table-expansions'), allowedClasses: msCreateRuleValues('new-table-classes'), sheetVisibility: msFieldValue('new-table-sheet-visibility') || 'summary', levelRules: { exodoMin: msFieldValue('new-table-exodo-min') || 'iniciado', exodoMax: msFieldValue('new-table-exodo-max') || 'veterano', existenceMin: Number(msFieldValue('new-table-existence-min') || 5), existenceMax: Number(msFieldValue('new-table-existence-max') || 0), patamarMin: Number(msFieldValue('new-table-patamar-min') || 1), patamarMax: Number(msFieldValue('new-table-patamar-max') || 4) } },
        initialConditions: msFieldValue('new-table-initial'), houseRules: msFieldValue('new-table-rules'),
        tone: msFieldValue('new-table-tone'), focus: msFieldValue('new-table-focus'), secrecy: msFieldValue('new-table-secrecy'), threat: msFieldValue('new-table-threat'), historyBaseline: msFieldValue('new-table-history') || 'y80-100',
        tsinPosture: msFieldValue('new-table-tsin'), technologyScale: msFieldValue('new-table-tech'), paranormalExposure: msFieldValue('new-table-exposure'), institution: msFieldValue('new-table-institution')
    };
    document.getElementById('create-table-modal').style.display = 'none';

    // A identidade do rascunho nasce uma única vez e é reutilizada em qualquer repetição de salvamento.
    currentDraftIdentity = { id: crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`, code: generateRoomCode(), createdAt: Date.now() };
    isDraftMode = true;
    enterVTT('draft', true, name);
}

async function saveDraftTable() {
    if(!currentUser || !window.MS_SERVICES?.Games) return false;
    if(!isDraftMode && currentTableData?.id) return true;
    if(msDraftSavePromise) return msDraftSavePromise;
    const name = document.getElementById('vtt-table-name')?.innerText?.trim() || 'Nova Fenda';
    currentDraftIdentity = currentDraftIdentity || { id: crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`, code: generateRoomCode(), createdAt: Date.now() };
    const draft={id:currentDraftIdentity.id,name,code:currentDraftIdentity.code,theme:currentVttTheme,gameMode:currentDraftGameMode,ownerId:currentUser.id,banned:[],participants:[],settings:msClone(currentDraftSettings||{})};
    const saveButton=document.getElementById('btn-save-table');
    if(saveButton){saveButton.disabled=true;saveButton.setAttribute('aria-busy','true');saveButton.dataset.originalText=saveButton.textContent;saveButton.textContent='SALVANDO…';}
    msDraftSavePromise=(async()=>{try{
        const result=await window.MS_SERVICES.Games.create(draft);
        const remote=result?.data||result;
        if(!remote || remote.id===undefined) throw new Error('O Supabase não devolveu a mesa criada.');
        const newTable=msNormalizeTable({id:remote.id,code:remote.code,name:remote.name,theme:remote.theme,gameMode:remote.game_mode,ownerId:remote.owner_id,participants:remote.participants||[],banned:remote.banned||[],settings:remote.settings||{},createdAt:remote.created_at,updatedAt:remote.updated_at});
        msUpsertTable(newTable); myTables=(allTablesDB||[]).filter(t=>String(t.ownerId)===String(currentUser.id)).map(msClone); isDraftMode=false; currentTableData=msClone(newTable);
        if(saveButton){saveButton.style.display='none';saveButton.removeAttribute('aria-busy');saveButton.textContent='SALVAR FENDA';}
        currentDraftIdentity={id:newTable.id,code:newTable.code,createdAt:currentDraftIdentity.createdAt,saved:true};
        window.MS_PLATFORM?.toast(`Mesa criada. Código: ${newTable.code}`,'success');
        await msHydrateRemoteGameState();
        renderAncoragem();
        return true;
    }catch(error){
        if(saveButton){saveButton.disabled=false;saveButton.removeAttribute('aria-busy');saveButton.textContent=saveButton.dataset.originalText||'SALVAR FENDA';}
        window.MS_PLATFORM?.toast(error.message||'Não foi possível criar a mesa online.','error');return false;
    }finally{msDraftSavePromise=null;}})();
    return msDraftSavePromise;
}

async function deleteTable(id) {
    if(!currentUser || !window.MS_SERVICES?.Games) return false;
    if(!confirm('Tem certeza que deseja apagar essa Fenda para sempre? O mundo será destruído.')) return false;
    try{
        const deleted=await window.MS_SERVICES.Games.delete(id);
        if((deleted?.data??deleted)!==true) throw new Error('O servidor não confirmou a exclusão da Fenda.');
        if(String(currentTableData?.id)===String(id)){await window.MS_TABLE_SESSION?.disconnect?.();currentTableData=null;}
        await msHydrateRemoteGameState();
        renderAncoragem();
        window.MS_PLATFORM?.toast('Mesa excluída e confirmada pelo servidor.','success');
        return true;
    }catch(error){window.MS_PLATFORM?.toast(error.message||'Não foi possível excluir a Fenda.','error');return false;}
}

async function leaveJoinedTable(code) {
    if (!currentUser || !window.MS_SERVICES?.Games) return false;
    if (!confirm('Deseja cortar sua conexão permanente com esta Fenda?')) return false;
    try {
        const confirmed=await window.MS_SERVICES.Games.leave(code);
        if(confirmed!==true) throw new Error('O servidor não confirmou a saída da campanha.');
        await msHydrateRemoteGameState();
        renderAncoragem();
        window.MS_PLATFORM?.toast('Conexão com a campanha encerrada.','success');
        return true;
    } catch (error) { window.MS_PLATFORM?.toast(error?.message||'Não foi possível abandonar a campanha.','error'); return false; }
}

function openJoinTableModal() {
    const select = document.getElementById('join-char-select-vtt');
    select.innerHTML = '';
    if (!Array.isArray(characters) || characters.length === 0) {
        select.innerHTML = '<option disabled>Nenhuma alma no santuário</option>';
    } else {
        characters.forEach((c, i) => select.innerHTML += `<option value="${i}">${c.name} - ${c.nature}</option>`);
    }
    document.getElementById('join-code-input').value = '';
    document.getElementById('join-modal').style.display = 'flex';
}

async function confirmJoinTable() {
    const code=document.getElementById('join-code-input')?.value.trim().toUpperCase();
    const raw=document.getElementById('join-char-select-vtt')?.value;
    const charIndex=raw===''?null:Number(raw);
    if(!code||charIndex===null||Number.isNaN(charIndex)||!characters[charIndex]){window.MS_PLATFORM?.toast('Preencha o código e selecione uma alma.','error');return false;}
    if(!window.MS_SERVICES?.Games){window.MS_PLATFORM?.toast('A mesa online não está disponível.','error');return false;}
    try{
        const selectedChar=msClone(characters[charIndex]);
        const result=await window.MS_SERVICES.Games.join(code,selectedChar.id);
        const remote=result?.data||result;
        if(!remote?.id) throw new Error('Mesa ou convite inválido.');
        const table=msNormalizeTable({id:remote.id,code:remote.code,name:remote.name,theme:remote.theme,gameMode:remote.game_mode,ownerId:remote.owner_id,participants:remote.participants||[],banned:remote.banned||[],settings:remote.settings||{},createdAt:remote.created_at,updatedAt:remote.updated_at});
        myVttCharIndex=charIndex; msUpsertTable(table); document.getElementById('join-modal').style.display='none';
        await msHydrateRemoteGameState();
        window.MS_PLATFORM?.toast('Você atravessou o véu e entrou na mesa.','success');
        enterVTT(table.id,String(table.ownerId)===String(currentUser.id));
        return true;
    }catch(error){window.MS_PLATFORM?.toast(error.message||'Não foi possível entrar nessa Fenda.','error');return false;}
}

async function enterVTT(tableIdOrCode, asGM, draftName = null) {
    window.MS_FEATURES?.ensureProgression?.().catch(()=>{});
    isVttGM = !!asGM;
    document.querySelectorAll('.gm-only-btn').forEach(el => el.style.display = asGM ? 'flex' : 'none');
    tablePlayers = []; currentTableData = null; diceHistory = []; renderDiceHistory();

    if (tableIdOrCode === 'draft') {
        document.getElementById('vtt-table-name').innerText = draftName || 'Forjando Nova Fenda...';
        document.getElementById('btn-save-table').style.display = 'block';
    } else {
        document.getElementById('btn-save-table').style.display = 'none';
        const table = msGetTableByCodeOrId(tableIdOrCode);
        currentTableData = table ? msClone(table) : null;
        if (!currentTableData) { window.MS_PLATFORM?.toast('Mesa não encontrada nesta sessão. Atualize suas mesas.','error'); return false; }
        document.getElementById('vtt-table-name').innerText = currentTableData.name;
        if (currentTableData.theme) { document.getElementById('vtt-theme-select').value = currentTableData.theme; previewVttTheme(); }

        // Fichas completas seguem privadas: jogador recebe apenas a própria; direção recebe as autorizadas.
        // O roster sanitizado complementa a lateral com cartões públicos dos demais participantes.
        try {
            if (window.MS_SERVICES?.Characters && window.MS_SERVICES?.Games && window.currentUser) {
                const [charResult, rosterResult] = await Promise.allSettled([
                    window.MS_SERVICES.Games.characters(currentTableData.id),
                    window.MS_SERVICES.Games.roster(currentTableData.id)
                ]);
                const remoteCharacters = charResult.status === 'fulfilled' ? (charResult.value?.data || charResult.value || []) : [];
                const roster = rosterResult.status === 'fulfilled' ? (rosterResult.value?.data || rosterResult.value || []) : [];
                if (charResult.status === 'rejected') throw charResult.reason;
                if (remoteCharacters.length) {
                    tablePlayers = remoteCharacters.map(c => {
                        const payload = c.payload && typeof c.payload === 'object' ? msClone(c.payload) : {};
                        payload.id = c.id; payload.ownerId = c.owner_id; payload.userId = c.user_id;
                        payload.name = payload.name || c.name; payload.mode = payload.mode || c.mode; payload.nature = payload.nature || c.nature; payload.className = payload.className || c.class_name;
                        payload.updatedAt = c.updated_at;
                        payload.isMe = String(c.user_id) === String(currentUser.authUserId||currentUser.id);
                        payload.sourceOwnerId = c.owner_id; payload.sourceCharId = c.id; payload.participantUserId = c.user_id;
                        return payload;
                    });
                }
                const knownUsers = new Set(tablePlayers.map(c=>String(c.participantUserId||c.userId||'')));
                for (const r of roster) {
                    const uid=String(r.user_id||'');
                    if(!uid || knownUsers.has(uid) || String(r.status||'active')!=='active') continue;
                    tablePlayers.push({
                        id:r.character_id||`roster-${uid}`, sourceCharId:r.character_id||null, participantUserId:uid, userId:uid,
                        name:r.character_name||r.username||'Participante', username:r.username||'jogador', memberRole:r.member_role||'jogador',
                        isMe:uid===String(currentUser.authUserId||currentUser.id), isRosterOnly:true, resources:{}, stats:{}
                    });
                    knownUsers.add(uid);
                }
            }
        } catch (error) { window.MS_PLATFORM?.toast('A mesa abriu, mas as fichas participantes não puderam ser sincronizadas.','error'); }

        if (!asGM && !tablePlayers.some(c=>c.isMe) && myVttCharIndex !== -1 && characters[myVttCharIndex]) {
            const selected = msClone(characters[myVttCharIndex]); selected.isMe=true; selected.sourceOwnerId=currentUser.id; selected.sourceCharId=selected.id; selected.participantUserId=currentUser.id; tablePlayers.unshift(selected);
        }
        if (asGM && !tablePlayers.length && Array.isArray(characters)) {
            characters.forEach(c => { const mine=msClone(c); mine.isMe=true; mine.sourceOwnerId=currentUser.id; mine.sourceCharId=mine.id; mine.participantUserId=currentUser.id; tablePlayers.push(mine); });
        }
    }

    // Separa papel da conta (acesso ao Escudo) da autoridade nesta mesa (Direção).
    const accountRole = String(currentUser?.role || 'jogador').toLowerCase();
    const membershipRole = String(currentTableData?.myMemberRole || window.__msTableMemberships?.[String(currentTableData?.id || '')]?.role || '').toLowerCase();
    isVttGM = !!asGM || accountRole === 'admin' || !!currentTableData?.isOwner || ['mestre','co_mestre'].includes(membershipRole);
    try { window.__msVttIsGM = !!isVttGM; } catch(_) {}
    document.querySelectorAll('.gm-only-btn').forEach(el => el.style.display = isVttGM ? 'flex' : 'none');
    if(isVttGM) window.MS_FEATURES?.ensureOperational?.().catch(()=>{});

    if (window.MasterTools && typeof window.MasterTools.onVttEnter === 'function') await window.MasterTools.onVttEnter(currentTableData, isVttGM);
    showScreen('screen-vtt');
    if (window.MasterTools && typeof window.MasterTools.mountShield === 'function') window.MasterTools.mountShield(isVttGM, currentTableData);
    document.querySelectorAll('.vtt-floating-window').forEach(el => el.style.display = 'none');
    toggleVttWindow('vtt-chat-box'); renderVttCards();
    if (window.MasterTools && typeof window.MasterTools.restoreVttState === 'function') window.MasterTools.restoreVttState();
    window.MS_TABLE_SHELL?.mount?.(currentTableData || {name:draftName||'Nova Fenda',code:'RASCUNHO'},isVttGM);
    window.MS_PLATFORM?.emit('vtt:entered',{tableId:currentTableData?.id||null,asGM:isVttGM});
    return true;
}

function toggleEditUI() {
    const form = document.getElementById('char-form');
    if (!form) return;
    form.classList.toggle('view-mode', !isEditMode);

    const btn = document.getElementById('btn-toggle-edit');
    if (btn) btn.innerText = isEditMode ? "SALVAR EDIÇÃO" : "INICIAR EDIÇÃO";

    document.querySelectorAll('#char-form input[type="text"], #char-form input[type="number"], #char-form textarea').forEach(el => {
        if (!isEditMode) el.setAttribute('readonly', true);
        else el.removeAttribute('readonly');
    });

    const archetypeLocked = editingIndex !== null;
    document.querySelectorAll('#nature-grid .archetype-card, #class-grid .archetype-card').forEach(el => {
        const locked = archetypeLocked || !isEditMode;
        el.disabled = locked;
        el.classList.toggle('archetype-locked', archetypeLocked);
        el.setAttribute('aria-disabled', locked ? 'true' : 'false');
        if (archetypeLocked) el.title = 'Classe/expansão fixada após a criação da ficha.';
    });
    document.querySelectorAll('.choice-card:not(.archetype-card)').forEach(el => {
        el.style.pointerEvents = isEditMode ? 'auto' : 'none';
        if (isEditMode) el.classList.remove('locked');
    });

    document.querySelectorAll('.hide-on-view').forEach(el => el.style.display = isEditMode ? '' : 'none');

    const avatarGroup = document.getElementById('upload-avatar-group');
    const galleryGroup = document.getElementById('upload-gallery-group');
    if (avatarGroup) avatarGroup.style.display = '';
    if (galleryGroup) galleryGroup.style.display = '';

    const avatarInput = document.getElementById('input-avatar');
    const galleryInput = document.getElementById('input-gallery');
    if (avatarInput) avatarInput.disabled = !isEditMode;
    if (galleryInput) galleryInput.disabled = !isEditMode;

    if (!isEditMode) {
        document.querySelectorAll('.hide-on-view').forEach(el => {
            if (el.id === 'input-avatar' || el.id === 'input-gallery') return;
            el.style.display = 'none';
        });
    }
}

function buildCharacterPayloadFromBuilder() {
    const skills = [];
    document.querySelectorAll('#skills-list .list-item').forEach(item => skills.push(item.innerHTML));
    const powersHtml = [], structuredPowers = [];
    document.querySelectorAll('#powers-list .list-item').forEach(item => {
        powersHtml.push(item.innerHTML);
        if(item.dataset.power){ try{ structuredPowers.push(JSON.parse(item.dataset.power)); }catch(_){ } }
    });
    const specificData = {};
    document.querySelectorAll('#specific-content-container input, #specific-content-container select, #specific-content-container textarea').forEach(el => { if (el.id) specificData[el.id] = el.type==='checkbox' ? !!el.checked : el.value; });
    const resources = {};
    document.querySelectorAll('#resource-panel .res-val-input').forEach(inp => { resources[inp.getAttribute('data-type')] = inp.value; });
    const concept={origin:msFieldValue('char-origin'),occupation:msFieldValue('char-occupation'),institution:msFieldValue('char-institution'),status:msFieldValue('char-status'),bonds:msFieldValue('char-bonds'),motivation:msFieldValue('char-motivation'),worldRelation:msFieldValue('char-world-relation')};
    const editingId = editingIndex !== null
        ? ((document.getElementById('screen-vtt').classList.contains('active') && tablePlayers[editingIndex])
            ? (tablePlayers[editingIndex].sourceCharId || tablePlayers[editingIndex].id)
            : characters[editingIndex]?.id)
        : null;
    if (!editingId && !window.__msBuilderCharacterId) window.__msBuilderCharacterId = crypto.randomUUID ? crypto.randomUUID() : ('c-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    const characterId = editingId || window.__msBuilderCharacterId;
    return {
        id: characterId,
        ownerId: currentUser ? currentUser.id : null,
        name: msFieldValue('char-name'), mode: editingIndex !== null && editingArchetypeSnapshot.mode ? editingArchetypeSnapshot.mode : currentMode,
        nature: editingIndex !== null && editingArchetypeSnapshot.nature ? editingArchetypeSnapshot.nature : currentNature,
        className: editingIndex !== null && editingArchetypeSnapshot.className ? editingArchetypeSnapshot.className : currentClass,
        avatar: currentAvatarBase64, gallery: msClone(currentGallery || []), points: document.getElementById('pts-count')?.value || 0,
        concept,
        stats: {for:msFieldValue('attr-for'),vig:msFieldValue('attr-vig'),agi:msFieldValue('attr-agi'),int:msFieldValue('attr-int'),prn:msFieldValue('attr-prn'),pre:msFieldValue('attr-pre')},
        resources, skillsHtml: skills, powers: structuredPowers, powersHtml, evolution: msClone(currentEvolutionLog||[]), equipment: msClone(currentSheetEquipment || []), specificData,
        mercadoDaMorte: currentClass === 'Mercador da Morte' ? msClone(window.__mmDraft || {}) : undefined
    };
}

async function saveCharacter(e) {
    if (e?.preventDefault) e.preventDefault();
    if (!isEditMode || !currentUser) return false;

    const builder = document.getElementById('screen-builder');
    const payload = buildCharacterPayloadFromBuilder();
    const validation = window.MS_PLATFORM?.validateDraft(payload) || {valid:true,errors:[],warnings:[]};
    renderCharacterValidation(validation);
    if (!validation.valid) {
        window.MS_PLATFORM?.toast(validation.errors[0] || 'Revise a ficha antes de salvar.','error');
        return false;
    }

    window.MS_PLATFORM?.setStatus('builder','loading');
    try {
        // Edição do Mestre dentro da mesa: persiste a ficha real do proprietário.
        if (builder.classList.contains('overlay') && isVttGM && editingIndex !== null && tablePlayers[editingIndex]) {
            const target = tablePlayers[editingIndex];
            const ownerId = target.sourceOwnerId || target.ownerId || currentUser.id;
            const charId = target.sourceCharId || target.id || payload.id;
            payload.id = charId; payload.ownerId = ownerId; payload.sourceOwnerId = ownerId; payload.sourceCharId = charId;
            const mergedTarget = { ...msClone(target), ...msClone(payload) };
            const tableId = currentTableData?.id || currentTableData?.tableId || target.tableId;
            if (!tableId || !window.MS_DB?.ready || typeof window.MS_DB.updateCharacterAsGM !== 'function') {
                throw new Error('A edição de ficha pelo Mestre exige uma mesa online sincronizada.');
            }
            window.MS_ONLINE_UI?.saveBuilderDraft?.(payload);
            await window.MS_DB.updateCharacterAsGM(tableId, payload);
            tablePlayers[editingIndex] = mergedTarget;
            msPersistCharacterToRepo(payload, ownerId, charId).catch(error => console.warn('[Mundos Sombrios] Cache da ficha GM:', error));
            window.MS_ONLINE_UI?.clearBuilderDraft?.();
            renderVttCards();
            closeBuilder();
            window.MS_PLATFORM?.setStatus('builder','success');
            window.MS_PLATFORM?.toast('Ficha do jogador sincronizada.','success');
            return true;
        }

        window.MS_ONLINE_UI?.saveBuilderDraft?.(payload);
        const wasEditing = editingIndex !== null;
        await window.MS_PLATFORM?.withPersistence(
            () => msPersistCharacterToRepo(payload, currentUser.id, payload.id),
            { entity: 'character', operation: wasEditing ? 'update' : 'create', id: payload.id }
        );
        if (wasEditing) characters[editingIndex] = msClone(payload); else characters.push(msClone(payload));
        saveGlobalCharacters();
        window.MS_ONLINE_UI?.clearBuilderDraft?.();
        window.MS_PLATFORM?.setStatus('builder','success');
        window.MS_PLATFORM?.toast(wasEditing ? 'Edição sincronizada com sucesso.' : 'Alma forjada e sincronizada.','success');
        window.MS_PLATFORM?.emit('character:changed',{character:msClone(payload), mode: wasEditing ? 'edit' : 'create'});
        closeBuilder();
        return true;
    } catch (error) {
        window.MS_PLATFORM?.setStatus('builder','error',error);
        window.MS_PLATFORM?.toast(error.message || 'Não foi possível salvar a ficha.','error');
        console.error('[Mundos Sombrios] Falha ao salvar ficha:', error);
        return false;
    }
}

function renderCharacterValidation(result) {
    const panel=document.getElementById('character-validation-panel');
    if(!panel) return;
    const errors=Array.isArray(result?.errors)?result.errors:[];
    const warnings=Array.isArray(result?.warnings)?result.warnings:[];
    panel.hidden = !(errors.length || warnings.length);
    panel.dataset.valid = result?.valid ? 'true' : 'false';
    const title=result?.valid ? (warnings.length ? 'Pronta para imortalizar · campos opcionais pendentes' : 'Pronta para imortalizar') : 'Faltam pré-requisitos para imortalizar';
    panel.innerHTML = `<strong>${title}</strong>${errors.length?`<ul>${errors.map(x=>`<li>Erro: ${escHtml(x)}</li>`).join('')}</ul>`:''}${warnings.length?`<ul>${warnings.map(x=>`<li>Atenção: ${escHtml(x)}</li>`).join('')}</ul>`:''}`;
}

function validateCurrentCharacterDraft() {
    try { const payload=buildCharacterPayloadFromBuilder(); const result=window.MS_PLATFORM?.validateDraft(payload) || {valid:true,errors:[],warnings:[]}; renderCharacterValidation(result); return result; } catch(error) { const result={valid:false,errors:[error.message||'Falha ao validar a ficha.'],warnings:[]}; renderCharacterValidation(result); return result; }
}

function openCharacterPreview() {
    const modal=document.getElementById('character-preview-modal'); const target=document.getElementById('character-preview-content');
    if(!modal||!target) return;
    try {
        const char=buildCharacterPayloadFromBuilder();
        const result=window.MS_PLATFORM?.validateDraft(char); renderCharacterValidation(result);
        const mode=String(char.mode||'exodo')==='ocultatun'?'Ocultatun · Ecos':'Êxodo · Assimilação';
        const stats=char.stats||{};
        const resources=window.MS_PLATFORM?.normalizeResources(char.resources).slice(0,8) || [];
        target.innerHTML=`<article class="character-preview-card" data-mode="${escHtml(char.mode||'exodo')}">
          <header><div><span class="preview-kicker">${escHtml(mode)}</span><h4>${escHtml(char.name||'Alma sem nome')}</h4><p>${escHtml(char.nature||'Natureza não definida')} · ${escHtml(char.className||'Classe não definida')}</p></div>${char.avatar?`<img src="${char.avatar}" alt="Retrato de ${escHtml(char.name||'personagem')}">`:'<div class="preview-no-avatar" aria-hidden="true">◈</div>'}</header>
          <section class="preview-stats"><span>FOR <b>${escHtml(stats.for??0)}</b></span><span>VIG <b>${escHtml(stats.vig??0)}</b></span><span>AGI <b>${escHtml(stats.agi??0)}</b></span><span>INT <b>${escHtml(stats.int??0)}</b></span><span>PRN <b>${escHtml(stats.prn??0)}</b></span><span>PRE <b>${escHtml(stats.pre??0)}</b></span></section>
          <section class="preview-resources">${resources.map(r=>`<div class="ms-resource-card"><div class="ms-resource-label"><span>${escHtml(r.label||r.key)}</span><b>${escHtml(r.value)}${r.max!=null?`/${escHtml(r.max)}`:''}</b></div><div class="ms-resource-bar"><span style="width:${r.max>0?Math.max(0,Math.min(100,(r.value/r.max)*100)):100}%"></span></div></div>`).join('')}</section>
        </article>`;
        modal.style.display='flex'; modal.setAttribute('aria-hidden','false');
        window.MS_PLATFORM?.emit('character:previewed',{character:char});
    } catch(error) { window.MS_PLATFORM?.toast(error.message||'Não foi possível montar a pré-visualização.','error'); }
}

function closeCharacterPreview() { const modal=document.getElementById('character-preview-modal'); if(modal){modal.style.display='none'; modal.setAttribute('aria-hidden','true');} }

function syncVttCharacterToOwner(char) {
    if (!char || char.isNPC) return;
    const ownerId = char.sourceOwnerId || char.ownerId || (currentUser ? currentUser.id : null);
    if (!ownerId) return;
    const charId = char.sourceCharId || char.id;
    msPersistCharacterToRepo(char, ownerId, charId);
    msRefreshLegacyCharacterUnion();
}

function loadCharacterToBuilder(index, sourceArray = characters, restrictToIdentity = false) {
    if(window.MS_FEATURES && !window.MS_FEATURES.isBuilderReady()) { window.MS_FEATURES.ensureBuilder().then(()=>loadCharacterToBuilder(index,sourceArray,restrictToIdentity)).catch(error=>window.MS_PLATFORM?.toast(error.message||'Falha ao carregar módulos da ficha.','error')); return false; }
    editingIndex = index;
    const char = sourceArray[index];
    window.__msBuilderCharacterId = char?.sourceCharId || char?.id || null;
    editingArchetypeSnapshot = { mode: char?.mode || null, nature: char?.nature || null, className: char?.className || null };
    currentMode = char.mode || 'exodo';
    // Open/rebuild the builder before touching its dependent selects.
    startBuilder(currentMode);
    populateSelects(currentMode);

    isHydratingCharacter = true;
    try {
        if (char.nature) selectNature(char.nature);
        if (char.className) selectClass(char.className, true);
    } finally {
        isHydratingCharacter = false;
    }

    const nameEl = document.getElementById('char-name');
    if (nameEl) nameEl.value = char.name || '';
    const concept=char.concept||{};
    const conceptMap={'char-origin':'origin','char-occupation':'occupation','char-institution':'institution','char-status':'status','char-bonds':'bonds','char-motivation':'motivation','char-world-relation':'worldRelation'};
    Object.entries(conceptMap).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=concept[key]||'';});

    if (char.avatar) {
        currentAvatarBase64 = char.avatar;
        document.getElementById('avatar-preview-container').innerHTML = `<img src="${char.avatar}">`;
    } else {
        currentAvatarBase64 = '';
        document.getElementById('avatar-preview-container').innerHTML = '<span style="color:#666; font-size:0.8rem;">Nenhum retrato</span>';
    }

    currentGallery = Array.isArray(char.gallery) ? msClone(char.gallery) : [];
    window.renderGallery?.();

    if (char.stats) {
        document.getElementById('attr-for').value = char.stats.for;
        document.getElementById('attr-vig').value = char.stats.vig;
        document.getElementById('attr-agi').value = char.stats.agi;
        document.getElementById('attr-int').value = char.stats.int;
        document.getElementById('attr-prn').value = char.stats.prn;
        document.getElementById('attr-pre').value = char.stats.pre;
    }

    if (char.resources) {
        Object.keys(char.resources).forEach(key => {
            const inp = document.querySelector(`#resource-panel .res-val-input[data-type="${key}"]`);
            if (inp) inp.value = char.resources[key];
        });
    }

    const skillsList = document.getElementById('skills-list');
    skillsList.innerHTML = '';
    if (char.skillsHtml) {
        char.skillsHtml.forEach(skHtml => {
            const div = document.createElement('div');
            div.className = 'list-item';
            if (skHtml.includes('Nativo da')) div.classList.add('locked');
            div.innerHTML = skHtml;
            skillsList.appendChild(div);
        });
    }

    const powersList = document.getElementById('powers-list');
    powersList.innerHTML = '';
    if (Array.isArray(char.powers) && char.powers.length) {
        char.powers.forEach(power => powersList.appendChild(renderPowerItem(power)));
    } else if (char.powersHtml) {
        char.powersHtml.forEach(pwHtml => { const div=document.createElement('div');div.className='list-item';div.innerHTML=pwHtml;powersList.appendChild(div); });
    }
    currentEvolutionLog = Array.isArray(char.evolution) ? msClone(char.evolution) : [];
    renderEvolutionEntries();

    currentSheetEquipment = Array.isArray(char.equipment) ? msClone(char.equipment) : [];
    renderEquipmentSheet();

    if (restrictToIdentity) {
        document.getElementById('btn-tab-stats').style.display = 'none';
        document.getElementById('btn-tab-skills').style.display = 'none';
        document.getElementById('btn-tab-powers').style.display = 'none';
        const evoBtn=document.getElementById('btn-tab-evolution'); if(evoBtn)evoBtn.style.display='none';
        document.getElementById('btn-tab-equipment').style.display = 'none';
        isEditMode = false;
        toggleEditUI();
    } else {
        document.getElementById('btn-tab-stats').style.display = '';
        document.getElementById('btn-tab-skills').style.display = '';
        document.getElementById('btn-tab-powers').style.display = '';
        const evoBtn=document.getElementById('btn-tab-evolution'); if(evoBtn)evoBtn.style.display='';
        document.getElementById('btn-tab-equipment').style.display = '';
        const inVTTNow = document.getElementById('screen-vtt')?.classList.contains('active');
        isEditMode = !inVTTNow || isVttGM;
        const editBtn = document.getElementById('btn-toggle-edit');
        const saveBtn = document.getElementById('btn-final-save');
        if (inVTTNow && !isVttGM) { if (editBtn) editBtn.style.display='none'; if (saveBtn) saveBtn.style.display='none'; }
        toggleEditUI();
    }

    if (currentNature && String(currentNature).includes('Envolto')) {
        try {
            buildSkillTreeUI(currentNature);
        } catch (err) {
            console.warn('[Mundos Sombrios] Falha ao recriar skill tree do Envolto:', err);
        }
    }
    if (currentNature === 'Arquiteto de Linhagem (Aprimorador)' && typeof window.aprimoradorRestoreFromData === 'function') {
        try {
            window.aprimoradorRestoreFromData(char.specificData || {});
        } catch (err) {
            console.warn('[Mundos Sombrios] Falha ao recriar Engenharia de Linhagem:', err);
        }
    }
    if (currentNature === 'Operador de Sistema (Proj. Player)' && typeof window.restoreProjetoPlayerFromData === 'function') {
        try { window.restoreProjetoPlayerFromData(char.specificData || {}); } catch (err) { console.warn('[Mundos Sombrios] Falha ao recriar Interface & Kafra:', err); }
    }
}

/* V2.8.3 — galeria canônica pertence a js/gallery-editor.js. */


function beginNewCharacter(){
        try {
            if (!currentUser) {
                alert('A sessão do Santuário expirou. Entre novamente no Vazio.');
                showScreen('screen-login');
                return false;
            }

            let mode = (selectedGameMode === 'exodo' || selectedGameMode === 'ocultatun')
                ? selectedGameMode
                : ((currentMode === 'exodo' || currentMode === 'ocultatun') ? currentMode : (window.__mundosSelectedMode || ''));
            if (mode !== 'exodo' && mode !== 'ocultatun') {
                alert('Escolha primeiro o modo de jogo: Êxodo ou Ocultatun.');
                showScreen('screen-mode-select');
                return false;
            }

            // O repositório é atualizado, mas nunca pode impedir a abertura do construtor.
            try {
                if (typeof msEnsureUserRepo === 'function') {
                    const repo = msEnsureUserRepo(currentUser.id);
                    characters = Array.isArray(repo.characters) ? msClone(repo.characters) : [];
                } else if (!Array.isArray(characters)) {
                    characters = [];
                }
            } catch (repoError) {
                console.warn('[Mundos Sombrios] Repositório indisponível; usando visão local da conta.', repoError);
                if (!Array.isArray(characters)) characters = [];
            }

            const limit = msCharacterCapacity();
            if (!msCanCreateCharacter()) {
                alert(window.MS_SOUL?.slotMessage?.('character') || `O limite de ${msCapacityLabel(limit)} almas forjadas foi atingido.`);
                window.MS_SOUL?.openVault?.('store','character_slot');
                return false;
            }

            const ids = ['screen-builder','char-form','char-mode','char-name','nature-grid',
                         'class-container','specific-content-container','avatar-preview-container',
                         'gallery-container','skills-list','powers-list'];
            const missing = ids.filter(id => !document.getElementById(id));
            if (missing.length) {
                console.error('[Mundos Sombrios] Elementos ausentes na criação:', missing);
                alert('A janela de criação não foi carregada corretamente. Recarregue o site.');
                return false;
            }
            if (typeof ruleset === 'undefined' || !ruleset || !ruleset[mode]) {
                console.error('[Mundos Sombrios] Ruleset indisponível para:', mode);
                alert('As regras do modo escolhido ainda não foram carregadas.');
                return false;
            }

            selectedGameMode = mode;
            currentMode = mode;
            editingIndex = null;
            window.__msBuilderCharacterId = crypto.randomUUID ? crypto.randomUUID() : ('c-' + Date.now() + '-' + Math.random().toString(36).slice(2));
            currentNature = '';
            currentClass = '';
            currentAvatarBase64 = '';
            currentGallery = [];
            currentPowerDraft = [];
            currentEvolutionLog = [];
            currentSheetEquipment = [];
            currentUnlockedNodes = [];
            if (typeof renderEvolutionEntries === 'function') renderEvolutionEntries();
            isEditMode = true;

            const form = document.getElementById('char-form');
            form.reset();
            document.getElementById('char-mode').value = mode;
            document.getElementById('char-name').value = '';
            const pts = document.getElementById('pts-count');
            if (pts) pts.value = '0';
            document.querySelectorAll('.attr-input').forEach(el => el.value = '0');
            document.querySelectorAll('.res-val-input').forEach(el => el.value = '');
            document.getElementById('avatar-preview-container').innerHTML = '<span style="color:#666;font-size:.8rem">Nenhum retrato</span>';
            document.getElementById('gallery-container').innerHTML = '';
            document.getElementById('skills-list').innerHTML = '';
            document.getElementById('powers-list').innerHTML = '';
            document.getElementById('specific-content-container').innerHTML = '';
            const treeData = document.getElementById('tree-unlocked-data');
            if (treeData) treeData.value = '';

            // Monta as opções diretamente; não depende de initBuilderForSelectedMode.
            if (typeof populateSelects === 'function') populateSelects(mode);
            if (typeof startBuilder === 'function') {
                if (startBuilder(mode) === false) throw new Error('startBuilder recusou o modo ' + mode);
            } else {
                throw new Error('startBuilder não está disponível');
            }

            // Garantia final: a tela é aberta mesmo que uma rotina visual secundária falhe.
            const builder = document.getElementById('screen-builder');
            builder.classList.remove('overlay');
            builder.classList.add('active');
            builder.style.zIndex = '1500';
            if (typeof openTab === 'function') openTab('tab-identity');
            if (typeof toggleEditUI === 'function') toggleEditUI();
            return true;
        } catch (err) {
            console.error('[Mundos Sombrios] Falha definitiva em DESPERTAR NOVA ALMA:', err);
            // Último fallback: abre a janela e deixa a ficha limpa, sem perder a sessão.
            try {
                const builder = document.getElementById('screen-builder');
                if (builder) {
                    builder.classList.remove('overlay');
                    builder.classList.add('active');
                    builder.style.zIndex = '1500';
                }
                const form = document.getElementById('char-form');
                if (form) form.reset();
                const mode = (selectedGameMode === 'exodo' || selectedGameMode === 'ocultatun') ? selectedGameMode : 'exodo';
                const modeInput = document.getElementById('char-mode');
                if (modeInput) modeInput.value = mode;
                if (typeof openTab === 'function') openTab('tab-identity');
                if (typeof toggleEditUI === 'function') toggleEditUI();
                return true;
            } catch (fallbackError) {
                console.error('[Mundos Sombrios] Fallback do construtor falhou:', fallbackError);
                alert('Não foi possível abrir a criação da ficha. Recarregue o site e tente novamente.');
                return false;
            }
        }
    
}

function initBuilderForSelectedMode() {
    if (!currentUser) {
        alert('A sessão do Santuário expirou. Entre novamente no Vazio.');
        showScreen('screen-login');
        return false;
    }

    const mode = (selectedGameMode === 'exodo' || selectedGameMode === 'ocultatun')
        ? selectedGameMode
        : (document.getElementById('char-mode')?.value || '');

    if (!mode || !ruleset[mode]) {
        alert('Escolha primeiro o modo de jogo: Êxodo ou Ocultatun.');
        showScreen('screen-mode-select');
        return false;
    }

    msSeedRepoStoreFromLegacyCharacters();
    msSeedTablesFromLegacy();
    msSyncCurrentUserView();

    const LIMIT = msCharacterCapacity();
    if (!Array.isArray(characters)) characters = [];
    if (!msCanCreateCharacter()) {
        alert(window.MS_SOUL?.slotMessage?.('character') || `O limite de ${msCapacityLabel(LIMIT)} almas forjadas foi atingido.`);
        window.MS_SOUL?.openVault?.('store','character_slot');
        return false;
    }

    const requiredIds = ['char-form', 'char-name', 'nature-grid', 'class-container', 'specific-content-container'];
    const missing = requiredIds.filter(id => !document.getElementById(id));
    if (missing.length) {
        console.error('[Mundos Sombrios] Elementos ausentes no construtor:', missing);
        alert('Não foi possível abrir a criação de ficha porque a janela está incompleta. Recarregue o site.');
        return false;
    }

    editingIndex = null;
    window.__msBuilderCharacterId = crypto.randomUUID ? crypto.randomUUID() : ('c-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    currentAvatarBase64 = '';
    currentGallery = [];
    currentPowerDraft = [];
    currentEvolutionLog = [];
    currentSheetEquipment = [];
    if (typeof renderEvolutionEntries === 'function') renderEvolutionEntries();
    isEditMode = true;

    document.getElementById('char-form').reset();
    document.getElementById('char-name').value = '';
    document.querySelectorAll('.attr-input').forEach(el => el.value = '0');
    document.getElementById('pts-count').value = '0';
    document.querySelectorAll('.res-val-input').forEach(el => el.value = '');
    document.getElementById('avatar-preview-container').innerHTML = '<span style="color:#666; font-size:0.8rem;">Nenhum retrato</span>';
    document.getElementById('gallery-container').innerHTML = '';
    document.getElementById('skills-list').innerHTML = '';
    document.getElementById('powers-list').innerHTML = '';
    renderEquipmentSheet();
    document.getElementById('specific-content-container').innerHTML = '';
    currentUnlockedNodes = [];
    if (document.getElementById('tree-unlocked-data')) document.getElementById('tree-unlocked-data').value = '';

    selectedGameMode = mode;
    populateSelects(mode);
    if (!startBuilder(mode)) return false;
    toggleEditUI();
    return true;
}


/* V2.8.3 — criação de ficha consolidada em beginNewCharacter(); o patch final duplicado foi removido. */

// =====================================================================
// V0.9 — RITUAIS HERMÉTICOS + FORJA MULTISSISTEMA
// =====================================================================
(function(){
    window.currentHermeticRituals = window.currentHermeticRituals || [];
    window.msForgeContext = 'vtt'; // 'vtt' | 'sheet'

    const ritualStateMap = () => Object.fromEntries((window.currentHermeticRituals || []).map(r => [r.id, r]));
    const esc = s => (typeof escHtml === 'function' ? escHtml(String(s ?? '')) : String(s ?? ''));

    function hermeticCharacterActive(){
        return currentMode === 'ocultatun' && currentNature === 'Agente Designado (Ocultatun)' && currentClass === 'Hermético';
    }

    function ritualLimits(){
        const int = Number(document.getElementById('attr-int')?.value || 0);
        const prn = Number(document.getElementById('attr-prn')?.value || 0);
        return { known: Math.max(0, int + 3), sync: Math.max(0, int + prn) };
    }

    function normalizeRitualState(list){
        const raw = Array.isArray(list) ? list : [];
        const valid = [];
        raw.forEach(x => {
            const id = typeof x === 'string' ? x : x?.id;
            const ritual = hermeticRitualById(id);
            if (!ritual) return;
            valid.push({ id: ritual.id, known: x?.known !== false, synchronized: !!x?.synchronized });
        });
        return valid;
    }

    window.renderHermeticRituals = function(){
        const panel = document.getElementById('tab-rituals');
        const btn = document.getElementById('btn-tab-rituals');
        if (!panel || !btn) return;
        const active = hermeticCharacterActive();
        btn.style.display = active ? '' : 'none';
        panel.style.display = active ? '' : 'none';
        if (!active) return;

        const limits = ritualLimits();
        const state = ritualStateMap();
        const knownCount = Object.values(state).filter(r => r.known).length;
        const syncCount = Object.values(state).filter(r => r.synchronized).length;
        const knownEl = document.getElementById('hermetic-known-count');
        const syncEl = document.getElementById('hermetic-sync-count');
        if (knownEl) knownEl.textContent = `${knownCount}/${limits.known}`;
        if (syncEl) syncEl.textContent = `${syncCount}/${limits.sync}`;

        const query = (document.getElementById('hermetic-ritual-search')?.value || '').trim().toLowerCase();
        const filter = document.getElementById('hermetic-ritual-filter')?.value || 'all';
        const grid = document.getElementById('hermetic-ritual-grid');
        if (!grid) return;
        grid.innerHTML = '';

        HERMETIC_RITUALS.forEach(r => {
            const st = state[r.id] || { id:r.id, known:false, synchronized:false };
            const hay = `${r.number} ${r.name} ${r.material} ${r.gesture} ${r.verbal} ${r.effect}`.toLowerCase();
            if (query && !hay.includes(query)) return;
            if (filter === 'known' && !st.known) return;
            if (filter === 'synchronized' && !st.synchronized) return;
            if (filter === 'available' && (st.known || st.synchronized)) return;
            const article = document.createElement('article');
            article.className = `ritual-card ${st.known?'is-known':''} ${st.synchronized?'is-synchronized':''}`;
            article.innerHTML = `
                <div class="ritual-card-head">
                    <div class="ritual-sigil" title="Sigilo ${r.number}">${r.sigil}</div>
                    <div class="ritual-title-wrap"><span class="ritual-number">RITUAL ${String(r.number).padStart(2,'0')} · CAP ${r.cap}</span><h4>${esc(r.name)}</h4><span class="ritual-cost">${r.epCost} EP</span></div>
                </div>
                <div class="ritual-card-body">
                    <p><b>Material:</b> ${esc(r.material)}</p>
                    <p><b>Gesto:</b> ${esc(r.gesture)}</p>
                    <p><b>Verbo:</b> <em>${esc(r.verbal)}</em></p>
                    <p><b>Salvaguarda:</b> ${esc(r.save)}</p>
                    <p><b>Tempo:</b> ${esc(r.time)}</p>
                    <p class="ritual-effect"><b>Efeito:</b> ${esc(r.effect)}</p>
                </div>
                <div class="ritual-card-actions hide-on-view">
                    <label><input type="checkbox" class="ritual-known-toggle" data-id="${r.id}" ${st.known?'checked':''}> Conhecido</label>
                    <label><input type="checkbox" class="ritual-sync-toggle" data-id="${r.id}" ${st.synchronized?'checked':''}> Sintonizado</label>
                </div>`;
            grid.appendChild(article);
        });

        grid.querySelectorAll('.ritual-known-toggle').forEach(cb => cb.addEventListener('change', function(){
            const id = this.dataset.id;
            let row = state[id];
            if (!row) row = {id, known:false, synchronized:false};
            row.known = this.checked;
            if (!this.checked) row.synchronized = false;
            state[id] = row;
            window.currentHermeticRituals = Object.values(state);
            renderHermeticRituals();
            // O estado visual do editor não precisa ser recalculado ao marcar um ritual.
            // Chamar toggleEditUI aqui acionava o guardião contextual legado e podia
            // redirecionar indevidamente o Códice Hermético para Identidade & Natureza.
        }));
        grid.querySelectorAll('.ritual-sync-toggle').forEach(cb => cb.addEventListener('change', function(){
            const id = this.dataset.id;
            let row = state[id];
            if (!row) row = {id, known:true, synchronized:false};
            if (this.checked) {
                if (!row.known) row.known = true;
                const already = Object.values(state).filter(x => x.synchronized).length;
                if (!row.synchronized && already >= limits.sync) {
                    this.checked = false;
                    return alert(`O Hermético só pode manter ${limits.sync} ritual(is) sintonizado(s) com INT ${Number(document.getElementById('attr-int')?.value||0)} + PRN ${Number(document.getElementById('attr-prn')?.value||0)}.`);
                }
            }
            row.synchronized = this.checked;
            state[id] = row;
            window.currentHermeticRituals = Object.values(state);
            renderHermeticRituals();
            // O estado visual do editor não precisa ser recalculado ao marcar um ritual.
            // Chamar toggleEditUI aqui acionava o guardião contextual legado e podia
            // redirecionar indevidamente o Códice Hermético para Identidade & Natureza.
        }));
    };

    window.setHermeticRituals = function(list){
        window.currentHermeticRituals = normalizeRitualState(list);
        renderHermeticRituals();
    };

    window.syncHermeticRitualUI = function(){
        const active = hermeticCharacterActive();
        const btn = document.getElementById('btn-tab-rituals');
        const tab = document.getElementById('tab-rituals');
        if (btn) btn.style.display = active ? '' : 'none';
        if (tab) tab.style.display = active ? '' : 'none';
        if (active) renderHermeticRituals();
    };

    // Capture existing builder hooks and extend them.
    const _selectNature = window.selectNature;
    window.selectNature = function(natureName){
        const result = _selectNature.call(this, natureName);
        window.currentHermeticRituals = [];
        syncHermeticRitualUI();
        return result;
    };
    const _selectClass = window.selectClass;
    window.selectClass = function(className, skipAutofill=false){
        const result = _selectClass.call(this, className, skipAutofill);
        syncHermeticRitualUI();
        if (hermeticCharacterActive()) {
            const desc = document.getElementById('subclass-description');
            if (desc) desc.innerText = `${classDescDict[className] || 'Arquiteto da Simetria.'}\n\nCódice: INT + 3 rituais conhecidos · Sintonia: INT + PRN · Custo padrão: Capacidade × 2 EP.`;
        }
        return result;
    };
    const _initBuilder = window.initBuilderForSelectedMode;
    window.initBuilderForSelectedMode = function(){
        const result = _initBuilder.apply(this, arguments);
        if (result) { window.currentHermeticRituals = []; syncHermeticRitualUI(); }
        return result;
    };
    const _toggleEditUI = window.toggleEditUI;
    window.toggleEditUI = function(){
        const result = _toggleEditUI.apply(this, arguments);
        document.querySelectorAll('#tab-rituals input[type="checkbox"]').forEach(el => el.disabled = !isEditMode);
        return result;
    };
    const _buildPayload = window.buildCharacterPayloadFromBuilder;
    window.buildCharacterPayloadFromBuilder = function(){
        const payload = _buildPayload.apply(this, arguments);
        payload.rituals = msClone(window.currentHermeticRituals || []);
        payload.hermeticRitualLimits = ritualLimits();
        return payload;
    };
    const _loadCharacter = window.loadCharacterToBuilder;
    window.loadCharacterToBuilder = function(){
        const result = _loadCharacter.apply(this, arguments);
        const sourceArray = arguments[1] || characters;
        const index = arguments[0];
        const char = sourceArray[index];
        window.currentHermeticRituals = normalizeRitualState(char?.rituals || []);
        syncHermeticRitualUI();
        if (arguments[2]) {
            const ritualBtn=document.getElementById('btn-tab-rituals'), ritualTab=document.getElementById('tab-rituals');
            if (ritualBtn) ritualBtn.style.display='none';
            if (ritualTab) ritualTab.style.display='none';
        }
        renderEquipmentSheet();
        return result;
    };

    // -----------------------------------------------------------------
    // Equipment normalization + mode-accurate forge schemas.
    // -----------------------------------------------------------------
    window.normalizeEquipment = function(item){
        const x = msClone(item || {});
        x.id = x.id || `eq-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
        x.name = x.name || 'Item sem nome';
        x.category = x.category || 'Equipamento';
        x.effect = x.effect || '';
        x.source = x.source || 'Inventário';
        if (x.pe !== undefined && x.pe !== null && x.pe !== '' && !isNaN(Number(x.pe))) x.pe = Number(x.pe);
        if (x.stage !== undefined && x.stage !== null && x.stage !== '' && !isNaN(Number(x.stage))) x.stage = Number(x.stage);
        if (x.charges !== undefined && x.charges !== null && x.charges !== '' && !isNaN(Number(x.charges))) x.charges = Number(x.charges);
        return x;
    };

    function charModeNature(char){
        const nature = char?.nature || currentNature || '';
        const mode = char?.mode || currentMode || (nature.includes('Ocultatun') || nature.includes('Envolto') || nature.includes('Ordem dos Sete') ? 'ocultatun' : 'exodo');
        return { mode, nature };
    }

    window.currentBuilderCharacter = function(){
        return {
            mode: currentMode || document.getElementById('char-mode')?.value || 'exodo',
            nature: currentNature || document.getElementById('char-nature')?.value || '',
            className: currentClass || document.getElementById('char-class')?.value || '',
            name: document.getElementById('char-name')?.value || '',
            stats: {
                for:Number(document.getElementById('attr-for')?.value||0),
                vig:Number(document.getElementById('attr-vig')?.value||0),
                agi:Number(document.getElementById('attr-agi')?.value||0),
                int:Number(document.getElementById('attr-int')?.value||0),
                prn:Number(document.getElementById('attr-prn')?.value||0),
                pre:Number(document.getElementById('attr-pre')?.value||0)
            }
        };
    };

    function forgeSchema(char){
        const {mode,nature} = charModeNature(char);
        if (nature === 'O Envolto (Horror Cósmico)') return {
            key:'envolto', mode:'ocultatun',
            title:'Engenharia do Blasfemo',
            subtitle:'Chassi Profano + Enxerto Aberrante + Válvula de Potência + Gatilho de Falha.',
            chassis:[['Ligeiro',2],['Padrão',5],['Massivo',8],['Proteção',4]],
            vectors:[], categories:['Artefato Blasfemo'],
            specials:true
        };
        if (nature === 'A Ordem dos Sete (Alta Glória)') return {
            key:'ordem', mode:'ocultatun',
            title:'Forja das Dádivas',
            subtitle:'Chassi Divino + Vetores de Ascensão + Estágio + Propósito Sagrado.',
            chassis:[['Ligeiro',2],['Padrão',5],['Massivo',8],['Proteção',4],['Utilitário',3]],
            vectors:['Arkhé','Ex-Nihilo','Poesis Pleroma'], categories:['Dádiva'],
            specials:true
        };
        if (mode === 'exodo') return {
            key:'exodo', mode:'exodo',
            title:'Forja de Dispositivos de Êxodo',
            subtitle:'Chassi + Vetores de Função (VF) + Estágio (ES) + MCP + Extras.',
            chassis:[['Equipamento',5],['Dispositivo',15],['Resquício',40]],
            vectors:['Emissão','Cinético','Biótico','Psíquico','Sensorial','Temporal','Contenção'], categories:['Equipamento','Dispositivo','Resquício'],
            specials:true
        };
        return {
            key:'ocultatun', mode:'ocultatun',
            title:'Forja da Ocultatun',
            subtitle:'Chassi + Vetores de Manifestação (VM) + Estágio (ES) + Categoria.',
            chassis:[['Ligeiro',2],['Padrão',5],['Massivo',8],['Proteção',4],['Utilitário',3]],
            vectors:(lists?.ocultatun?.powers?.['Agente Designado (Ocultatun)']||['Destrutiva','Fluxo','Fissura','Decadência','Manipulação','Propagação','Pactual','Quebra']),
            categories:['Ritualístico','Anômalo'], specials:true
        };
    }

    function refreshForgeFields(char){
        const schema = forgeSchema(char);
        const chassisEl = document.getElementById('forge-chassis');
        const categoryEl = document.getElementById('forge-category');
        const vectorsEl = document.getElementById('forge-vectors');
        const labelChassis = document.querySelector('#forge-chassis')?.closest('.form-group')?.querySelector('label');
        const labelCat = document.querySelector('#forge-category')?.closest('.form-group')?.querySelector('label');
        const labelVec = document.querySelector('#forge-vectors')?.closest('.form-group')?.querySelector('label');
        if (labelChassis) labelChassis.textContent = schema.key==='exodo' ? 'Categoria de item / chassi' : 'Chassi';
        if (labelCat) labelCat.textContent = schema.key==='ocultatun' ? 'Categoria de Item' : schema.key==='envolto' ? 'Natureza da Forja' : schema.key==='ordem' ? 'Categoria' : 'Categoria';
        if (labelVec) labelVec.textContent = schema.key==='exodo' ? 'Vetores de Função (VF)' : schema.key==='ocultatun' ? 'Vetores de Manifestação (VM)' : 'Vetores de Ascensão';
        chassisEl.innerHTML = schema.chassis.map(([name,pe])=>`<option value="${esc(name)}" data-pe="${pe}">${esc(name)} — ${pe} PE</option>`).join('');
        categoryEl.innerHTML = schema.categories.map(cat=>`<option value="${esc(cat)}">${esc(cat)}${cat==='Ritualístico'?' — desconto de 5 PE':''}${cat==='Anômalo'?' — custo integral':''}</option>`).join('');
        vectorsEl.innerHTML = schema.vectors.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
        const target = document.getElementById('forge-recipient')?.closest('.form-group');
        if(target) target.style.display = msForgeContext==='sheet' ? 'none' : '';
        const stageWrap = document.getElementById('forge-stage')?.closest('.form-group');
        if(stageWrap) stageWrap.style.display = schema.key==='envolto' ? 'none' : '';
        const vectorWrap = document.getElementById('forge-vectors')?.closest('.form-group');
        if(vectorWrap) vectorWrap.style.display = schema.vectors.length ? '' : 'none';
        const ex = document.getElementById('forge-exodo-fields');
        const en = document.getElementById('forge-envolto-fields');
        const or = document.getElementById('forge-ordem-fields');
        if(ex) ex.style.display = schema.key==='exodo' ? '' : 'none';
        if(en) en.style.display = schema.key==='envolto' ? '' : 'none';
        if(or) or.style.display = schema.key==='ordem' ? '' : 'none';
        const categoryWrap = categoryEl?.closest('.form-group');
        if(categoryWrap) categoryWrap.style.display = schema.categories.length ? '' : 'none';
        updateForgeCost();
    }

    function getForgeVectorValues(){ return [...document.getElementById('forge-vectors')?.selectedOptions || []].map(o=>o.value); }

    window.updateForgeCost = function(){
        const targetChar = msForgeContext==='sheet' ? currentBuilderCharacter() : getVttCharById(document.getElementById('forge-recipient')?.value) || currentBuilderCharacter();
        const schema = forgeSchema(targetChar);
        const ch = document.getElementById('forge-chassis');
        const base = Number(ch?.selectedOptions?.[0]?.dataset?.pe || 0);
        const stage = Math.min(10, Math.max(1, Number(document.getElementById('forge-stage')?.value || 1)));
        const vectors = getForgeVectorValues();
        let total = base;
        let lines = [`Chassi ${base} PE`];
        let details = {};

        if(schema.key==='exodo'){
            const vectorPE = vectors.length*5, esPE=stage*2;
            const mm=Number(document.getElementById('forge-mcp-multi')?.value||0);
            const me=Number(document.getElementById('forge-mcp-effect')?.value||0);
            const mcp=(mm||me) ? Math.max(10,3*mm)+2*me : 0;
            const extras=Number(document.getElementById('forge-extras')?.value||0);
            total += vectorPE+esPE+mcp+extras;
            details={vectorPE,esPE,mcp,extras};
            lines.push(`${vectorPE} PE VF`, `${esPE} PE ES ${stage}`, `${mcp} PE MCP`, `${extras} PE Extras`);
        } else if(schema.key==='ocultatun'){
            const vectorPE=vectors.length*5, esPE=stage*2, discount=document.getElementById('forge-category')?.value==='Ritualístico'?-5:0;
            total += vectorPE+esPE+discount;
            details={vectorPE,esPE,discount};
            lines.push(`${vectorPE} PE VM`, `${esPE} PE ES ${stage}`, `${discount} PE categoria`);
        } else if(schema.key==='envolto'){
            const residueCost=Number(document.getElementById('forge-residue')?.selectedOptions?.[0]?.dataset?.pe||0);
            const valve=Number(document.getElementById('forge-valve')?.value||0);
            const valveCost=[0,6,12][Math.max(0,Math.min(2,valve))]||0;
            const curse=document.getElementById('forge-curse')?.value ? -5 : 0;
            total += residueCost+valveCost+curse;
            details={residueCost,valveCost,curse,valve};
            lines.push(`${residueCost} PE enxerto`, `${valveCost} PE válvula T${valve}`, `${curse} PE maldição`);
        } else if(schema.key==='ordem'){
            const vectorPE=vectors.length*5, esPE=stage*2;
            total += vectorPE+esPE;
            details={vectorPE,esPE};
            lines.push(`${vectorPE} PE Ascensões`, `${esPE} PE ES ${stage}`);
        }
        const preview=document.getElementById('forge-preview');
        if(preview) preview.innerHTML=`<b>Custo estimado: ${total} PE</b><span>${lines.map(esc).join(' · ')}</span>`;
        return {schema,base,stage,vectors,total,details};
    };

    function buildForgeItem(target){
        const calc=updateForgeCost();
        const schema=calc.schema;
        const name=document.getElementById('forge-name')?.value.trim();
        if(!name) throw new Error('Defina o nome do item.');
        const chassis=document.getElementById('forge-chassis').value;
        const effect=document.getElementById('forge-effect').value.trim();
        const item={id:`eq-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,chassis,pe:calc.total,effect,source:'Forja oficial do site',system:schema.key};
        if(schema.key==='exodo'){
            const mm=Number(document.getElementById('forge-mcp-multi')?.value||0), me=Number(document.getElementById('forge-mcp-effect')?.value||0), stage=calc.stage;
            item.category=document.getElementById('forge-category').value;
            item.stage=stage; item.vectors=calc.vectors; item.integrity=Math.round(10+Number(document.getElementById('forge-chassis').selectedOptions[0].dataset.pe||0)/2);
            item.saturation=calc.vectors.reduce((sum,v)=>sum+({Emissão:4,'Cinético':2,Biótico:3,Psíquico:5,Sensorial:1,Temporal:5,Contenção:2}[v]||0),0)+(mm||me?2:0);
            item.mcp={multi:3*mm,effect:2*me}; item.extras=Number(document.getElementById('forge-extras')?.value||0);
        } else if(schema.key==='ocultatun'){
            item.category=document.getElementById('forge-category').value; item.stage=calc.stage; item.vectors=calc.vectors;
            const vig=Number(target?.stats?.vig||document.getElementById('attr-vig')?.value||0); item.charges=10+vig-calc.stage;
            item.activation=item.category==='Anômalo'?'Ao ativar: 1d4 Dano Mental (Sanidade) ou -5 PV.':'Após a missão, teste de degradação; o item ritualístico pode enferrujar/perder potência.';
        } else if(schema.key==='envolto'){
            item.category='Artefato Blasfemo'; item.residue=document.getElementById('forge-residue').value; item.valveTier=Number(document.getElementById('forge-valve').value||0); item.curse=document.getElementById('forge-curse').value || '';
            item.integrity={pv:Math.max(10,Math.round(10+(Number(document.getElementById('forge-chassis').selectedOptions[0].dataset.pe||0)*1.5))),rd:item.chassis==='Proteção'?10:5};
            item.activation='Canaliza a Energia do Envolto/EE do usuário conforme a válvula instalada.';
        } else if(schema.key==='ordem'){
            item.category='Dádiva'; item.stage=calc.stage; item.vectors=calc.vectors; item.purpose=document.getElementById('forge-purpose').value.trim();
            if(!item.purpose) throw new Error('A Dádiva exige um Propósito Sagrado.');
            const vig=Number(target?.stats?.vig||document.getElementById('attr-vig')?.value||0); item.charges=10+vig-calc.stage; item.forgeDC=10+calc.stage; item.recordacaoMin=25;
        }
        return normalizeEquipment(item);
    }

    window.openForgeForCurrentSheet = function(){
        msForgeContext='sheet';
        const modal=document.getElementById('forge-modal'); if(!modal)return;
        document.getElementById('forge-name').value=''; document.getElementById('forge-stage').value='1'; document.getElementById('forge-effect').value='';
        document.getElementById('forge-eyebrow').textContent='ARSENAL · FORJA DE FICHA';
        const schema=forgeSchema(currentBuilderCharacter());
        document.getElementById('forge-title').textContent=schema.title;
        document.getElementById('forge-subtitle').textContent=schema.subtitle;
        refreshForgeFields(currentBuilderCharacter());
        populateForgeRecipients();
        modal.style.display='flex';
    };

    window.openForgeWindow = function(){
        msForgeContext='vtt';
        const modal=document.getElementById('forge-modal'); if(!modal)return;
        const mode=getTableGameMode();
        const first=getVttCharById(document.getElementById('forge-recipient')?.value) || tablePlayers.find(p=>!p.isNPC) || {mode};
        const schema=forgeSchema(first);
        document.getElementById('forge-name').value=''; document.getElementById('forge-stage').value='1'; document.getElementById('forge-effect').value='';
        document.getElementById('forge-eyebrow').textContent='FORJA MULTISSISTEMA · PE';
        document.getElementById('forge-title').textContent=schema.title;
        document.getElementById('forge-subtitle').textContent=schema.subtitle;
        refreshForgeFields(first);
        populateForgeRecipients();
        modal.style.display='flex';
    };

    window.populateForgeRecipients = function(){
        const s=document.getElementById('forge-recipient'); if(!s)return;
        const mode=getTableGameMode();
        const targetList=tablePlayers.filter(p=>!p.isNPC);
        s.innerHTML=targetList.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.nature||p.mode||mode)}</option>`).join('');
        if(!s.innerHTML) s.innerHTML='<option value="">Nenhum jogador compatível</option>';
        s.onchange=()=>{ if(msForgeContext==='vtt'){ const c=getVttCharById(s.value); const schema=forgeSchema(c||{}); document.getElementById('forge-title').textContent=schema.title; document.getElementById('forge-subtitle').textContent=schema.subtitle; refreshForgeFields(c||{}); } };
    };

    window.forgeItemForTable = function(){
        try{
            const target = msForgeContext==='sheet' ? currentBuilderCharacter() : getVttCharById(document.getElementById('forge-recipient')?.value);
            if(msForgeContext==='vtt' && !target) throw new Error('Defina um destinatário.');
            const item=buildForgeItem(target);
            if(msForgeContext==='sheet'){
                currentSheetEquipment.push(item);
                renderEquipmentSheet();
                closeForgeWindow();
                alert(`${item.name} foi adicionado à ficha. O custo calculado é ${item.pe} PE.`);
            } else {
                target.equipment=Array.isArray(target.equipment)?target.equipment:[];
                target.equipment.push(item);
                syncVttCharacterToOwner(target);
                currentTableData=currentTableData||{};
                currentTableData.forgedItems=Array.isArray(currentTableData.forgedItems)?currentTableData.forgedItems:[];
                currentTableData.forgedItems.push(item);
                renderVttCards(); renderVttEquipment(); renderEquipmentShop(); closeForgeWindow();
                alert(`${item.name} foi forjado e entregue a ${target.name}.`);
            }
        }catch(e){ alert(e.message || 'Não foi possível concluir a forja.'); }
    };

    window.closeForgeWindow = function(){ const m=document.getElementById('forge-modal'); if(m)m.style.display='none'; };

    // The existing equipment profile is refined so all four equipment architectures remain distinct.
    window.getEquipmentProfile = function(char=currentBuilderCharacter()){
        const {mode,nature}=charModeNature(char);
        if(nature==='O Envolto (Horror Cósmico)') return {mode,key:'envolto',eyebrow:'OCULTATUN · ENVOLTO',title:'Engenharia do Blasfemo',subtitle:'Chassi Profano, Resíduo Ontológico, Válvula de Potência e Gatilho de Falha.',addTitle:'Registrar Artefato Blasfemo',addSubtitle:'Use a forja para calcular o PE e registrar enxertos do Espaço Final.',labels:['Nome do artefato','Categoria / chassi','Resíduo / válvula / maldição','Efeito / corrupção'],placeholders:['Ex.: Lâmina que Chora','Artefato Blasfemo · Padrão','Carne Estática · T1 · Fome','Descrição e falha'],fields:'envolto'};
        if(nature==='A Ordem dos Sete (Alta Glória)') return {mode,key:'ordem',eyebrow:'OCULTATUN · ORDEM DOS SETE',title:'Dádivas Forjadas',subtitle:'Chassi Divino + Ascensões + Estágio + Propósito; cargas de integridade e Estase Dimensional.',addTitle:'Registrar Dádiva',addSubtitle:'Dádivas são estáveis e exigem Propósito Sagrado.',labels:['Nome da Dádiva','Chassi / categoria','Ascensões · ES · cargas','Propósito / efeito'],placeholders:['Ex.: Lança da Revelação','Dádiva · Padrão','Arkhé + Ex-Nihilo · ES 4','Propósito e efeito'],fields:'ordem'};
        if(mode==='exodo') return {mode,key:'exodo',eyebrow:'ÊXODO · ENGENHARIA',title:'Dispositivos & Equipamentos',subtitle:'PE = Chassi + VF + ES + MCP + Extras. O inventário acompanha o sistema técnico de Êxodo.',addTitle:'Registrar equipamento de Êxodo',addSubtitle:'Use a Forja para calcular PE, VF, ES, MCP e Integridade.',labels:['Nome do item','Categoria / tipo','PE · VF · ES · MCP','Efeito / função'],placeholders:['Ex.: Braçadeira Neurocinética','Dispositivo · VF Cinético','28 PE · ES 4 · MCP 0','Descrição'],fields:'exodo'};
        return {mode:'ocultatun',key:'ocultatun',eyebrow:'OCULTATUN · ARSENAL',title:'Arsenal Anômalo & Ritualístico',subtitle:'PE = Chassi + VM + ES + Categoria. Cargas e Gamma Lock pertencem ao próprio item.',addTitle:'Registrar equipamento da Ocultatun',addSubtitle:'Use a Forja para calcular Chassi, VM, ES e categoria.',labels:['Nome do item','Categoria / tipo','PE · ES · Cargas','Efeito / VM / observações'],placeholders:['Lâmina, rifle, dispositivo...','Ritualístico ou Anômalo · Chassi','Ex.: 11 PE · ES 3 · 10 cargas','Descrição'],fields:'ocultatun'};
    };
    window.applyEquipmentProfile = function(char=currentBuilderCharacter()){
        const p=getEquipmentProfile(char); const set=(id,val)=>{const e=document.getElementById(id); if(e)e.textContent=val;};
        set('equipment-sheet-eyebrow',p.eyebrow); set('equipment-sheet-title',p.title); set('equipment-sheet-subtitle',p.subtitle); set('equipment-add-eyebrow',p.eyebrow); set('equipment-add-title',p.addTitle); set('equipment-add-subtitle',p.addSubtitle);
        ['name','type','meta','effect'].forEach((k,i)=>{set(`sheet-eq-${k}-label`,p.labels[i]); const e=document.getElementById(`sheet-eq-${k}`); if(e)e.placeholder=p.placeholders[i];});
        const profile=document.getElementById('equipment-sheet-profile');
        if(profile){
            const data={
                exodo:['PE técnico','Chassi + VF + ES','MCP + Extras','Integridade / Saturação'],
                ocultatun:['PE de Arsenal','Chassi + VM + ES','Ritualístico / Anômalo','Cargas / Gamma Lock'],
                envolto:['PE blasfemo','Chassi + Resíduo','Válvula + Maldição','PV/RD do artefato'],
                ordem:['PE sagrado','Chassi + Ascensões','ES + Propósito','Cargas / Estase']
            }[p.key] || [];
            profile.innerHTML=data.map(x=>`<span>${esc(x)}</span>`).join('');
        }
    };
    window.renderEquipmentSheet = function(){
        const c=document.getElementById('equipment-sheet-list'); if(!c)return;
        applyEquipmentProfile(); c.innerHTML='';
        if(!currentSheetEquipment.length){ c.innerHTML='<div class="equipment-empty">Nenhum item registrado nesta ficha.</div>'; return; }
        const p=getEquipmentProfile();
        currentSheetEquipment.forEach((it,i)=>{
            let meta='';
            if(p.key==='exodo') meta=`<span><b>PE</b>${esc(it.pe??'—')}</span><span><b>ES</b>${esc(it.stage??'—')}</span><span><b>VF</b>${esc((it.vectors||[]).join(', ')||'—')}</span><span><b>Int.</b>${esc(it.integrity??'—')}</span>`;
            else if(p.key==='ocultatun') meta=`<span><b>PE</b>${esc(it.pe??'—')}</span><span><b>ES</b>${esc(it.stage??'—')}</span><span><b>Cargas</b>${esc(it.charges??'—')}</span><span><b>Cat.</b>${esc(it.category||'—')}</span>`;
            else if(p.key==='envolto') meta=`<span><b>PE</b>${esc(it.pe??'—')}</span><span><b>Resíduo</b>${esc(it.residue||'—')}</span><span><b>Válvula</b>T${esc(it.valveTier??0)}</span><span><b>Falha</b>${esc(it.curse||'—')}</span>`;
            else meta=`<span><b>PE</b>${esc(it.pe??'—')}</span><span><b>ES</b>${esc(it.stage??'—')}</span><span><b>Cargas</b>${esc(it.charges??'—')}</span><span><b>Propósito</b>${esc(it.purpose||'—')}</span>`;
            c.innerHTML += `<article class="equipment-item-card ${it.category==='Anômalo'||it.system==='envolto'?'anomalous':''} mode-${p.key}"><div class="equipment-item-main"><span class="equipment-tag">${esc(it.category||'Equipamento')}</span><h4>${esc(it.name)}</h4><p>${esc(it.effect||'Sem descrição.')}</p></div><div class="equipment-item-meta">${meta}<button class="hide-on-view equipment-remove" onclick="removeEquipmentFromCurrentSheet(${i})">×</button></div></article>`;
        });
    };
    window.addEquipmentToCurrentSheet = function(){
        const p=getEquipmentProfile(); const name=document.getElementById('sheet-eq-name').value.trim(); if(!name)return alert('Dê um nome ao item.');
        const type=document.getElementById('sheet-eq-type').value.trim()||'Equipamento'; const meta=document.getElementById('sheet-eq-meta').value.trim(); const effect=document.getElementById('sheet-eq-effect').value.trim()||'Sem descrição.';
        const item={name,category:type,effect,notes:meta,source:'Registro manual',system:p.key};
        if(p.key==='exodo'){item.link=meta;item.status='Íntegro';}
        else if(p.key==='ocultatun'){item.pe='—';item.stage='—';item.charges='—';}
        else if(p.key==='envolto'){item.pe='—';item.residue=meta;}
        else {item.pe='—';item.stage='—';item.charges='—';item.purpose=meta;}
        currentSheetEquipment.push(normalizeEquipment(item)); renderEquipmentSheet(); document.getElementById('equipment-add-modal').style.display='none'; ['sheet-eq-name','sheet-eq-type','sheet-eq-meta','sheet-eq-effect'].forEach(id=>document.getElementById(id).value='');
    };
    window.removeEquipmentFromCurrentSheet = function(i){ if(!isEditMode)return; currentSheetEquipment.splice(i,1); renderEquipmentSheet(); };

    const _openEquipmentAddModal=window.openEquipmentAddModal;
    window.openEquipmentAddModal=function(){ applyEquipmentProfile(); _openEquipmentAddModal(); };

    // Let the VTT equipment browser understand all four architectures.
    window.renderVttEquipment = function(){
        const c=document.getElementById('vtt-equipment-list'); if(!c)return; c.innerHTML='';
        if(!tablePlayers.length){c.innerHTML='<div class="equipment-empty">Nenhuma ficha presente na mesa.</div>';return;}
        tablePlayers.forEach((p,i)=>{
            const items=Array.isArray(p.equipment)?p.equipment:[], prof=getEquipmentProfile(p);
            c.innerHTML += `<section class="vtt-player-arsenal mode-${prof.key}"><div class="vtt-player-arsenal-head"><div><span class="eyebrow">${esc(prof.eyebrow)}</span><h4>${esc(p.name)}</h4><p>${esc(prof.subtitle)}</p></div><button class="souls-btn small-btn" onclick="openCharacterEquipmentFromVtt(${i})">ABRIR FICHA</button></div>${items.length ? items.map(it=>{ const bits=prof.key==='exodo'?`PE ${it.pe??'—'} · ES ${it.stage??'—'}`:prof.key==='ocultatun'?`PE ${it.pe??'—'} · ES ${it.stage??'—'} · Cargas ${it.charges??'—'}`:prof.key==='envolto'?`PE ${it.pe??'—'} · Válvula T${it.valveTier??0}`:`PE ${it.pe??'—'} · ES ${it.stage??'—'} · Cargas ${it.charges??'—'}`; return `<div class="vtt-eq-row"><div><b>${esc(it.name)}</b><span>${esc(it.category||'Equipamento')} · ${esc(bits)}</span></div><p>${esc(it.effect||'')}</p></div>`; }).join('') : '<div class="equipment-empty compact">Sem equipamentos registrados.</div>'}</section>`;
        });
    };

    // Add a visible builder-forge button next to the manual item button.
    const eqHead=document.querySelector('#tab-equipment .equipment-sheet-head');
    if(eqHead && !document.getElementById('btn-forge-sheet-item')){
        const b=document.createElement('button'); b.type='button'; b.id='btn-forge-sheet-item'; b.className='souls-btn small-btn hide-on-view'; b.textContent='⚒ FORJAR ITEM'; b.onclick=()=>openForgeForCurrentSheet(); eqHead.appendChild(b);
    }

    // Initialize once DOM is ready. The script is loaded at the end of body, so a microtask is sufficient.
    Promise.resolve().then(()=>{ syncHermeticRitualUI(); applyEquipmentProfile(); renderEquipmentSheet(); });
})();


// =====================================================================
// V0.39 — ALQUERINO · LABORATÓRIO DE SÍNTESE / INGREDIENTES / 9 CAMINHOS OFICIAIS
// Conteúdo canônico baseado no Livro Base — Ocultaton: Ecos 1.5.
// =====================================================================
(function(){
    const ALCHEMY_INGREDIENTS = [
      ['água de chuva coletada durante um fenômeno anômalo','R2'],['olho de criatura precognitiva','R3'],['página escrita antes do evento que descreve','R3'],
      ['cristal de memória temporal','R3'],['pena de ave que nunca pousou','R3'],['sangue de alguém que teve déjà-vu anômalo','R2'],
      ['relógio parado em uma morte','R4'],['olho de vidente','R4'],['tinta feita de memória futura','R4'],
      ['fragmento de objeto anômalo destruído','R4'],['sangue de testemunha morta','R4'],['cinza de documento apagado da história','R5'],
      ['segundo ponteiro de relógio que marcou um instante inexistente','R5'],['memória de uma pessoa apagada','R5'],['lágrima de alguém que ainda não morreu','R6'],
      ['fragmento de linha temporal colapsada','R6'],['sangue de viajante temporal','R6'],['fotografia de acontecimento que nunca aconteceu','R6'],
      ['primeiro instante de uma linha temporal','R7'],['último instante de uma linha temporal','R7'],['conhecimento de uma entidade temporal','R7'],
      ['sangue de penitente','R2'],['erva cultivada em local de sofrimento','R2'],['água benta ou equivalente ritual','R2'],
      ['lágrima de pessoa que perdoou seu maior inimigo','R3'],['cinza de confissão','R3'],['flor que cresce sobre sepultura','R2'],
      ['tecido regenerativo anômalo','R4'],['sangue de criatura regenerativa','R4'],['cicatriz voluntariamente reaberta','R3'],
      ['lágrima de criatura sobrenatural','R4'],['coração de animal empático','R4'],['confissão escrita por alguém condenado','R5'],
      ['coração de mártir','R5'],['sangue de três espécies diferentes','R5'],['relíquia de alguém que morreu por outra pessoa','R6'],
      ['tecido de entidade regenerativa Classe B','R6'],['essência vital preservada','R6'],['relíquia de um santo, mártir ou equivalente','R6'],
      ['fragmento de vida primordial','R7'],['sofrimento condenado','R7'],['conceito de perdão','R7'],
      ['pena de entidade celeste','R3'],['cinza de fogo sobrenatural','R2'],['sangue de criatura voadora','R2'],
      ['pena celestial','R3'],['carvão de incêndio anômalo','R3'],['óleo solar','R3'],
      ['osso de entidade alada','R4'],['chama de fenômeno paranormal','R4'],['metal que não projeta sombra','R3'],
      ['sangue de entidade celestial','R5'],['pena de arcanjo','R5'],['fogo de estrela anômala','R5'],
      ['seis penas celestiais diferentes','R6'],['fragmento de estrela','R6'],['lágrima de entidade divina','R6'],
      ['coração de entidade celeste','R6'],['cinza de anjo','R6'],['fragmento de espaço sagrado','R6'],
      ['essência de divindade','R7'],['chama primordial','R7'],['nome verdadeiro de uma entidade celeste','R7'],
      ['corda de execução','R2'],['sangue de alguém condenado injustamente','R3'],['carta do Enforcado','R3'],
      ['objeto de alguém que sacrificou a própria vida','R3'],['sangue de mártir','R3'],['fio de destino','R4'],
      ['poeira de nexo','EX'],['arrependimento','EX'],['mercúrio','EX']
    ].map(([name,rarity],i)=>({id:`ing-${i+1}`,name,rarity}));

    const P = (path,seq,name,cap,cd,effect,ingredients,cost='') => ({id:`${path.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${seq}`,source:'official',path,seq,name,cap,cd,effect,cost,ingredients});
    const OFFICIAL_PATHS = {
      "Profeta": {
        "philosophy": "O futuro não é destino. É uma consequência que ainda não aconteceu.\" O Profeta aprende a perceber o antes e o depois dos acontecimentos, tendo a consciência causal como sua divindade.  * I - O Ouvinte (Cap. 2 / CD 13): Recebe Pré-Cognição menor. Uma vez por cena, pode perguntar ao Mestre: \"Qual é o maior perigo imediato desta situação?\" e receber uma resposta honesta. Ingredientes: Água de chuva anômala (R2); olho de criatura precognitiva (R3); página escrita antes do evento (R3).  * II - O Vidente (Cap. 3 / CD 16): Uma vez por cena: +5 Defesa Passiva contra o primeiro ataque. Pode declarar \"Eu já vi isso\" para repetir um teste de Percepção/Prontidão recém-falhado. Ingredientes: Cristal de memória temporal (R3); pena de ave que nunca pousou (R3); sangue de alguém com déjà-vu anômalo (R2).  * III - O Profeta (Cap. 4 / CD 19): Recebe Pré-Cognição de Combate e +2 em Iniciativa. No início do combate, pode perguntar ao Mestre: quem atacará primeiro, qual inimigo tem maior intenção hostil ou a ação provável de um inimigo. Ingredientes: Relógio parado em uma morte (R4); olho de vidente (R4); tinta de memória futura (R4).  * IV - O Oráculo (Cap. 5 / CD 22): Recebe Pós-Cognição. Gastando 2 ES, pode tocar objeto/local e observar eventos de até 7 dias atrás, podendo fazer uma pergunta sobre a visão. Ingredientes: Fragmento de objeto anômalo destruído (R4); sangue de testemunha morta (R4); cinza de documento apagado (R5).  * V - O Testemunho (Cap. 7 / CD 25): Uma vez por cena, antes de uma ação de um aliado, pode declarar \"Eu sei que isso vai funcionar",
        "nodes": [
          {
            "id": "official-1-1",
            "source": "official",
            "path": "Profeta",
            "seq": 1,
            "name": "O Ouvinte",
            "cap": 2,
            "cd": 13,
            "effect": "Recebe Pré-Cognição menor. Uma vez por cena, pode perguntar ao Mestre: \"Qual é o maior perigo imediato desta situação?\" e receber uma resposta honesta.",
            "cost": "",
            "ingredients": [
              "Água de chuva anômala (R2)",
              "olho de criatura precognitiva (R3)",
              "página escrita antes do evento (R3)"
            ]
          },
          {
            "id": "official-1-2",
            "source": "official",
            "path": "Profeta",
            "seq": 2,
            "name": "O Vidente",
            "cap": 3,
            "cd": 16,
            "effect": "Uma vez por cena: +5 Defesa Passiva contra o primeiro ataque. Pode declarar \"Eu já vi isso\" para repetir um teste de Percepção/Prontidão recém-falhado.",
            "cost": "",
            "ingredients": [
              "Cristal de memória temporal (R3)",
              "pena de ave que nunca pousou (R3)",
              "sangue de alguém com déjà-vu anômalo (R2)"
            ]
          },
          {
            "id": "official-1-3",
            "source": "official",
            "path": "Profeta",
            "seq": 3,
            "name": "O Profeta",
            "cap": 4,
            "cd": 19,
            "effect": "Recebe Pré-Cognição de Combate e +2 em Iniciativa. No início do combate, pode perguntar ao Mestre: quem atacará primeiro, qual inimigo tem maior intenção hostil ou a ação provável de um inimigo.",
            "cost": "",
            "ingredients": [
              "Relógio parado em uma morte (R4)",
              "olho de vidente (R4)",
              "tinta de memória futura (R4)"
            ]
          },
          {
            "id": "official-1-4",
            "source": "official",
            "path": "Profeta",
            "seq": 4,
            "name": "O Oráculo",
            "cap": 5,
            "cd": 22,
            "effect": "Recebe Pós-Cognição. Gastando 2 ES, pode tocar objeto/local e observar eventos de até 7 dias atrás, podendo fazer uma pergunta sobre a visão.",
            "cost": "",
            "ingredients": [
              "Fragmento de objeto anômalo destruído (R4)",
              "sangue de testemunha morta (R4)",
              "cinza de documento apagado (R5)"
            ]
          },
          {
            "id": "official-1-5",
            "source": "official",
            "path": "Profeta",
            "seq": 5,
            "name": "O Testemunho",
            "cap": 7,
            "cd": 25,
            "effect": "Uma vez por cena, antes de uma ação de um aliado, pode declarar \"Eu sei que isso vai funcionar\". Se o aliado falhar, permite uma segunda rolagem.",
            "cost": "",
            "ingredients": [
              "Segundo ponteiro de relógio de instante inexistente (R5)",
              "memória de pessoa apagada (R5)",
              "lágrima de alguém que não morreu (R6)"
            ]
          },
          {
            "id": "official-1-6",
            "source": "official",
            "path": "Profeta",
            "seq": 6,
            "name": "O Visionário",
            "cap": 8,
            "cd": 28,
            "effect": "Pode observar 1 minuto do futuro e alterar uma decisão pessoal. Uma vez por descanso longo (Reescrever Instante): ao ser atingido, retorna sua posição e estado para o início da rodada.",
            "cost": "",
            "ingredients": [
              "Fragmento de linha temporal colapsada (R6)",
              "sangue de viajante temporal (R6)",
              "fotografia de evento inexistente (R6)"
            ]
          },
          {
            "id": "official-1-7",
            "source": "official",
            "path": "Profeta",
            "seq": 7,
            "name": "O Profeta Eterno",
            "cap": 10,
            "cd": 31,
            "effect": "Observa passado, presente e futuros possíveis. Uma vez por sessão, pode perguntar \"Qual acontecimento precisa ocorrer para que X seja possível?\" e receber uma resposta verdadeira.",
            "cost": "",
            "ingredients": [
              "Primeiro instante de uma linha temporal (R7)",
              "último instante de uma linha temporal (R7)",
              "conhecimento de entidade temporal (R7)"
            ]
          }
        ]
      },
      "Penitente": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-2-1",
            "source": "official",
            "path": "Penitente",
            "seq": 1,
            "name": "O Arrependido",
            "cap": 2,
            "cd": 13,
            "effect": "Resistência Emocional +3. Pode reduzir uma condição mental Leve para nenhuma uma vez por cena.",
            "cost": "",
            "ingredients": [
              "Sangue de penitente (R2)",
              "erva de local de sofrimento (R2)",
              "água benta ou equivalente (R2)"
            ]
          },
          {
            "id": "official-2-2",
            "source": "official",
            "path": "Penitente",
            "seq": 2,
            "name": "O Disciplinado",
            "cap": 3,
            "cd": 16,
            "effect": "Imunidade a medo comum e intimidação mundana. Gasta 1 ES para remover condição emocional Leve.",
            "cost": "",
            "ingredients": [
              "Lágrima de pessoa que perdoou inimigo (R3)",
              "cinza de confissão (R3)",
              "flor sobre sepultura (R2)"
            ]
          },
          {
            "id": "official-2-3",
            "source": "official",
            "path": "Penitente",
            "seq": 3,
            "name": "O Flagelado",
            "cap": 4,
            "cd": 19,
            "effect": "Regeneração 2 PV/rodada (não funciona a 0 PV). Pode converter 5 PV perdidos em +2 num teste de Vontade.",
            "cost": "",
            "ingredients": [
              "Tecido regenerativo anômalo (R4)",
              "sangue de criatura regenerativa (R4)",
              "cicatriz reaberta voluntariamente (R3)"
            ]
          },
          {
            "id": "official-2-4",
            "source": "official",
            "path": "Penitente",
            "seq": 4,
            "name": "O Confessor",
            "cap": 5,
            "cd": 22,
            "effect": "Controla emoções (Ação Padrão + 3 ES). Alvo faz Vontade (CD 10 + PRE + 5); falha permite remover medo, acalmar pânico, induzir tristeza ou impedir reação emocional.",
            "cost": "",
            "ingredients": [
              "Lágrima de criatura sobrenatural (R4)",
              "coração de animal empático (R4)",
              "confissão de condenado (R5)"
            ]
          },
          {
            "id": "official-2-5",
            "source": "official",
            "path": "Penitente",
            "seq": 5,
            "name": "O Mártir",
            "cap": 7,
            "cd": 25,
            "effect": "Regeneração 5 PV/rodada. Como Reação + 2 ES (1x/rodada), transfere até 10 PV de dano de um aliado a até 9m para si.",
            "cost": "",
            "ingredients": [
              "Coração de mártir (R5)",
              "sangue de 3 espécies diferentes (R5)",
              "relíquia de sacrifício (R6)"
            ]
          },
          {
            "id": "official-2-6",
            "source": "official",
            "path": "Penitente",
            "seq": 6,
            "name": "O Santo",
            "cap": 8,
            "cd": 28,
            "effect": "Regeneração 10 PV/rodada. Pode restaurar ossos, órgãos e membros. Uma vez por descanso longo (Ressurreição Parcial): traz de volta cadáver morto há até 24h com 1 PV.",
            "cost": "",
            "ingredients": [
              "Tecido regenerativo Classe B (R6)",
              "essência vital preservada (R6)",
              "relíquia de santo/mártir (R6)"
            ]
          },
          {
            "id": "official-2-7",
            "source": "official",
            "path": "Penitente",
            "seq": 7,
            "name": "O Penitente Divino",
            "cap": 10,
            "cd": 31,
            "effect": "O usuário representa a Redenção através do sofrimento. Regenera aliados, restaura corpos e divide o sofrimento (mas não remove o sofrimento sem assumir consequência equivalente).",
            "cost": "",
            "ingredients": [
              "Fragmento de vida primordial (R7)",
              "sofrimento condensado (R7)",
              "conceito de perdão (R7)"
            ]
          }
        ]
      },
      "Arcanjo": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-3-1",
            "source": "official",
            "path": "Arcanjo",
            "seq": 1,
            "name": "A Asas",
            "cap": 2,
            "cd": 13,
            "effect": "Recebe +2 AGI e manifesta asas temporárias (Voo: 12 metros).",
            "cost": "",
            "ingredients": [
              "Pena de entidade celeste (R3)",
              "cinza de fogo sobrenatural (R2)",
              "sangue de criatura voadora (R2)"
            ]
          },
          {
            "id": "official-3-2",
            "source": "official",
            "path": "Arcanjo",
            "seq": 2,
            "name": "O Serafim Menor",
            "cap": 3,
            "cd": 16,
            "effect": "Resistência a fogo 5. Produz fogo angelical (1d6 de dano energético).",
            "cost": "",
            "ingredients": [
              "Pena celestial (R3)",
              "carvão de incêndio anômalo (R3)",
              "óleo solar (R3)"
            ]
          },
          {
            "id": "official-3-3",
            "source": "official",
            "path": "Arcanjo",
            "seq": 3,
            "name": "O Guardião",
            "cap": 4,
            "cd": 19,
            "effect": "Voo: 25 metros. Recebe +3 Defesa Passiva e Fogo angelical causa 2d6.",
            "cost": "",
            "ingredients": [
              "Osso de entidade alada (R4)",
              "chama paranormal (R4)",
              "metal sem sombra (R3)"
            ]
          },
          {
            "id": "official-3-4",
            "source": "official",
            "path": "Arcanjo",
            "seq": 4,
            "name": "O Anjo",
            "cap": 5,
            "cd": 22,
            "effect": "Transformação Angelical (Ação Rápida + 3 ES). Durante a cena: asas, olhos luminosos, RD físico 5, voo 30m e Fogo angelical 3d6.",
            "cost": "",
            "ingredients": [
              "Sangue de entidade celestial (R5)",
              "pena de arcanjo (R5)",
              "fogo de estrela anômala (R5)"
            ]
          },
          {
            "id": "official-3-5",
            "source": "official",
            "path": "Arcanjo",
            "seq": 5,
            "name": "O Serafim",
            "cap": 7,
            "cd": 25,
            "effect": "Transformação completa. Recebe +4 AGI, RD 10 e Fogo Angelical 5d6 (pode emitir rajada de 6m).",
            "cost": "",
            "ingredients": [
              "Seis penas celestiais diferentes (R6)",
              "fragmento de estrela (R6)",
              "lágrima de divindade (R6)"
            ]
          },
          {
            "id": "official-3-6",
            "source": "official",
            "path": "Arcanjo",
            "seq": 6,
            "name": "O Arcanjo",
            "cap": 8,
            "cd": 28,
            "effect": "Velocidade sobrenatural. Uma vez por rodada, realiza Ação de Movimento extra. Fogo angelical 8d6. Pode teleportar-se 18m como Ação Rápida.",
            "cost": "",
            "ingredients": [
              "Coração de entidade celeste (R6)",
              "cinza de anjo (R6)",
              "fragmento de espaço sagrado (R6)"
            ]
          },
          {
            "id": "official-3-7",
            "source": "official",
            "path": "Arcanjo",
            "seq": 7,
            "name": "O Arcanjo Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Torna-se entidade angelológica com aura sagrada. Cria fogo celestial sem reagentes e impõe autoridade conceitual.",
            "cost": "",
            "ingredients": [
              "Essência de divindade (R7)",
              "chama primordial (R7)",
              "nome verdadeiro de entidade celeste (R7)"
            ]
          }
        ]
      },
      "O Enforcado": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-4-1",
            "source": "official",
            "path": "O Enforcado",
            "seq": 1,
            "name": "O Pendurado",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Pode suspender-se em superfícies. Recebe +2 em AGI e vantagem para escapar de contenção.",
            "cost": "",
            "ingredients": [
              "Corda de execução (R2)",
              "sangue de alguém condenado injustamente (R3)",
              "carta do Enforcado (R3)"
            ]
          },
          {
            "id": "official-4-2",
            "source": "official",
            "path": "O Enforcado",
            "seq": 2,
            "name": "O Sacrifício",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Pode transferir 5 PV próprios para conceder +5 em qualquer teste próprio ou de aliado. Utilizável uma vez por cena.",
            "cost": "",
            "ingredients": [
              "Objeto de alguém que sacrificou a própria vida (R3)",
              "sangue de mártir (R3)",
              "fio de destino (R4)"
            ]
          },
          {
            "id": "official-4-3",
            "source": "official",
            "path": "O Enforcado",
            "seq": 3,
            "name": "A Inversão",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Gastando 2 ES, pode inverter uma polaridade durante 1d4 rodadas: cima/baixo (gravidade local para um alvo), atração/repulsão ou direção de movimento. O alvo deve passar em um teste de Reflexos para não perder a ação.",
            "cost": "",
            "ingredients": [
              "Prisma anômalo que não refrata luz (R4)",
              "poeira de nexo magnético (R4)",
              "sangue de criatura Cisma (R3)"
            ]
          },
          {
            "id": "official-4-4",
            "source": "official",
            "path": "O Enforcado",
            "seq": 4,
            "name": "O Espelho",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: O sacrifício reflete o mal. Como Reação, ao ser atingido por um ataque, o Alquerino gasta 3 ES e perde 5 PV adicionais voluntariamente para espelhar o dano total recebido de volta ao agressor.",
            "cost": "",
            "ingredients": [
              "Fragmento de espelho que refletiu uma morte violenta (R4)",
              "corda manchada de sangue (R4)",
              "lágrima de um carrasco (R5)"
            ]
          },
          {
            "id": "official-4-5",
            "source": "official",
            "path": "O Enforcado",
            "seq": 5,
            "name": "O Mártir Invertido",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: Ao cair a 0 PV ou entrar na Condição Grave, pode gastar 5 ES para \"inverter\" a condição com um inimigo a até 9m. O inimigo faz um teste de Fortitude; se falhar, sofre dano equivalente à vida que o Agente recuperou (até o limite de 25% dos PV do Alquerino).",
            "cost": "",
            "ingredients": [
              "Osso de alguém executado de cabeça para baixo (R5)",
              "madeira de forca anômala (R5)",
              "essência de transmutação (R6)"
            ]
          },
          {
            "id": "official-4-6",
            "source": "official",
            "path": "O Enforcado",
            "seq": 6,
            "name": "A Gravidade Morta",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Como Ação Padrão, o Alquerino inverte as regras físicas de uma área (círculo de 18m). Inimigos \"caem\" para o teto, coberturas viram armadilhas. Custo de 5 ES. Duração de uma cena.",
            "cost": "",
            "ingredients": [
              "Cristal de nexo de Cisma (R6)",
              "corda tecida com cabelo de morto-vivo (R6)",
              "lágrima de quem perdeu toda a esperança (R6)"
            ]
          },
          {
            "id": "official-4-7",
            "source": "official",
            "path": "O Enforcado",
            "seq": 7,
            "name": "O Enforcado Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: O Alquerino se torna o princípio da Perspectiva Absoluta. Pode inverter permanentemente uma lei física local ou transformar a maior Vantagem/Imunidade de uma Entidade de Classe A em sua principal Vulnerabilidade.",
            "cost": "",
            "ingredients": [
              "Fio do destino rompido (R7)",
              "o último suspiro de um deus (R7)",
              "conceito de sacrifício absoluto (R7)"
            ]
          }
        ]
      },
      "O Diabo": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-5-1",
            "source": "official",
            "path": "O Diabo",
            "seq": 1,
            "name": "O Tentador",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Ao analisar um alvo por uma rodada, descobre seu maior desejo mundano ou fraqueza psicológica (Vontade anula). Recebe +5 em testes de Diplomacia ou Intimidação contra ele pelo resto da missão.",
            "cost": "",
            "ingredients": [
              "Moeda de ouro roubada de um túmulo (R2)",
              "saliva de um mentiroso compulsivo (R2)",
              "enxofre de fenômeno anômalo (R3)"
            ]
          },
          {
            "id": "official-5-2",
            "source": "official",
            "path": "O Diabo",
            "seq": 2,
            "name": "O Acordo",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Pode selar um \"pacto menor\" gastando 1 ES. Um aliado ganha +1d6 em seu próximo teste, mas o Alquerino ou o aliado sofre 1d6 de dano de Estresse ou Entrópico como pagamento imediato.",
            "cost": "",
            "ingredients": [
              "Contrato rabiscado com sangue (R3)",
              "cinza de documento queimado (R3)",
              "unha de criatura Instintiva (R3)"
            ]
          },
          {
            "id": "official-5-3",
            "source": "official",
            "path": "O Diabo",
            "seq": 3,
            "name": "As Correntes",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Manifesta correntes espirituais invisíveis (Ação Padrão, 3 ES). Um alvo a até 9m deve vencer um teste de Fortitude ou ficar Paralisado por 1d4 rodadas, tomando 2d6 de dano paranormal se tentar forçar a quebra.",
            "cost": "",
            "ingredients": [
              "Elo de corrente de um prisioneiro morto (R4)",
              "chifre de Entidade (R4)",
              "prata derretida em sangue (R3)"
            ]
          },
          {
            "id": "official-5-4",
            "source": "official",
            "path": "O Diabo",
            "seq": 4,
            "name": "O Marionetista",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: Dominação Mental para comandos complexos (Ação Padrão + 3 ES). O alvo deve passar em Vontade (CD 10 + PRE + 5 do Alquerino) ou cumprirá ordens destrutivas por 1 minuto.",
            "cost": "",
            "ingredients": [
              "Cérebro de criatura dominadora (R4)",
              "corda de marionete usada em crime (R4)",
              "lágrima de quem vendeu a alma (R5)"
            ]
          },
          {
            "id": "official-5-5",
            "source": "official",
            "path": "O Diabo",
            "seq": 5,
            "name": "O Desejo Distorcido",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: O Alquerino \"concede um desejo\" a um aliado ou inimigo. O efeito imita qualquer Potência de Capacidade 5, mas sempre carrega uma Maldição equivalente (Ex: cura total do alvo, mas inflige 2 pontos de Decadência ou Dano massivo a quem estiver adjacente).",
            "cost": "",
            "ingredients": [
              "Coração de Entidade de Classe C (R5)",
              "fruto colhido dentro de um Nexo (R5)",
              "gota do sangue do próprio Alquerino (R6)"
            ]
          },
          {
            "id": "official-5-6",
            "source": "official",
            "path": "O Diabo",
            "seq": 6,
            "name": "O Soberano",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Autoridade pactual absurda. O Alquerino pode escravizar temporariamente (1 cena) uma Entidade Consciente (Classe C) ou comandar uma Entidade Regional (Classe B) caso ela falhe em um teste de Vontade.",
            "cost": "",
            "ingredients": [
              "Coroa de rei ou governante esquecido (R6)",
              "cinzas de um pacto quebrado (R6)",
              "sangue de Entidade Regional (R6)"
            ]
          },
          {
            "id": "official-5-7",
            "source": "official",
            "path": "O Diabo",
            "seq": 7,
            "name": "O Diabo Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: Torna-se a própria encarnação do Pacto Abissal. Seus acordos reescrevem a causalidade. O Alquerino pode dominar a Vontade Divina de ameaças globais (Classe A) ou extrair poderes permanentes assinando contratos na própria alma.",
            "cost": "",
            "ingredients": [
              "Conceito de submissão pura (R7)",
              "contrato firmado nos alicerces do Abismo (R7)",
              "essência do primeiro traidor (R7)"
            ]
          }
        ]
      },
      "A Roda da Fortuna": {
        "philosophy": "O acaso é apenas uma matemática caprichosa que os tolos não conseguem calcular. A partir de hoje, sou eu quem gira a roda.\"  * I - O Sortudo (Cap. 2 / CD 13):    * Efeito: Distorção de probabilidade micro. Uma vez por cena, gastando 1 ES, o Alquerino pode rolar novamente qualquer teste seu ou de um aliado próximo e ficar com o melhor resultado.    * Ingredientes: Dado viciado de um apostador assassinado (R2); trevo que cresceu sobre sangue (R3); cinza de bilhete de aposta premiado (R2).  * II - O Azarão (Cap. 3 / CD 16):    * Efeito: Como uma Carga de Reação (1 ES), força um inimigo que acaba de declarar um ataque a rolar 2d20 e ficar com o pior resultado.    * Ingredientes: Objeto considerado amaldiçoado (R3); pelo de animal de mau agouro morto (R3); moeda gasta com ferrugem anômala (R3).  * III - O Ciclo (Cap. 4 / CD 19):    * Efeito: Pode alterar a Potência de Fluxo da realidade. Gastando 2 ES, o Alquerino prolonga a duração de um efeito, Condição (buff ou debuff) por 1d4 rodadas adicionais, ou encurta o efeito inimigo pela mesma quantia.    * Ingredientes: Relógio sem ponteiros (R4); areia de uma ampulheta anômala (R3); sangue de alguém que sobreviveu a múltiplos acidentes mortais (R4).  * IV - A Manipulação (Cap. 5 / CD 22):    * Efeito: \"Ancorar a Sorte",
        "nodes": [
          {
            "id": "official-6-1",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 1,
            "name": "O Sortudo",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Distorção de probabilidade micro. Uma vez por cena, gastando 1 ES, o Alquerino pode rolar novamente qualquer teste seu ou de um aliado próximo e ficar com o melhor resultado.",
            "cost": "",
            "ingredients": [
              "Dado viciado de um apostador assassinado (R2)",
              "trevo que cresceu sobre sangue (R3)",
              "cinza de bilhete de aposta premiado (R2)"
            ]
          },
          {
            "id": "official-6-2",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 2,
            "name": "O Azarão",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Como uma Carga de Reação (1 ES), força um inimigo que acaba de declarar um ataque a rolar 2d20 e ficar com o pior resultado.",
            "cost": "",
            "ingredients": [
              "Objeto considerado amaldiçoado (R3)",
              "pelo de animal de mau agouro morto (R3)",
              "moeda gasta com ferrugem anômala (R3)"
            ]
          },
          {
            "id": "official-6-3",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 3,
            "name": "O Ciclo",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Pode alterar a Potência de Fluxo da realidade. Gastando 2 ES, o Alquerino prolonga a duração de um efeito, Condição (buff ou debuff) por 1d4 rodadas adicionais, ou encurta o efeito inimigo pela mesma quantia.",
            "cost": "",
            "ingredients": [
              "Relógio sem ponteiros (R4)",
              "areia de uma ampulheta anômala (R3)",
              "sangue de alguém que sobreviveu a múltiplos acidentes mortais (R4)"
            ]
          },
          {
            "id": "official-6-4",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 4,
            "name": "A Manipulação",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: \"Ancorar a Sorte\". Por 1 cena inteira (Custo 4 ES), você anula totalmente a margem de Acerto Crítico (20 natural) de qualquer inimigo em um raio de 9 metros. Acertos críticos contra sua equipe tornam-se acertos normais.",
            "cost": "",
            "ingredients": [
              "Roda de máquina que causou um acidente fatal (R4)",
              "sangue de Entidade focada em Cisma (R5)",
              "ficha de cassino feita de osso humano (R4)"
            ]
          },
          {
            "id": "official-6-5",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 5,
            "name": "O Paradoxo",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: Gastando 5 ES como Reação, você transforma instantaneamente um Sucesso Crítico (20) de um inimigo em uma Falha Crítica (1), sofrendo 1 ponto de Estresse pelo choque de dobrar a causalidade local.",
            "cost": "",
            "ingredients": [
              "Fragmento material de um paradoxo local (R5)",
              "lágrima de quem escapou do destino final (R5)",
              "olho de Entidade da Loucura (R6)"
            ]
          },
          {
            "id": "official-6-6",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 6,
            "name": "A Causalidade Fatal",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Você declara um evento banal e improvável (ex: \"A estrutura vai ceder em cima dele\"). O inimigo rola Vontade; se falhar, a Roda da Fortuna ajusta o ambiente para que o evento absurdo e letal ocorra imediatamente, causando dano extremo (Equivalente a Potência Destrutiva Cap 8).",
            "cost": "",
            "ingredients": [
              "Fragmento de um destino não cumprido (R6)",
              "poeira de espaço temporal colapsado (R6)",
              "moeda que consegue cair nas duas faces simultaneamente (R6)"
            ]
          },
          {
            "id": "official-6-7",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 7,
            "name": "A Fortuna Divina",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: O Alquerino se torna o mestre da probabilidade. Ele dita os dados. Pode decretar a probabilidade absoluta de um acontecimento na cena (fazendo algo ser 100% chance de sucesso ou 0% chance de ocorrer), imune ao acaso e à própria entropia.",
            "cost": "",
            "ingredients": [
              "Causalidade engarrafada (R7)",
              "fragmento da primeira roda já inventada (R7)",
              "conceito materializado de \"probabilidade\" (R7)"
            ]
          }
        ]
      },
      "Senhor das Bestas": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-7-1",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 1,
            "name": "O Instinto",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: O Olfato e a intuição animal substituem a razão. O Alquerino recebe +2 permanente em testes de Prontidão e Atletismo, além de faro anômalo para rastrear ferimentos frescos (sangramento) a até 1km.",
            "cost": "",
            "ingredients": [
              "Sangue de predador alfa anômalo (R2)",
              "osso de animal carnívoro triturado (R2)",
              "pelo de criatura de Instinto (R3)"
            ]
          },
          {
            "id": "official-7-2",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 2,
            "name": "A Mutação Menor",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Gastando 1 ES (Ação Rápida), transmuta os próprios braços em patas rasgadoras ou manifesta garras osso-metálicas. Ganha um ataque corpo a corpo (2d6 dano cortante + sangramento que reduz PV no início do turno inimigo).",
            "cost": "",
            "ingredients": [
              "Garra de fera paranormal extraída viva (R3)",
              "dente incisivo de criatura carniceira (R3)",
              "bile ácida (R3)"
            ]
          },
          {
            "id": "official-7-3",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 3,
            "name": "O Predador",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Adquire locomoção aberrante. Ignora terreno difícil e aumenta o salto de forma desumana. Uma vez por rodada, se o Alquerino reduzir um inimigo a 0 PV (ou condição Grave), ele pode gastar 2 ES para realizar um movimento completo e um ataque extra imediatamente.",
            "cost": "",
            "ingredients": [
              "Coração de fera Cisma (R4)",
              "glândula de adrenalina preservada (R3)",
              "carne crua de Entidade (R4)"
            ]
          },
          {
            "id": "official-7-4",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 4,
            "name": "A Casca Aberrante",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: O metabolismo colapsa e se reconstrói. A pele é recoberta por escamas orgânicas invisíveis ou carapaças biológicas sob a derme. Concede RD 5 permanente contra danos físicos e imita Resistência (Fortitude) a venenos.",
            "cost": "",
            "ingredients": [
              "Escama de entidade regional (R4)",
              "carapaça de criatura blindada do abismo (R4)",
              "sangue negro peçonhento (R5)"
            ]
          },
          {
            "id": "official-7-5",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 5,
            "name": "A Quimera",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: Transmutação Orgânica Absoluta (Ação Padrão + 3 ES). O Alquerino vira um monstro por uma cena. Seus atributos Físicos (FOR, AGI) sobem para 6, seus ataques causam 3d8 de dano entrópico/dilacerante, e ele causa Medo Paranormal automático a humanos normais.",
            "cost": "",
            "ingredients": [
              "Essência mista de três linhagens anômalas (R5)",
              "um segundo coração orgânico (R5)",
              "toxina letal purificada (R6)"
            ]
          },
          {
            "id": "official-7-6",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 6,
            "name": "A Cadeia Alimentar",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: O ápice biológico. Recebe Regeneração Brutal (Cura 10 PV por turno). Fica completamente imune a doenças, toxinas ou mutações forçadas. Ataques biológicos contra o Alquerino o curam em vez de causar dano.",
            "cost": "",
            "ingredients": [
              "Tecido tumoral orgânico imortal (R6)",
              "lágrima de fera caçada à beira da extinção (R6)",
              "sangue da primeira aberração registrada (R6)"
            ]
          },
          {
            "id": "official-7-7",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 7,
            "name": "O Apex Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: Torna-se a Fera Suprema, o último elo da evolução. O Alquerino sofre \"Adaptação Instantânea\": se for ferido por um tipo de ataque ou energia, torna-se permanentemente imune a ele pelo resto do combate. Pode devorar a Carga Residual de Entidades (Classe B ou A) para assimilar e usar os poderes delas.",
            "cost": "",
            "ingredients": [
              "Fragmento genético primordial não-humano (R7)",
              "conceito puro de \"Evolução\" (R7)",
              "o coração de um Leviatã/Singularidade (R7)"
            ]
          }
        ]
      },
      "Abismo": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-8-1",
            "source": "official",
            "path": "Abismo",
            "seq": 1,
            "name": "O Vazio Mental",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: A mente do Alquerino se torna estática fria. Ele recebe +2 Permanente em Vontade (PRE) e torna-se imune à leitura de mentes. Qualquer criatura que tente ler seus pensamentos sofre 1d6 de dano de Estresse.",
            "cost": "",
            "ingredients": [
              "Água de um mar sem luz e sem fundo (R2)",
              "pó de osso humano triturado em silêncio (R2)",
              "espelho quebrado na mais absoluta escuridão (R3)"
            ]
          },
          {
            "id": "official-8-2",
            "source": "official",
            "path": "Abismo",
            "seq": 2,
            "name": "A Gravidade Morta",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Manipulação cinética leve. Gastando 1 ES, pode levitar a poucos centímetros do chão, ignorando rastros, fios de armadilha ou placas de pressão. Pode mover objetos a distância de até 5kg.",
            "cost": "",
            "ingredients": [
              "Pedra do epicentro de um nexo (R3)",
              "pena que flutua independentemente do vento (R3)",
              "olho de uma criatura abissal cega (R3)"
            ]
          },
          {
            "id": "official-8-3",
            "source": "official",
            "path": "Abismo",
            "seq": 3,
            "name": "O Tentáculo",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Transfiguração existencial. Manifesta apêndices de pura sombra ou matéria escura do próprio corpo (Ação Rápida, 2 ES). Aumenta o alcance de ataques corpo a corpo e interações físicas em 9 metros. Pode enforcar, arremessar ou empurrar alvos.",
            "cost": "",
            "ingredients": [
              "Ventosa orgânica de monstro inanição (R4)",
              "frasco de vácuo pressurizado (R4)",
              "tinta de kraken ou aberração marinha (R3)"
            ]
          },
          {
            "id": "official-8-4",
            "source": "official",
            "path": "Abismo",
            "seq": 4,
            "name": "A Pressão Cósmica",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: Telecinese destrutiva maciça (Ação Padrão + 3 ES). Seleciona um alvo a 18m; o Alquerino dita que a física local está tentando esmagá-lo. Causa 4d8 de Dano Contundente/Entrópico e o alvo deve passar em Fortitude para não ter ossos/armadura triturados (Condição Moderada).",
            "cost": "",
            "ingredients": [
              "Fragmento de meteorito anômalo (R4)",
              "núcleo denso de Entidade Regional (R4)",
              "silêncio absoluto engarrafado (R5)"
            ]
          },
          {
            "id": "official-8-5",
            "source": "official",
            "path": "Abismo",
            "seq": 5,
            "name": "O Olhar de Lá",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: O Alquerino revela o que existe por trás do Véu (Ação Padrão, 4 ES). Abre os próprios olhos ou o próprio peito para liberar luz de espaço-tempo colapsado. Inimigos em um cone de 9m entram em Catatonia Imediata ou Fuga (Vontade vs CD do Alquerino). Ignora imunidades baseadas em forma.",
            "cost": "",
            "ingredients": [
              "Globo ocular de um Grande Ancião menor (R5)",
              "telescópio anômalo que gravou a entropia final (R5)",
              "fragmento físico de espaço-tempo (R6)"
            ]
          },
          {
            "id": "official-8-6",
            "source": "official",
            "path": "Abismo",
            "seq": 6,
            "name": "O Evento de Horizonte",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Colapso físico localizado. Gastando 6 ES, pode criar um vórtex destrutivo em uma área de 18m de raio. A área tem oxigênio removido, a luz é sugada (Cegueira absoluta) e a gravidade arrasta inimigos para o centro (Velocidade 0), causando dano por cada rodada que permaneçam no buraco negro em miniatura.",
            "cost": "",
            "ingredients": [
              "Luz estagnada extraída do vazio (R6)",
              "sombra viva autônoma (R6)",
              "eco cristalizado do início da existência (R6)"
            ]
          },
          {
            "id": "official-8-7",
            "source": "official",
            "path": "Abismo",
            "seq": 7,
            "name": "A Singularidade Divina",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: Torna-se a Entropia Viva. O corpo físico do Alquerino é apenas uma sugestão. Ele pode, através do toque, apagar conceitos da realidade (ex: apagar uma porta, apagar a gravidade ao redor de um prédio, apagar a memória de que uma Entidade existe, forçando-a a desaparecer).",
            "cost": "",
            "ingredients": [
              "Uma pequena singularidade negra estabilizada (R7)",
              "a escuridão que existia antes da luz (R7)",
              "o conceito manifesto de \"Inexistência\" (R7)"
            ]
          }
        ]
      },
      "Olimpo": {
        "philosophy": "A humanidade nasceu implorando de joelhos por governantes de carne indestrutível e vontade inquestionável. Eu não serei uma aberração. Eu apenas preencherei a vaga de Deus.\"  * I - O Semideus (Cap. 2 / CD 13):    * Efeito: Presença e Herança. O Alquerino recebe +2 Permanente em PRE e VIG. O personagem passa a possuir uma \"Voz do Trovão\", audível e clara através de qualquer barreira sonora, dispensando a necessidade de rolar dados para intimidar humanos de nível civil.    * Ingredientes: Ouro verdadeiro derretido em chamas não-oxidantes (R2); vinho sagrado preservado há séculos (R3); folha de louro intocada pela decadência (R2).  * II - A Perfeição Esculpida (Cap. 3 / CD 16):    * Efeito: Gastando 1 ES (Ação Rápida), assume o traço da Divindade Física. Por 1 cena, sua aparência ofusca a visão de humanos comuns. Recebe +1d6 bônus extra em todas as perícias sociais, e imunidade a aflições de Decadência leve (doenças, lentidão, fraqueza).    * Ingredientes: Sangue puro de um monarca destronado (R3); mármore de estátua anômala (R3); reflexo de espelho perfeitamente límpido (R3).   * III - O Domínio (Cap. 4 / CD 19):    * Efeito: Manipulação conceitual sobre o clima e a matéria. O Alquerino aprende a dominar um elemento clássico. Pode lançar relâmpagos diretos (3d8 Dano de Choque), abrir fendas sísmicas para derrubar inimigos, ou congelar barreiras e áreas (Ação Padrão, 2 ES).    * Ingredientes: Eletricidade capturada dentro de quartzo (R4); terra da base de uma montanha sagrada (R4); água não congelável do fundo do oceano (R3).  * IV - A Égide (Cap. 5 / CD 22):    * Efeito: A aura do Panteão o protege. Ativar a Égide (Ação Padrão, 3 ES) cria um campo de força de luz física (Raio 3m). Todos os aliados adjacentes ao Alquerino ganham RD 10 total (contra dano material e energia) e imunidade a qualquer efeito de Manipulação Mental por 1d4 rodadas.    * Ingredientes: Metal desconhecido (orichalcum) forjado no abismo (R4); sangue dourado ou icor de Entidade Maior (R5); escudo mundano que sobreviveu a cem guerras (R4).  * V - A Ira (Cap. 7 / CD 25):    * Efeito: O comando da Herança absoluta: \"Ajoelhe-se!",
        "nodes": [
          {
            "id": "official-9-1",
            "source": "official",
            "path": "Olimpo",
            "seq": 1,
            "name": "O Semideus",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Presença e Herança. O Alquerino recebe +2 Permanente em PRE e VIG. O personagem passa a possuir uma \"Voz do Trovão\", audível e clara através de qualquer barreira sonora, dispensando a necessidade de rolar dados para intimidar humanos de nível civil.",
            "cost": "",
            "ingredients": [
              "Ouro verdadeiro derretido em chamas não-oxidantes (R2)",
              "vinho sagrado preservado há séculos (R3)",
              "folha de louro intocada pela decadência (R2)"
            ]
          },
          {
            "id": "official-9-2",
            "source": "official",
            "path": "Olimpo",
            "seq": 2,
            "name": "A Perfeição Esculpida",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Gastando 1 ES (Ação Rápida), assume o traço da Divindade Física. Por 1 cena, sua aparência ofusca a visão de humanos comuns. Recebe +1d6 bônus extra em todas as perícias sociais, e imunidade a aflições de Decadência leve (doenças, lentidão, fraqueza).",
            "cost": "",
            "ingredients": [
              "Sangue puro de um monarca destronado (R3)",
              "mármore de estátua anômala (R3)",
              "reflexo de espelho perfeitamente límpido (R3)"
            ]
          },
          {
            "id": "official-9-3",
            "source": "official",
            "path": "Olimpo",
            "seq": 3,
            "name": "O Domínio",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Manipulação conceitual sobre o clima e a matéria. O Alquerino aprende a dominar um elemento clássico. Pode lançar relâmpagos diretos (3d8 Dano de Choque), abrir fendas sísmicas para derrubar inimigos, ou congelar barreiras e áreas (Ação Padrão, 2 ES).",
            "cost": "",
            "ingredients": [
              "Eletricidade capturada dentro de quartzo (R4)",
              "terra da base de uma montanha sagrada (R4)",
              "água não congelável do fundo do oceano (R3)"
            ]
          },
          {
            "id": "official-9-4",
            "source": "official",
            "path": "Olimpo",
            "seq": 4,
            "name": "A Égide",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: A aura do Panteão o protege. Ativar a Égide (Ação Padrão, 3 ES) cria um campo de força de luz física (Raio 3m). Todos os aliados adjacentes ao Alquerino ganham RD 10 total (contra dano material e energia) e imunidade a qualquer efeito de Manipulação Mental por 1d4 rodadas.",
            "cost": "",
            "ingredients": [
              "Metal desconhecido (orichalcum) forjado no abismo (R4)",
              "sangue dourado ou icor de Entidade Maior (R5)",
              "escudo mundano que sobreviveu a cem guerras (R4)"
            ]
          },
          {
            "id": "official-9-5",
            "source": "official",
            "path": "Olimpo",
            "seq": 5,
            "name": "A Ira",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: O comando da Herança absoluta: \"Ajoelhe-se!\". Se o Alquerino der uma ordem de dominação a uma Entidade Regional (Classe B) ou Humano, o alvo deve fazer teste de Vontade; se falhar, sua própria biologia o pune pela desobediência, causando Dano Entrópico igual à Potência Destrutiva Cap 7 e forçando-o a se submeter por 1 rodada completa.",
            "cost": "",
            "ingredients": [
              "Fogo mítico original que nunca se apaga (R5)",
              "coração de gigante ou Colosso Abissal (R5)",
              "decreto escrito por um império caído (R6)"
            ]
          },
          {
            "id": "official-9-6",
            "source": "official",
            "path": "Olimpo",
            "seq": 6,
            "name": "O Mito Vivo",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Torna-se um conceito mitológico impossível de matar. Uma vez por missão, o Alquerino ganha Imortalidade Causal por 1 cena. Mesmo se reduzido a 0 PV (ou decapitado, esmagado), ele não entra em Estado Moribundo e continua lutando ignorando a Letalidade e a Espiral de Condições. Ao final da cena, ele estabiliza em 1 PV.",
            "cost": "",
            "ingredients": [
              "Icor cristalizado de uma divindade esquecida (R6)",
              "página de um mito transformada em matéria real (R6)",
              "coroa de louros que transforma tudo que toca em perfeição (R6)"
            ]
          },
          {
            "id": "official-9-7",
            "source": "official",
            "path": "Olimpo",
            "seq": 7,
            "name": "O Rei do Panteão",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: O Alquerino ocupa o trono conceitual. Ele reescreve a realidade para ser o seu \"Reino Divino\" em um raio de quilômetros. Dentro desse reino, ele dita absolutos: \"A Morte não é permitida aqui\", \"Toda ferida cura-se em segundos\" ou \"Fogo não queima\". Suas ordens tornam-se novas Leis Físicas Permanentes enquanto ele dominar o território.",
            "cost": "",
            "ingredients": [
              "Lasca do Trono Conceitual original (R7)",
              "ambrosia ou néctar formador da criação (R7)",
              "a materialização inquestionável da \"Supremacia\" (R7)"
            ]
          }
        ]
      }
    };
        const HIDDEN_PATHS = [];

    const SEQUENCES = [
      ['I','Despertar'],['II','Assimilação'],['III','Transfiguração'],['IV','Ascensão'],['V','Conceito'],['VI','Arquétipo'],['VII','Apoteose']
    ];

    // Canonicaliza os ingredientes usados pelas fórmulas oficiais. Algumas fórmulas
    // históricas carregam a raridade no próprio texto ("Nome (R3)"), enquanto a
    // bancada usa um catálogo com nome + raridade separados. O módulo Alquerino é o
    // proprietário desse contrato e deve aceitar ambas as representações.
    function cleanFormulaIngredientName(value){
      return String(value??'').replace(/\s*\((?:R[1-7]|EX)\)\s*$/i,'').trim();
    }
    function ingredientKey(value){
      return cleanFormulaIngredientName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    }
    const canonicalIngredientKeys = new Set(ALCHEMY_INGREDIENTS.map(i=>ingredientKey(i.name)));
    const allFormulaIngredientEntries = [...Object.values(OFFICIAL_PATHS).flatMap(x=>x.nodes||[]), ...HIDDEN_PATHS.flatMap(x=>x.nodes||[])];
    allFormulaIngredientEntries.flatMap(n=>n.ingredients||[]).forEach(raw=>{
      const clean = cleanFormulaIngredientName(raw);
      const key = ingredientKey(clean);
      if(!key || canonicalIngredientKeys.has(key)) return;
      const rarity = (String(raw).match(/\((R[1-7]|EX)\)\s*$/i)||[])[1] || 'EX';
      ALCHEMY_INGREDIENTS.push({id:`formula-ing-${ALCHEMY_INGREDIENTS.length+1}`,name:clean,rarity:rarity.toUpperCase()});
      canonicalIngredientKeys.add(key);
    });

    function resolveIngredient(value){
      const raw = cleanFormulaIngredientName(value);
      const key = ingredientKey(raw);
      return ALCHEMY_INGREDIENTS.find(x=>ingredientKey(x.name)===key);
    }

    const state = {
      selectedIngredients: [],
      inventory: {},
      unlocked: [],
      customFormulas: [],
      customPaths: [],
      preparations: []
    };
    ALCHEMY_INGREDIENTS.forEach(i=>state.inventory[i.id]=0);

    function isAlq(){ return currentMode==='ocultatun' && currentNature==='Agente de Carreira (Ocultatun)' && currentClass==='Alquerino'; }
    function esc(v){ return typeof escHtml==='function'?escHtml(String(v??'')):String(v??''); }
    function allNodes(){ return [...Object.values(OFFICIAL_PATHS).flatMap(x=>x.nodes), ...HIDDEN_PATHS.flatMap(x=>x.nodes)]; }
    function ingredientByName(name){ return resolveIngredient(name); }
    function rarityLabel(r){ return ({R1:'Comum',R2:'Incomum',R3:'Anômalo',R4:'Raro',R5:'Singular',R6:'Conceitual',R7:'Divino',EX:'Mencionado'})[r]||r; }
    function selectedIds(){ return state.selectedIngredients.slice(); }
    function selectedNames(){ return selectedIds().map(id=>ALCHEMY_INGREDIENTS.find(x=>x.id===id)?.name).filter(Boolean); }
    function normalizedSet(a){ return a.slice().sort((x,y)=>x.localeCompare(y,'pt-BR')); }
    function exactMatch(node){ const formulaIds=(node.ingredients||[]).map(ingredientByName).filter(Boolean).map(x=>x.id); return normalizedSet(formulaIds).join('|')===normalizedSet(selectedIds()).join('|'); }

    window.switchAlchemyPanel=function(panel){
      document.querySelectorAll('.alchemy-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.alchemyPanel===panel));
      document.querySelectorAll('.alchemy-panel').forEach(p=>p.classList.toggle('active',p.id===`alchemy-panel-${panel}`));
      if(panel==='paths') renderOfficialPaths();
      if(panel==='formulas') renderAlchemyFormulaLibrary();
      if(panel==='ingredients') renderAlchemyIngredientLibrary();
      if(panel==='forge') renderCustomPathBuilder();
    };

    window.renderAlchemyIngredients=function(){
      const grid=document.getElementById('alchemy-ingredient-grid'); if(!grid)return;
      const q=(document.getElementById('alchemy-ingredient-search')?.value||'').toLowerCase().trim();
      const rf=document.getElementById('alchemy-rarity-filter')?.value||'all';
      grid.innerHTML=ALCHEMY_INGREDIENTS.filter(i=>(rf==='all'||i.rarity===rf)&&(!q||i.name.toLowerCase().includes(q))).map(i=>{
        const qty=Number(state.inventory[i.id]||0), sel=state.selectedIngredients.includes(i.id);
        return `<button type="button" class="ingredient-chip ${sel?'selected':''}" onclick="toggleAlchemyIngredient('${i.id}')"><span class="ingredient-rarity ${i.rarity}">${i.rarity}</span><strong>${esc(i.name)}</strong><small>${rarityLabel(i.rarity)} · posse ${qty}</small></button>`;
      }).join('') || '<div class="alchemy-empty">Nenhum reagente encontrado.</div>';
    };

    window.renderAlchemyIngredientLibrary=function(){
      const grid=document.getElementById('alchemy-ingredient-library'); if(!grid)return;
      const q=(document.getElementById('alchemy-ingredient-library-search')?.value||'').toLowerCase().trim();
      const rf=document.getElementById('alchemy-ingredient-library-filter')?.value||'all';
      grid.innerHTML=ALCHEMY_INGREDIENTS.filter(i=>(rf==='all'||i.rarity===rf)&&(!q||i.name.toLowerCase().includes(q))).map(i=>`<div class="ingredient-library-card"><div><span class="ingredient-rarity ${i.rarity}">${i.rarity}</span><b>${esc(i.name)}</b><small>${rarityLabel(i.rarity)}</small></div><label>Qtd<input type="number" min="0" value="${Number(state.inventory[i.id]||0)}" onchange="setAlchemyIngredientQty('${i.id}',this.value)"></label></div>`).join('') || '<div class="alchemy-empty">Nenhum reagente.</div>';
    };
    window.setAlchemyIngredientQty=function(id,value){ state.inventory[id]=Math.max(0,Number(value)||0); renderAlchemyIngredients(); renderAlchemyIngredientLibrary(); renderCombinationVessel(); };
    window.__ALCHEMY_INGREDIENT_IDS=ALCHEMY_INGREDIENTS.map(i=>i.id);
    window.__setAlchemyBulkQty=function(op,n){ const q=Math.max(0,Number(n)||0); ALCHEMY_INGREDIENTS.forEach(i=>{ const cur=Math.max(0,Number(state.inventory[i.id]||0)); state.inventory[i.id]=op==='add'?cur+q:op==='sub'?Math.max(0,cur-q):q; }); renderAlchemyIngredients(); renderAlchemyIngredientLibrary(); renderCombinationVessel(); };
    window.toggleAlchemyIngredient=function(id){
      const idx=state.selectedIngredients.indexOf(id);
      if(idx>=0) state.selectedIngredients.splice(idx,1);
      else if(state.selectedIngredients.length<3) state.selectedIngredients.push(id);
      else return alert('A câmara de combinação comporta exatamente três reagentes.');
      renderAlchemyIngredients(); renderCombinationVessel(); renderCustomPathBuilder();
    };
    window.clearAlchemyCombination=function(){ state.selectedIngredients=[]; renderAlchemyIngredients(); renderCombinationVessel(); renderCustomPathBuilder(); };
    function renderCombinationVessel(){
      document.querySelectorAll('#alchemy-panel-bench .reagent-flask').forEach((f,i)=>{const id=state.selectedIngredients[i];const ing=id&&ALCHEMY_INGREDIENTS.find(x=>x.id===id);f.classList.toggle('filled',!!ing);f.querySelector('.flask-bulb b').textContent=ing?ing.rarity:'+';f.querySelector('.flask-bulb small').textContent=ing?ing.name:'vazio';});
      const c=document.getElementById('alchemy-free-reagent-count'); if(c)c.textContent=`${state.selectedIngredients.length}/3`;
      const cap=Number(document.getElementById('alchemy-free-cap')?.value||1), comp=Number(document.getElementById('alchemy-free-complexity')?.value||0); const cd=document.getElementById('alchemy-free-cd'); if(cd)cd.textContent=String(10+cap+comp);
    }
    function canPrepare(){ const int=Number(document.getElementById('attr-int')?.value||0), grau=Number(document.getElementById('spec-alquerino-ocultismo-grau')?.value||0); return state.preparations.length < (int+grau); }
    window.combineAlchemyIngredients=function(){
      if(state.selectedIngredients.length!==3) return alert('Selecione três ingredientes para a síntese.');
      const names=selectedNames(); const matches=allNodes().filter(exactMatch); const consume=document.getElementById('alchemy-consume-reagents')?.checked; const insufficient=state.selectedIngredients.filter(id=>(Number(state.inventory[id]||0)<1)); if(consume&&insufficient.length) return alert('A bancada não possui uma unidade de cada reagente selecionado. Ajuste o almoxarifado antes de consumir a mistura.');
      const box=document.getElementById('alchemy-unlocked-formula');
      if(!canPrepare()) return alert('O Alquerino já atingiu o limite de preparos deste descanso longo.');
      if(matches.length){ const m=matches[0]; if(!state.unlocked.includes(m.id))state.unlocked.push(m.id); if(consume)state.selectedIngredients.forEach(id=>state.inventory[id]=Math.max(0,Number(state.inventory[id]||0)-1)); state.preparations.push({id:`prep-${Date.now()}`,type:'Caminho',name:`${m.path} · ${m.name}`,cap:m.cap,insumo:names.join(' + '),note:`Etapa ${m.seq} desbloqueada · CD ${m.cd}`}); box.innerHTML=`<div class="formula-match success"><b>FÓRMULA RECONHECIDA</b><strong>${esc(m.path)} · ${esc(m.name)}</strong><span>Cap. ${m.cap} · CD ${m.cd}${m.cost?' · Custo '+esc(m.cost):''}</span><small>${esc(m.effect)}</small><button type="button" class="souls-btn mini-btn" onclick="switchAlchemyPanel('formulas')">ABRIR FÓRMULA</button></div>`; }
      else { if(consume)state.selectedIngredients.forEach(id=>state.inventory[id]=Math.max(0,Number(state.inventory[id]||0)-1)); box.innerHTML=`<div class="formula-match neutral"><b>SÍNTESE NÃO CATALOGADA</b><strong>Os três reagentes formam um composto livre.</strong><small>${esc(names.join(' + '))}</small><span>Use a Fórmula Livre para registrar o efeito, forma e estabilidade da mistura.</span></div>`; }
      window.currentAlquerinoPreparations=state.preparations; renderAlchemyIngredients(); renderAlchemyIngredientLibrary(); renderCombinationVessel(); renderAlquerinoLab();
    };

    window.renderOfficialPaths=function(){
      const wrap=document.getElementById('alquerino-official-paths'); if(!wrap)return;
      wrap.innerHTML=Object.values(OFFICIAL_PATHS).map(path=>`<article class="official-path-card"><header><div><span class="path-index">✦</span><b>Caminho ${esc(path.nodes[0].path)}</b><small>${esc(path.philosophy)}</small></div><span class="path-count">${path.nodes.filter(n=>state.unlocked.includes(n.id)).length}/7 DESBLOQUEADAS</span></header><div class="path-node-list">${path.nodes.map(n=>`<div class="path-node-card ${state.unlocked.includes(n.id)?'unlocked':''}"><div class="path-node-top"><span>Seq. ${n.seq}</span><b>${esc(n.name)}</b><em>CAP ${n.cap} · CD ${n.cd}</em></div><p>${esc(n.effect)}</p><div class="formula-ingredients">${n.ingredients.map(x=>`<span>${esc(x)}</span>`).join('')}</div><button type="button" class="path-use-btn" onclick="loadFormulaIngredients('${n.id}')">${state.unlocked.includes(n.id)?'FÓRMULA DESBLOQUEADA':'CARREGAR NA CÂMARA'}</button></div>`).join('')}</div></article>`).join('');
      const hidden=document.getElementById('alquerino-hidden-paths'); if(hidden)hidden.innerHTML=HIDDEN_PATHS.map(path=>`<article class="hidden-path-list"><h5>Caminho ${esc(path.path)}</h5><small>${esc(path.note)}</small>${path.nodes.map(n=>`<div class="hidden-node"><div><b>${esc(n.name)}</b><span>Cap. ${n.cap} · CD ${n.cd}</span></div><p>${esc(n.effect)}</p><div class="formula-ingredients">${n.ingredients.map(x=>`<span>${esc(x)}</span>`).join('')}</div><button type="button" class="path-use-btn" onclick="loadFormulaIngredients('${n.id}')">CARREGAR</button></div>`).join('')}</article>`).join('');
    };
    window.loadFormulaIngredients=function(nodeId){ const custom=[...state.customFormulas,...state.customPaths.flatMap(p=>p.nodes||[])]; const n=[...allNodes(),...custom].find(x=>x.id===nodeId); if(!n)return; state.selectedIngredients=(n.ingredients||[]).map(ingredientByName).filter(Boolean).map(x=>x.id); switchAlchemyPanel('bench'); setTimeout(()=>{renderAlchemyIngredients();renderCombinationVessel();},0); };

    window.renderAlchemyFormulaLibrary=function(){
      const grid=document.getElementById('alchemy-formula-library'); if(!grid)return;
      const q=(document.getElementById('alchemy-formula-search')?.value||'').toLowerCase().trim(); const f=document.getElementById('alchemy-formula-filter')?.value||'all';
      const formulas=[...allNodes(),...state.customFormulas,...state.customPaths.flatMap(p=>p.nodes||[])];
      grid.innerHTML=formulas.filter(x=>(f==='all'||(f==='official'&&x.source==='official')||(f==='hidden'&&x.source==='hidden')||(f==='custom'&&x.source==='custom'))&&(!q||`${x.path} ${x.name} ${x.effect} ${x.ingredients.join(' ')}`.toLowerCase().includes(q))).map(x=>`<article class="formula-library-card ${x.source}"><div class="formula-library-head"><span>${x.source==='custom'?'LIVRE':x.source==='hidden'?'OCULTA':'OFICIAL'}</span><b>${esc(x.path)} · ${esc(x.name)}</b><em>CAP ${x.cap} · CD ${x.cd}</em></div><p>${esc(x.effect)}</p><div class="formula-ingredients">${x.ingredients.map(i=>`<button type="button" onclick="loadIngredientByName('${encodeURIComponent(i)}')">${esc(i)}</button>`).join('')}</div><button type="button" class="path-use-btn" onclick="loadFormulaIngredients('${esc(x.id)}')">CARREGAR FÓRMULA</button></article>`).join('') || '<div class="alchemy-empty">Nenhuma fórmula encontrada.</div>';
    };
    window.loadIngredientByName=function(encoded){ const name=decodeURIComponent(encoded); const ing=ingredientByName(name); if(!ing)return; if(state.selectedIngredients.length<3&&!state.selectedIngredients.includes(ing.id)) state.selectedIngredients.push(ing.id); renderAlchemyIngredients(); renderCombinationVessel(); switchAlchemyPanel('bench'); };

    window.saveFreeAlchemyFormula=function(){
      if(!canPrepare())return alert('O limite de preparos deste descanso longo já foi alcançado.');
      if(state.selectedIngredients.length!==3)return alert('Combine três ingredientes antes de gravar uma fórmula livre.'); const consume=document.getElementById('alchemy-consume-reagents')?.checked; const insufficient=state.selectedIngredients.filter(id=>(Number(state.inventory[id]||0)<1)); if(consume&&insufficient.length)return alert('Faltam reagentes no almoxarifado para este preparo.');
      const name=(document.getElementById('alchemy-free-name')?.value||'Fórmula Livre').trim(); const type=document.getElementById('alchemy-free-type')?.value||'Poção'; const form=document.getElementById('alchemy-free-form')?.value||'Líquido'; const cap=Number(document.getElementById('alchemy-free-cap')?.value||1); const complexity=Number(document.getElementById('alchemy-free-complexity')?.value||0); const fn=(document.getElementById('alchemy-free-function')?.value||'').trim(); const stability=(document.getElementById('alchemy-free-stability')?.value||'').trim();
      const f={id:`free-${Date.now()}`,source:'custom',path:'Preparo Livre',seq:'—',name,effect:`${type} em forma de ${form}. Função: ${fn||'a definir'}. Estabilidade: ${stability||'a definir'}. CD ${10+cap+complexity}.`,cap,cd:10+cap+complexity,ingredients:selectedNames(),cost:'ES conforme Potências usadas'}; if(consume)state.selectedIngredients.forEach(id=>state.inventory[id]=Math.max(0,Number(state.inventory[id]||0)-1)); state.customFormulas.push(f); state.unlocked.push(f.id); state.preparations.push({id:f.id,type,name,cap,insumo:selectedNames().join(' + '),note:`Fórmula Livre · ${form} · CD ${f.cd}`}); window.currentAlquerinoPreparations=state.preparations; alert(`Fórmula “${name}” gravada na biblioteca.`); renderAlchemyFormulaLibrary(); renderAlquerinoLab(); };

    window.saveNewAlchemyPathNode=function(){
      if(state.selectedIngredients.length!==3)return alert('Uma nova etapa de Caminho precisa de três ingredientes selecionados na câmara.');
      const path=(document.getElementById('alchemy-new-path-name')?.value||'Caminho Novo').trim(); const philosophy=(document.getElementById('alchemy-new-path-philosophy')?.value||'').trim(); const seq=Number(document.getElementById('alchemy-new-path-seq')?.value||1); const cap=Number(document.getElementById('alchemy-new-path-cap')?.value||1); const cd=Number(document.getElementById('alchemy-new-path-cd')?.value||10+cap); const name=(document.getElementById('alchemy-new-path-ability')?.value||`Etapa ${seq}`).trim(); const effect=(document.getElementById('alchemy-new-path-effect')?.value||'').trim();
      let item=state.customPaths.find(x=>x.path===path); if(!item){item={path,philosophy,nodes:[],source:'custom'};state.customPaths.push(item);} item.nodes.push({id:`custom-path-${Date.now()}`,source:'custom',path,seq,name,cap,cd,effect,ingredients:selectedNames()}); item.nodes.sort((a,b)=>a.seq-b.seq); state.unlocked.push(item.nodes[item.nodes.length-1].id); renderCustomPathBuilder(); renderAlchemyFormulaLibrary(); alert(`Etapa ${seq} gravada em ${path}.`);
    };
    window.renderCustomPathBuilder=function(){
      const box=document.getElementById('alchemy-new-path-reagents'); if(box)box.innerHTML=selectedNames().map((n,i)=>`<div class="selected-reagent-line"><span>${String.fromCharCode(65+i)}</span><b>${esc(n)}</b><small>${ingredientByName(n)?.rarity||''}</small></div>`).join('')||'<div class="alchemy-empty">Selecione três ingredientes na Câmara de Combinação.</div>';
      const list=document.getElementById('alchemy-custom-path-list'); if(list)list.innerHTML=state.customPaths.map(p=>`<article class="custom-path-card"><header><b>${esc(p.path)}</b><small>${esc(p.philosophy||'')}</small></header>${p.nodes.map(n=>`<div><span>${n.seq} · ${esc(SEQUENCES[n.seq-1]?.[1]||'')}</span><b>${esc(n.name)}</b><p>${esc(n.effect)}</p></div>`).join('')}</article>`).join('')||'<div class="alchemy-empty">Nenhum Caminho novo gravado.</div>';
    };

    function getStats(){ const int=Number(document.getElementById('attr-int')?.value||0), pre=Number(document.getElementById('attr-pre')?.value||0), pat=Number(document.getElementById('spec-alquerino-patamar')?.value||1), grau=Number(document.getElementById('spec-alquerino-ocultismo-grau')?.value||0); return {int,pre,pat,grau,prepMax:int+grau,esMax:8+int+pre+pat}; }
    window.renderAlquerinoLab=function(){
      const tab=document.getElementById('tab-alquerino'), btn=document.getElementById('btn-tab-alquerino'); if(!tab||!btn)return; btn.style.display=isAlq()?'':'none'; tab.style.display=isAlq()?'':'none'; if(!isAlq())return;
      const s=getStats(); document.getElementById('alquerino-prep-capacity').textContent=String(s.prepMax); document.getElementById('alquerino-es-total').textContent=String(s.esMax); document.getElementById('alquerino-fadiga-total').textContent=String(state.fadiga||0);
      renderAlchemyIngredients(); renderAlchemyFormulaLibrary(); renderAlchemyIngredientLibrary(); renderOfficialPaths(); renderCombinationVessel(); renderCustomPathBuilder();
      const list=document.getElementById('alquerino-preparos-list'); if(list)list.innerHTML=state.preparations.length?state.preparations.map((p,i)=>`<article class="prepared-vial"><div class="prepared-vial-icon">⚗</div><div><b>${esc(p.name||p.type||'Preparo')}</b><small>${esc(p.cap?'Cap. '+p.cap:'')}${p.insumo?' · '+esc(p.insumo):''}</small><span>${esc(p.note||'')}</span></div><button type="button" class="hide-on-view" onclick="removeAlquerinoPreparation(${i})">×</button></article>`).join(''):'<div class="alchemy-empty">Nenhuma mistura pronta. Use a Câmara de Combinação e grave uma fórmula.</div>';
    };
    window.removeAlquerinoPreparation=function(i){ if(!isEditMode)return; state.preparations.splice(i,1); window.currentAlquerinoPreparations=state.preparations; renderAlquerinoLab(); };

    const oldPayload=window.buildCharacterPayloadFromBuilder;
    if(typeof oldPayload==='function') window.buildCharacterPayloadFromBuilder=function(){ const payload=oldPayload.apply(this,arguments); payload.alquerino={...(payload.alquerino||{}),patamar:document.getElementById('spec-alquerino-patamar')?.value||'1',ocultismoGrau:Number(document.getElementById('spec-alquerino-ocultismo-grau')?.value||0),inventory:msClone(state.inventory),unlocked:msClone(state.unlocked),customFormulas:msClone(state.customFormulas),customPaths:msClone(state.customPaths),preparacoes:msClone(state.preparations)}; return payload; };

    const oldSelectNature=window.selectNature; if(typeof oldSelectNature==='function') window.selectNature=function(){ const r=oldSelectNature.apply(this,arguments); resetState(); renderAlquerinoLab(); return r; };
    const oldSelectClass=window.selectClass; if(typeof oldSelectClass==='function') window.selectClass=function(){ const r=oldSelectClass.apply(this,arguments); renderAlquerinoLab(); return r; };
    const oldLoad=window.loadCharacterToBuilder;
    if(typeof oldLoad==='function') window.loadCharacterToBuilder=function(){ const r=oldLoad.apply(this,arguments); const sourceArray=arguments[1]||characters, idx=arguments[0], ch=sourceArray[idx], a=ch?.alquerino||{}; resetState(); Object.assign(state.inventory,a.inventory||{}); state.unlocked=Array.isArray(a.unlocked)?msClone(a.unlocked):[]; state.customFormulas=Array.isArray(a.customFormulas)?msClone(a.customFormulas):[]; state.customPaths=Array.isArray(a.customPaths)?msClone(a.customPaths):[]; state.preparations=Array.isArray(a.preparacoes)?msClone(a.preparacoes):[]; const pat=document.getElementById('spec-alquerino-patamar'); const og=document.getElementById('spec-alquerino-ocultismo-grau'); if(pat)pat.value=a.patamar||a.nivel||'1'; if(og)og.value=a.ocultismoGrau??'0'; window.currentAlquerinoPreparations=state.preparations; renderAlquerinoLab(); return r; };
    function resetState(){ state.selectedIngredients=[]; ALCHEMY_INGREDIENTS.forEach(i=>state.inventory[i.id]=0); state.unlocked=[]; state.customFormulas=[]; state.customPaths=[]; state.preparations=[]; window.currentAlquerinoPreparations=state.preparations; }
    const oldToggle=window.toggleEditUI; if(typeof oldToggle==='function')window.toggleEditUI=function(){const r=oldToggle.apply(this,arguments);document.querySelectorAll('#tab-alquerino input,#tab-alquerino select,#tab-alquerino textarea,#tab-alquerino button').forEach(el=>{if(el.classList.contains('alchemy-nav-btn'))return;el.disabled=!isEditMode;});renderAlquerinoLab();return r;};

    document.addEventListener('DOMContentLoaded',()=>setTimeout(renderAlquerinoLab,80));
})();

/* =====================================================================
   ESPAÇO FINAL — VIEWPORT, ESCALA, PAN E PAINEL
   O viewport é responsável apenas pela navegação do canvas. Os nodos são
   responsabilidade do editor da árvore e podem ser arrastados individualmente.
   ===================================================================== */
let efViewportPanState = null;

function efApplyTreeZoom(scrollWrapper, frame, zoom) {
    if (!scrollWrapper || !frame) return;
    const safeZoom = Math.max(0.42, Math.min(1.2, Number(zoom) || 1));
    efTreeZoom = safeZoom;
    scrollWrapper.style.setProperty('--ef-zoom', String(safeZoom));
    scrollWrapper.style.width = '1600px';
    scrollWrapper.style.height = '1180px';
    scrollWrapper.style.minWidth = '1600px';
    scrollWrapper.style.minHeight = '1180px';
    scrollWrapper.style.transform = 'none';
    scrollWrapper.style.transformOrigin = 'top left';
    const out = document.getElementById('ef-zoom-value');
    if (out) out.textContent = `${Math.round(safeZoom * 100)}%`;
}

function efFitTreeViewport(scrollWrapper, frame) {
    if (!scrollWrapper || !frame) return;
    const availableW = Math.max(320, frame.clientWidth - 24);
    const availableH = Math.max(280, frame.clientHeight - 24);
    const fit = Math.min(1, availableW / 1600, availableH / 1180);
    efTreeZoomManual = false;
    efApplyTreeZoom(scrollWrapper, frame, Math.max(0.42, fit));
    requestAnimationFrame(() => {
        frame.scrollLeft = Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2);
        frame.scrollTop = Math.max(0, (frame.scrollHeight - frame.clientHeight) / 2);
    });
}

function efSetTreeZoom(scrollWrapper, frame, zoom) {
    efTreeZoomManual = true;
    efApplyTreeZoom(scrollWrapper, frame, zoom);
    requestAnimationFrame(() => {
        frame.scrollLeft = Math.max(0, Math.min(frame.scrollLeft, frame.scrollWidth - frame.clientWidth));
        frame.scrollTop = Math.max(0, Math.min(frame.scrollTop, frame.scrollHeight - frame.clientHeight));
    });
}

function efBindTreeViewportPan(frame) {
    if (!frame || frame.dataset.panBound === '1') return;
    frame.dataset.panBound = '1';
    frame.classList.add('ef-free-pan');

    frame.addEventListener('pointerdown', function(ev) {
        if (ev.button !== 0) return;
        const target = ev.target;
        if (target && target.closest && (
            target.closest('.ef-node') || target.closest('button') || target.closest('input') ||
            target.closest('select') || target.closest('textarea') || target.closest('a')
        )) return;
        efViewportPanState = {
            pointerId: ev.pointerId,
            x: ev.clientX,
            y: ev.clientY,
            left: frame.scrollLeft,
            top: frame.scrollTop,
            moved: false
        };
        frame.classList.add('ef-panning');
        try { frame.setPointerCapture(ev.pointerId); } catch (_) {}
        ev.preventDefault();
    }, {passive:false});

    frame.addEventListener('pointermove', function(ev) {
        const state = efViewportPanState;
        if (!state || state.pointerId !== ev.pointerId) return;
        const dx = ev.clientX - state.x;
        const dy = ev.clientY - state.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) state.moved = true;
        frame.scrollLeft = state.left - dx;
        frame.scrollTop = state.top - dy;
        ev.preventDefault();
    }, {passive:false});

    const endPan = function(ev) {
        const state = efViewportPanState;
        if (!state || (ev.pointerId != null && state.pointerId !== ev.pointerId)) return;
        efViewportPanState = null;
        frame.classList.remove('ef-panning');
        try { frame.releasePointerCapture(state.pointerId); } catch (_) {}
        if (state.moved) ev.preventDefault();
    };
    frame.addEventListener('pointerup', endPan, {passive:false});
    frame.addEventListener('pointercancel', endPan, {passive:false});
    frame.addEventListener('lostpointercapture', function() {
        efViewportPanState = null;
        frame.classList.remove('ef-panning');
    });
}

function efBindTreeViewControls() {
    const frame = document.querySelector('#ef-space-final .ef-tree-frame');
    const wrapper = document.getElementById('tree-scroll-wrapper');
    if (!frame || !wrapper) return;

    efBindTreeViewportPan(frame);
    if (!efTreeZoom || !efTreeZoomManual) efFitTreeViewport(wrapper, frame);
    else efApplyTreeZoom(wrapper, frame, efTreeZoom);

    const fit = document.getElementById('ef-fit-tree');
    if (fit && fit.dataset.efBound !== '1') {
        fit.dataset.efBound = '1';
        fit.addEventListener('click', function(ev) {
            ev.preventDefault();
            efFitTreeViewport(wrapper, frame);
        });
    }

    const zoomOut = document.getElementById('ef-zoom-out');
    const zoomIn = document.getElementById('ef-zoom-in');
    if (zoomOut && zoomOut.dataset.efBound !== '1') {
        zoomOut.dataset.efBound='1';
        zoomOut.addEventListener('click', ev=>{ev.preventDefault();efSetTreeZoom(wrapper,frame,(efTreeZoom||1)-0.1);});
    }
    if (zoomIn && zoomIn.dataset.efBound !== '1') {
        zoomIn.dataset.efBound='1';
        zoomIn.addEventListener('click', ev=>{ev.preventDefault();efSetTreeZoom(wrapper,frame,(efTreeZoom||1)+0.1);});
    }

    const toggle = document.getElementById('ef-toggle-info');
    const close = document.getElementById('ef-close-info');
    const panel = document.getElementById('ef-tree-info-panel');
    const toggleInfo = () => {
        if (!panel) return;
        const hidden = panel.classList.toggle('ef-info-collapsed');
        const main = panel.closest('.ef-main');
        if (main) main.classList.toggle('ef-info-hidden', hidden);
        if (toggle) toggle.textContent = hidden ? 'MOSTRAR PAINEL' : 'OCULTAR PAINEL';
        frame.scrollLeft = Math.max(0, (frame.scrollWidth - frame.clientWidth) / 2);
    };
    if (toggle && toggle.dataset.efBound !== '1') { toggle.dataset.efBound='1'; toggle.addEventListener('click', e=>{e.preventDefault();toggleInfo();}); }
    if (close && close.dataset.efBound !== '1') { close.dataset.efBound='1'; close.addEventListener('click', e=>{e.preventDefault();toggleInfo();}); }

    const reset = document.getElementById('ef-reset-tree-layout');
    if (reset && reset.dataset.efBound !== '1') {
        reset.dataset.efBound='1';
        reset.addEventListener('click', e=>{e.preventDefault();if(!isEditMode)return;efResetTablePositions('O Envolto (Horror Cósmico)');});
    }

    if (frame.dataset.efResizeBound !== '1') {
        frame.dataset.efResizeBound='1';
        const onResize = () => { if(!efTreeZoomManual) efFitTreeViewport(wrapper,frame); };
        window.addEventListener('resize', onResize, {passive:true});
    }
}

