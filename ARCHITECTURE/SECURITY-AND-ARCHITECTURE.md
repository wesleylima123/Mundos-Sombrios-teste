# Segurança e Arquitetura — 0.65.0

1. Nunca armazenar senha ou hash no frontend. Supabase Auth é responsável por credenciais.
2. Nunca usar `service_role` no navegador.
3. RLS é obrigatório nas tabelas privadas.
4. Operações privilegiadas usam RPCs `security definer` com `auth.uid()` e checagem do papel/mesa.
5. `table_members` é a relação canônica de participação; o JSON `tables.participants` é mantido apenas como compatibilidade de leitura.
6. Jogadores não escrevem `table_state`; eles publicam eventos. O Mestre é responsável pelo estado estrutural do VTT.
7. A ficha atual vive em `characters`; versões anteriores vivem em `character_versions`.
8. Conteúdo público pode ser lido publicamente, mas escrita administrativa passa por papel `admin`.
9. Arquivos privados da Sala de Mestres usam Storage privado.
10. O frontend não toma decisões de autorização como fonte final.
