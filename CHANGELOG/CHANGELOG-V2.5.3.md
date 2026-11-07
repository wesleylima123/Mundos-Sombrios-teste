# Mundos Sombrios V2.5.3 — Imortalização Mínima

## Regra nova
- **Êxodo** e **Ocultatun** usam a mesma regra de persistência.
- Os únicos pré-requisitos para **IMORTALIZAR FICHA** são:
  1. Nome;
  2. Expansão / origem;
  3. Classe.
- Todos os demais campos são opcionais e podem ser completados ou revisados depois.

## Implementação
- `js/ms-platform.js`: validação bloqueante reduzida aos três campos essenciais.
- Atributos fora da faixa, conceito incompleto e poderes incompletos passam a ser observações, não bloqueios.
- `index.html`: a Forja exibe explicitamente os três pré-requisitos junto ao botão de imortalização.
- `supabase-character-minimum-v2.5.3-migration.sql`: aplica a mesma regra no servidor, preservando limites de slots e entitlements da Soul Economy.
- SQLs de instalação limpa também foram alinhados.

## QA
- 36/36 arquivos JavaScript válidos.
- 79/79 testes aprovados.
