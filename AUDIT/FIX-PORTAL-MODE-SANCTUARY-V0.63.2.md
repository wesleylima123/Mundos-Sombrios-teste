# Correção — Portal → Seleção de Modo → Santuário → Criação de Ficha

## Problema reproduzido
O Portal carregava visualmente, mas as áreas protegidas do jogo não eram alcançáveis. O clique para entrar no jogo dependia de `showScreen`, `doLogin` e `selectGameMode`; esses símbolos deveriam ser registrados por `js/script.js`.

## Causa-raiz
No início de `js/script.js` existia:

```js
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
```

A declaração usa o mesmo identificador no lado esquerdo e direito dentro da mesma declaração lexical. Isso acessa `supabase` durante sua Temporal Dead Zone e interrompe a execução do arquivo com `ReferenceError`.

Consequência: o restante de `script.js` nunca era executado. Assim, `showScreen`, `doLogin`, `selectGameMode`, `beginNewCharacter` e toda a camada de navegação/autenticação do jogo não chegavam a ser registrados.

Havia ainda uma inconsistência arquitetural: o próprio `script.js` já possuía autenticação local baseada em `localStorage` + PBKDF2, e `doRegister()` gravava contas em `mundosSombriosUsers`. O login, porém, tinha sido desviado para Supabase. Isso tornava o fluxo de contas locais incompatível mesmo depois de eliminar o erro de inicialização.

## Correção na origem
Proprietário mantido em `js/script.js`:

- autenticação local: `doLogin`, `doRegister`, `doRecover`, `doLogout`;
- navegação: `showScreen`;
- seleção de modo: `selectGameMode`;
- Santuário: `showScreen('screen-char-select')` + `renderCharList`;
- criação de ficha: `beginNewCharacter`.

Alterações:

1. Removida a inicialização Supabase que abortava o script.
2. Removida a dependência CDN do Supabase do `index.html`.
3. `doLogin()` voltou a validar `usersDB` localmente por usuário/e-mail e `passwordHash` PBKDF2.
4. Mantida migração transparente de contas legadas com campo `password` para `passwordHash`.
5. Removido o adapter `createSupabaseAdmin()`, que ficou sem consumidor depois da consolidação da autenticação local.

## Antes / Depois

| Área | Antes | Depois |
|---|---|---|
| Boot de `script.js` | Abortava em `supabase.createClient` | Executa integralmente |
| `showScreen` | Não registrado | Único proprietário ativo |
| Login | Dependia de Supabase enquanto contas eram locais | Validação local PBKDF2 |
| Portal → jogo | Bloqueado | Acessível após login |
| Seleção de modo | Função não carregada | Êxodo e Ocultatun abrem o Santuário |
| Santuário | Não alcançável | Abre por modo e preserva contexto |
| Criação de ficha | Não alcançável | `beginNewCharacter` abre o construtor |
| Supabase | Dependência/resíduo incompatível | Removido |

## Testes executados

### Regressão funcional
- Login local → Portal: **PASS**
- Portal → Seleção de modo: **PASS**
- Êxodo → Santuário: **PASS**
- Ocultatun → Santuário: **PASS**
- Santuário → criação de ficha: **PASS**
- `beginNewCharacter` com contexto de modo válido: **PASS**

### Integridade estrutural
- JS syntax em todos os arquivos: **PASS**
- referências locais do `index.html`: **0 ausentes**
- IDs HTML duplicados: **0**
- `showScreen`: **1 definição**
- `selectGameMode`: **1 definição**
- guard final de `beginNewCharacter`: **1 instalação**
- referências Supabase em `index.html`/`js`: **0**

## Limitação do ambiente
O Chromium disponível no ambiente não permitiu concluir um smoke test visual completo porque o processo headless ficou bloqueado neste runtime. Os fluxos acima foram testados executando as funções reais extraídas do código em uma sandbox JavaScript com DOM/estado simulados e os checks estruturais do repositório.
