# Atlas — execução da auditoria (22/11/2026)

> Ramo cumulativo: `codex/atlas-auditoria-hardening-20261122` · PR #38 (rascunho).
> **Não é aprovação para habilitar produção ou gravações financeiras remotas.**

## Correções implementadas no código

| Achado | Estado | Implementação |
|---|---|---|
| A01 | Testes automatizados anteriores aprovados | Ajuste de navegação móvel na revisão base PR #37; precisa validação física no Android |
| A02 | Mitigação, não sincronização | Arquivo de Planejamento pode ser exportado com senha e importado em outro dispositivo; IndexedDB não sincroniza |
| A03 | Bloqueado por configuração externa | Nenhuma variável de produção foi alterada; `preflight:production` mantém aprovação explícita |
| A04 | Implementado previamente | Arquivo de Planejamento no importador I2 gera orientação correta |
| A05 | Código + migração preparada | `api.pluggy_claim_refresh` registra atualização de forma atômica por usuário/item. Se a migração não foi aplicada ou habilitada, o gateway **não** permite refresh |
| A06 | Implementado | `resource=health` verifica presença de configuração sem consultar/autenticar na Pluggy |
| A07 | Implementado | IDs de conexões deixam de estar em `api/pluggy.ts` e `scripts/verify-pluggy-items.mjs`, passando a `ATLAS_PLUGGY_ALLOWED_ITEM_IDS` (somente servidor) |
| A08 | Parcial | Prévia de extrato admite até 80 páginas, limite de 20 mil transações e progresso de gravações, sem gravar se o limite da prévia for ultrapassado. Grandes períodos ainda exigem divisão em janelas e uma recuperação completa |
| A09 | Exportação protegida | Cópia de Planejamento usa AES-256-GCM, PBKDF2-SHA256 (210.000 iterações), sal aleatório e nonce novo; mantém importação do JSON legado. O IndexedDB e backups I2/I3 **não** foram criptografados |
| A10 | Implementado | Busca normalizada e paginação sobre todas as despesas, sem corte em 120 eventos |
| A11 | Parcial | Estilos responsivos dos novos controles; modularização do CSS antigo ainda exige revisão visual ampla |
| A12 | Parcial | `audit:guards` no CI verifica regressões de privacidade e de integrações; Node pinado em 22.x. ESLint e análise de vulnerabilidades permanecem para revisão de dependências |

## Configuração segura do gateway Pluggy

A Vercel deve manter as seguintes configurações **somente no ambiente correto**, por meio de variáveis protegidas; **não as inclua no Git, tickets, chats ou documentação**:

- `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`: segredos do gateway
- `ATLAS_PLUGGY_OWNER_ID`: UUID do único proprietário autorizado pelo gateway
- `ATLAS_PLUGGY_ALLOWED_ITEM_IDS`: UUIDs de conexões autorizadas, separados por vírgula; sem `*` ou nomes parecidos
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`: endpoint e chave pública do Supabase do ambiente aprovado
- `ATLAS_PLUGGY_REFRESH_LOCK=supabase`: habilitar somente **depois** de instalar e testar a função atômica
- `ATLAS_BANK_DIAGNOSE=1`: opcional, somente em diagnóstico explícito, nunca como configuração permanente

A migração em `supabase/migrations/20261122180000_pluggy_refresh_gate.sql` é independente do livro-caixa. **Aplicar primeiramente no staging**. Por padrão, ninguém pode ler nem alterar diretamente as duas tabelas do bloqueio. A RPC exige sessão autenticada, acesso Atlas ativo e item bancário aprovado por administrador.

Após migração e validação, um administrador autorizado registra no banco de staging os pares de proprietário e item previamente conferidos:

```sql
-- Exemplo ilustrativo com parâmetros privados, nunca com IDs reais no Git:
insert into atlas_private.pluggy_refresh_allowed_items(owner_id, item_id)
values (:approved_owner_uuid, :approved_item_uuid)
on conflict do nothing;
```

A RPC retorna `true` apenas quando pode reservar atomicamente a próxima janela de uma hora; `false` significa bloqueio/ausência de autorização. Falhas de RPC deixam a atualização desabilitada. A janela não é liberada automaticamente por erro upstream, para evitar tempestade de chamadas.

**A migração está no repositório, não foi executada no banco principal nesta revisão.** Não cadastrar automaticamente conexões por inferência de nome.

## Como usar o Planejamento com segurança

1. Em **Mais → Planejamento**, informe uma senha de no mínimo 12 caracteres e exporte **cópia criptografada**.
2. Guarde arquivo e senha separadamente. A senha não é armazenada nem recuperável pelo aplicativo.
3. No segundo navegador ou aparelho, informe a senha e escolha **Importar cópia**.
4. O importador valida e faz merge por ID; se houver conteúdo divergente no mesmo ID, interrompe sem sobrescrever.
5. Se importar o JSON legado (sem senha), guarde-o com proteção externa. Importações não criam lançamentos financeiros.

A exportação protegida não substitui uma cópia financeira I2/I3. A sincronização automática do Planejamento depende de um modelo de servidor próprio, migração isolada, controle de concorrência e testes autenticados em dois aparelhos.

## Critérios de liberação

- CI unitário + build + Playwright desktop/mobile + PWA todos aprovados na mesma revisão.
- Backup I2/I3 verificável antes de qualquer migração, contas/saldos/recibos preservados.
- Auditoria de permissões negativas, conectividade Pluggy com conexões comprovadamente autorizadas e paginação longa com retomada.
- Migração e configuração primeiro em staging; consulta privada `health` apenas indica configuração, não prova API upstream.
- Homologação real PC ↔ Android (login, edições offline, restauração, conflito, logout).
- Revisão e aprovação explícita antes de mudança de `main`, domínio de produção ou autorização de gravação remota.

**Proibido nesta revisão:** importar dados pessoais no repositório público, inventar saldos, habilitar dívidas, ativar recorrências bancárias ou alterar o conjunto financeiro principal.
