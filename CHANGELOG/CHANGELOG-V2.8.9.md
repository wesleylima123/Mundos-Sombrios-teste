# V2.8.9 — Autoridade de Ficha e Evolução Gradual

- Adiciona viewer universal somente leitura para fichas.
- Bloqueia alterações mecânicas livres após a criação; narrativa permanece editável.
- Cria carteira PEG por Mesa, saldo PEG por personagem e ledger de progressão.
- Mestre/ADM distribuem PEG e podem reverter concessões ainda não consumidas.
- Mestre/ADM compram PEG para a Mesa com SoulDrakma; jogador não pode comprar.
- Arconte/ADM pode conceder ou retirar PEG diretamente de qualquer Mesa.
- Recursos sensíveis são alterados por solicitação/aprovação ou ajuste Mestre/ADM.
- Ocultatun mantém Sucessos de Carreira separados do PEG.
- Mesa define requisitos de admissão e política de visualização de ficha.
- Núcleo 3D de Evolução aparece permanentemente apenas para Mestre/ADM e temporariamente ao jogador receptor durante concessão.
- Progressão V2.8.9 é carregada sob demanda.
- Migração: `supabase-progression-v2.8.9-migration.sql` / patch `supabase-v2.8.9-live-patch.sql`.
