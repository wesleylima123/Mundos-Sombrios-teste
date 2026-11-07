# Auditoria Geral por Papel — V2.8.8

## Escopo
Varredura sobre Portal, Login, Forja, Santuário, Ancoragem, Mesa ao Vivo, Campanha em Movimento, diretório/recrutamento, ferramentas de Mestre, Arconte/ADM, SoulDrakma, persistência e responsividade.

## Achados corrigidos durante a auditoria
1. A camada da Forja V2.8.7 usava um `MutationObserver` capaz de reagir às próprias mutações de UI. A V2.8.8 remove o observador e atualiza por eventos explícitos, evitando loops/re-renderizações e reduzindo risco de lentidão.
2. O pacote de sandbox integrado apontava para `sandbox.js`, mas o arquivo não existia no diretório V2.8.7. Runtime offline V2.8.8 criado e validado.
3. Categoria era visualmente selecionável, porém a validação canônica ainda considerava apenas Nome + Expansão + Classe. V2.8.8 torna Categoria o quarto pré-requisito no frontend e no backend.
4. `supabase-production.sql` não consolidava `touch_table_presence`, `set_table_live_status` e `fetch_my_table_summaries`. As funções e `table_presence` foram consolidadas para instalações novas.
5. A camada V2.8.7 da Forja adicionava ~30 KB ao boot. A V2.8.8 é lazy-loaded pelo `feature-loader`; boot local permanece em ~766,6 KB de JS local.

## Forja / Categorias
- Categorias agora são três ícones compactos 3D animados, sem cards.
- Combatente aplica +3 FOR, +2 AGI, +1 PRN; Atletismo 2, Pontaria 2, Luta 2; +5 PE.
- Sobrevivente aplica +3 VIG, +3 AGI; Tratamento 3, Intuição 3; +5 PE.
- Especialista aplica +4 INT, +1 PRN; Especialidade 4, Tecnologia 4; +15 PE.
- Em Ocultatun, a camada transversal preserva os bônus de atributos/PE e usa equivalentes de perícias do vocabulário do modo: Medicina/Sobrevivência e Investigação/Artífice.
- Mudança de categoria remove os bônus da anterior antes de aplicar a nova.
- Benefícios são gravados como `categoryPreset` no payload da ficha.
- Categoria aparece no resumo da ficha e nas perícias nativas bloqueadas.
- Valores derivados recalculam PV, Defesa, Fortitude, Reflexos, Vontade, deslocamento, iniciativa e recursos de classes especiais.

## Jogador
Validado no sandbox e por regressão estática:
- não cria/exclui mesa;
- não vê ações ADM;
- entra/sai da mesa e retorna ao site;
- botão Salvar Fenda permanece oculto;
- acesso a Forja, Códices, Santuário e Ancoragem preservado;
- associação de ficha e permissões continuam protegidas por RLS/RPC nos testes existentes.

## Mestre
- criação de mesa gera exatamente uma mesa no teste interativo;
- Salvar Fenda visível;
- exclusão disponível;
- entrada/saída preserva vínculo da campanha;
- Campanha em Movimento permanece integrada à Mesa;
- ferramentas de grid, iniciativa, Escudo e gestão de equipe preservadas pela suíte de regressão;
- status ao vivo/presença consolidado no SQL principal.

## ADM
- criação/exclusão de mesa disponíveis;
- solicitação de Mestre: aceitar/recusar/excluir validada no sandbox; resolução segura continua coberta pelos testes;
- Arconte, SoulDrakma, usuários, permissões e painel administrativo cobertos pela regressão existente;
- ações administrativas permanecem isoladas do perfil Jogador.

## Responsividade
- Sandbox em viewport 390 px: `scrollWidth=390`, `clientWidth=390`, sem overflow horizontal.
- Forja V2.8.8 redefine grid para 2 colunas em tablet e 1 coluna em mobile.
- Mesa V3 muda para fluxo vertical em <=960 px; janelas flutuantes ficam limitadas a 96vw/80vh.
- Ícones de categoria reduzem rótulos em <=640 px mantendo área de toque.

## Automação
- 43 arquivos JavaScript sintaticamente válidos.
- 172 testes detectados.
- 153 aprovados.
- 0 falhas.
- 19 condicionais/skip históricos (dependem de runtime/migração antiga que não acompanha esta árvore como artefato executável).
- Build de produção concluído; `dist/` exclui SQL, testes e auditorias.

## Limitação
Esta auditoria não usa credenciais reais dos usuários do Supabase de produção. Fluxos dependentes de dados reais foram validados pelo sandbox offline, contratos SQL/RPC e testes de regressão; a aplicação das migrações no projeto Supabase real continua necessária para certificar o ambiente hospedado.
