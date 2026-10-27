# I3 — início da configuração externa

Atualizado em 27/10/2026. Complementa [STATUS_I3_LOCAL.md](STATUS_I3_LOCAL.md). As seções de 26/10 abaixo preservam o marco anterior; a consulta desta retomada está registrada a seguir.

## Retomada e consulta de Auth — 27/10/2026

A branch `codex/incremento-3-local-foundation` foi recuperada com worktree inicialmente limpo. Após `git fetch origin`, HEAD e `git ls-remote` apontaram para `300098a7c59b41f7cbc972cda91a74753c93317b`, sem commits posteriores na branch antes deste checkpoint documental.

`list_projects` e `get_project` reconfirmaram o projeto existente `atlas-financeiro-i3`, região `sa-east-1`, estado `ACTIVE_HEALTHY`. `get_organization` reconfirmou `plan: free` e `tier: tier_free`. Nenhum projeto foi criado; método de pagamento não foi inspecionado. Continua obrigatório custo zero, sem cartão, upgrade, trial ou adicionais pagos.

Para conferir o estado atual sem obter credenciais administrativas, foi consultado somente por GET o endpoint público `/auth/v1/settings`, usando uma chave publicável ativa obtida pelo conector. A chave não foi gravada em arquivo, configuração do aplicativo ou Git. Resultado observado:

| Configuração | Valor observado | Interpretação |
|---|---|---|
| `disable_signup` | `false` | Cadastro público ainda aberto. |
| `external.email` | `true` | Entrada por email habilitada. |
| `external.google` | `false` | Google desabilitado. |
| `external.anonymous_users` | `false` | Entrada anônima desabilitada. |
| Demais provedores retornados, incluindo telefone | `false` | Desabilitados nessa resposta. |

Vinculação manual não é informada por essa resposta e permanece **não verificada**. O conector disponível não oferece leitura da configuração administrativa de Auth; conferir essa opção no painel com o usuário, sem solicitar token administrativo. A leitura de settings não testa login, bloqueio efetivo de cadastro ou autorização por UUID e não inventaria usuários, tabelas ou métodos adicionais ausentes da resposta.

Próxima etapa guiada, no mesmo formulário Authentication → Sign In / Providers: desligar `Allow new users to sign up`, manter `Allow anonymous sign-ins` e `Allow manual linking` desligados e salvar. Aguardar confirmação do usuário e reconsultar o estado público; a vinculação manual exige evidência do painel. Depois, em etapa separada, orientar a desativação de Email e revisar os métodos de entrada antes de qualquer ativação Google. Nenhuma alteração dessa etapa foi executada ou presumida nesta retomada.

Foram consultados o changelog e a [configuração geral oficial](https://supabase.com/docs/guides/auth/general-configuration) em 27/10/2026. Não houve SQL remoto, criação de usuário, login, alteração de Auth, ativação Google, publicação ou configuração real do aplicativo. Os demais projetos não foram alterados. I3 continua incompleto.

## Marco confirmado

O usuário pediu orientação para a primeira configuração externa, reforçou que não usará cartão/cobrança/trial e criou pessoalmente, no painel, um projeto separado chamado `atlas-financeiro-i3`. A consulta somente de leitura pelo conector Supabase confirmou o nome, região `sa-east-1` (São Paulo), status `ACTIVE_HEALTHY` e organização com `plan: free` / `tier: tier_free`.

Antes disso, o inventário somente de leitura encontrou dois projetos preexistentes sem vínculo confirmado com o Atlas. Eles não foram alterados, reativados ou reutilizados. Não inferir a identidade Google autorizada pelo nome de organização, conta administrativa ou GitHub. Identificadores operacionais da conta/projeto não são necessários neste registro público sanitizado.

O plano Free foi confirmado pela API; método de pagamento não foi inspecionado. A condição expressa pelo usuário permanece: sem cartão, cobrança, upgrade, trial ou adicionais pagos.

## Limite das ações executadas

O agente consultou projetos, organização e documentação oficial. Não executou criação/configuração remota, SQL, migrações, criação de usuário, ativação Google, publicação, cobrança ou conexão local com o serviço. A criação foi feita pelo usuário na interface. O aplicativo continua com modo remoto desabilitado; não há dados pessoais cadastrados pelo agente.

As configurações de Auth, API, tabelas e usuários do novo projeto ainda não foram inspecionadas nem validadas. Não presumir que os defaults já fecham o acesso. A existência de um projeto ativo não comprova nenhuma integração financeira ou critério de conclusão de I3.

## Próxima etapa guiada

Fechar cadastro público em Authentication → Sign In / Providers, manter entrada anônima e vinculação manual desabilitadas e desabilitar login por email antes de ativar somente o provedor Google na etapa apropriada. O usuário fará a configuração guiada; não foi dada autorização genérica ao agente para alterar Auth, aplicar SQL ou publicar.

A documentação oficial confirma que `Allow new users to sign up` desligado permite login apenas de usuários existentes. O pré-cadastro administrativo de um único usuário, primeiro vínculo Google, autorização ativa por UUID e provas negativas continuam pendentes; não abrir cadastros como atalho.

Referência consultada em 26/10/2026: [General configuration](https://supabase.com/docs/guides/auth/general-configuration). Após o usuário salvar cada configuração, distinguir relato/captura, verificação remota e testes reais. Não registrar uma etapa como confirmada só por ter sido orientada.

## Retomada

Reconsultar o inventário pelo conector autorizado, identificar o projeto pelo nome e confirmar plano/estado antes de qualquer ação. Não tocar nos outros projetos nem obter segredos como parte desse inventário. Continuar pelas pendências de [PENDENCIAS_INCREMENTO_3.md](PENDENCIAS_INCREMENTO_3.md). A orientação originalmente solicitada era uma etapa por vez; o usuário depois pediu que os campos do formulário fossem apresentados juntos. Agrupar os campos de uma mesma etapa, aguardando a conclusão antes da próxima.
