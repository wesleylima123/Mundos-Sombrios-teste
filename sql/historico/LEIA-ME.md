# SQL histórico — NÃO usar em banco novo

Estes arquivos são migrações, patches e instaladores de versões anteriores. Ficam aqui só como registro (alguns testes automatizados os leem).

Para um banco novo, use **apenas** `supabase-install-completo-v2.10.1.sql`, na raiz do projeto. Ele já inclui tudo o que está aqui, inclusive as correções de realtime de chat/dados e do grid.

## migrations-cli-nao-aplicar/

Migrações que estavam em `supabase/migrations/`. As duas com conteúdo substituem a função `progression_table_state` por uma versão que sempre responde "progressão indisponível", o que desliga PEG/Evolução na mesa. Foram tiradas da pasta do Supabase CLI para que `supabase db push` não as aplique por engano.
