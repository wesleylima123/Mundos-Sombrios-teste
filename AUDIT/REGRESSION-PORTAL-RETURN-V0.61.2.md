# REGRESSION — RETORNO AO PORTAL V0.61.2

## Causa-raiz

As três áreas afetadas (`screen-mode-select`, `screen-ancoragem` e `screen-codex`) não tinham uma rota de retorno ao Portal Oficial. Os controles existentes apontavam apenas para `screen-mode-select` ou, no Códice, para a página interna dos Códices. O Portal já possuía a função canônica `backToPortal()` exposta como `window.returnToOfficialPortal`, mas nenhum desses fluxos a utilizava.

Isso criou uma navegação sem volta para a homepage. O usuário precisava voltar à seleção e, em alguns caminhos, sair/reentrar na autenticação para alcançar o Portal.

## Correção

`js/portal/portal-core.js` permanece como proprietário único da navegação de retorno:

- `window.returnToOfficialPortal = backToPortal`
- limpa apenas o estado visual/editorial do Portal (`section`, `world`, `detail`)
- chama `showScreen('screen-portal')`
- não executa `doLogout()`
- não atribui `currentUser = null`

### Pontos de entrada adicionados

- `screen-mode-select`: `PORTAL OFICIAL`
- `screen-ancoragem`: `PORTAL OFICIAL`
- Códices — entrada: `PORTAL OFICIAL`
- Códices — ala do mundo: `PORTAL OFICIAL`

Os botões da Sala dos Mestres foram promovidos para o contêiner global da tela de Ancoragem e o botão duplicado dentro de `master-room.js` foi removido.

## Arquivos alterados

- `index.html`
- `js/portal/portal-core.js`
- `js/world-codices.js`
- `js/master-room.js`
- `css/portal/portal.css`
- `QA/test-portal-return-navigation-v0.61.2.js`
- `QA/test-portal-return-navigation-v0.61.2-behavior.js`
- `QA/test-portal-return-navigation-v0.61.2.py`
- `VERSION.txt`

## Testes

PASS — todos os `node --check`.
PASS — suíte JS completa existente.
PASS — teste estrutural do retorno ao Portal.
PASS — teste de comportamento do proprietário do Portal: `screen-portal` abre e `currentUser` permanece o mesmo objeto.
PASS — nenhum novo logout introduzido.
PASS — nenhum `currentUser = null` no caminho de retorno.
PASS — nenhum botão duplicado de retorno na Sala dos Mestres.
PASS — IDs HTML não duplicados nos pontos alterados.

## Limitação do ambiente

O Chromium disponibilizado neste ambiente bloqueia navegação de páginas locais e `127.0.0.1` com `ERR_BLOCKED_BY_ADMINISTRATOR`; por isso o smoke E2E da página completa não pôde ser executado aqui. O comportamento do proprietário foi executado isoladamente em VM e os demais fluxos foram cobertos por testes estruturais/regressão.
