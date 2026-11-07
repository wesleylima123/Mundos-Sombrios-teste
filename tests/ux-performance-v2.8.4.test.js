import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/script.js', import.meta.url), 'utf8');
const portal = readFileSync(new URL('../js/portal/portal-core.js', import.meta.url), 'utf8');
const portalContent = readFileSync(new URL('../js/portal/portal-content.js', import.meta.url), 'utf8');
const portalMedia = readFileSync(new URL('../js/portal/portal-media.js', import.meta.url), 'utf8');
const db = readFileSync(new URL('../js/supabase-db.js', import.meta.url), 'utf8');

// V2.8.4 — guardas para navegação pública, login, performance e moderação ADM.
test('login permite voltar ao Portal sem autenticar e oferece mostrar/ocultar senha', () => {
  assert.match(html, /id="screen-login"[\s\S]*onclick="returnToOfficialPortal\(\)"/);
  assert.match(html, /id="login-pass-toggle"[\s\S]*onclick="toggleLoginPassword\(\)"/);
  assert.match(script, /function toggleLoginPassword\(\)/);
  assert.match(script, /input\.type=showing\?'password':'text'/);
});

test('login apresenta erro persistente e amigável para credenciais inválidas', () => {
  assert.match(html, /id="login-status" class="login-status"/);
  assert.match(script, /Senha ou usuário\/e-mail incorretos\. Confira os dados e tente novamente\./);
  assert.match(script, /msSetLoginStatus\(friendly,'error'\)/);
});

test('Portal público renderiza antes da hidratação remota e navegação não aguarda mídia assíncrona', () => {
  assert.match(portal, /window\.openOfficialPortal\(\);/);
  assert.match(portal, /DOMContentLoaded',\(\)=>refreshPortalContent\(\)/);
  assert.doesNotMatch(portal, /openOfficialPortal=async\(\)=>\{[^}]*await PortalContent\.hydrate/);
  assert.match(portal, /mediaUrls=PortalMedia\.prepareContent\(c\)\|\|\{\}/);
  assert.match(portalMedia, /function prepareContent\(content\)/);
  assert.doesNotMatch(portalMedia, /async function prepareContent/);
  assert.match(portalContent, /let hydratePromise = null/);
  assert.match(portalContent, /HYDRATE_TTL = 30000/);
});

test('atalhos primários evitam cargas e renderizações pesadas duplicadas', () => {
  assert.match(script, /id==='screen-builder'/);
  assert.doesNotMatch(script, /id==='screen-char-select'\|\|id==='screen-builder'/);
  assert.doesNotMatch(script, /id==='screen-char-select'\|\|id==='screen-mode-select'\|\|id==='screen-builder'/);
  assert.match(portal, /!document\.getElementById\('world-codex-root'\)/);
  assert.match(portal, /showScreen\('screen-ancoragem',\{skipAncoragemRender:true\}\)/);
  assert.match(script, /!options\.skipAncoragemRender/);
});

test('Arconte abre imediatamente e faz uma única rodada paralela de usuários e solicitações', () => {
  const open = script.slice(script.indexOf('async function openAdminPanel()'), script.indexOf('function renderAdminPanel()'));
  assert.match(open, /modal\.style\.display='flex'/);
  assert.match(open, /Promise\.all\(\[/);
  assert.equal((open.match(/MS_DB\.fetchUsers\(\)/g) || []).length, 1);
  assert.equal((open.match(/MS_DB\.fetchAdminRequests\(\)/g) || []).length, 1);
  assert.doesNotMatch(open, /await hydrateAuthState\(\)/);
});

test('decisão de solicitação de Mestre possui fallback para bancos sem RPC V2.8.2', () => {
  const start = db.lastIndexOf('async resolveAdminRequestSecure');
  const resolve = db.slice(start, db.indexOf('async silenceAdminRequestSecure', start));
  assert.match(resolve, /PGRST202/);
  assert.match(resolve, /admin_set_user_role|adminSetUserRole/);
  assert.match(resolve, /tableNames\.admin_requests/);
  assert.match(resolve, /status:approved\?'approved':'rejected'/);
  assert.match(resolve, /REQUEST_USER_NOT_FOUND/);
});
