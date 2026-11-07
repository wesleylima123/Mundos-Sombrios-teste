# Auditoria e Regressão — Portal Mídia + Histórias V0.61.3

## Reprodução solicitada

Fluxo pretendido:

1. visitante abre Portal;
2. navega pelas caixas públicas;
3. ADM entra no Portal;
4. abre `ADMINISTRAR`;
5. cria/edita conteúdo;
6. seleciona imagem ou vídeo;
7. publica;
8. visitante visualiza a mídia;
9. recarga mantém conteúdo + mídia;
10. visitante não recebe controles de ADM.

## Resultado no ambiente

A execução do E2E real com Chromium foi tentada, mas o ambiente bloqueia navegação tanto para `http://127.0.0.1` quanto para `file://` com `ERR_BLOCKED_BY_ADMINISTRATOR`.

Por isso o teste E2E completo não foi marcado como PASS neste ambiente.

O arquivo `QA/test-portal-media-user-v0.61.3.py` foi mantido preparado para execução em ambiente de navegador normal.

## Testes executados aqui

- `node --check` em todos os JS: PASS
- `QA/test-portal-media-stories-v0.61.3.js`: PASS
- consolidação V0.60.3: PASS
- consolidação V0.61.1: PASS
- segurança: PASS
- Power Registry: PASS
- Projeto Player: PASS
- Hermético: PASS
- Alquerino: PASS
- Envolto: PASS
- Esotérico: PASS
- Galeria: PASS
- Mesa dos Mestres: PASS
- seleção de modo: PASS
- Santuário: PASS
- retorno ao Portal: PASS
- Códices: PASS

## Riscos restantes

1. O Portal continua sendo um protótipo client-side; permissões reais exigem backend.
2. IndexedDB depende do navegador. Em ambiente que bloqueie IndexedDB, o upload de mídia falhará com mensagem explícita.
3. Vídeos grandes aumentam consumo local; há limite de 40 MB por arquivo.
4. Ainda não há pipeline npm/build/lint/typecheck declarado no projeto.
