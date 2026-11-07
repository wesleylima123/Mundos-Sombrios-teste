# Mundos Sombrios — Portal, Mesa e evolução

Entrega: 16/09/2026. Base: V2.10.2 consolidada. Esta é a revisão atual; os relatórios anteriores dentro de AUDIT documentam etapas históricas.

## O que foi aplicado

### Portal e direção artística

- Três imagens inteiramente novas, geradas para o projeto: limiar entre os mundos, arquivo institucional de Êxodo e biblioteca ritual de Ocultatun. Nenhuma imagem anterior foi usada como referência ou matéria-prima.
- Hero com arte em destaque, texto curto, título amplo e duas ações: Entrar no jogo e Explorar os mundos. Retirado o console ornamental que disputava espaço com a imagem.
- Acessos grandes para os dois mundos: Êxodo em azul mineral/âmbar; Ocultatun em bronze/vinho. Os detalhes de leitura ficam sobre áreas escuras previsíveis.
- Para contas autenticadas: Continuar minha mesa e Minhas personagens. Se há uma mesa em contexto, o primeiro botão retorna a ela; caso contrário, abre a seleção de mesas. Minhas personagens reutiliza Fichas Rápidas e o viewer existente.
- Mantido um destaque principal e conteúdo editorial real. Notícias/eventos sem publicações não geram blocos vazios na página inicial.
- Arte nova também nos cabeçalhos de preparação dos Mestres. Tipografia pequena revisada nas folhas existentes, foco de teclado e controles do Centro de Comando com mínimo de 44 px.
- Na sessão, a arte não encobre o mapa. Cabeçalho sóbrio, destaque textual de sessão pausada e aviso explicitamente identificado como enviado a todos.
- As regras antigas de hero e cartões de mundos foram retiradas de folhas concorrentes antes de implantar a composição em `portal-editorial-v2.2.css`. O inventário das regras substituídas está em `art-portal-css.json`.

Os arquivos de arte anteriores continuam no acervo para funcionalidades não redesenhadas. Os defaults do Portal e os cabeçalhos alterados usam apenas as imagens novas. Conteúdo que um administrador já tenha publicado permanece sob controle editorial; não foi regravado banco externo.

### Janela de fichas e miniaturas móveis

- Botão **FICHAS** no cabeçalho da Mesa e nas ferramentas abre uma janela ampla de participantes. Os cartões mostram identificação e recursos disponíveis, com acesso às miniaturas.
- Cada personagem permitido recebe um ícone circular com iniciais. O título do ícone informa o nome completo.
- Clique/toque abre a miniatura; outro clique no mesmo ícone a recolhe. É possível manter várias miniaturas abertas.
- Ícones e miniaturas podem ser arrastados. **Alt + setas** permite movimentação pelo teclado. A posição dos ícones é preservada nesta sessão do navegador, separada por usuário, mesa e papel.
- A janela de participantes oferece **Organizar ícones** e **Atualizar participantes**. Cada miniatura oferece Atualizar e Abrir ficha completa. Escape recolhe as miniaturas e a janela, exceto quando há uma confirmação modal aberta.
- As miniaturas são de leitura e usam o **mesmo renderizador de ficha** do viewer de Evolução: atributos, recursos, perícias, poderes, rituais, equipamentos e dados narrativos disponíveis. Não foi criada outra cópia persistida da ficha.
- Jogador vê suas próprias fichas vinculadas à mesa. Mestre em contexto de gerenciamento tem os ícones dos participantes. A leitura passa por `Characters.view`, mantendo a autorização do backend; um ícone não concede acesso a dados privados.
- Saída, troca de mesa/papel e remoção de participante limpam a interface. Respostas assíncronas atrasadas são descartadas para evitar exibir uma ficha do contexto anterior.
- O mapa e a conversa continuam nos mesmos elementos ao alternar painéis. As miniaturas ficam independentes da coluna estreita de personagens.

### Reserva e movimentação de evolução

Os dois caminhos anteriores — painel de evolução e Central Tripulação — agora delegam a `MS_POINTS.open` em `js/points-ui.js`. O serviço financeiro existente continua sendo a fonte dos saldos e operações.

| Ação | O que a pessoa vê antes de confirmar | Efeito |
|---|---|---|
| Abastecer reserva | Quantidade, custo total em SoulDrakma e reserva resultante | Compra PEG para a mesa |
| Conceder pontos | Personagem, quantidade, motivo, reserva e saldo do personagem resultantes | Transfere PEG da reserva para a ficha |
| Retirar pontos | Concessão anterior, quantidade integral, motivo e saldos resultantes | Reverte a concessão e devolve PEG à reserva |

**Retirar pontos preserva a regra existente de reversão integral de uma concessão.** Não foi inventada uma operação de débito parcial. A lista usa as concessões reversíveis do histórico disponibilizado pelo backend; a confirmação é rejeitada se os pontos já tiverem sido gastos ou a concessão já tiver sido revertida.

O formulário permanece aberto quando há erro, apresenta a mensagem e impede submissões simultâneas. Cancelamento não movimenta saldos. Mudar de mesa antes da confirmação invalida a ação. Compra limitada a 200 PEG por operação, compatível com o limite do fluxo principal anterior.

Pontos disponíveis não significam aumento automático de graduação: as trilhas, sucessos e validações de evolução continuam separados e explicados na interface.

