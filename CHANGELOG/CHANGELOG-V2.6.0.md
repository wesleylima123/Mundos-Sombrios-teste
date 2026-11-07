# Mundos Sombrios — V2.6.0

## Atlas Global do Escudo do Mestre

- Substitui a cartografia SVG antiga pelo Atlas Global baseado em Leaflet.
- Preserva os 66 registros do HTML `Mundos_Sombrios_Atlas_Global.html` como base canônica.
- Pesquisa, filtros por seis categorias, navegação geográfica e registros fora do plano físico.
- Dossiê lateral com país/região, governo, moeda, câmbio, lore e leitura estratégica.
- 20 locais já possuem arte otimizada em WebP e botão **Visitar Local**.
- O restante dos registros continua consultável e preparado para receber arte sem mudança estrutural.

## Permissões

- Mestre: leitura integral + solicitação de alteração ao ADM.
- ADM: criar, editar, apagar, importar, exportar e restaurar registros do Atlas.
- Solicitações cartográficas usam `admin_requests` e aparecem no painel do ADM sem serem confundidas com pedidos de promoção para Mestre.
- Migração `supabase-atlas-v2.6-migration.sql` restringe `master_shield_*` a Mestre/ADM e mantém gravação de `site_settings` somente para ADM.

## Economia Global

- Novo simulador econômico compartilhado via `site_settings/master_shield_global_economy`.
- Mestres podem consultar o estado econômico; apenas ADM vê e executa o console.
- Comandos aceitos são estritamente predefinidos; não há avaliação de código ou comandos arbitrários.
- Comandos iniciais: `AVANCAR_CICLO`, `CRISE_ANT_NEXO`, `CRISE_PRO_NEXO`, `EMBARGO_GLOBAL`, `RUPTURA_DO_VEU`, `BOOM_HAKURE`, `CHOQUE_VOGLASKOV`, `COLAPSO_DF`, `ESTABILIZAR_MERCADOS`, `RESET_ECONOMIA`.
- Alterações econômicas são persistidas no Supabase e refletidas nos dossiês dos países.

## Infraestrutura

- Novo `js/master-atlas-data.js`.
- Novo `js/master-atlas.js`.
- Novo `css/master-atlas.css`.
- Leaflet 1.9.4 passa a ser carregado sob demanda por `js/vendor-loader.js`.


## Validação

- Nova suíte `tests/master-atlas-v2.6.test.js` cobre dados, artes, carregamento, permissões, comandos e contrato RLS.
- Auditoria local concluída com 85 testes aprovados e 0 falhas.
- Build de publicação validado com os módulos e 20 artes do Atlas presentes em `dist/`.
