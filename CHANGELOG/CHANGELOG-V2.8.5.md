# V2.8.5 — Responsividade, QA Offline e Identidade do Site

## Ancoragem / Mestre / ADM
- Abas da Ancoragem agora ficam contidas no viewport em telas estreitas e usam rolagem horizontal interna sem ampliar a página.
- Centro de Comando ganhou contenção responsiva para navegação, cabeçalho, ações e painéis; `Equipe` e `Encerramento` permanecem acessíveis no mobile.
- Janelas de solicitações ADM receberam classe própria e, em telas de até 640 px, são centralizadas e limitadas ao viewport.

## Sandbox offline
- O sandbox integrado da entrega V2.8.5 usa chave de armazenamento própria (`ms-sandbox-v285`).
- Ao entrar em uma mesa como Mestre ou ADM, `SALVAR FENDA` permanece disponível para reproduzir o fluxo real; Jogador não recebe esse controle.

## Identidade
- Novo favicon oficial dedicado a Mundos Sombrios em SVG, ICO e PNG para atalhos/touch.

## Empacotamento
- `COMPLETO.zip` continua contendo o site de produção sem sandbox.
- `UPDATE.zip` continua cumulativo desde V2.8.2 e sem sandbox.
- O terceiro artefato passa a ser uma pasta completa do site com `sandbox-offline/` integrado, sem ZIP adicional.
