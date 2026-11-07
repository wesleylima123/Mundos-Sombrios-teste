# Mundos Sombrios — Glossário de Programação e Guia de Manutenção

## 1. Nomenclaturas essenciais

| Termo | Significado | Como pensar no projeto |
|---|---|---|
| HTML | Estrutura da interface | Botões, janelas, campos, seções e elementos visuais |
| CSS | Aparência e layout | Tema, espaçamento, animações, responsividade |
| JavaScript (JS) | Comportamento e regras da interface | Login, ficha, poderes, mesas, Códice, VTT |
| DOM | Árvore de elementos HTML disponível ao JS | `document.getElementById(...)`, `querySelector(...)` |
| ID | Identificador único de um elemento | `id="character-list"`; nunca duplicar |
| Classe CSS | Grupo reutilizável de estilo | `.souls-btn`, `.modal`, `.card-wrapper` |
| Função | Bloco reutilizável de lógica | `openAdminPanel()` |
| Parâmetro | Informação recebida por uma função | `selectNature(nature)` |
| Variável | Valor que pode mudar | `currentNature`, `editingIndex` |
| Constante | Referência que não deve ser reatribuída | `MAX_TABLES` |
| Objeto | Conjunto nomeado de dados | `{ username, role, ... }` |
| Array | Lista ordenada de valores | `usersDB`, `characters` |
| Estado | Dados que representam a situação atual | natureza selecionada, ficha aberta, mesa ativa |
| Persistência | Guardar dados para recuperar depois | `localStorage` hoje; banco/backend no futuro |
| Evento | Algo que aconteceu | clique, mudança de select, carregamento |
| Listener | Código que reage a um evento | `addEventListener('change', ...)` |
| Callback | Função chamada por outra operação | função de um `map`, evento ou `setTimeout` |
| JSON | Formato textual de dados estruturados | armazenamento local e fixtures QA |
| API | Contrato para acessar outra camada/serviço | no futuro, backend de autenticação e fichas |
| E2E | Teste ponta a ponta | usuário entra, cria ficha e conclui um fluxo |
| Regressão | Teste para provar que uma mudança não quebrou algo antigo | login + seleção de modo após qualquer alteração |
| Baseline | Versão de referência estável | esta build preparada para novos trabalhos |
| Refatoração | Melhorar a estrutura sem alterar o comportamento esperado | dividir `script.js` por domínio |
| Patch | Correção pequena e localizada | usar dentro do módulo proprietário; evitar arquivos de patch globais |
| Legacy/Legado | Código antigo mantido por compatibilidade | `mundos-updates.js` |
| Seed | Dados iniciais inseridos automaticamente | nesta versão, seeds inseguros foram removidos |
| Hash | Representação irreversível usada para senhas | `passwordHash` |
| Salt | Valor aleatório usado no hash | impede que hashes iguais sejam iguais |
| Autenticação | Provar quem é o usuário | login |
| Autorização | Definir o que o usuário pode fazer | `role === 'admin'` |
| Client-side | Código executado no navegador | quase todo o site atual |
| Server-side | Código executado no servidor | necessário para segurança real |

## 2. Convenções recomendadas

### Nomes
- Funções de ação: `open...`, `close...`, `render...`, `save...`, `load...`, `select...`, `sync...`.
- Booleanos: prefira `is...`, `has...`, `can...`.
- Arrays: nomes no plural (`characters`, `usersDB`).
- Um objeto de domínio deve ter nome explícito (`mercadoDaMorte`, `envolto`, `powerDraft`).
- Não reutilize o mesmo nome para coisas diferentes em arquivos distintos.

### IDs HTML
Formato recomendado:
`dominio-elemento-acao`

Exemplos:
- `power-registry-list`
- `envolto-chant-details`
- `admin-users-list`

Evitar números de versão no ID. Versão é documentação, não identidade do elemento.

### Estado
Não crie uma segunda variável global para representar o mesmo estado.

Errado:
`selectedClass`, `currentSelectedClass`, `activeClass`, `classNow`

Correto:
`currentClass`

Se um módulo precisar de dados temporários, mantenha-os dentro de um objeto do próprio módulo ou use um contrato explícito.

## 3. Como implementar uma atualização

### Exemplo: adicionar uma nova janela ao Envolto
1. Identifique o proprietário: `js/...` do Envolto.
2. Crie os IDs HTML da janela.
3. Crie a renderização em uma função `render...`.
4. Não altere `script.js` para guardar uma segunda cópia do estado.
5. Faça o módulo ler `currentNature/currentClass` ou o contrato definido.
6. Registre o estado apenas na ficha/estrutura proprietária.
7. Adicione teste QA da abertura, seleção, salvar e reabertura.
8. Teste também um personagem de outra classe para garantir que a janela não aparece.

## 4. Como corrigir um bug

Use este roteiro:

**Reproduzir → localizar causa → corrigir no proprietário → testar causa → testar regressão.**

Não faça:

**bug → criar `mundos-updates-v2.js` → sobrescrever função antiga → criar outro patch.**

Isso cria competição de inicialização e torna o comportamento dependente da ordem dos `<script>`.

## 5. Diagnóstico rápido

### Erro `X is not defined`
Possíveis causas:
- ordem dos scripts;
- função removida;
- escopo incorreto;
- módulo não carregado.

Primeiro verifique o console e `index.html`.

### Clique não funciona
Verifique:
- `id` correto;
- `onclick`/listener correto;
- elemento não está coberto por outra camada CSS;
- função realmente existe no momento do clique.

### Janela aparece no lugar errado
Verifique:
- `position`;
- `z-index`;
- `transform` herdado;
- classe de modal/janela;
- múltiplos listeners alterando `style`.

### Dados somem
Verifique:
- `localStorage`;
- chave utilizada;
- serialização JSON;
- se uma rotina de inicialização está sobrescrevendo o estado;
- se outro módulo salvou uma versão incompleta do objeto.

### Uma atualização “não pega”
Antes de reescrever:
1. pesquise todas as definições da função;
2. pesquise todos os listeners que a chamam;
3. confira a ordem dos `<script>`;
4. procure blocos históricos em `mundos-updates.js`;
5. só então altere.

## 6. Checklist obrigatório antes de considerar uma atualização pronta

- [ ] Sintaxe JS válida.
- [ ] Nenhum ID HTML duplicado.
- [ ] Nenhum `<script>` duplicado acidentalmente.
- [ ] Módulo proprietário definido.
- [ ] Teste QA novo/atualizado.
- [ ] Fluxo de login ainda funciona.
- [ ] Permissões ainda funcionam.
- [ ] Natureza/classe correta limita a UI.
- [ ] Criar ficha funciona.
- [ ] Editar ficha funciona.
- [ ] Salvar/reabrir funciona.
- [ ] Exportação/importação, quando afetadas, foram testadas.
- [ ] Mobile não quebra o layout.
- [ ] Nenhum patch global novo foi criado sem justificativa arquitetural.

## 7. Frase-guia do projeto

> Uma funcionalidade deve ter um dono. Um estado deve ter uma fonte. Uma correção deve ter um teste.
