# V2.8.4 — Navegação, Login, Performance e Moderação ADM

## Login e navegação pública
- Adicionado botão **PÁGINA INICIAL** na tela de login, disponível antes de autenticar.
- Adicionado controle **MOSTRAR/OCULTAR** para a senha.
- Credenciais inválidas exibem mensagem persistente e acessível: “Senha ou usuário/e-mail incorretos”.

## Performance
- Portal Oficial passa a renderizar imediatamente, sem aguardar hidratação remota do Supabase.
- Conteúdo remoto do Portal é atualizado em segundo plano e chamadas concorrentes são deduplicadas por 30 segundos.
- `PortalMedia.prepareContent` deixa de usar Promise desnecessária no caminho de navegação.
- Abrir **Criar Personagem** não carrega os módulos pesados da Forja enquanto o usuário ainda está apenas na seleção de modo.
- **Consultar Regras** não remonta o Códice quando ele já está inicializado.
- **Acessar Mesas** evita renderização dupla da Ancoragem ao selecionar a aba correta.
- **Sistema do Arconte** abre antes da sincronização remota e consulta usuários/solicitações apenas uma vez, em paralelo.

## Solicitações de Mestre
- `resolveAdminRequestSecure` mantém a RPC V2.8.2 como caminho principal.
- Quando a RPC ainda não existe/schema cache está desatualizado, usa fallback compatível baseado em RLS + `admin_set_user_role` + atualização de `admin_requests`.
- O fallback localiza o solicitante por `auth_user_id`, `profiles.id` ou username, cobrindo perfis atuais e legados.

## QA
- Adicionada suíte `ux-performance-v2.8.4.test.js` com guardas específicas para os fluxos desta versão.
