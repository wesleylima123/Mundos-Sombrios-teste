# Inventário funcional — V2.9.0 Consolidação

Legenda: **I** implementado · **T** testado · **P** persistência/contrato testado · **R** papéis testados.

| Área | I | T | P | R | Evidência principal |
|---|:---:|:---:|:---:|:---:|---|
| Login offline | ✓ | ✓ | ✓ | ✓ | `offline-db.js`, smoke browser |
| Jogador / Mestre / ADM | ✓ | ✓ | ✓ | ✓ | testes V2.9 + toolbar QA |
| Portal | ✓ | ✓ | — | ✓ | smoke desktop/mobile |
| Forja / fichas | ✓ | ✓ | ✓ | ✓ | testes de categorias, save protegido |
| Êxodo: categoria posterior | ✓ | ✓ | ✓ | ✓ | `exodo-category-flow-v2.8.10.test.js` |
| Ocultatun: progressão própria | ✓ | ✓ | ✓ | ✓ | jornada V2.9.0 |
| Viewer universal | ✓ | ✓ | ✓ | ✓ | smoke desktop + visibilidade de Mesa |
| Recursos protegidos | ✓ | ✓ | ✓ | ✓ | solicitação Jogador → decisão Mestre |
| Diretório / admissão de Mesa | ✓ | ✓ | ✓ | ✓ | testes 2.8 + jornada V2.9 |
| Criação/exclusão de Mesa | ✓ | ✓ | ✓ | ✓ | testes de papéis/ownership |
| VTT / grid / iniciativa | ✓ | ✓ | ✓ | ✓ | testes VTT + smoke mobile |
| Campanha em Movimento no VTT | ✓ | ✓ | — | ✓ | núcleo `table-shell-v3.js` + smoke mobile |
| SoulDrakma | ✓ | ✓ | ✓ | ✓ | suíte Soul Economy |
| PEG / Evolução Gradual | ✓ | ✓ | ✓ | ✓ | jornada completa V2.9 |
| Núcleo 3D PEG | ✓ | ✓ | ✓ | ✓ | smoke mobile Mestre/Jogador |
| Arconte: concessão PEG à Mesa | ✓ | ✓ | ✓ | ✓ | teste administrativo + smoke desktop |
| Sandbox integral | ✓ | ✓ | ✓ | ✓ | byte equality + browser smoke |
| Supabase genérico | ✓ | ✓ | ✓ | ✓ | SQL consolidado/contratos; sem conexão real nesta consolidação |
| Mobile 390 px | ✓ | ✓ | — | ✓ | smoke browser mobile |

## Observação
A coluna de Supabase cobre esquema/contratos/RPCs e configuração genérica, mas a V2.9.0 foi validada sem conectar o pacote a um projeto Supabase do usuário. RLS/Realtime reais devem ser validados somente no ambiente remoto escolhido para implantação.
