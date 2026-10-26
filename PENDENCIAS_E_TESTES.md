# INGENIUM — entrega para equipe

## Alteração realizada
- POST /api/contact valida os dados e salva em `public.contact_messages`.
- SMTP opcional: sem SMTP a resposta é `delivery: database`; com SMTP, tenta enviar também o e-mail.
- Se o SMTP falhar após salvar, informa sucesso do registro no banco.
- Não houve publicação ou alteração do site em produção.

## Pendente — executar por pessoa com acesso
1. No SQL Editor do Supabase, executar `scripts/contact_messages.sql` (ou migração equivalente).
2. Confirmar `DATABASE_URL` do ambiente do backend. Não colocar senha no GitHub. A senha exibida anteriormente em captura de tela deve ser rotacionada.
3. Iniciar backend e frontend com variáveis corretas e verificar POST /api/contact, registro no Supabase e resposta de sucesso na interface.
4. Testar cadastro/login reais com CNPJ válido e verificar sessão/cookies, permissões e persistência. Esses fluxos existem no código, mas NÃO foram validados ponta a ponta nesta entrega.
5. Para envio de e-mail real, configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e CONTACT_TO por pessoa autorizada. Sem SMTP, mensagens ficam armazenadas no banco.
6. Revisar segurança, rate limiting e anti-spam do endpoint público antes de expor a produção.
7. Revisar e fazer commit/push via acesso autorizado ao repositório. Nunca subir .env.

## Testes realizados
- Inspeção estática dos arquivos do projeto e implementação da persistência.
- Sem credenciais nem banco acessível: NÃO foi possível executar teste real de integração ou confirmar conexão.
