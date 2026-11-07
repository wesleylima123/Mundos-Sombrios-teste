# Mundos Sombrios — v0.65.0

## Online-first
- Supabase Auth + PostgreSQL + RLS + RPC + Realtime consolidam a fonte de verdade.
- Adicionada camada de serviços de domínio (`ms-services.js`).
- Mesas usam `tables` + `table_members`, com convites seguros.
- Fichas usam `characters` + `character_versions`, com histórico e restauração.
- Sala dos Mestres consulta somente dados permitidos pela sessão autenticada.
- VTT separa estado estrutural do Mestre de eventos de jogadores.
- Entradas, saídas, banimentos e exclusão de mesas passam por RPCs protegidas.
- Adicionados campanhas e sessões no modelo do banco para evolução futura.
- Regressão corrigida: hidratação/login não cria novas versões artificiais.
