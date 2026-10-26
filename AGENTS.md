# Continuidade do Atlas Financeiro

- Ajustes de interface devem seguir [docs/DIRETRIZES_UI_UX.md](docs/DIRETRIZES_UI_UX.md), preservando a linguagem visual e o escopo de I2.

- A VM de trabalho é descartável. Código e documentação técnica sanitizada só estão preservados depois de commit e push confirmados no GitHub.
- Antes de editar, conferir branch, remoto, estado do worktree, `README.md`, `docs/ESTADO_ATUAL.md` e `docs/VALIDACAO.md`. Preservar alterações existentes; não usar reset destrutivo, limpeza ou force push.
- Os Incrementos 1 e 2 estão concluídos e devem ser preservados. Em 26/10/2026 o usuário aprovou o plano e autorizou implementação local de I3 em branch própria, migrações versionadas, testes locais e checkpoints no GitHub. Também autorizou recuperação mínima de exportação I2 em origem/perfil vazio, preservando IDs/histórico/outbox, com validação e atomicidade. Restauração completa e gerações permanecem em I4. Ver `docs/EXECUCAO_INCREMENTO_3.md`.
- Nunca versionar especificações pessoais originais, dados financeiros reais, bancos, exportações, comprovantes, backups privados, segredos, `.env` reais, `node_modules` ou artefatos temporários. Arquivos ignorados também podem desaparecer com a VM.
- Não configurar, publicar ou habilitar serviços externos, deploy, faturamento, trial ou recursos pagos sem autorização específica. Push de código não autoriza deploy.
- Trabalhar em branch própria sem publicação automática e fazer checkpoints remotos coerentes. Antes do push, revisar explicitamente os arquivos preparados e procurar segredos ou dados pessoais.
- A aplicação fica em `app/`. Para validar o estado local completo, executar `npm ci` e `npm run check`; esse fluxo cobre unitários, typecheck/build, navegador e PWA offline. Registrar apenas resultados realmente observados em `docs/VALIDACAO.md`.
- `database/modelo_inicial.sql` é somente referência não aplicada. Migrações em `supabase/migrations/` são artefatos locais; nunca aplicá-las remotamente sem autorização específica. Separar evidências de PostgreSQL embarcado com identidade simulada, navegador local e integração real de Supabase/Google/dois dispositivos. Não declarar I3 concluído sem os testes reais obrigatórios.
