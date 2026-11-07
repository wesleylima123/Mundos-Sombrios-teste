# AUDIT v0.57 — Desenvolvimento — Poderes & Potências

## Escopo
Correção exclusiva das rotas: Arquiteto de Linhagem, Operador de Sistema, Linhagem Herdada, Agente de Carreira, Agente Designado e Envolto. Interfaces que já funcionavam (Nexo especializado e Ordem dos Sete) não foram alteradas pelo novo registro.

## Causa encontrada
O registro v0.54 podia não ser re-renderizado após a seleção da classe e o rascunho genérico mostrava apenas nome + Capacidade, sem descrição completa da Potência/Capacidade anexada.

## Correções
- Renderização idempotente do Registro de Potências após seleção de classe, abertura da aba, seleção da natureza e carregamento da ficha.
- Prévia detalhada do rascunho antes da criação do Poder.
- Potência anexada mostra descrição, Capacidade e efeito/custo.
- Remoção individual do anexo atualiza a prévia.
- Limite de 3 Potências por Poder preservado.
- Fonte de dados: 12×10 para Êxodo nessas expansões, 8×10 para agentes de carreira/designados e 13×10 para Envolto.

## Validações
- Node syntax check: PASS
- Rotas alvo com dados: 6/6 PASS
- Êxodo: 12 Potências × 10 Capacidades = 120 níveis
- Ocultatun carreira/designados: 8 × 10 = 80 níveis
- Envolto: 13 × 10 = 130 níveis
- IDs HTML duplicados: 0
- power-registry.js carregado uma vez
- PDFs oficiais: 7


## Varredura geral desta build

### Estrutura
- O pacote entregue contém um único HTML principal, um CSS principal e módulos JS locais.
- A sintaxe de todos os 12 arquivos JS ativos foi validada com `node --check`.
- Não foram encontrados IDs HTML duplicados.
- Todas as referências locais de script/CSS presentes em `index.html` existem no pacote.

### Concorrência encontrada
- `js/mundos-updates.js` ainda concentra blocos históricos rotulados de v0.12 a v0.45 e múltiplas sobrescritas de funções centrais. Este arquivo permanece como o módulo consolidado ativo; nenhuma nova camada de patch foi criada. A consolidação estrutural completa deve ocorrer dentro do próprio módulo/arquivos proprietários, substituindo a lógica redundante, e não adicionando outro loader.
- Os testes QA que apontavam para `/mnt/data/work53` e `/mnt/data/fix52` estavam obsoletos e foram removidos/substituídos por testes locais nesta distribuição.

### Bugs corrigidos nesta varredura
- Rotinas do painel ADM agora recusam execução quando `currentUser.role !== 'admin'`, inclusive chamadas diretas a partir do console.
- A recuperação de senha deixou de revelar credenciais em texto puro.
- Clique em ficha de modo diferente do modo selecionado volta ao fluxo de criação de ficha no modo da ficha, em vez de trocar silenciosamente o contexto e abrir a ficha errada.
- Exclusão de arquivo oficial do Códice agora possui registro de desativação, evitando que o seed automático o recrie imediatamente.

### Baseline de desenvolvimento v0.57

Nesta preparação foram removidas as credenciais seed em texto puro, criado fluxo explícito para configuração do primeiro ADM, adicionada migração de senha legada para PBKDF2 local, removida a exibição de senha no painel ADM e adicionados guards para dependências externas de PDF, corte e VTT. Isso reduz os riscos acidentais e prepara a base para a migração futura ao backend, mas não transforma o client-side em um ambiente seguro contra adulteração do navegador.

### Limitação arquitetural importante
O site é atualmente client-side e persiste usuários, fichas, mesas e uploads administrativos em `localStorage`. Portanto, controle de acesso e conteúdo administrativo não constituem segurança de servidor; um usuário tecnicamente habilidoso ainda pode alterar o armazenamento local. A correção atual impede acessos acidentais/diretos pela interface e pelas funções, mas não substitui autenticação/autorização real de backend.

### Acervo oficial
Os 7 PDFs listados no catálogo atual estão efetivamente presentes e referenciados pelo Códice: 2 livros-base + 5 expansões. Não há PDF extra não referenciado no diretório `codex-files/`.
