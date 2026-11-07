# Seite_Mundos-Sombrios_V2.0 — 2.1.0

## Experiência de criação
- A Forja da Alma ganhou um **Roteiro da Alma** em oito momentos: Conceito, Origem, Classe, Atributos, Competências, Poderes, Equipamento e Jogar.
- Adicionado **Modo Guiado / Modo Rápido** para equilibrar aprendizagem e velocidade para usuários experientes.
- Adicionado **Retrato Vivo**, com prévia do personagem, progresso de construção, recursos e identidade mecânica.
- Ao navegar entre classes antes de confirmar, o Retrato Vivo exibe uma **prévia fantasma** da opção atual e seus atributos-base.
- Os 31 cards de classe/natureza/expansão recebem orientação de função: estilo de jogo, complexidade, pontos fortes, fragilidades, sinergias, situações a evitar e exemplo de personagem.

## Criar, Evoluir e Jogar
- A ficha agora distingue três contextos de uso: **Criar**, **Evoluir** e **Jogar**.
- O modo Jogar oferece HUD enxuto com recursos e poderes prioritários.
- Poderes podem ser marcados como favoritos; a preferência é persistida dentro do dado estruturado do poder.
- A Evolução Gradual foi transformada visualmente em linha de memória, com progresso de prática e destaque para avanços autorizados pelo Mestre.

## Transparência mecânica
- Atributos e recursos recebem consulta de **composição da regra** sem esconder a fórmula-base.
- PV, EP/Energia, Estamina/EB, Ameaça, DS/ES/Síntese, Assimilação/CO e LHL exibem sua origem de cálculo quando aplicável.
- A prévia continua usando as regras existentes; a camada V2.1 não cria uma segunda fonte de cálculo.

## Direção de arte dinâmica
- Identidade visual específica para Êxodo, Ocultatun, Envolto e Ordem dos Sete através de tokens de interface compartilhados.
- Assimilação, Estresse, Corrupção Ontológica e Recordação passam a comunicar estado também visualmente, com intensidade discreta e sem substituir o valor numérico.
- Confirmações de origem/classe receberam momentos narrativos curtos e tematizados.
- Transições entre mundos receberam linguagem própria.

## Portal e acessibilidade
- Portal prioriza quatro intenções: **Conhecer os Mundos, Criar Personagem, Consultar Regras e Acessar Mesas**.
- Adicionado controle global de experiência: **Funcional, Imersivo e Cinemático**.
- Áudio de interface é opcional, desativado por padrão e sintetizado localmente; não há música ou autoplay.
- `prefers-reduced-motion` e o modo Funcional reduzem animações e parallax.

## Compatibilidade
- A atualização foi implementada como camada de experiência sobre os módulos consolidados de V2.0.
- Salvamento, histórico, rascunho, regras, módulos especializados, Realtime e estrutura das fichas permanecem compatíveis.
- Exportação PDF ignora os elementos de HUD/guia e continua mostrando o conteúdo da ficha mesmo se o usuário estiver no modo Jogar.
