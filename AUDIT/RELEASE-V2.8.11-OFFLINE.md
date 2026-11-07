# Auditoria de Release — V2.8.11 Offline / Sandbox Integral

## Escopo
- Restauração do login offline no site principal.
- Sandbox convertido em réplica integral do runtime do site.
- Alternância QA entre Jogador, Mestre e ADM/Arconte.
- Persistência offline independente por namespace localStorage.
- Simulação local de Mesas/VTT, fichas, progressão gradual, SoulDrakma, Arconte e ferramentas de Mestre.
- Nenhuma configuração Supabase ou workflow GitHub embutidos.

## Resultado automatizado
- JavaScript: 51/51 arquivos válidos no runtime raiz.
- Testes: 196 total; 177 aprovados; 0 falhas; 19 skips condicionais históricos.
- Build: concluído com sucesso.
- Paridade do sandbox: assets, CSS, códices e JavaScript idênticos ao runtime raiz, exceto `ms-runtime-config.js`, que usa namespace isolado e `sandboxMode: true`.

## Contas QA locais
- Jogador: `jogador` / `jogador123`
- Mestre: `mestre` / `mestre1234`
- ADM: `admin` / `admin12345`

## Isolamento
- Site offline: namespace `ms-local-v2811`.
- Sandbox: namespace `ms-sandbox-v2811`.
- Não existe `.github/` no pacote.
- Não existe endpoint, project-ref ou publishable key Supabase embutido no runtime.

## Validação de navegador neste ambiente
A tentativa de smoke test via Chromium/Playwright local foi bloqueada pela política do ambiente de execução (`ERR_BLOCKED_BY_ADMINISTRATOR` para localhost). Por isso a validação entregue aqui é baseada na suíte automatizada, VM de JavaScript e inspeção de paridade dos arquivos. O pacote inclui inicializadores Windows para teste real no navegador do usuário.
