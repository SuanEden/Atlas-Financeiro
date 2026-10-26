# Continuidade do Atlas Financeiro

- A VM de trabalho é descartável. Código e documentação técnica sanitizada só estão preservados depois de commit e push confirmados no GitHub.
- Antes de editar, conferir branch, remoto, estado do worktree, `README.md`, `docs/ESTADO_ATUAL.md` e `docs/VALIDACAO.md`. Preservar alterações existentes; não usar reset destrutivo, limpeza ou force push.
- O escopo concluído nesta linha de trabalho é o Incremento 1. Não iniciar telas financeiras, PWA, autenticação, sincronização, backup/restauração completos ou o Incremento 2 sem nova autorização.
- Nunca versionar especificações pessoais originais, dados financeiros reais, bancos, exportações, comprovantes, backups privados, segredos, `.env` reais, `node_modules` ou artefatos temporários. Arquivos ignorados também podem desaparecer com a VM.
- Não configurar, publicar ou habilitar serviços externos, deploy, faturamento, trial ou recursos pagos sem autorização específica. Push de código não autoriza deploy.
- Trabalhar em branch própria sem publicação automática e fazer checkpoints remotos coerentes. Antes do push, revisar explicitamente os arquivos preparados e procurar segredos ou dados pessoais.
- A aplicação fica em `app/`. Para validar a fundação, executar `npm ci`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:browser`; registrar apenas resultados realmente observados em `docs/VALIDACAO.md`.
- `database/modelo_inicial.sql` é somente referência não aplicada. Não descrever PostgreSQL, Supabase, Google OAuth, RPCs, sincronização ou restauração como validados sem integração real.
