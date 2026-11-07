# Release Audit — V2.8.10

Escopo: remoção exclusiva do seletor visual antecipado de Categoria em Êxodo.

Critérios:
- Êxodo não renderiza `ms-category-strip`;
- Ocultatun preserva o seletor e ícones 3D;
- seleção posterior de classe/especialização de Êxodo determina `category`;
- preset mecânico da Categoria continua aplicado;
- payload continua gravando `category` e `categoryPreset`;
- edição de fichas antigas infere Categoria pela classe quando necessário;
- salvamento definitivo continua impedido sem Categoria válida.

## Validação final
- JavaScript: 45/45 arquivos válidos.
- Testes: 187 detectados; 168 aprovados; 0 falhas; 19 condicionais ignorados.
- Build: concluído com sucesso; `dist/` gerado e mantido fora do ZIP de produção/UPDATE.
- UPDATE cumulativo: 45 arquivos novos + 34 alterados desde V2.8.2; 0 removidos detectados.
