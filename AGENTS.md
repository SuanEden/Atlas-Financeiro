# Continuidade do Atlas Financeiro

- A VM de trabalho é descartável. Código e documentação técnica sanitizada só estão preservados depois de commit e push confirmados no GitHub.
- Antes de editar, conferir branch, remoto, estado do worktree, `README.md`, `docs/ESTADO_ATUAL.md` e `docs/VALIDACAO.md`. Preservar alterações existentes; não usar reset destrutivo, limpeza ou force push.
- Os Incrementos 1 e 2 estão concluídos nesta linha de trabalho. Não iniciar autenticação, envio remoto, aplicação de SQL, restauração completa, gerações ou o Incremento 3 sem nova autorização.
- Nunca versionar especificações pessoais originais, dados financeiros reais, bancos, exportações, comprovantes, backups privados, segredos, `.env` reais, `node_modules` ou artefatos temporários. Arquivos ignorados também podem desaparecer com a VM.
- Não configurar, publicar ou habilitar serviços externos, deploy, faturamento, trial ou recursos pagos sem autorização específica. Push de código não autoriza deploy.
- Trabalhar em branch própria sem publicação automática e fazer checkpoints remotos coerentes. Antes do push, revisar explicitamente os arquivos preparados e procurar segredos ou dados pessoais.
- A aplicação fica em `app/`. Para validar o estado local completo, executar `npm ci` e `npm run check`; esse fluxo cobre unitários, typecheck/build, navegador e PWA offline. Registrar apenas resultados realmente observados em `docs/VALIDACAO.md`.
- `database/modelo_inicial.sql` é somente referência não aplicada. Não descrever PostgreSQL, Supabase, Google OAuth, RPCs, sincronização ou restauração como validados sem integração real.
