# Mundos Sombrios V0.60 — Sala dos Mestres e Escudo

## Fonte única de verdade
- `js/master-room.js`: apresentação/registro das mesas.
- `js/master-tools.js`: cofre privado, notas, NPCs, Escudo do Mestre e persistência auxiliar do VTT.
- `js/master-shield-rules.js`: índice mecânico derivado dos ativos oficiais presentes no repositório.
- `js/script.js`: proprietário do motor VTT (canvas, chat, dados, galeria e fluxo de entrada); chama hooks explícitos de `MasterTools`.
- `js/world-codices.js`: proprietário do Códice e do retorno à seleção de modo.

## Dados
- Mesas: `mundosSombriosTables` / repositório por usuário existente.
- Arquivos privados: `mundosSombriosGMFilesV1`.
- Notas: `mundosSombriosGMNotesV1`.
- NPCs: `mundosSombriosGMNPCsV1`.
- Estado compartilhado do VTT: `mundosSombriosVttStateV1` por ID de mesa.

## Permissões
Somente `role === 'mestre' || role === 'admin'` renderiza o cofre e o Escudo. As funções de escrita também recusam acesso fora do papel de Mestre/ADM.

## Escudo do Mestre
É um mecanismo local de recuperação por relevância lexical sobre um índice pré-processado dos livros oficiais. Não inventa regras, não chama um serviço externo e informa a origem do fragmento retornado. O contexto da mesa prioriza o modo de jogo salvo em `gameMode`.

## Persistência VTT
Chat, rolagens, galeria de campanha e objetos do grid são salvos por mesa. O grid ignora linhas decorativas e restaura os objetos de jogo na abertura.

## Estados
- carregando: FileReader / restauração do VTT.
- sucesso: nota, upload, NPC, consulta e restauração.
- erro: arquivo grande, pergunta vazia ou nenhum resultado mecânico relevante.
- permissão: ferramentas privadas e Escudo são omitidos para jogador.
