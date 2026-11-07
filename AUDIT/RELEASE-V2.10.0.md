# Release Audit — Mundos Sombrios V2.10.0

## Resultado
Release candidata validada com 56 arquivos JavaScript válidos e 233 testes (214 aprovados, 0 falhas, 19 condicionais).

## QA funcional
- Jogador: FICHAS global, visualizador integral, saldo PEG, 11 trilhas, prática e treinamento.
- Jornada real: Luta 2→3 após 30 sucessos, concessão PEG, solicitação e aprovação do Mestre; sucessos reiniciados para 0/40 e gasto registrado.
- Mestre: Central Operacional com quatro subáreas de Evolução e Ledger.
- Arconte: ajuste de reserva e Ledger por Mesa com economia e memória de evolução.
- ADM: acesso à Mesa e autoridade operacional de Mestre.
- Sandbox: Fabric Lite local confirmado no VTT.

## QA mobile 390×844
Fichas Rápidas, visualizador, Evolução, VTT, TRIPULAÇÃO, drawer da Central e Arconte foram exercitados sem overflow horizontal. O botão TRIPULAÇÃO permanece totalmente dentro da viewport e acionável sobre as janelas do VTT.

## Observação de banco
`supabase-install-completo-v2.10.0.sql` é o instalador cumulativo: base V2.9.0 + migração semântica V2.10.0. Para atualização de uma instalação V2.9.0 existente, pode ser aplicada apenas `supabase-progression-v2.10.0-migration.sql`.
