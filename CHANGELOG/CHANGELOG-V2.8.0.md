# Mundos Sombrios V2.8.0 — Diretório de Fendas e Recrutamento

## Objetivo

A V2.8.0 completa a experiência de entrada do Jogador nas mesas, separando descoberta pública de acesso privado e adicionando recrutamento controlado pelo Mestre.

## Diretório de Fendas

- Janela universal para Jogador, Mestre e ADM consultar mesas públicas ativas.
- Exibe somente metadados de recrutamento: descrição, Mestre, modo, classes, expansões/naturezas, limite, participantes e quantidade online.
- Não expõe código privado, chat, `table_state`, eventos, configurações secretas ou fichas completas.
- “Minhas Mesas” continua restrito às mesas em que o usuário é membro/dono, com exceção administrativa prevista pelo sistema.

## Requisitos e admissão

- Mestre configura modo Êxodo, Ocultatun ou Híbrida por botões.
- Mestre seleciona classes e expansões/naturezas permitidas.
- Mestre define limite de jogadores, visibilidade pública e recebimento de solicitações.
- Jogador escolhe uma ficha antes de solicitar entrada.
- O servidor valida propriedade da ficha, modo, classe, expansão/natureza, banimento, estado e capacidade.
- Ficha incompatível é recusada com motivo.
- Aprovação repete a validação para impedir admissão com requisito que deixou de ser válido.
- Entrada por código e convites não contornam os requisitos.

## Convites

- Convite global para a mesa.
- Convite direcionado a username específico.
- Convite direcionado tem prioridade quando coexistir com convite global.
- Aceite exige uma ficha válida para os requisitos atuais da mesa.

## Presença e Realtime

- `table_presence` registra presença efêmera para a contagem online.
- Mudanças de recrutamento/membros disparam refresh no lobby privado.
- Polling de segurança preservado como fallback.

## Solicitações administrativas

- Mestre/ADM requests passam por resolução atômica e idempotente.
- Aceitar/recusar persiste no servidor antes da interface remover a janela.
- Uma solicitação concluída não reaparece como pendente após nova hidratação.

## Mesa do Jogador

- Chat permanece visível e funcional.
- Rolagem de dados permanece visível e publica eventos persistentes.
- Grid permanece visível e mantém botão de Totem.
- Área de participantes passa a exibir:
  - ficha completa do próprio Jogador;
  - cartões públicos dos demais participantes com nome, username e papel;
  - nenhuma informação privada das fichas alheias.
- Corrigida reentrada na Mesa V3 após o shell remover o antigo `vtt-quick-access`.
- Sandbox ignora eco da própria aba para não duplicar chat/dados.
- Indicador de sincronização hidrata imediatamente o estado atual do Session Engine.

## Banco

Nova migração obrigatória após V2.7.3:

`supabase-table-directory-v2.8-migration.sql`

Nenhuma migração foi aplicada automaticamente ao Supabase remoto durante esta entrega.

## Validação

- 134/134 testes automatizados aprovados.
- 42 arquivos JavaScript válidos.
- `npm run build` aprovado.
- Teste em Chromium/Sandbox como Jogador confirmou sessão SYNCED, grid, chat, dados e painel de participantes visíveis.
- Chat enviado pelo Jogador persistiu uma única vez.
- D20 do Jogador persistiu em `table_events`.
- Saída e reentrada na Mesa mantiveram 3 cartões de participantes e sessão SYNCED.
