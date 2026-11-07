# Regressão V0.60.0

## Passou
- `QA/test-alquerino-laboratorio.js`
- `QA/test-consolidation-baseline.js`
- `QA/test-envolto-espasso-final.js`
- `QA/test-esoterico-surgery-v0.58.0.js`
- `QA/test-galeria-personagem-v0.57.5.js`
- `QA/test-hermetico-ritual-selection.js`
- `QA/test-master-room-v0.59.0.cjs`
- `QA/test-master-tools-v0.60.js`
- `QA/test-power-registry.js`
- `QA/test-project-player-module.js`
- `QA/test-security-baseline.js`
- `QA/test-world-codices-v0.59.0.js`
- `QA/test-worlds-master-browser.py`
- `QA/test-master-vtt-browser-v0.60.py`

## Browser master/vtt
- retorno dos Códices -> seleção de modo: PASS
- Mestre cria mesa Êxodo: PASS
- ADM cria mesa Ocultatun: PASS
- arquivos privados upload/download/perm: PASS
- bloco de notas: PASS
- NPC criar/editar: PASS
- Escudo do Mestre consulta Potência de Alcance 5 e encontra `30 metros de raio`: PASS
- grid abre e aceita objeto: PASS
- chat envia mensagem: PASS
- d20 rola e registra histórico: PASS
- galeria recebe imagem: PASS
- jogador entra pela mesma mesa: PASS
- jogador não recebe Escudo/cofre/controles GM: PASS
- recarga restaura chat, dados, galeria e grid: PASS

## Integridade
- todos os JavaScript: `node --check` PASS
- IDs duplicados em `index.html`: 0
- referências locais de scripts ausentes: 0
- ZIP: `unzip -tq` PASS

## Limitação
A autenticação continua sendo client-side, conforme a arquitetura do protótipo. O Escudo é determinístico/local; ele não é uma IA generativa e só responde a partir do índice dos ativos oficiais carregados na build.
