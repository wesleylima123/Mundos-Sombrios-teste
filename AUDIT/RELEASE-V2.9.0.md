# Release Audit — Mundos Sombrios V2.9.0

## Resultado
**APROVADO PARA EMPACOTAMENTO LOCAL.**

A V2.9.0 foi reconstruída como árvore canônica única após a divergência entre pacotes 2.8.x. O sandbox é gerado da mesma árvore e usa apenas um adaptador de backend diferente.

## Verificações executadas
- `npm run syntax`: **52/52 arquivos JavaScript válidos**.
- `npm test`: **216 testes; 197 aprovados, 0 falhas e 19 skips condicionais**.
- `npm run build`: sandbox, sintaxe, testes e `dist/` concluídos.
- Browser smoke desktop: backend offline, login Jogador, viewer universal, troca para Mestre, carteira PEG, troca para ADM, Arconte e aba Evolução.
- Browser smoke mobile 390×844: VTT como Jogador e Mestre, permissões GM, Núcleo PEG, Campanha em Movimento e largura global sem overflow.

## Defeito encontrado durante a validação final
O primeiro smoke mobile revelou que **Campanha em Movimento ainda dependia do módulo lazy da Forja**, logo poderia não existir quando a Mesa fosse aberta sem visitar a Forja antes. A função foi incorporada ao núcleo `table-shell-v3.js`. A mesma correção moveu a ativação do status ao vivo para o núcleo da Mesa, evitando dependência do carregamento da Forja.

Depois da correção, o smoke mobile passou integralmente.

## Isolamento
- Nenhuma publicação ou alteração em GitHub foi executada.
- Nenhum projeto Supabase foi conectado ou modificado durante esta consolidação.
- `js/ms-runtime-config.js` permanece genérico e vazio por padrão.
- O sandbox usa storage namespace próprio (`ms-sandbox-v290`).
