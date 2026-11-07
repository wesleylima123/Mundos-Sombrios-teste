# Mundos Sombrios — Experiência do Mestre V2.3.0

## Objetivo
Transformar a área do Mestre de uma coleção de ferramentas em um sistema operacional de campanha, organizado em **Campanha → Sessão → Cena → Consequência**, preservando os contratos consolidados do banco, VTT, Cofre e Escudo.

## Centro de Comando
- Painel operacional por campanha com fase **Preparação / Em Sessão / Pós-sessão**.
- Métricas rápidas: pistas ocultas, consequências pendentes, facções e cenas.
- Atalhos contextuais para Cofre, VTT, Escudo e Registros Históricos.
- Cronologia automática de ações relevantes da sessão.
- Encerramento de sessão com revisão e passagem de pendências para a próxima preparação.

## Fundação de campanha
A criação de mesa passou a registrar, além de nome/modo/tema:
- tom;
- foco;
- nível de sigilo;
- nível de ameaça;
- marco histórico inicial;
- postura frente ao T.S.I.N. e escala tecnológica em Êxodo;
- exposição paranormal e instituição em Ocultatun.

## Sessões e cenas
- Storyboard de cenas arrastável.
- Cena com resumo, local, mapa, NPCs, pistas, encontro e ambiente.
- Ação **Iniciar cena** registra o evento, muda o estado da sessão e envia contexto ao VTT.
- Mapa da cena pode ser aplicado como fundo do VTT quando disponível.

## Combat Director
- PV com ajustes rápidos.
- Reações prontas/usadas.
- Condições e efeitos com duração em rodadas.
- Redução automática de duração ao avançar rodada.
- Registro de rodada na cronologia da sessão.

## NPCs
- Cadastro rápido e reutilizável ampliado com facção, lealdade, medo, relação, histórico, token, ataques, resistências, poderes, comportamento e objetivos.

## Pistas e revelações
- Estados: **Preparada → Descoberta → Compreendida**.
- Ligações entre pistas.
- Revelação dramática para os jogadores via VTT/realtime.

## Facções e relações
- Facções com postura, influência, objetivo e progresso.
- Evolução incremental de objetivos.
- Mapa de relações textual entre personagens, NPCs, organizações, locais e eventos.

## Visão do Jogador
- Mestre pode abrir uma visualização da cena ativa e do material efetivamente revelado aos jogadores.

## Busca universal
- `Ctrl/Cmd + K` pesquisa cenas, facções, relações, pistas, NPCs e registros históricos.

## Registros Históricos
O suplemento histórico foi incorporado como fonte operacional do Mestre:
- linha do tempo por períodos;
- eventos globais;
- economia/geopolítica;
- ganchos de campanha;
- seleção de marco histórico para campanha;
- conversão de gancho histórico em cena;
- consulta no Centro de Comando;
- consulta contextual no Escudo;
- visão própria **Registros Históricos** no Escudo;
- PDF integral preservado em `codex-files/registros-historicos-mundos-sombrios.pdf`.

O índice cobre do primeiro semestre após a vigência do T.S.I.N. ao Ano 100 Pós-G.E., incluindo a ascensão de Hakuré, Voglaskov e seus Angels, Protheus/Nova Ordem, Guerra Norte-Americana, Base Lunar Ápice, Linhagem Herdada, Grande Silêncio, Project Player e situação geopolítica/econômica atual.

## Portal do Mestre
Para Mestre/ADM, a janela do portal torna-se **Centro de Operações**, com acesso direto ao Centro de Comando, Registros Históricos e Escudo.

## Papéis de mesa
Nova migração `supabase-master-v2.3-migration.sql` adiciona contratos para:
- Mestre principal;
- Co-Mestre;
- Observador;
- Jogador.

A migração adiciona `can_manage_table(...)` e `set_table_member_role(...)` e amplia políticas de estado da mesa, notas, NPCs e arquivos para gestores autorizados.

> Importante: para colaboração protegida no Supabase de produção, execute `supabase-master-v2.3-migration.sql` após as migrações já existentes. O frontend continua respeitando o papel global de Mestre/ADM para abrir as ferramentas administrativas.

## Rolagem de dados
A animação antiga foi substituída por uma rolagem única e controlada:
- `requestAnimationFrame` em vez de múltiplos `setTimeout` de 2 s;
- bloqueio temporário dos botões durante a rolagem;
- aterrissagem visual clara do resultado;
- `crypto.getRandomValues` quando disponível, com fallback;
- suporte a `prefers-reduced-motion`;
- sincronização preservada com histórico, chat e realtime.

## Qualidade
- 32/32 arquivos JavaScript válidos.
- 52/52 testes aprovados.
- Nenhum arquivo removido em relação à V2.2.0.
- 17 arquivos modificados e 8 novos.
