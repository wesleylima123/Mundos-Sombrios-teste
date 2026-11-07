# Mundos Sombrios — V2.11.2

## Grid Architect — correção de renderização e posicionamento

- Corrigido o bloqueio mútuo entre `MS_GRID_ENGINE` e `MS_GRID_ARCHITECT` que fazia as linhas da matriz desaparecerem.
- O Architect agora é o renderer espacial canônico quando está ativo; o overlay legado cede corretamente sem impedir a renderização.
- A grade ganhou contraste padrão mais legível e continua respeitando formato, cor, opacidade, espessura, coordenadas e visibilidade aos jogadores.
- Refeito o fluxo de biblioteca artística para objetos e totens: selecionar → pré-visualizar sobre o mapa → clicar para posicionar → persistir.
- Props carregam dimensões e comportamentos do catálogo no ponto clicado.
- Totens do catálogo podem ser colocados no ponto clicado e continuam integrados à camada oficial de tokens/Fabric quando disponível.
- Adicionados cursores, estado de posicionamento e preview da área ocupada antes da confirmação.

## Sonoplastia da Mesa

O sistema de ambiência procedural anterior foi substituído por um Soundscape Engine local, desenhado especificamente para sessões de RPG.

- 22 paisagens sonoras estéreo locais em OGG/Opus.
- Loops de aproximadamente 18 segundos, desenhados para repetição contínua.
- Duas camadas simultâneas com crossfade.
- EQ de diálogo com redução suave da faixa de 1,5–3,6 kHz e foco em 2,2 kHz para abrir espaço para as vozes da mesa.
- Filtro de subgrave e compressor suave no master.
- Importação de áudio personalizado preservada.
- Funcionamento Offline/SANDBOX sem dependência externa.

### Êxodo
- Arquivo Nexo
- Laboratório biométrico
- Complexo industrial
- Megacidade sob chuva

### Ocultatun
- Arquivo interdito
- Câmara ritual
- Anomalia ativa
- Subsolo inundado

### Ambientes gerais
- Floresta noturna
- Tempestade
- Ruínas em chamas
- Sala silenciosa
- Chuva leve
- Chuva forte
- Vento oco
- Caverna e gotejamento
- Bombas e água
- Sala de máquinas
- Fluorescente
- Metrô
- Rádio/interferência
- Arquivo

## Validação

- Build integral aprovado.
- 328 testes executados.
- 309 aprovados.
- 0 falhas.
- 19 condicionais/ignorados.
- 64 arquivos JavaScript com sintaxe válida.
- QA isolado do runtime confirmou linhas visíveis, posicionamento de prop, posicionamento de totem e mix de duas paisagens sonoras.
