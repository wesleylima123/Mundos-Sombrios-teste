# Mundos Sombrios V2.10.0 — Evolução Gradual

A V2.10.0 integra a progressão narrativa do RPG ao sistema operacional do site. Sucessos determinam elegibilidade; PEG efetiva o avanço. A economia existente de SoulDrakma, Reserva PEG e Ledger permanece canônica.

## Jogador
- FICHAS global abre Fichas Rápidas e o visualizador somente leitura fora do Santuário.
- Visualizador organizado em FICHA / EVOLUÇÃO / HISTÓRICO.
- Trilhas estruturadas para atributos, perícias, vantagens, talentos, poderes, rituais e classe/cargo.
- Registro de práticas, treinamentos e solicitações semânticas de evolução.
- Custos, saldo PEG, sucessos restantes e requisitos narrativos ficam visíveis antes da solicitação.
- Desenvolvimento autoral abre apenas o módulo pertinente da Forja.

## Mestre / Co-Mestre
- TRIPULAÇÃO consolida PERSONAGENS / SOLICITAÇÕES / TREINAMENTOS / LEDGER.
- Reconhecimento de sucessos, requisitos, treinamento, concessão PEG e aceleração narrativa.
- Evoluções aprovadas alteram apenas a capacidade solicitada e preservam versionamento/auditoria.
- Co-Mestre usa a mesma autoridade operacional do Mestre no backend online e offline.

## Êxodo e Ocultatun
- Treino operacional: Básico CD 13/+1, Prático CD 18/+2, Difícil CD 23/+3.
- Poderes/Rituais exigem ruptura/descoberta narrativa reconhecida.
- Falhas geram risco temático auditável: Pressão do Gene Êxodo ou Ruptura do Véu, com severidade acumulada.
- O sistema não impõe automaticamente mutação ou perda de sanidade; a resolução permanece com o Mestre.
- Classe/cargo usa cinco requisitos narrativos canônicos.
- Aceleração permite +1 graduação por acontecimento excepcional, registrada separadamente no Ledger.

## ADM / Arconte
- Evolução lista Mesas com reserva, fichas, trilhas prontas e pendências.
- Ledger por Mesa combina Economia PEG e Memória de Evolução.
- ADM acessa qualquer Mesa no Sandbox e herda Central Operacional, Núcleo de Evolução e comandos de Mestre.

## Sandbox / VTT / Mobile
- Fabric Lite local inicializa canvas, grid, formas, régua, tokens básicos, serialização e movimentação offline.
- Produção continua apta a usar Fabric.js completo.
- Correção do vínculo de Mesa ao abrir Evolução pela FICHA global.
- TRIPULAÇÃO móvel permanece integralmente dentro da viewport e acima das janelas do VTT.
- Central Operacional é drawer inferior em 390×844.
- Fichas Rápidas, Evolução e Arconte sem overflow horizontal em 390×844.

## Validação
- 56 arquivos JavaScript sintaticamente válidos.
- 233 testes: 214 aprovados, 0 falhas, 19 condicionais.
- QA real em Chromium: Jogador → Mestre → evolução de perícia → Arconte → ADM na Mesa.
