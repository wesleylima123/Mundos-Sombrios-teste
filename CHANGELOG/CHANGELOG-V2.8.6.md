# V2.8.6 — Fenda Studio, Idempotência e Desempenho

- Corrige multiplicação de mesas: o rascunho ganha identidade estável, o botão trava durante o salvamento e `create_table_secure` passa a ser idempotente por `p_id`.
- Corrige os quatro gateways iniciais brancos ao mover o estilo-base para a camada própria do Portal.
- Refaz integralmente o fluxo visual de criação de mesa e a Mesa ao Vivo/Fenda Studio, mantendo IDs e contratos públicos necessários à compatibilidade.
- Amplia o grid com cursor, totens, NPCs, mapa, grade, encaixe, régua, cone, linha, raio, limpeza de medidas e iniciativa.
- Reduz o boot local: histórico canônico e motor visual de dados 3D passam a carregar sob demanda; hidratação de mesas evita consulta duplicada e perfis globais deixam de ser buscados por Jogador/Mestre.
- Adiciona `supabase-bugfix-v2.8.6-migration.sql` para aplicação manual em bancos existentes.
- Sandbox atualizado para V2.8.6 e chave `ms-sandbox-v286`.
