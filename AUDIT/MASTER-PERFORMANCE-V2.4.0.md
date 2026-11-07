# Mundos Sombrios — QA do Mestre e Performance V2.4.0

## Escopo
Revisão da área do Mestre da V2.3.0 com foco em enquadramento da Fundação de Campanha, integração de Campanha em Movimento à mesa, rolagens poliédricas 3D e redução do custo do boot.

## Correções funcionais
### Fundação de campanha
O modal genérico crescia além do viewport depois da expansão de campos da V2.3. O diálogo agora usa `height:min(92vh,860px)`/`max-height:92vh`, grid de três linhas, rolagem somente em `.create-table-scroll` e regras específicas para telas baixas/estreitas. Cabeçalho e ações permanecem acessíveis.

### Campanha em Movimento
O Centro Operacional deixou de ser um painel global independente da Ancoragem. O contexto é montado na mesa selecionada, mantendo a campanha ativa e seu Cofre no mesmo espaço de trabalho.

### Dados 3D
`js/dice-3d.js` implementa projeção de malha em Canvas 2D para D4, D6, D8, D10, D12 e D20. A animação usa `requestAnimationFrame`, rotação tridimensional, perspectiva, sombreamento e aterrissagem. Rolagens remotas usam o mesmo renderer em uma apresentação transitória.

## Performance antes/depois
| Métrica de boot local | V2.3.0 | V2.4.0 | Variação |
|---|---:|---:|---:|
| JavaScript estático | 1.619.672 B | 629.802 B | -61,1% |
| CSS estático | 319.445 B | 264.347 B | -17,2% |
| scripts locais no `index.html` | 29 | 21 | -8 |
| folhas CSS locais no `index.html` | 16 | 11 | -5 |

### Gargalos eliminados
- Fabric.js e html2pdf antecipados no `<head>`.
- `mundos-updates.js` (~616 KB), `power-registry.js` (~162 KB) e módulos especializados da Forja no boot do Portal/Sala do Mestre.
- Criação/destruição contínua de partículas DOM.
- Polling de lifecycle da Forja a cada ~800 ms apesar de já existir MutationObserver.

## Validação automatizada
- `npm run syntax`: 35/35 JS válidos.
- `npm run test`: 60/60 testes aprovados.
- Testes V2.4 cobrem enquadramento do modal, integração da campanha, modelos/faces dos dados, animação remota, lazy loading e orçamento do boot.

## Validação visual em navegador
Foi tentada uma rodada adicional com Chromium 144 em modo headless. O runtime corporativo bloqueia tanto `http://127.0.0.1` quanto `file://` com a mensagem `Your organization doesn’t allow you to view this site`. Portanto, não foi possível produzir uma nova certificação visual do navegador neste ambiente. Essa limitação é do ambiente e está registrada explicitamente; não foi substituída por uma alegação de teste visual inexistente.

## Recomendação de publicação
Após publicar os arquivos da V2.4, fazer uma smoke test em navegador real: abrir Fundação de Campanha em desktop/tablet/mobile; alternar Centro Operacional/Cofre; rolar D4/D6/D8/D10/D12/D20 em duas sessões simultâneas; abrir VTT e exportar PDF confirmando os carregamentos lazy. A migração Supabase V2.3 continua válida; a V2.4 não introduz nova migração SQL.
