# Seite_Mundos-Sombrios — 2.3.0

## Centro de Comando do Mestre
- Campanha -> Sessão -> Cena -> Consequência.
- Dashboard operacional, fases Preparação/Sessão/Pós-sessão e cronologia automática.
- Storyboard reordenável de cenas com contexto de local, NPCs, pistas, encontro, ambiente e mapa.
- Facções vivas, mapa de relações, Mundo em Movimento e visão do jogador.
- Busca universal por cenas, NPCs, pistas, facções, relações e história.
- Encerramento de sessão com arquivo do registro e pendências.

## Ferramentas
- Combat Director com PV rápido, reações, efeitos temporários e duração por rodadas.
- NPCs completos com facção, lealdade, medo, relação e memória de campanha.
- Pistas nos estados Preparada -> Descoberta -> Compreendida e revelação dramática.
- Escudo passa a consultar também os Registros Históricos.

## Registros Históricos
- Suplemento oficial incorporado em `codex-files/registros-historicos-mundos-sombrios.pdf`.
- Índice operacional do Ano 1 ao Ano 100 com geopolítica, economia, eventos e ganchos.
- Marco histórico selecionável por campanha e conversão de ganchos em cenas.

## Permissões
- Migração opcional/necessária em produção: `supabase-master-v2.3-migration.sql`.
- Papéis de mesa: Mestre principal, Co-Mestre, Observador e Jogador.

## VTT
- Rolagem de dados reescrita com animação estável, `requestAnimationFrame`, bloqueio contra cliques concorrentes e `crypto.getRandomValues` quando disponível.
