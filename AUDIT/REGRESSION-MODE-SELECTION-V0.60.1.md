# Mundos Sombrios V0.60.1 — Regressão da Seleção de Modo

## Causa-raiz
A V0.60.0 passou a carregar `js/master-shield-rules.js` diretamente no `index.html`. Esse arquivo contém o índice do Escudo do Mestre (~832 KB de JS/JSON) e era interpretado durante o boot da aplicação, bloqueando o thread principal e podendo deixar a seleção de modo/Santuário sem resposta, sobretudo em dispositivos mais lentos.

## Correção
A referência eager foi removida do `index.html`. `js/master-tools.js`, proprietário do Escudo, agora carrega `js/master-shield-rules.js` de forma assíncrona somente quando uma consulta do Escudo é feita. O estado loading/erro da consulta também foi explicitado.

## Mantido
- `selectGameMode()` continua pertencendo ao `script.js`.
- `showScreen()` continua pertencendo ao `script.js`.
- Mesa dos Mestres e ferramentas privadas não foram reescritas.
- Dados e armazenamento existentes foram preservados.

## Testes
- `node --check` em todos os JS: PASS
- mode-selection-master-regression: PASS
- master-vtt-browser-v0.60: PASS
- world-codices-v0.59.0: PASS
- security-baseline: PASS
- consolidation-baseline: PASS
- IDs HTML duplicados: 0
- referência eager ao shield no `index.html`: ausente
