# Release Audit — Mundos Sombrios V2.10.1

Hotfix focado na jornada de Evolução Gradual em produção.

Critérios de aceite:
- Jogador envia treino e evolução.
- Evolução pode ser solicitada com PEG individual insuficiente.
- Mestre aprova e pode completar PEG faltante pela reserva.
- Mestre pode conceder evolução diretamente em trilha pronta.
- Filas operacionais sincronizam sem fechar/reabrir a Central.
- Supabase contém RPCs e tabelas de progressão/evolução necessários.
- Sandbox e produção compartilham o mesmo contrato.
