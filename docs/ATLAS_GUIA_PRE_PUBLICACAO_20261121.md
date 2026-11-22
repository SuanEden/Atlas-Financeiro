# Atlas Financeiro — verificação de pré-publicação

Este processo prepara a implantação **sem alterar dados financeiros**. Não é autorização para ativar a sincronização.

## Configuração recomendada

- Raiz do projeto na Vercel: `app`.
- Framework: Vite. Instalação: `npm ci`. Compilação: `npm run build`. Saída: `dist`.
- `app/vercel.json` contém a regra para `/auth/callback`.
- Node >=22.12.
- `VITE_ATLAS_REMOTE_MODE=disabled` para uso local isolado.
- Para cloud: `VITE_ATLAS_REMOTE_MODE=integration`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (somente chave pública), `VITE_ATLAS_AUTH_ORIGIN` (origem HTTPS autorizada).
- Executar `npm run preflight:local`, `npm run preflight:staging` ou `npm run preflight:production` no ambiente correspondente **antes** de cada implantação.
- Production exige `ATLAS_RELEASE_APPROVED=yes` no processo de checagem, e somente após homologação e consentimento explícito. Essa variável não liga escrita no servidor.
- O preflight de produção exige a URL do **I3 principal**; o de staging exige a URL do **staging**. Impede confundir os projetos, não autentica usuários nem altera a base.
- Nunca inserir `service_role`, `sb_secret_*`, senha de Postgres ou client secret no frontend.

## Gate de lançamento

1. Localizar o projeto **Vercel que já hospeda o Atlas**; a conexão Vercel disponível ao assistente não mostra esse projeto. Não criar outro projeto por conveniência.
2. Confirmar o domínio real e os callbacks Google/Supabase de autenticação. Preservar sessão e histórico existentes.
3. Fazer backup íntegro da origem local e teste de recuperação; não limpar IndexedDB.
4. Conferir o histórico financeiro real existente no banco I3 principal: 4 contas, 163 eventos, 168 recibos na auditoria. Comparar antes/depois sem retornar payload sensível.
5. Homologar a associação I3, mudanças PC ↔ Android, offline/reconexão, reenvio idempotente e conflitos em sessão real, sem sobrescrever registros.
6. Testar Pluggy em conexão autorizada, com conciliação por IDs e revisão de centavos.
7. Validar o PR e o CI; só então habilitar release e implementar um rollout reversível com acompanhamento de erros.

## Ambientes e política de segurança

- `atlas-financeiro-i3` (I3 principal): contém dados existentes; escrita atualmente bloqueada. Não ligar escrita sem homologação.
- `atlas-financeiro-realtime-staging`: dados financeiros vazios na auditoria, um recibo existente, escrita habilitada. Não substituir pelo principal.
- O preflight não executa SQL, migração, upload nem deploy; ele valida apenas variáveis de ambiente locais.
- Em caso de erro ou divergência, não remover, zerar, transformar ou reassociar a base.

## Referências operacionais

- Plano completo: `docs/ATLAS_PRONTIDAO_USO_REAL_2026-11-21.md`.
- Auditoria recente: `docs/ATLAS_FLUIDEZ_SINCRONIZACAO_20261121.md`.
- PRs anteriores #31–#34 são cumulativos. Manter revisão consolidada da branch mais recente para evitar mesclar os mesmos arquivos repetidas vezes.
