# ARCHITECTURE v0.55

O Registro de Potências agora possui uma camada de apresentação e composição específica para as seis rotas solicitadas.

`sourceData()` continua sendo a fonte única de Potências/Capacidades.
`renderDetail()` mostra a descrição da Potência e a tabela 1–10.
`renderDraftPreview()` mostra o estado real de `currentPowerDraft` antes da criação.
`bindRegistryToDraft()` adiciona/remove os anexos usando o estado central da ficha.

A camada é acionada após `openTab('tab-powers')`, `selectNature`, `loadCharacterToBuilder` e `selectClass`, evitando o problema de ordem de inicialização.


## Baseline v0.57
- Autenticação local endurecida: sem credenciais seed; primeiro ADM criado via setup.
- Senhas novas usam PBKDF2/SHA-256 via Web Crypto; contas antigas são migradas no primeiro login válido.
- Painel ADM não exibe senhas; redefinição usa campo opcional de nova senha.
- Dependências externas críticas possuem guardas para degradação controlada.
- Próxima etapa arquitetural: separar `script.js` por domínio sem alterar comportamento.


## Consolidação v0.57.7
- Removidos blocos V0.21/V0.22 do Envolto que estilizam classes não emitidas pelo renderer canônico atual.
- Removidos helpers comprovadamente órfãos em `linhagem-tree.js` e `ordem-sete.js`.
- A suíte QA não contém mais caminhos absolutos temporários; os testes resolvem o repositório por `__dirname`.
- Wrappers de compatibilidade ainda usados foram preservados e estão listados no relatório de consolidação.
