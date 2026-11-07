# V2.8.11 — Sandbox Integral Offline

- Restaura login offline no site principal quando não há Supabase configurado.
- Adiciona adaptador local que implementa o contrato `MS_DB` usado pelo site.
- Sandbox deixa de ser página reduzida e passa a ser réplica integral do runtime.
- Barra QA permite alternar Jogador, Mestre e ADM/Arconte usando o fluxo real de autenticação/hidratação.
- Persistência local separada entre site offline e sandbox.
- Simulação local de Mesas, VTT/eventos, Progressão Gradual, SoulDrakma, solicitações ADM, conteúdo do Portal e ferramentas de Mestre.
- Nenhum endpoint, project-ref ou credencial Supabase é embutido. Nenhum workflow GitHub é incluído.

## Validação
- 51 arquivos JavaScript válidos.
- 196 testes: 177 aprovados, 0 falhas, 19 skips condicionais.
- Build concluído.
