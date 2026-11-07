# v0.66.0

- Broadcast privado por mesa para sincronização de baixa latência.
- Presence para participantes conectados.
- RLS em `realtime.messages` vinculando canal à mesa.
- Persistência PostgreSQL continua sendo fonte de verdade.
- Jogadores deixam de sobrescrever o estado VTT inteiro; publicam apenas eventos.
- Refresh de mesa via Broadcast emitido pelo banco para membros autorizados.
- Índices e triggers de atualização adicionados.
- Corrigida duplicação de declaração de `table_state` no SQL de produção.
- Sala de Mestres/VTT recebeu indicador de presença em tempo real.
- Roster da mesa é atualizado quando membros/sessões/estado mudam.
- Movimento de tokens utiliza Broadcast e o Mestre pode consolidá-lo no estado persistente.
- Controle do chat é sincronizado como evento de mesa.
- Consolidação da assinatura Realtime em um canal privado por mesa; canais temporários deixam de competir com a conexão principal.
- Removida duplicação de `removeGalleryImage` no módulo do Mestre.
- Versões internas de `MS_PLATFORM` e `MS_SERVICES` alinhadas para 0.66.0.
