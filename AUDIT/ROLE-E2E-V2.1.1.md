# Auditoria Funcional por Perfil — Seite_Mundos-Sombrios V2.1.1

## Objetivo
Validar o site como **Jogador**, **Mestre** e **ADM**, verificando propósito, controle de acesso, criação/uso de fichas, Ancoragem, Sala dos Mestres, VTT, Escudo e administração. A auditoria foi conduzida em navegador Chromium por HTTP local, além da suíte automatizada do repositório.

## Método
- Navegação real em Chromium headless, acionando os mesmos botões/funções do site.
- Três sessões independentes: `jogador`, `mestre` e `admin`.
- Backend determinístico de QA com os mesmos contratos públicos de `MS_DB`/`MS_SERVICES` para permitir testar fluxos sem credenciais de produção.
- Fabric.js e html2pdf foram simulados apenas no browser smoke test; a integração e presença das dependências continuam verificadas estruturalmente no projeto.
- Captura de erros JavaScript, warnings relevantes e respostas HTTP 404.
- Execução final de `npm run audit`.

## Resultado final
| Perfil | Verificações | Aprovadas | Falhas |
|---|---:|---:|---:|
| Jogador | 35 | 35 | 0 |
| Mestre | 31 | 31 | 0 |
| ADM | 10 | 10 | 0 |
| **Total** | **76** | **76** | **0** |

Além disso: **30/30 arquivos JavaScript válidos**, **35/35 testes automatizados**, **0 erros de runtime** e **0 recursos locais com HTTP 404** no percurso final.

## Jogador — recursos validados
- sessão/perfil e ocultação de controles restritos;
- quatro acessos primários do Portal;
- Conhecer os Mundos e Códice;
- bloqueio correto para criar mesa, Painel ADM e Escudo;
- Santuário de Êxodo e carregamento de ficha remota;
- Forja narrativa, modos Criar/Evoluir/Jogar e intensidade Funcional/Imersiva/Cinemática;
- carrossel focal, arte temática, decisão mecânica e autofill de classe;
- transparência de regras, áudio opcional, salvamento e histórico;
- criação Ocultatun e arte de Agente de Carreira;
- Visão do Jogador da Ancoragem, mesas conectadas e entrada por código;
- VTT como jogador: permissões GM ocultas, chat, grid, token próprio e régua.

## Mestre — recursos validados
- emblema/aba de Mestre e ausência do Painel ADM;
- Sala dos Mestres com uma única suíte de ferramentas;
- mesa própria, criação de mesa e contexto de campanha;
- Cofre: notas, NPCs, encontros, iniciativa/rodadas, pistas, mundo e sessões;
- Escudo do Mestre e suas nove visões: Cronologia, Mapa, Economia, Êxodo, Ocultatun, Ordem, Envolto, Árvores e Arquivos;
- VTT como GM: controles privados, NPC, área de efeito, régua, chat e bloqueio de chat.

## ADM — recursos validados
- controles administrativos e de Mestre simultaneamente;
- Painel do Arconte, papéis e banimento;
- alteração de usuário/papel de outro usuário;
- CMS do Portal e publicação de conteúdo;
- herança correta da Sala dos Mestres;
- acesso ao Escudo com selo `ARCONTE · ADM`.

## Falhas encontradas e corrigidas
### 1. Ficha remota desaparecia após hidratação — Alta
**Antes:** `msHydrateRemoteGameState()` carregava a ficha do backend e depois `msSyncCurrentUserView()` podia substituí-la por um cache local vazio.
**Depois:** a lista remota é promovida ao cache de compatibilidade antes da sincronização da visão. O Supabase permanece fonte de verdade.

### 2. Visão do Jogador da Ancoragem vazia — Alta
**Antes:** após a consolidação da Sala dos Mestres, `#player-tables-list` continuava no HTML sem renderizador proprietário.
**Depois:** `renderPlayerConnections()` mostra Fendas conectadas, entrar e desconectar, inclusive no perfil Jogador.

### 3. ID inválido em ficha recém-criada — Alta
**Antes:** uma ficha nova podia ser criada localmente com `id: false`; o backend gerava um ID, mas a instância em memória permanecia sem a identidade real, afetando histórico e edição imediata.
**Depois:** o construtor gera e mantém `__msBuilderCharacterId` estável antes do primeiro salvamento.

### 4. Cofre do Mestre duplicado — Média
**Antes:** duas chamadas assíncronas de renderização podiam terminar em ordens diferentes e anexar duas suítes de oito ferramentas.
**Depois:** `renderMasterTools()` é idempotente e remove qualquer suíte anterior imediatamente antes da montagem.

### 5. Recurso `/assets/archetypes/natures/.svg` inexistente — Baixa
**Antes:** a prévia imersiva consultava o catálogo visual com nome vazio antes da escolha de origem, gerando 404.
**Depois:** o fallback só produz caminho de imagem quando existe um slug válido.

### 6. Identidade de autoridade do Escudo — Baixa
**Antes:** o selo permanecia genérico como “ACESSO RESTRITO”.
**Depois:** exibe “MESTRE AUTORIZADO” ou “ARCONTE · ADM”.

### 7. Favicon ausente — Baixa
**Antes:** o navegador gerava uma requisição 404 para `/favicon.ico`.
**Depois:** o documento referencia um SVG local existente como favicon.

## Evidências
- `AUDIT/ROLE-E2E-V2.1.1-results.json` — resultado granular das 76 verificações.
- `AUDIT/evidence-v2.1.1/player-vtt.png` — VTT no percurso Jogador.
- `AUDIT/evidence-v2.1.1/master-vtt.png` — VTT no percurso Mestre.
- `AUDIT/evidence-v2.1.1/admin-shield.png` — Escudo no percurso ADM.

## O que esta auditoria NÃO pode garantir
O ambiente de execução não possui as credenciais do seu projeto Supabase implantado nem conectividade aos CDNs externos. Portanto, não é tecnicamente correto afirmar que foram comprovados em produção: latência real, falhas de rede, confirmação por e-mail, Storage real, Broadcast/Presence entre dois dispositivos físicos ou políticas RLS já instaladas na instância que você publica.

Os scripts SQL, RPCs, políticas, contratos de serviço e arquitetura Realtime foram revalidados pela suíte automatizada. Para uma garantia de implantação, a etapa seguinte é um **teste de aceitação em staging/produção com três contas reais simultâneas** (Jogador, Mestre e ADM).
