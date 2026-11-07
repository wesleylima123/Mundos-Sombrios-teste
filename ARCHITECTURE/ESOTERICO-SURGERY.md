# Arquitetura do Esotérico — V0.58.0

## Fonte única de verdade
A fonte de dados da ficha continua sendo `characters[*].esoterico`. O proprietário da apresentação e das regras interativas é `js/esoterico-surgery.js`.

`mundos-updates.js` não possui mais renderer nem mutadores concorrentes de Anomalias/Enxertos/Covis. Ele pode apenas participar da infraestrutura genérica de persistência e contexto já existente no site.

## Dados preservados
O novo módulo normaliza e preserva os campos históricos:
- `activeGrafts`
- `grafts`
- `surgeryUsed`
- `stress`
- `coves`
- `specializations`
- `decadence`
- `ptRejection`
- `rejectionResult`
- `medicineBonus`
- `lastAcceptance`
- `lastHealing`
- `lastMutation`
- `lastError`

Quando registros antigos de enxertos não possuem IDs consistentes, a restauração resolve por ID, depois por nome e só então normaliza um fallback.

## Regras canônicas implementadas
Baseadas no capítulo `ESOTÉRICO: O CIENTISTA DO ABISMO` do `codex-files/livro-base-ocultatun-ecos.pdf`:
- PV inicial: `(VIG x 10) + 12`.
- EP inicial: `(INT x 5) + 15`.
- Dado de Vida: `1d8` por patamar.
- Autocirurgia Paranormal: 1 vez por sessão; 1 hora de descanso; troca de enxertos ativos ou cura `2d8` PV.
- Rejeição: `Vigor + Medicina`, CD 15; falha acrescenta +1 Estresse até o fim da missão.
- Slots: `Modificador de Vigor + 1`.
- Ativação de enxerto: `Capacidade x 2 EP`.
- Vantagem em TCP quando `Capacidade < Vigor`.
- Covis: Rápido (1 ação padrão, CD 10 + GC, 1 cena), Prático (10 minutos, CD 15 + GC, 24h), Perpétuo (1 semana, CD 20 + GC, permanente).
- GC: 1–10; Integridade: `GC x 10`; defesas Corporal/Mental/Existencial com base `10 + INT`.
- Especializações: Sincronização de Núcleo, Registro da Carne, Simbiose Modular, Eco de Realidade Falsa.
- Decadência: 1–2 Dissonância Biológica; 3–4 Desumanização Funcional; 5 Herege — O Oráculo Calcinado.

## UI / estados
A janela única é uma sala cirúrgica responsiva com monitoramento de PV/EP, ECG, instrumental, campo de implantação, console de aceitação/rejeição e laboratório de Covis abaixo.

Estados contemplados:
- loading: conteúdo inicial aguarda as dependências base e os atributos da ficha;
- sucesso: enxerto aceito, registro salvo, Covil registrado;
- erro: formulário inválido, falta de Slots, autocirurgia já utilizada ou rejeição;
- contexto/permissão: fora da classe Esotérico o renderer remove a janela e não deixa UI residual.

As animações são decorativas e sutis; `prefers-reduced-motion` desativa transições/efeitos para usuários que solicitarem redução de movimento.

## Modais e componentes
O módulo usa um único modal reutilizável por fluxo para cadastro/edição de Enxerto e registro de Covil. Botões de ação são `type="button"` e não submetem o formulário da ficha.

## Persistência
O módulo expõe `capture()` e `load()` em `window.EsotericoSurgery`. Wrappers no ciclo genérico da ficha apenas transferem o estado para o payload e de volta, sem replicar as regras de negócio.

## Dependências
Não há dependência externa específica para o Esotérico. O layout e os símbolos são CSS/HTML/SVG textual, evitando falhas de CDN.
