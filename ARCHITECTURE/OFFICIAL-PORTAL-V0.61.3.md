# Arquitetura do Portal Oficial — V0.61.3

## Fonte de verdade

`PortalContent` controla metadados e conteúdo editorial em `mundosSombriosPortalContentV1`.

`PortalMedia` controla os binários de imagem/vídeo em IndexedDB `MundosSombriosPortalMediaV1`.

Essa separação evita inflar `localStorage` com vídeos e mantém o catálogo editorial pequeno.

## Proprietários

- `js/portal/portal-core.js`: navegação, renderização pública, cards, páginas e estados de loading.
- `js/portal/portal-content.js`: defaults, leitura, escrita e publicação do conteúdo.
- `js/portal/portal-admin.js`: formulário do ADM, permissões e CRUD editorial.
- `js/portal/portal-media.js`: persistência binária, URLs temporárias, limites e limpeza.
- `css/portal/portal.css`: visual do Portal, mídia, histórias e responsividade.

## Modelo de mídia

Cada conteúdo pode conter:

```json
{
  "media": {
    "id": "portal-media-...",
    "kind": "image|video",
    "type": "image/png|video/mp4",
    "name": "arquivo.ext",
    "alt": "descrição acessível"
  }
}
```

O binário não é salvo junto do JSON editorial. O `id` referencia a entrada da biblioteca IndexedDB.

## Histórias

`stories[]` usa:

- `title`
- `subtitle`
- `world`
- `description` (resumo)
- `body` (texto integral)
- `date`
- `kind`
- `published`
- `media`

## Acessibilidade e UX

- `aria-label` em mídia renderizada.
- `<video controls playsinline preload="metadata">`.
- imagens com `loading="lazy"`.
- `aria-busy` durante a preparação do Portal.
- mensagens de erro para upload inválido ou indisponível.
- suporte a `prefers-reduced-motion` existente permanece.
