# Auditoria — Grid e Sonoplastia V2.11.2

## Causa das linhas invisíveis

A V2.11.1 criou uma exclusão mútua involuntária: `MS_GRID_ENGINE` deixava de desenhar quando `MS_GRID_ARCHITECT` estava presente e o Architect, por sua vez, deixava de desenhar quando o Grid Engine oficial existia. Assim, nenhum renderer assumia a matriz.

Na V2.11.2, o Grid Engine oficial continua cedendo a renderização espacial ao Architect, mas o Architect não interrompe mais `drawGrid()` por causa da presença do Grid Engine. A configuração oficial continua sendo consumida em tempo real por `MS_GRID_ENGINE.active()`.

## Causa do posicionamento inconsistente de objetos/totens

A biblioteca selecionava itens e alterava a ferramenta, mas não havia um contrato completo para estado pendente, preview espacial e confirmação por clique para todos os tipos de item. Totens artísticos eram especialmente frágeis porque dependiam da camada Fabric sem receber coordenadas de destino de forma explícita.

A V2.11.2 introduz `pendingProp`, `pendingToken`, `hoverBoard`, preview visual e posicionamento no clique. O helper `msCreateTokenGroup` aceita `left/top`, permitindo inserir o totem no ponto escolhido.

## Nova arquitetura sonora

Os presets procedurais foram substituídos por loops locais renderizados antecipadamente. Isso reduz CPU durante a sessão e permite uma sonoplastia mais controlada.

Fluxo:

`Catálogo de paisagens → decodeAudioData → Deck A / Deck B → crossfade → high-pass → EQ de diálogo → compressor → saída`

Os loops são estéreo, locais e codificados em OGG/Opus. O mixer mantém duas camadas e permite troca contínua sem corte brusco.

## QA isolado

Foi executada uma Mesa mínima com `MS_GRID_ENGINE` e `MS_GRID_ARCHITECT` presentes simultaneamente — exatamente a condição do bug.

Resultados:
- linha vertical esperada apresentou pixel diferente do fundo;
- prop inserido por clique entrou em `state.interactives`;
- totem inserido por clique entrou em `state.tokens`;
- catálogo sonoro retornou 22 paisagens;
- Deck A `exodo_archive` + Deck B `ocultatun_ritual` tocaram simultaneamente;
- nenhuma exceção de página foi registrada.
