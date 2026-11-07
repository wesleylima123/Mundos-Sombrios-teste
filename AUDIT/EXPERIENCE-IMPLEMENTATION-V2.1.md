# Mundos Sombrios — Implementação de Experiência V2.1

## Objetivo
Transformar a criação de ficha e a navegação do site em uma experiência diegética, mantendo compatibilidade com a arquitetura V2.0 consolidada e sem criar uma segunda fonte de regras ou persistência.

## Mapeamento das 15 diretrizes

| # | Diretriz | Implementação V2.1 | Estado |
|---|---|---|---|
| 1 | Criação como experiência narrativa | Roteiro da Alma em 8 momentos, textos contextuais por universo e Modo Guiado/Rápido | Implementado |
| 2 | Cards venderem a fantasia | Os 31 cards recebem estilo de jogo, complexidade, pontos fortes, fragilidades, sinergias, contraindicações e exemplo | Implementado |
| 3 | Prévia antes de confirmar | Retrato Vivo entra em estado de prévia fantasma ao navegar por uma classe ainda não confirmada e exibe atributos-base | Implementado |
| 4 | Escolhas mecanicamente transparentes | Botões de composição em atributos/recursos e painel com fórmulas-base | Implementado |
| 5 | Ficha mudar conforme personagem | Skins por mundo/natureza + arte do arquétipo + estados de transformação | Implementado |
| 6 | Momentos de confirmação | Overlay breve e tematizado para Origem e Classe; suprimido em hidratação e Modo Rápido | Implementado |
| 7 | Sistema visual de consequências | Assimilação, Estresse, Corrupção Ontológica e Recordação alteram discretamente a linguagem visual | Implementado |
| 8 | Retrato Vivo | Preview persistente com arte/avatar, origem, classe, recursos, complexidade, progresso e estado | Implementado |
| 9 | Separar Criar/Evoluir/Jogar | Três modos no cabeçalho; Jogar oferece HUD rápido com recursos e ações | Implementado |
| 10 | Evolução como memória | Linha temporal, contador de práticas e destaque para avanço autorizado | Implementado |
| 11 | Portal como porta dos mundos | Quatro intenções primárias: cenário, personagem, regras e mesas | Implementado |
| 12 | Transições como narrativa | Transições por mundo e intensidade, respeitando redução de movimento | Implementado |
| 13 | Som opcional | Feedback sintetizado localmente, OFF por padrão, sem música e sem autoplay | Implementado |
| 14 | Linguagem própria por universo | Tokens/skins para Êxodo, Ocultatun, Envolto e Ordem dos Sete | Implementado |
| 15 | Imersão ajustável | Funcional / Imersivo / Cinemático + áudio e Modo Guiado/Rápido persistidos como preferência local | Implementado |

## Compatibilidade e fonte de verdade
- `js/immersive-experience.js` observa e apresenta o estado existente; não substitui `ms-platform.js`, `ms-services.js` ou os módulos de natureza/classe.
- Favoritos de poderes são persistidos no próprio objeto estruturado do poder, sem criar repositório paralelo.
- Preferências de UI podem usar `localStorage`; autenticação, fichas, mesas e conteúdo canônico não usam essa preferência como fonte de verdade.
- A exportação PDF esconde guias/HUD e força a área principal da ficha a permanecer visível mesmo se o jogador estiver no modo Jogar.

## Acessibilidade e desempenho
- Modo Funcional desativa as animações narrativas mais pesadas.
- `prefers-reduced-motion` é respeitado.
- Áudio só inicia após ação explícita do usuário.
- Parallax de retrato só é habilitado no modo Cinemático.
- Layout possui quebras para tablet e celular.

## Validação
- Build: `npm run build`.
- Sintaxe: 30 arquivos JavaScript válidos.
- Testes: 29/29 aprovados.
- Testes V2.1 cobrem portal, jornada, 31 guias de decisão, estados visuais, transparência mecânica, áudio opcional, favoritos e evolução.

## Limite de validação
A suíte é estrutural/regressiva e não substitui uma rodada manual em navegadores reais com diferentes tamanhos de tela, Supabase de produção e dispositivos de desempenho baixo. A implementação foi construída para degradação segura pelo Modo Funcional e `prefers-reduced-motion`.
