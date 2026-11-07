# Mundos Sombrios V2.9.0 — Consolidação

A V2.9.0 substitui a cadeia fragmentada de pacotes 2.8.x por uma árvore canônica única. O objetivo desta versão é garantir que uma funcionalidade só seja considerada presente quando estiver carregada, acionável, persistente e validada pelo papel correto.

## Consolidação estrutural
- Uma única árvore de runtime para produção e sandbox.
- `sandbox-offline/` é reconstruído automaticamente pelo `npm run sandbox` copiando os mesmos bytes de HTML, CSS e JavaScript do site principal; somente `js/ms-runtime-config.js` é substituído pelo backend local isolado.
- Configuração Supabase genérica, sem URL, project-ref, chave ou repositório específicos.
- SQL consolidado de instalação: `supabase-install-completo-v2.9.0.sql`.
- Contrato executável `js/ms-consolidation-v2.9.0.js` verifica os serviços essenciais em runtime.

## Fichas e progressão
- Visualizador universal somente leitura independente da Forja.
- Alterações narrativas comuns permanecem permitidas; campos mecânicos e recursos protegidos não podem ser adulterados pelo save comum.
- Evolução Gradual (PEG) continua vinculada à Mesa e registrada por transação.
- Mestre/ADM controla a reserva de PEG; Jogador não visualiza a carteira global da Mesa.
- Arconte/ADM pode ajustar PEG diretamente em uma Mesa, com registro de motivo.
- Êxodo e Ocultatun preservam custos e progressões próprios; Sucesso de Carreira de Ocultatun permanece separado do PEG.

## Mesas e VTT
- Requisitos de admissão validam modo, expansão, classe e faixa de progressão.
- Campanha em Movimento foi movida para o núcleo da Mesa (`table-shell-v3.js`) e não depende mais do carregamento da Forja.
- Ao entrar como Mestre/ADM, o VTT reativa o status ao vivo diretamente pelo núcleo da Mesa.
- Núcleo 3D de Evolução continua exclusivo de Mestre/ADM durante a sessão, aparecendo ao Jogador apenas na animação de recebimento.
- Layout mobile validado em 390 px sem overflow horizontal global.

## Sandbox integral
- Login local real com Jogador, Mestre e ADM/Arconte.
- Barra QA troca a identidade usando o mesmo fluxo de autenticação/hidratação do site.
- Mesmas telas e módulos do runtime principal: Portal, Forja, fichas, Ancoragem, VTT, Arconte, SoulDrakma e PEG.
- Banco local e storage namespace isolados do site principal.

## Validação
- Sintaxe: 52/52 arquivos JavaScript válidos.
- Testes automatizados: executados via `npm test` sem falhas.
- Smoke browser desktop: login, viewer universal, Mestre, carteira PEG, ADM/Arconte e contratos essenciais.
- Smoke browser mobile: Jogador/Mestre no VTT, permissões GM, Núcleo PEG, Campanha em Movimento e ausência de overflow global.

## Patch operacional — Fichas Globais, Tripulação e Sandbox offline

- Adicionado **FICHAS · ACESSO RÁPIDO** na Encruzilhada para abrir Fichas Rápidas e o visualizador universal somente leitura sem entrar no Santuário/Forja.
- A ação **TRIPULAÇÃO** da Mesa agora abre a **Central Operacional**, com abas Participantes, Solicitações e Evolução.
- Solicitações pendentes possuem contador e ações VER FICHA / ACEITAR / RECUSAR; decisões persistem no backend e aprovação dispara atualização imediata do roster da Mesa.
- Participantes podem ser inspecionados no visualizador universal e receber PEG diretamente pela Central; compra de PEG continua usando o contrato atômico SoulDrakma → reserva da Mesa.
- Arconte/Evolução permanece como ponto de concessão direta de PEG às reservas de Mesa.
- Autoridade offline corrigida para Co-Mestre e ADM; no sandbox o ADM passa a listar/acessar qualquer Mesa e recebe autoridade operacional de Mestre.
- Central Operacional usa camada acima das janelas flutuantes e vira drawer inferior em mobile; regressão específica cobre viewport 390×844 e overflow horizontal.
- O VTT offline ganhou **Fabric Lite local**, carregado sob demanda no sandbox: Canvas, grid, formas, régua, tokens básicos, serialização e movimentação sem acesso à CDN. Produção continua preferindo Fabric.js completo.
- Restaurado alias `supabase-install-completo-v2.8.10-local.sql` para compatibilidade da suíte de empacotamento.
- Validação final: **53 JS válidos; 222 testes; 203 aprovados; 0 falhas; 19 condicionais**.
