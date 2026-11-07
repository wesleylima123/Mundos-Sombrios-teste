# Regressão — Seleção de Modo → Santuário — V0.60.2

## Reprodução
Fluxo reproduzido no navegador headless:
1. Login de usuário padrão.
2. Tela `screen-mode-select`.
3. Clique em Êxodo.
4. Clique em Ocultatun.
5. Retorno do Santuário para seleção de modo.
6. Tentativa de modo inválido.

## Causa-raiz
`script.js::selectGameMode()` fazia:
- `document.getElementById('sanctuary-title').innerText = ...`
- `showScreen('screen-char-select')`

Na V0.60.1, `index.html` não continha mais a tela `#screen-char-select` nem os elementos do Santuário. O primeiro acesso devolvia `null` para `sanctuary-title`, gerando:
`TypeError: Cannot set properties of null (setting 'innerText')`

O Santuário não era portanto um bug de regra de modo, storage ou permissões: a camada DOM canônica havia sido removida enquanto o controlador existente continuava apontando para ela.

## Correção na origem
- Restaurada **uma única** `#screen-char-select` em `index.html`.
- Restaurados `sanctuary-title`, `sanctuary-subtitle`, `sanctuary-limits`, `character-list`, `carousel-prev`, `carousel-next`, `btn-new-char` e `import-json`.
- Proprietário preservado em `js/script.js` para `showScreen`, `selectGameMode`, `renderCharList`, `beginNewCharacter`.
- Não foi criado renderer duplicado de Santuário.
- Botões restaurados usam `type="button"`.
- Teste estrutural garante exatamente um conjunto desses IDs.

## Resultados
- Êxodo → Santuário: PASS
- Ocultatun → Santuário: PASS
- Santuário → Seleção de modo: PASS
- Modo inválido: PASS
- Estrutura DOM única: PASS
- Master mode regression: PASS
- Master tools regression: PASS
- Consolidation baseline: PASS
- Security baseline: PASS
- JavaScript syntax: PASS