Foi corrigida uma divergência concreta do adaptador local: a reversão agora bloqueia uma segunda retirada da mesma concessão, como já fazia o SQL remoto, e reduz corretamente o contador de pontos distribuídos. Não houve alteração de SQL nem execução em banco externo.

## Validação realizada

`npm run build` aprovado: sincronização de versão, regeneração do sandbox, sintaxe, suíte completa e geração de `dist`.

| Indicador | Antes desta etapa | Depois |
|---|---:|---:|
| Testes totais | 255 | 268 |
| Aprovados | 236 | 249 |
| Falhas | 0 | 0 |
| Ignorados históricos | 19 | 19 |
| Novas artes raster | 0 | 3 |

Os 13 testes novos cobrem filtros por papel, limites de posição, prévia de saldos/custo, valores inválidos, exclusão de concessões revertidas, mesa ativa, dupla submissão, cancelamento, erro do backend, compra/concessão/reversão real no adaptador local, proteção contra segunda reversão, abertura/recolhimento, arraste sem clique acidental, teclado, descarte de resposta atrasada e integração do Portal com suas mídias e atalhos.

Duas verificações antigas foram atualizadas para o novo proprietário dos estilos e os novos rótulos de botões; não foram silenciadas. Os 19 testes ignorados continuam ligados a arquivos históricos ausentes no ZIP recebido.

## Limites importantes da entrega

**Não foi possível validar a geometria final em navegador.** A tentativa de instalar Chromium para Playwright falhou por timeout e erro 502. Os testes de interface usam Node/VM e DOM controlado, não um motor de renderização. As imagens geradas foram inspecionadas, mas isso não equivale a testar o site renderizado.

**Multiplayer remoto continua sem homologação.** O pacote não traz URL e chave pública do Supabase configuradas. Não se afirma que testes locais comprovem RLS, latência, atualização entre duas máquinas ou reconexão real.

Antes de publicar, testar em 390, 768, 1024 e 1440 px: Portal; Mesa com seis participantes; arraste e recolhimento; miniaturas simultâneas; abrir ficha completa; retorno da Forja; rolagem dos painéis; teclado; compra, concessão e retirada. Repetir os fluxos de leitura e pontos com Mestre e Jogador em sessões remotas distintas quando houver backend configurado.

## Arquivos e revisão

- `js/points-ui.js`: formulário canônico de pontos.
- `js/table-sheets.js`: janela e miniaturas, posições e ciclo de vida.
- `css/table-sheets.css`: estilos desses dois componentes.
- `js/evolution-gradual-v2.10.1.js`: exportação do renderizador já existente.
- `tests/art-experience.test.js`: novos testes comportamentais.
- `manifesto.json`, `alteracoes.patch` e `before/`: hashes, diferenças e fontes anteriores desta etapa.
- `art-build-final.log`: resultado integral do build.
- `art-browser-install.log`: evidência da limitação de navegador.

A fonte, `dist/` e `sandbox-offline/` estão no ZIP. O sandbox foi gerado novamente; não foi editado como uma segunda aplicação.

## Artes originais e prompts

Método: ferramenta integrada de geração de imagens, sem referências anteriores, sem CLI ou imagens de banco. Arquivos finais no projeto:

1. `assets/art-direction/portal-threshold.png`
2. `assets/art-direction/exodo-archive.png`
3. `assets/art-direction/ocultatun-library.png`

### Prompt — Portal

Create original concept art for a dark tabletop RPG website Mundos Sombrios. Use case stylized-concept. Asset: cinematic website hero, wide landscape 1536x1024 or wider. An immense abandoned archive at the threshold between two worlds: on the left monumental brutalist institutional corridors, mineral blue glass, cold mist and subtle amber emergency lights; on the right a forbidden ritual library of dark stone, aged manuscripts, restrained burgundy shadows and bronze celestial instruments. A narrow luminous threshold joins the worlds in the right half. Painterly premium editorial game concept art, sophisticated chiaroscuro, atmospheric depth, tactile architecture, no characters necessary. Left third quiet dark negative space suitable for HTML headline overlay. No letters, no typography, no logo, no watermark, no UI. Entirely new image, no existing references. Save output for integration into the project.

### Prompt — Êxodo

Use case stylized-concept. Original premium RPG environment illustration for the Êxodo world gateway on a website. Landscape. A vast abandoned brutalist research archive, towering steel shelving and glass partitions, mineral blue haze, restrained amber status lights, an eerie luminous phenomenon beyond the distant observation window. Architectural realism with painterly detail, exquisite light, somber and mysterious, grey stone, tarnished metal, institutional papers. Readable large shapes at small card sizes, central vanishing point, no text, no lettering, no UI, no watermark, no logos. Brand new artwork, do not reference existing images.

### Prompt — Ocultatun

Use case stylized-concept. Original landscape concept art for Ocultatun dark occult RPG website world gateway. A forbidden library carved in black stone, towering shelves receding into darkness, an open illuminated manuscript on a bronze reading desk, suspended delicate astronomical rings framing a distant sealed doorway, deep burgundy textiles, old ivory paper, muted bronze and candlelight, fine atmospheric haze. Sophisticated painterly architectural game concept art with strong readable composition at small sizes. Quiet, ominous, elegant. No lettering or text, no logo, no watermark, no UI. Completely new artwork.
