# V2.8.8 — Categorias compactas, presets automáticos e auditoria por papel

- Substitui cards de categoria por três ícones 3D animados compactos junto ao fluxo de expansão/classe.
- Aplica o pacote de categoria automaticamente aos atributos e perícias; registra o bônus de PE e `categoryPreset` no payload.
- Mantém os pacotes canônicos de Êxodo: Combatente (+3 FOR, +2 AGI, +1 PRN; Atletismo 2, Pontaria 2, Luta 2; +5 PE), Sobrevivente (+3 VIG, +3 AGI; Tratamento 3, Intuição 3; +5 PE) e Especialista (+4 INT, +1 PRN; Especialidade 4, Tecnologia 4; +15 PE).
- Em Ocultatun, a categoria transversal utiliza o mesmo pacote de atributos/PE e traduz as perícias inexistentes para equivalentes do próprio vocabulário do modo (Medicina/Sobrevivência e Investigação/Artífice).
- Move a camada V2.8.8 da Forja para carregamento sob demanda, evitando regressão de peso no boot.
- Revalida Mesa/Campanha, Login, Portal, Ancoragem, Arconte e responsividade por papel.

- Auditoria detectou e removeu observer autorreferente da Forja.
- Sandbox integrado ganhou runtime próprio V2.8.8.
- `supabase-production.sql` consolidou presença/status/sumários atuais.
- Categoria passou a ser pré-requisito obrigatório também no backend.

## Implantação hospedada
- `supabase-v2.8.8-live-patch.sql` consolida em um único patch as correções necessárias para uma instalação Supabase já existente: presença, status ao vivo, sumários, exclusão segura e Categoria obrigatória na gravação de ficha.
