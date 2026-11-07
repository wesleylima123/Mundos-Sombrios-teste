# Regressão e Reestruturação do Esotérico — V0.58.0

## Objetivo
Substituir integralmente a janela antiga de Anomalias do Esotérico por uma única implementação canônica, mantendo os dados existentes e adicionando uma seção própria para Engenharia de Covis.

## Antes
- Renderer e mutadores misturados em `js/mundos-updates.js` (V0.16/V0.17).
- CSS cirúrgico dividido entre blocos históricos em `css/style.css`.
- Concorrência entre renderer antigo e camadas de compatibilidade.
- Dados estavam em `characters[*].esoterico`, mas regras de UI não tinham proprietário isolado.
- Covil e enxertos compartilhavam a janela histórica.

## Depois
- Proprietário único: `js/esoterico-surgery.js`.
- CSS único: `css/esoterico-surgery.css`.
- `mundos-updates.js` deixa de renderizar/manipular a mecânica do Esotérico.
- Janela de Anomalias reconstruída como sala de cirurgia.
- Laboratório de Covis independente abaixo da sala de cirurgia.
- Estado persistente continua em `characters[*].esoterico`.
- Contexto fora da classe remove a UI residual.

## Fonte oficial revisada
Nenhum PDF separado específico do Esotérico está presente no repositório. A implementação canônica da classe está no `codex-files/livro-base-ocultatun-ecos.pdf`, seção `ESOTÉRICO: O CIENTISTA DO ABISMO`, incluindo Autocirurgia, Enxertos, Engenharia de Covis, especializações e Decadência.

## Testes
- Sintaxe de todos os JS: PASS.
- QA Alquerino: PASS.
- QA Consolidação: PASS.
- QA Envolto: PASS.
- QA Esotérico estático: PASS.
- QA Galeria: PASS.
- QA Hermético: PASS.
- QA Registro de Potências: PASS.
- QA Projeto Player: PASS.
- QA Security Baseline: PASS.
- Browser harness do módulo Esotérico: PASS.
  - caminho feliz: aceite do enxerto;
  - rejeição: +1 Estresse;
  - edição de enxerto;
  - entrada inválida;
  - registro de Covil;
  - normalização de dados inválidos;
  - recarga/renderização do estado;
  - contexto fora do Esotérico não mantém a janela.
- IDs duplicados: 0.
- Referências locais ausentes: 0.

## Limitação de ambiente
O navegador completo do site via `file://` permanece bloqueado pelo ambiente de execução. O teste E2E completo da página não deve ser interpretado como aprovado; o browser harness valida diretamente o módulo canônico e seus fluxos de UI.
