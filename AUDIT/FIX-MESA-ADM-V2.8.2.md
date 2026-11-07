# Auditoria de Correção — V2.8.2

Escopo: erros reportados em Mesa ao Vivo, criação/exclusão de Fenda e moderação de solicitações administrativas.

## Resultado
- `SAIR DA MESA` permanece acessível no layout responsivo.
- `SALVAR FENDA` permanece acessível no layout responsivo.
- Exclusão de Fenda aceita proprietário representado por `profiles.id` ou UUID legado do Auth.
- Co-Mestre continua sem poder apagar a Fenda do proprietário.
- ADM pode aceitar/recusar, silenciar e excluir solicitações por RPCs `security definer` com validação de papel.
- O esquema consolidado inclui as RPCs de moderação necessárias.

## Validação local
- `node --test tests/bugfix-v2.8.2.test.js`: 4/4 testes aprovados.
- `node tests/syntax-check.mjs`: 42 arquivos JavaScript válidos.
- `sandbox-offline/sandbox.js`: sintaxe validada e sem dependências HTTP/HTTPS.

## Implantação futura
Nenhuma configuração de Supabase/GitHub foi executada. Em um banco existente, a correção SQL correspondente está em `supabase-bugfix-v2.8.2-migration.sql`.
