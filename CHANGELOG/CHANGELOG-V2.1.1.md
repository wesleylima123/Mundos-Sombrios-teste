# Seite_Mundos-Sombrios_V2.0 — 2.1.1

## Auditoria funcional por perfil
A V2.1.1 é uma atualização de confiabilidade derivada de testes reais de navegação em Chromium nos perfis Jogador, Mestre e ADM.

### Correções
- Corrigida a hidratação de fichas remotas: dados vindos do Supabase não são mais sobrescritos por um cache legado vazio.
- Restaurada a renderização das mesas conectadas na **Visão do Jogador** da Ancoragem.
- Fichas recém-criadas agora recebem um **ID estável antes do primeiro salvamento**, preservando histórico e futuras edições sem duplicação.
- Tornado idempotente o Cofre do Mestre para impedir ferramentas duplicadas em renderizações assíncronas concorrentes.
- Eliminada a requisição inválida `assets/archetypes/natures/.svg` quando o personagem ainda não escolheu natureza/classe.
- O Escudo do Mestre agora identifica explicitamente **MESTRE AUTORIZADO** ou **ARCONTE · ADM**.
- Adicionado favicon local para eliminar a requisição 404 padrão do navegador.

### Qualidade
- 30/30 arquivos JavaScript válidos.
- 35/35 testes automatizados aprovados.
- 76/76 verificações funcionais de navegador aprovadas: 35 Jogador, 31 Mestre, 10 ADM.
- 0 erros de runtime no percurso final.
- 0 recursos locais retornando 404 no percurso final.

### Limite da validação
O navegador de QA usa um backend determinístico compatível com os contratos do Supabase e mocks controlados para Fabric/html2pdf porque o ambiente de execução não possui credenciais de produção nem acesso aos serviços externos. RLS, RPCs, Realtime e contratos de serviço continuam cobertos por testes estruturais; a aceitação multiusuário real deve ser repetida em staging/produção com contas reais.
